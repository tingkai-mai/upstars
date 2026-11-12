import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Next } from "next/font/google";
import "./globals.css";

// Designed by the Braille Institute for low-vision readers: letters like I, l and 1 are easy to tell apart
const hyperlegible = Atkinson_Hyperlegible_Next({
  variable: "--font-hyperlegible",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Upstars Assistant", template: "%s · Upstars Assistant" },
  description: "Lesson check-ins, goals and progress for Upstars tutors and students",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${hyperlegible.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
