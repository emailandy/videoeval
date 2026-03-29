import type { Metadata } from "next";
import "./globals.css";
import DashboardLayout from "@/components/DashboardLayout";

export const metadata: Metadata = {
  title: "Agoda Marketing Command Center",
  description: "Video Ad Evaluation Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <DashboardLayout>
          {children}
        </DashboardLayout>
      </body>
    </html>
  );
}
