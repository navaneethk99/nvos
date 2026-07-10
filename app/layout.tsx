import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "nvos | More power. Less hardware.",
  description: "A personal computer in your browser, ready when you are.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
