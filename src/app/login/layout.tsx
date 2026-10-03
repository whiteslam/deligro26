import { LangProvider } from "@/components/providers/lang-provider";
import { getLang } from "@/lib/i18n/server";

// The login screen is where a first-time customer picks their language, so it
// reads the same cookie the app does.
export default async function LoginLayout({ children }: { children: React.ReactNode }) {
  return <LangProvider initial={await getLang()}>{children}</LangProvider>;
}
