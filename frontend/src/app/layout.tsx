import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { VariantProvider } from "@/components/VariantSwitcher";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Substack to Kindle",
  description: "Convert any Substack newsletter into Kindle-ready EPUBs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <VariantProvider>
          <div className="min-h-screen">
            <header className="border-b">
              <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                <a href="/" className="text-lg font-semibold hover:text-orange-600 transition-colors">
                  Substack to Kindle
                </a>
                <kbd className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                  ⌘K to switch layout
                </kbd>
              </div>
            </header>
            <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
          </div>
        </VariantProvider>
      </body>
    </html>
  );
}
