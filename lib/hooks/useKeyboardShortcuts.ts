"use client";

import { useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import { useWorkflowStore } from "@/lib/store/workflowStore";

export function useKeyboardShortcuts(): void {
  const removeSelectedNodes = useWorkflowStore((state) => state.removeSelectedNodes);
  const selectAllNodes = useWorkflowStore((state) => state.selectAllNodes);
  const clearSelection = useWorkflowStore((state) => state.clearSelection);
  const saveNow = useWorkflowStore((state) => state.saveNow);
  const undo = useWorkflowStore((state) => state.undo);
  const redo = useWorkflowStore((state) => state.redo);
  const duplicateSelectedNodes = useWorkflowStore((state) => state.duplicateSelectedNodes);
  const { fitView } = useReactFlow();

  useEffect(() => {
    let isSpacePressed = false;

    const handleKeyDown = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null;
      const isInput =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.getAttribute("contenteditable") === "true";

      if (isInput && event.key !== "Escape") return;

      if ((event.key === "Delete" || event.key === "Backspace") && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        removeSelectedNodes();
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveNow();
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
        event.preventDefault();
        selectAllNodes();
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      }

      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        redo();
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateSelectedNodes();
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        void fitView({ padding: 0.18 });
      }

      if (event.key === " ") {
        isSpacePressed = true;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        clearSelection();
        isSpacePressed = false;
      }
    };

    const handleKeyUp = (event: KeyboardEvent): void => {
      if (event.key === " ") {
        isSpacePressed = false;
      }
    };

    // We'll store this in a way that canvas can detect it
    (window as any).__isSpacePressed = () => isSpacePressed;

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [clearSelection, redo, removeSelectedNodes, saveNow, selectAllNodes, undo, duplicateSelectedNodes, fitView]);
}
