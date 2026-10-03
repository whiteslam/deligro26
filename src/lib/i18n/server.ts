import { cookies } from "next/headers";
import { LANG_COOKIE, parseLang, translator, type Lang, type T } from "./lang";

/** The customer's language, for server components and route handlers. */
export async function getLang(): Promise<Lang> {
  return parseLang((await cookies()).get(LANG_COOKIE)?.value);
}

/** `const t = await getT(); t("Home", "होम")` */
export async function getT(): Promise<T> {
  return translator(await getLang());
}
