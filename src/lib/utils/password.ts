import "server-only";
import { randomInt } from "node:crypto";

/**
 * A one-time login password meant to be read aloud or typed by hand during a
 * manual vendor hand-off. The old scheme used `randomBytes(9).toString("base64url")`,
 * whose alphabet includes visually ambiguous characters (0/O, 1/l/I) plus `-`/`_`
 * — a recipe for "the password doesn't work" when someone types what they see.
 *
 * This alphabet drops every ambiguous glyph, and the value is short enough to
 * fit (untruncated) in the hand-off modal. `randomInt` is cryptographically
 * strong; ~14 chars over a 49-symbol alphabet is ample entropy for a credential
 * that is expected to be rotated on first sign-in.
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export function legiblePassword(length = 14): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[randomInt(0, ALPHABET.length)];
  }
  return out;
}
