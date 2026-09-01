import "server-only";
import { headers } from "next/headers";
import { emit, captureError, type ObsContext } from "./emit";
import {
  currentEnv,
  newRequestId,
  newTraceId,
  parseCorrelationId,
  templateRoute,
} from "./ids";
import { redactUrl } from "./redact";
import { OBS_REQUEST_ID_HEADER, OBS_TRACE_ID_HEADER } from "./types";

/**
 * Turning a route handler into something that reports on itself.
 *
 * `instrumentation.ts` already catches every throw. What it cannot see is the
 * successful-but-slow request, the deliberate 4xx, the 503 a route returns
 * rather than throws — and this app returns a great many of those on purpose
 * (`backend_not_configured`, `online_payments_unavailable`, `rate_limited`).
 * Those are the rows the API and Performance pages are built from, and none of
 * them is an exception.
 *
 * So: `onRequestError` records what broke, this records what happened.
 */

/**
 * The correlation ids for the request being served.
 *
 * `proxy.ts` mints these and sets them on the request headers, so every handler
 * in one request agrees on them without threading anything through. When the
 * proxy did not run — a route it excludes, a direct invocation in a test — new
 * ids are minted here rather than left null: a request with no id cannot be
 * correlated with anything, which is the one outcome worth avoiding.
 */
export async function obsRequestContext(): Promise<{
  requestId: string;
  traceId: string;
}> {
  try {
    const h = await headers();
    return {
      requestId:
        parseCorrelationId(h.get(OBS_REQUEST_ID_HEADER), "req") ?? newRequestId(),
      traceId:
        parseCorrelationId(h.get(OBS_TRACE_ID_HEADER), "trace") ?? newTraceId(),
    };
  } catch {
    // Called outside a request scope.
    return { requestId: newRequestId(), traceId: newTraceId() };
  }
}

/** Route-handler signatures, both the bare and the dynamic-segment shape. */
type Handler<C> = (request: Request, ctx: C) => Promise<Response> | Response;

export interface ObsRouteOptions {
  /**
   * The templated route, e.g. `/api/orders/[id]/status`.
   *
   * Passed explicitly rather than derived from the URL, because deriving it
   * means guessing which segments are ids — and a wrong guess either splits one
   * endpoint into thousands of rows or merges two different endpoints into one.
   * `templateRoute()` exists as a fallback for callers with nothing better, but
   * the name is cheap to write and always right.
   */
  route: string;
  /** Domain ids the caller can attach once it has parsed the request. */
  enrich?: (request: Request) => Partial<ObsContext>;
}

/**
 * Wrap a route handler.
 *
 * Records one `http` event per request, and — for a throw — one `error` event
 * too, then re-throws so Next's own error handling is unchanged. The double
 * record is deliberate: the http row keeps the endpoint's latency and status
 * series honest (a request that threw is still a request that was slow), and
 * the error row is what groups into an issue.
 */
export function withObservability<C>(
  options: ObsRouteOptions,
  handler: Handler<C>
): Handler<C> {
  return async (request: Request, ctx: C): Promise<Response> => {
    const started = Date.now();
    const { requestId, traceId } = await obsRequestContext();

    let extra: Partial<ObsContext> = {};
    try {
      extra = options.enrich?.(request) ?? {};
    } catch {
      // An enricher that throws must not decide whether the route runs.
    }

    const base: ObsContext = { requestId, traceId, ...extra };

    try {
      const response = await handler(request, ctx);

      emit({
        env: currentEnv(),
        kind: "http",
        // A 5xx is our fault and reads as an error. A 4xx is the caller's and
        // reads as info: a customer sending an invalid body, or a rate limit
        // doing exactly its job, is the system working. Recording those as
        // errors would bury the real ones under rows nobody needs to action.
        level: response.status >= 500 ? "error" : "info",
        source: `api${options.route}`,
        message: `${request.method} ${options.route} → ${response.status}`,
        httpMethod: request.method,
        httpRoute: options.route,
        httpStatus: response.status,
        durationMs: Date.now() - started,
        ...base,
      });

      return response;
    } catch (err) {
      const durationMs = Date.now() - started;

      emit({
        env: currentEnv(),
        kind: "http",
        level: "error",
        source: `api${options.route}`,
        message: `${request.method} ${options.route} → threw`,
        httpMethod: request.method,
        httpRoute: options.route,
        httpStatus: 500,
        durationMs,
        ...base,
      });

      captureError(err, {
        source: `api${options.route}`,
        httpMethod: request.method,
        httpRoute: options.route,
        httpStatus: 500,
        attrs: { durationMs, route: redactUrl(request.url) },
        ...base,
      });

      throw err;
    }
  };
}

/**
 * The route name for a handler that did not supply one.
 *
 * Kept here rather than inlined so the fallback path is one function everyone
 * shares — if it turns out to template a segment wrongly, there is a single
 * place to fix it and a single set of affected rows.
 */
export function routeFromUrl(url: string): string {
  try {
    return templateRoute(new URL(url).pathname);
  } catch {
    return templateRoute(redactUrl(url));
  }
}
