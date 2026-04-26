"use client";

import type { ReactNode } from "react";
import { AlertCircle, Loader2, X } from "lucide-react";
import { motion } from "framer-motion";

interface BaseNodeProps {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  isSelected: boolean;
  isRunning: boolean;
  error?: string;
  onDeleteAction?: (id: string) => void;
  children: ReactNode;
}

export default function BaseNode({
  id,
  title,
  icon: Icon,
  color,
  isSelected,
  isRunning,
  error,
  onDeleteAction,
  children
}: BaseNodeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={`group relative min-w-[260px] overflow-hidden rounded-[12px] border bg-[var(--bg-node)] shadow-[0_12px_32px_rgba(0,0,0,0.42)] transition-all duration-200 ${
        error
          ? "border-red-500/70 shadow-[0_0_0_1px_rgba(239,68,68,0.35)]"
          : isSelected
            ? "border-[var(--accent-purple)] shadow-[0_0_0_2px_rgba(139,92,246,0.22)]"
            : "border-[var(--border-color)]"
      } ${isRunning ? "node-running" : ""}`}
    >
      <div className="absolute left-0 top-0 h-full w-1.5" style={{ backgroundColor: error ? "#ef4444" : color }} />

      <div className="flex items-center gap-2 border-b border-[var(--border-color)] px-3 py-2.5">
        <div className="ml-1.5 flex h-6 w-6 items-center justify-center rounded-md" style={{ backgroundColor: `${color}20` }}>
          <div style={{ color }}>
            <Icon className="h-4 w-4" />
          </div>
        </div>

        <span className="text-sm font-semibold text-[var(--text-primary)]">{title}</span>

        {isRunning && <Loader2 className="ml-auto h-4 w-4 animate-spin text-[var(--accent-purple-bright)]" />}
        {!isRunning && error && <AlertCircle className="ml-auto h-4 w-4 text-red-400" />}

        <button
          type="button"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onDeleteAction?.(id);
          }}
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--text-secondary)] opacity-0 transition hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] group-hover:opacity-100"
          title="Delete node"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="p-3">{children}</div>
    </motion.div>
  );
}
