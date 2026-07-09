/**
 * Shared helpers for legacy import scripts.
 */
import { readFileSync } from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function findAuthUserByEmail(
  admin: SupabaseClient,
  email: string
) {
  let page = 1;
  const perPage = 200;
  while (page <= 50) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage });
    const users = data?.users ?? [];
    const hit = users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (hit) return hit;
    if (users.length < perPage) break;
    page++;
  }
  return null;
}

export async function findProfileByPhone(
  admin: SupabaseClient,
  phone: string
) {
  const { data } = await admin
    .from("profiles")
    .select("id, phone, role, full_name")
    .eq("phone", phone)
    .maybeSingle();
  return data;
}

export function loadEnvFile(envPath: string) {
  try {
    const raw = readFileSync(envPath, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // optional
  }
}

const RETRYABLE = /EAI_AGAIN|ETIMEDOUT|ECONNRESET|fetch failed|rate limit|429/i;

export async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  attempts = 5
): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (!RETRYABLE.test(msg) || i === attempts - 1) throw err;
      const wait = 500 * 2 ** i;
      console.warn(`  retry ${label} (${i + 1}/${attempts}) in ${wait}ms…`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw last;
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
