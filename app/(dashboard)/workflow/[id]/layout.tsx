"use client";

import type { ReactNode } from "react";

type WorkflowLayoutProps = {
  children: ReactNode;
};

export default function WorkflowLayout({ children }: WorkflowLayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <main className="min-h-screen">{children}</main>
    </div>
  );
}
