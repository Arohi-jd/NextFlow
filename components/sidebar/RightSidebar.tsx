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

function StatusDot({ status }: { status: RunStatus }) {
  const color =
    status === "success"
      ? "bg-emerald-400"
      : status === "failed"
        ? "bg-red-400"
        : "bg-amber-400";
  return <span className={`h-2 w-2 shrink-0 rounded-full ${color}`} />;
}

function StatusPill({ status }: { status: RunStatus }) {
  const cls =
    status === "success"
      ? "border-emerald-500/25 bg-emerald-500/12 text-emerald-300"
      : status === "failed"
        ? "border-red-500/25 bg-red-500/12 text-red-300"
        : "border-amber-500/25 bg-amber-500/12 text-amber-300";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${cls}`}>
      {status}
    </span>
  );
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
          nodeName:
            execution.nodeName ||
            nodes.find((node) => node.id === execution.nodeId)?.data.label ||
            execution.nodeId
        }))
      })),
    [nodes, runs]
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshHistory();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <motion.aside
      layout
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className={`relative flex h-full shrink-0 flex-col border-l border-white/5 bg-black ${
        isCollapsed ? "w-[52px]" : "w-[300px]"
      }`}
    >
      {/* Toggle */}
      <button
        type="button"
        onClick={() => onCollapsedChange(!isCollapsed)}
        className="absolute -left-3 top-14 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-[#1a1a1a] text-white/52 transition hover:text-white"
        aria-label={isCollapsed ? "Expand history" : "Collapse history"}
      >
        {isCollapsed ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            key="history-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex h-full flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 border-b border-white/5 px-4 py-4">
              <Clock3 className="h-4 w-4 text-white/42" />
              <h2 className="flex-1 text-[15px] font-medium tracking-[-0.03em] text-white">Run History</h2>
              <button
                type="button"
                onClick={() => void handleRefresh()}
                className="flex h-7 w-7 items-center justify-center rounded-[8px] text-white/38 transition hover:bg-white/6 hover:text-white"
                aria-label="Refresh history"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {runsWithNodeNames.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
                  <Clock3 className="h-8 w-8 text-white/18" />
                  <p className="text-[15px] tracking-[-0.03em] text-white/28">No runs yet</p>
                  <p className="text-[13px] text-white/18">Run the workflow to see history</p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {runsWithNodeNames.map((run, index) => {
                    const runExpanded = expandedRuns.includes(run.id);

                    return (
                      <motion.div
                        key={run.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18, delay: index * 0.03 }}
                        className="mb-2 overflow-hidden rounded-[14px] border border-white/6 bg-white/2"
                      >
                        {/* Run header */}
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedRuns((current) =>
                              current.includes(run.id) ? current.filter((id) => id !== run.id) : [...current, run.id]
                            )
                          }
                          className="flex w-full items-start gap-3 px-3.5 py-3 text-left transition hover:bg-white/4"
                        >
                          <StatusDot status={run.status} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[14px] font-medium tracking-[-0.03em] text-white">
                                Run #{run.runNumber}
                              </span>
                              <StatusPill status={run.status} />
                            </div>
                            <div className="mt-0.5 text-[12px] text-white/32">
                              {new Date(run.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              {" · "}
                              {(run.durationSeconds ?? run.duration ?? 0).toFixed(1)}s
                              {" · "}
                              {run.scope}
                            </div>
                          </div>
                          {runExpanded ? (
                            <ChevronUp className="mt-0.5 h-4 w-4 shrink-0 text-white/28" />
                          ) : (
                            <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-white/28" />
                          )}
                        </button>

                        {/* Node executions */}
                        <AnimatePresence initial={false}>
                          {runExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.18 }}
                              className="overflow-hidden border-t border-white/5"
                            >
                              <div className="space-y-1 px-3 py-2.5">
                                {run.executions.map((execution) => {
                                  const execExpanded = expandedNodes.includes(execution.id);
                                  return (
                                    <div
                                      key={execution.id}
                                      className="overflow-hidden rounded-[10px] border border-white/5 bg-white/2"
                                    >
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setExpandedNodes((current) =>
                                            current.includes(execution.id)
                                              ? current.filter((id) => id !== execution.id)
                                              : [...current, execution.id]
                                          )
                                        }
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-white/4"
                                      >
                                        <NodeStatusIcon status={execution.status} />
                                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium tracking-[-0.02em] text-white/82">
                                          {execution.nodeName}
                                        </span>
                                        <span className="shrink-0 text-[11px] text-white/28">
                                          {((execution.executionTime ?? 0) / 1000).toFixed(1)}s
                                        </span>
                                        {execExpanded ? (
                                          <ChevronUp className="h-3.5 w-3.5 shrink-0 text-white/22" />
                                        ) : (
                                          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/22" />
                                        )}
                                      </button>

                                      <AnimatePresence initial={false}>
                                        {execExpanded && (
                                          <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.15 }}
                                            className="overflow-hidden border-t border-white/5"
                                          >
                                            <div className="space-y-2 px-3 py-2.5 text-[12px] text-white/42">
                                              {execution.outputs && Object.keys(execution.outputs).length > 0 && (
                                                <div className="rounded-[8px] bg-white/4 p-2.5">
                                                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/38">
                                                    Output
                                                  </div>
                                                  <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap font-sans text-white/62">
                                                    {JSON.stringify(execution.outputs, null, 2)}
                                                  </pre>
                                                </div>
                                              )}
                                              {execution.error && (
                                                <div className="rounded-[8px] border border-red-500/18 bg-red-500/8 p-2.5 text-red-300/82">
                                                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em]">
                                                    Error
                                                  </div>
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

      {/* Collapsed: clock icon */}
      {isCollapsed && (
        <div className="flex flex-col items-center pt-5">
          <button
            type="button"
            onClick={() => onCollapsedChange(false)}
            className="text-white/32 transition hover:text-white/62"
            title="Run History"
          >
            <Clock3 className="h-5 w-5" />
          </button>
        </div>
      )}
    </motion.aside>
  );
}
