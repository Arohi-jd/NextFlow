"use client";

import { useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock3,
  Loader2,
  RefreshCw,
  X
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useWorkflowStore } from "@/lib/store/workflowStore";
import type { RunStatus } from "@/lib/types";

type RightSidebarProps = {
  isCollapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
};

function StatusBadge({ status }: { status: RunStatus }) {
  const palette =
    status === "success"
      ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
      : status === "failed"
        ? "border-red-500/30 bg-red-500/15 text-red-300"
        : "border-amber-500/30 bg-amber-500/15 text-amber-300";

  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${palette}`}>{status}</span>;
}

function NodeStatusIcon({ status }: { status: RunStatus }) {
  if (status === "success") return <Check className="h-3.5 w-3.5 text-emerald-400" />;
  if (status === "failed") return <X className="h-3.5 w-3.5 text-red-400" />;
  return <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-300" />;
}

export default function RightSidebar({ isCollapsed, onCollapsedChange }: RightSidebarProps) {
  const runs = useWorkflowStore((state) => state.runs);
  const refreshHistory = useWorkflowStore((state) => state.refreshHistory);
  const nodes = useWorkflowStore((state) => state.nodes);
  const [expandedRuns, setExpandedRuns] = useState<string[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const runsWithNodeNames = useMemo(
    () =>
      runs.map((run) => ({
        ...run,
        executions: run.executions.map((execution) => ({
          ...execution,
          nodeName: execution.nodeName || nodes.find((node) => node.id === execution.nodeId)?.data.label || execution.nodeId
        }))
      })),
    [nodes, runs]
  );

  return (
    <motion.aside
      layout
      className={`relative h-full shrink-0 border-l border-[var(--border-color)] bg-[var(--bg-secondary)] transition-all duration-300 ${isCollapsed ? "w-12" : "w-[320px]"}`}
    >
      <button
        type="button"
        onClick={() => onCollapsedChange(!isCollapsed)}
        className="absolute -left-3 top-3 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
        aria-label={isCollapsed ? "Expand workflow history" : "Collapse workflow history"}
      >
        {isCollapsed ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </button>

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            key="history-content"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.18 }}
            className="flex h-full flex-col"
          >
            <div className="flex items-center gap-2 border-b border-[var(--border-color)] px-3 py-3">
              <Clock3 className="h-4 w-4 text-[var(--accent-purple-bright)]" />
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Workflow History</h2>
              <button
                type="button"
                onClick={async () => {
                  setIsRefreshing(true);
                  try {
                    await refreshHistory();
                  } finally {
                    setIsRefreshing(false);
                  }
                }}
                className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                aria-label="Refresh workflow history"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {runsWithNodeNames.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <Clock3 className="h-8 w-8 text-[var(--text-muted)]" />
                  <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">No runs yet</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">Run the workflow to populate history.</p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {runsWithNodeNames.map((run, index) => {
                    const runExpanded = expandedRuns.includes(run.id);

                    return (
                      <motion.div
                        key={run.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.22, delay: index * 0.04 }}
                        className="mb-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)]"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedRuns((current) =>
                              current.includes(run.id) ? current.filter((id) => id !== run.id) : [...current, run.id]
                            )
                          }
                          className="flex w-full items-start gap-3 px-3 py-3 text-left transition hover:bg-white/5"
                        >
                          <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-[var(--accent-purple-bright)]" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-[var(--text-primary)]">Run #{run.runNumber}</span>
                              <StatusBadge status={run.status} />
                            </div>
                            <div className="mt-1 text-[11px] text-[var(--text-muted)]">
                              {new Date(run.startedAt).toLocaleString()} • {run.durationSeconds.toFixed(2)}s
                            </div>
                          </div>
                          {runExpanded ? <ChevronUp className="h-4 w-4 text-[var(--text-secondary)]" /> : <ChevronDown className="h-4 w-4 text-[var(--text-secondary)]" />}
                        </button>

                        <AnimatePresence initial={false}>
                          {runExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden border-t border-[var(--border-color)]"
                            >
                              <div className="space-y-2 px-3 py-3">
                                {run.executions.map((execution) => {
                                  const executionExpanded = expandedNodes.includes(execution.id);

                                  return (
                                    <div key={execution.id} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setExpandedNodes((current) =>
                                            current.includes(execution.id)
                                              ? current.filter((id) => id !== execution.id)
                                              : [...current, execution.id]
                                          )
                                        }
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left"
                                      >
                                        <NodeStatusIcon status={execution.status} />
                                        <span className="min-w-0 flex-1 truncate text-xs font-medium text-[var(--text-primary)]">{execution.nodeName}</span>
                                        <span className="text-[11px] text-[var(--text-muted)]">{(execution.executionTime / 1000).toFixed(2)}s</span>
                                        {executionExpanded ? <ChevronUp className="h-4 w-4 text-[var(--text-secondary)]" /> : <ChevronDown className="h-4 w-4 text-[var(--text-secondary)]" />}
                                      </button>

                                      <AnimatePresence initial={false}>
                                        {executionExpanded && (
                                          <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden border-t border-[var(--border-color)]"
                                          >
                                            <div className="space-y-2 px-3 py-2 text-[11px] text-[var(--text-muted)]">
                                              {execution.outputs && Object.keys(execution.outputs).length > 0 && (
                                                <div className="rounded-md bg-[var(--bg-tertiary)] p-2">
                                                  <div className="mb-1 font-semibold text-[var(--text-primary)]">Output</div>
                                                  <pre className="whitespace-pre-wrap font-sans">{JSON.stringify(execution.outputs, null, 2)}</pre>
                                                </div>
                                              )}
                                              {execution.error && (
                                                <div className="rounded-md border border-red-500/20 bg-red-500/10 p-2 text-red-200">
                                                  <div className="mb-1 font-semibold">Error</div>
                                                  <div>{execution.error}</div>
                                                </div>
                                              )}
                                            </div>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
