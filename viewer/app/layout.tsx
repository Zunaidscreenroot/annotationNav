import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AnnotationNav — Developer Handoff",
  description: "Figma design + implementation annotations in one place.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
