import type { Metadata } from "next";
import "./globals.css";
import "./businessiq-theme.css";
import "./original-interface.css";
import { I18nProvider } from "./components/i18n-provider";

export const metadata: Metadata = {
  title: "BusinessIQ — Global Business Intelligence Workspace",
  description: "A multilingual business intelligence workspace for teams around the world.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><I18nProvider>{children}</I18nProvider></body></html>;
}
