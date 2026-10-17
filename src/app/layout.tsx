import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
  title: "Personal OS",
  description: "Tu sistema personal: proyectos y tareas, en local.",
};

const NAV = [
  { href: "/inbox", label: "Inbox" },
  { href: "/hoy", label: "Hoy" },
  { href: "/calendar", label: "Calendario" },
  { href: "/projects", label: "Proyectos" },
  { href: "/finance", label: "Finanzas" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-neutral-950 text-neutral-100">
        <header className="border-b border-neutral-800 px-6 py-4">
          <div className="mx-auto flex max-w-4xl items-center gap-6">
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
      </body>
    </html>
  );
}
