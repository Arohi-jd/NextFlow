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
  const body = (
    <html lang="en">
      <body className="bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased">
        {children}
      </body>
    </html>
  );

  if (isDevelopmentAuthBypassEnabled()) {
    return body;
  }

  return (
    <ClerkProvider signInFallbackRedirectUrl="/workflow" signUpFallbackRedirectUrl="/workflow">
      {body}
    </ClerkProvider>
  );
}
