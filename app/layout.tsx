import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider, LanguageSwitcher } from "./components/i18n-provider";

export const metadata: Metadata = {
  title: "BusinessIQ — Global Business Intelligence Workspace",
  description: "A multilingual business intelligence workspace for teams around the world.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><I18nProvider><div className="biq-global-tools"><span>BusinessIQ · Global workspace</span><LanguageSwitcher /></div>{children}</I18nProvider></body></html>;
}
