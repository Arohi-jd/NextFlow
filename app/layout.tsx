import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NextFlow",
  description: "Visual AI workflow builder"
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <ClerkProvider signInFallbackRedirectUrl="/workflow" signUpFallbackRedirectUrl="/workflow">
      <html lang="en">
        <body className={`${inter.className} bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
