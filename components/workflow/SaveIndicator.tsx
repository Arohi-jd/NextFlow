"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { useWorkflowStore } from "@/lib/store/workflowStore";

export function SaveIndicator() {
  const saveStatus = useWorkflowStore((state) => state.saveStatus);
  const [visible, setVisible] = useState(saveStatus !== "saved");

  useEffect(() => {
    if (saveStatus === "saved") {
      setVisible(true);
      const timeout = window.setTimeout(() => setVisible(false), 2000);
      return () => window.clearTimeout(timeout);
    }

    setVisible(true);
    return undefined;
  }, [saveStatus]);

  return (
    <div
      className={`hidden items-center gap-2 rounded-[13px] border px-3 py-2 text-[12px] font-medium tracking-[-0.03em] transition-opacity duration-300 md:inline-flex ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      } ${
        saveStatus === "error"
          ? "border-red-500/30 bg-red-500/10 text-red-300"
          : saveStatus === "saving"
            ? "border-[#9988bb]/30 bg-[#9988bb]/10 text-[#9988bb]"
            : "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
      }`}
      aria-live="polite"
    >
      {saveStatus === "saving" ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Saving...
        </>
      ) : saveStatus === "error" ? (
        <>
          <X className="h-3.5 w-3.5" />
          Save failed
        </>
      ) : (
        <>
          <Check className="h-3.5 w-3.5" />
          Saved
        </>
      )}
    </div>
  );
}
