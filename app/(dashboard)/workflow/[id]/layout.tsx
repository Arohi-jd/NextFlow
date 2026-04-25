"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Loader2, Play, Sparkles, Zap } from "lucide-react";
import LeftSidebar from "@/components/sidebar/LeftSidebar";
import RightSidebar from "@/components/sidebar/RightSidebar";
import { useWorkflowStore } from "@/lib/store/workflowStore";

type WorkflowLayoutProps = {
  children: ReactNode;
};

export default function WorkflowLayout({ children }: WorkflowLayoutProps) {
  const workflowName = useWorkflowStore((state) => state.workflowName);
  const setWorkflowName = useWorkflowStore((state) => state.setWorkflowName);
  const saveState = useWorkflowStore((state) => state.saveState);
  const isRunning = useWorkflowStore((state) => state.isRunning);
  const executeWorkflow = useWorkflowStore((state) => state.executeWorkflow);
  const loadSampleWorkflow = useWorkflowStore((state) => state.loadSampleWorkflow);

  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  const [localName, setLocalName] = useState(workflowName);
  const isDevelopmentBypass = process.env.NODE_ENV === "development";

  useEffect(() => {
    setLocalName(workflowName);
  }, [workflowName]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <header className="fixed inset-x-0 top-0 z-40 h-14 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/95 backdrop-blur">
        <div className="grid h-full grid-cols-[260px_1fr_320px] items-center">
          <div className="flex items-center gap-2 border-r border-[var(--border-color)] px-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-purple)]/15">
              <Zap className="h-4 w-4 text-[var(--accent-purple-bright)]" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-[0.18em] text-[var(--text-primary)]">NextFlow</div>
              <div className="text-[11px] text-[var(--text-muted)]">Visual DAG editor</div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 px-4">
            <input
              value={localName}
              onChange={(event) => setLocalName(event.target.value)}
              onBlur={() => setWorkflowName(localName.trim() || "Untitled Workflow")}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  (event.target as HTMLInputElement).blur();
                }
              }}
              className="h-9 min-w-[240px] max-w-[520px] rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 text-center text-sm font-medium text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-purple)]"
            />
            <span className="text-xs text-[var(--text-muted)]">
              {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : saveState === "error" ? "Save failed" : ""}
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 border-l border-[var(--border-color)] px-4">
            <button
              type="button"
              onClick={() => loadSampleWorkflow()}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 text-xs font-semibold text-[var(--text-primary)] transition hover:border-[var(--border-hover)]"
            >
              <Sparkles className="h-4 w-4 text-[var(--accent-purple-bright)]" />
              Load Sample
            </button>
            <button
              type="button"
              onClick={() => void executeWorkflow("Full")}
              disabled={isRunning}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--accent-purple)] px-3 text-xs font-semibold text-white transition hover:bg-[var(--accent-purple-bright)] disabled:opacity-60"
            >
              {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Run Workflow
            </button>
            {isDevelopmentBypass ? (
              <Link
                href="/"
                className="inline-flex h-9 items-center rounded-full border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 text-xs font-semibold text-[var(--text-primary)] transition hover:border-[var(--border-hover)]"
              >
                Dev User
              </Link>
            ) : (
              <UserButton afterSignOutUrl="/sign-in" />
            )}
          </div>
        </div>
      </header>

      <div className="flex h-screen overflow-hidden pt-14">
        <LeftSidebar isCollapsed={isLeftCollapsed} onCollapsedChange={setIsLeftCollapsed} />
        <main className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</main>
        <RightSidebar isCollapsed={isRightCollapsed} onCollapsedChange={setIsRightCollapsed} />
      </div>
    </div>
  );
}
