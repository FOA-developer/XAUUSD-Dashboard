import type { Metadata } from "next";
import "./globals.css";


export const metadata: Metadata = {
  title: "XAUUSD Dashboard",
  description: "Gold price dashboard with technical indicators",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className= "h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
