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
    default: "SEA Audit",
    template: "%s · SEA Audit",
  },
  description:
    "Local internal audit workbench for housing compliance, managing agents, and statutory assurance.",
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
