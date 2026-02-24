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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-gray-900`}
      >
        <div className="min-h-screen">
          <header className="border-b border-gray-100">
            <div className="max-w-3xl mx-auto px-4 py-4">
              <a href="/" className="text-lg font-semibold text-gray-900 hover:text-orange-600 transition-colors">
                Substack to Kindle
              </a>
            </div>
          </header>
          <main className="max-w-3xl mx-auto px-4 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
