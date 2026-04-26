"use client";

import type { ReactNode } from "react";
import { KreaRailSidebar } from "@/components/krea/KreaSidebar";

type WorkflowLayoutProps = {
  children: ReactNode;
};

export default function WorkflowLayout({ children }: WorkflowLayoutProps) {
  return (
    <div className="min-h-screen bg-[#111111] text-white">
      <KreaRailSidebar />
      <main className="ml-[78px] min-h-screen">{children}</main>
    </div>
  );
}
