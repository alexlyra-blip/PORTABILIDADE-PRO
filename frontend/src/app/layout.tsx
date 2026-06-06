import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import DynamicFavicon from "@/components/DynamicFavicon";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={`${inter.className} min-h-screen antialiased bg-slate-50 dark:bg-[#0b1120] text-slate-900 dark:text-white transition-colors duration-200`} suppressHydrationWarning>
        <DynamicFavicon />
        {children}
      </body>
    </html>
  );
}
