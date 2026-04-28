"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, Loader2, X } from "lucide-react";
import { motion } from "framer-motion";

interface BaseNodeProps {
  id: string;
  title: string;
  icon: LucideIcon;
  color: string;
  isSelected: boolean;
  isRunning: boolean;
  error?: string;
  onDeleteAction?: (id: string) => void;
  children: ReactNode;
  minWidthClassName?: string;
  contentClassName?: string;
  hideDelete?: boolean;
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
  children,
  minWidthClassName = "min-w-[228px]",
  contentClassName = "p-3",
  hideDelete = false
}: BaseNodeProps) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute -top-6 left-1.5 z-20 flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
        <div className="flex h-4 w-4 items-center justify-center" style={{ color }}>
          <Icon className="h-3 w-3" strokeWidth={2.1} />
        </div>
        <span>{title}</span>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className={[
          "group relative overflow-visible rounded-[16px] border text-[var(--text-primary)] shadow-[0_8px_22px_rgba(0,0,0,0.24)] transition-all duration-200",
          minWidthClassName,
          error
            ? "border-red-500/70 shadow-[0_0_0_1px_rgba(239,68,68,0.28),0_10px_28px_rgba(0,0,0,0.28)]"
            : isSelected
              ? "shadow-[0_10px_28px_rgba(0,0,0,0.28)]"
              : "border-[var(--border-color)] hover:border-[var(--border-hover)]",
          isRunning ? "node-running" : ""
        ].join(" ")}
        style={{
          background: "var(--bg-node)",
          borderColor: error ? "rgba(239,68,68,0.7)" : isSelected ? color : undefined,
          boxShadow: isSelected ? `0 0 0 1px ${color}, 0 8px 22px rgba(0,0,0,0.24)` : undefined
        }}
      >
        {!hideDelete ? (
          <button
            type="button"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onDeleteAction?.(id);
            }}
            className="absolute right-2 top-2 z-20 flex h-5 w-5 items-center justify-center rounded-[6px] text-[var(--text-muted)] opacity-0 transition hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-secondary)] group-hover:opacity-100"
            title="Delete node"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        ) : null}

        {isRunning ? <Loader2 className="absolute right-2.5 top-2.5 z-20 h-3 w-3 animate-spin text-[var(--text-secondary)]" /> : null}
        {!isRunning && error ? <AlertCircle className="absolute right-2.5 top-2.5 z-20 h-3 w-3 text-red-400" /> : null}

        <div className={contentClassName}>{children}</div>
      </motion.div>
    </div>
  );
}
