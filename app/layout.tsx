import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Link Tagging",
  description: "Save and organize links with tags",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
