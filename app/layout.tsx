import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { isDevelopmentAuthBypassEnabled } from "@/lib/auth";
import "./globals.css";

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
    <html lang="en" suppressHydrationWarning>
      <body className="bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased" suppressHydrationWarning>
        {isDevelopmentAuthBypassEnabled() ? (
          children
        ) : (
          <ClerkProvider signInFallbackRedirectUrl="/" signUpFallbackRedirectUrl="/">
            {children}
          </ClerkProvider>
        )}
      </body>
    </html>
  );
}
