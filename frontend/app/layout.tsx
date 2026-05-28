import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";

const themeInitScript = `
(() => {
  try {
    const savedTheme = window.localStorage.getItem("theme")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const resolvedTheme = savedTheme === "dark" || savedTheme === "light"
      ? savedTheme
      : prefersDark
        ? "dark"
        : "light"

    document.documentElement.classList.toggle("dark", resolvedTheme === "dark")
    document.documentElement.style.colorScheme = resolvedTheme
  } catch {
    document.documentElement.classList.remove("dark")
    document.documentElement.style.colorScheme = "light"
  }
})()
`;

const notoSans = localFont({
  src: "../public/fonts/NotoSansHans-Regular.ttf",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "数字口腔多模态数据管理系统",
  description: "Digital Oral Multimodal Data Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`${notoSans.variable} antialiased font-sans`}>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <QueryProvider>
          {children}
          <Toaster richColors position="top-center" />
        </QueryProvider>
      </body>
    </html>
  );
}
