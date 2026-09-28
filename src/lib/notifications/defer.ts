import "server-only";
import { after } from "next/server";

/**
 * Run a notification after the response has been sent, and keep the function
 * alive until it finishes.
 *
 * Every push used to be `void notifyX()`: started, not awaited, and left
 * running when the handler returned. On Vercel an invocation can be frozen the
 * moment its response is flushed, so a push still waiting on its profile read
 * or on OneSignal could simply never leave the server. `after()` is Next's
 * contract for exactly this — the same reason obs flushes through it
 * (lib/obs/emit.ts) and dispatch is awaited.
 *
 * The response is not delayed: the caller still returns immediately.
 *
 * `after()` throws outside a request scope (a script, a module top level). The
 * fallback there is the old detached promise, which is no worse than before
 * and only reachable where there is no response to wait for anyway.
 */
export function deferNotify(task: () => Promise<unknown>): void {
  const run = async () => {
    try {
      await task();
    } catch {
      // Notifiers swallow their own failures; this is belt and braces so a
      // bug in one can never surface as an unhandled rejection.
    }
  };
  try {
    after(run);
  } catch {
    void run();
  }
}
