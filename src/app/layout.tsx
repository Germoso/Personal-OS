import type { Metadata } from "next";
import { Instrument_Serif, Sora } from "next/font/google";
import Link from "next/link";
import "./globals.css";

import { ChatPanel } from "@/components/ai/chat-panel";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Personal OS",
  description: "Tu sistema personal: proyectos y tareas, en local.",
};

const NAV = [
  { href: "/inbox", label: "Inbox" },
  { href: "/hoy", label: "Hoy" },
  { href: "/calendar", label: "Calendario" },
  { href: "/projects", label: "Proyectos" },
  { href: "/finance", label: "Finanzas" },
  { href: "/kitchen", label: "Cocina" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${sora.variable} ${instrument.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-neutral-950 text-neutral-100">
        <header className="sticky top-4 z-40 mx-auto mt-4 w-full max-w-4xl px-4">
          <div className="flex items-center gap-6 rounded-2xl border border-neutral-800 bg-neutral-900/85 px-6 py-3 shadow-lg shadow-black/25 backdrop-blur">
            <span className="text-sm font-semibold tracking-wide">Personal OS</span>
            <nav className="flex gap-4 text-sm text-neutral-400">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="hover:text-neutral-100"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">{children}</main>
        <ChatPanel />
      </body>
    </html>
  );
}
