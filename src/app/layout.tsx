import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maryem | Biopsychosocial Relationship Coaching",
  description:
    "Transform your relationships through evidence-based biopsychosocial coaching. Book a private session with Maryem and discover a more connected, fulfilling life.",
  keywords: [
    "relationship coaching",
    "biopsychosocial",
    "couples therapy",
    "mental wellness",
    "life coaching",
  ],
  openGraph: {
    title: "Maryem | Biopsychosocial Relationship Coaching",
    description:
      "Evidence-based coaching that weaves biology, psychology, and social context into lasting relationship change.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
