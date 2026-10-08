import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Niteo ERP | Gestión de Restaurantes",
  description: "Plataforma de gestión de restaurantes, inventario y despachos.",
};

import NextTopLoader from 'nextjs-toploader';

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextTopLoader
          color="#818cf8"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={true}
          easing="ease"
          speed={200}
          shadow="0 0 10px #818cf8,0 0 5px #818cf8"
          template='<div class="bar" role="bar"><div class="peg"></div></div><div class="spinner" role="spinner"><img src="/logo.png" class="niteo-logo-spinner" alt="Cargando..." /></div>'
        />
        {children}
      </body>
    </html>
  );
}
