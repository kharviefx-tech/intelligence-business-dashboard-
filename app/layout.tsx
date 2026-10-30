import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BusinessIQ — Business Intelligence Workspace",
  description: "A clear command centre for understanding business performance, cash flow, sales and operational risks.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
