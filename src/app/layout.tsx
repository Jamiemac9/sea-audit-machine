import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/workbench/app-shell";
import { WorkbenchProvider } from "@/lib/workbench";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Seaaudit",
    template: "%s · Seaaudit",
  },
  description:
    "Seaaudit — Support Audit CRM, Audit Workbench, Property Compliance (Big 8), and RP & MA Directory. Reports use [Client_RP_Name] or the active Registered Provider.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <WorkbenchProvider>
          <AppShell>{children}</AppShell>
        </WorkbenchProvider>
      </body>
    </html>
  )
}
