"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pin, PinOff, Search, Trash2 } from "lucide-react";

type WorkflowHistoryItem = {
  id: string;
  name: string;
  createdAt: string;
};

type WorkflowHistoryListProps = {
  workflows: WorkflowHistoryItem[];
};

const PINNED_WORKFLOWS_KEY = "nextflow:pinned-workflows";

function formatRelativeCreatedAt(value: string): string {
  const created = new Date(value).getTime();
  if (Number.isNaN(created)) return "Edited recently";

  const diffSeconds = Math.max(1, Math.floor((Date.now() - created) / 1000));

  if (diffSeconds < 60) return `Edited ${diffSeconds} second${diffSeconds === 1 ? "" : "s"} ago`;

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `Edited ${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Edited ${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `Edited ${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

export default function WorkflowHistoryList({ workflows }: WorkflowHistoryListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState(workflows);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setItems(workflows);
  }, [workflows]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PINNED_WORKFLOWS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        setPinnedIds(parsed.filter((id): id is string => typeof id === "string"));
      }
    } catch {
      // ignore localStorage parse issues
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(PINNED_WORKFLOWS_KEY, JSON.stringify(pinnedIds));
    } catch {
      // ignore localStorage write issues
    }
  }, [pinnedIds]);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    const base = normalized
      ? items.filter((workflow) => workflow.name.toLowerCase().includes(normalized))
      : items;

    return [...base].sort((a, b) => {
      const aPinned = pinnedIds.includes(a.id) ? 1 : 0;
      const bPinned = pinnedIds.includes(b.id) ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [items, pinnedIds, query]);

  const togglePinned = (workflowId: string) => {
    setPinnedIds((current) =>
      current.includes(workflowId) ? current.filter((id) => id !== workflowId) : [workflowId, ...current]
    );
  };

  const removeWorkflow = async (workflowId: string) => {
    setErrorMessage(null);
    const previousItems = items;
    setItems((current) => current.filter((workflow) => workflow.id !== workflowId));
    setPinnedIds((current) => current.filter((id) => id !== workflowId));

    try {
      const response = await fetch(`/api/workflows/${workflowId}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string; details?: string };
        throw new Error(payload.details || payload.error || "Failed to delete workflow");
      }

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setItems(previousItems);
      setErrorMessage("Delete failed. Please try again.");
    }
  };

  return (
    <div className="mt-10 border-t border-white/8 pt-7">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[14px] font-semibold tracking-[-0.02em] text-white">History</h3>
        <span className="text-[11px] text-white/45">Recent workflows</span>
      </div>

      <div className="mb-3 flex h-[42px] items-center gap-2 rounded-[12px] border border-white/10 bg-[#171717] px-3 text-white/60">
        <Search className="h-4 w-4" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search history..."
          className="w-full bg-transparent text-[12px] text-white outline-none placeholder:text-white/35"
        />
      </div>

      {errorMessage ? (
        <div className="mb-3 rounded-[12px] border border-red-500/30 bg-red-500/12 px-3 py-2 text-[11px] text-red-200">
          {errorMessage}
        </div>
      ) : null}

      {filteredItems.length === 0 ? (
        <div className="rounded-[14px] border border-white/8 bg-[#171717] px-4 py-5 text-[12px] text-white/45">
          {items.length === 0 ? "No workflow history yet. Create one from New Workflow." : "No workflows match your search."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[14px] border border-white/8 bg-[#171717]">
          {filteredItems.map((workflow, index) => {
            const isPinned = pinnedIds.includes(workflow.id);
            return (
              <div
                key={`history-${workflow.id}`}
                className={`flex items-center justify-between gap-4 px-4 py-3 ${
                  index !== filteredItems.length - 1 ? "border-b border-white/6" : ""
                }`}
              >
                <Link href={`/workflow/${workflow.id}`} className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-medium text-white">{workflow.name || "Untitled"}</div>
                  <div className="mt-0.5 text-[10px] text-white/45">{formatRelativeCreatedAt(workflow.createdAt)}</div>
                </Link>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      togglePinned(workflow.id);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-[9px] text-white/60 transition hover:bg-white/6 hover:text-white"
                    title={isPinned ? "Unpin" : "Pin"}
                    aria-label={isPinned ? "Unpin workflow" : "Pin workflow"}
                  >
                    {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                  </button>

                  <button
                    type="button"
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      void removeWorkflow(workflow.id);
                    }}
                    disabled={isPending}
                    className="flex h-8 w-8 items-center justify-center rounded-[9px] text-white/55 transition hover:bg-red-500/15 hover:text-red-300 disabled:opacity-40"
                    title="Delete"
                    aria-label="Delete workflow"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
