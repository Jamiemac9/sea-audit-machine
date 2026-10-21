import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/workbench/app-shell";
import { WorkbenchProvider } from "@/lib/store";
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
    "Local workbench for SEA resident-file audits, with a caseload board, side-by-side review, and Word reports.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
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
  );
}
