import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Deal or No Deal",
  description:
    "Play the classic Deal or No Deal game show right in your browser!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
