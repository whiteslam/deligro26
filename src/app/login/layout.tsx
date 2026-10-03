import { LangProvider } from "@/components/providers/lang-provider";
import { getLang } from "@/lib/i18n/server";

// The login screen speaks whatever language the app is set to, so it reads the
// same cookie the app does. The switch itself lives in the customer profile.
export default async function LoginLayout({ children }: { children: React.ReactNode }) {
  return <LangProvider initial={await getLang()}>{children}</LangProvider>;
}
