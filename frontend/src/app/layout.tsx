import type { Metadata } from "next";
import "./globals.css";
import DynamicFavicon from "@/components/DynamicFavicon";
import ThemeDecoration from "@/components/ThemeDecoration";

export const metadata: Metadata = {
  title: "Portabilidade PRO | CRM",
  description: "Sistema Avançado de Simulação de Portabilidade",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-inter min-h-screen antialiased bg-slate-50 dark:bg-[#0b1120] text-slate-900 dark:text-white transition-colors duration-200" suppressHydrationWarning>
        <DynamicFavicon />
        <ThemeDecoration />
        {children}
      </body>
    </html>
  );
}

