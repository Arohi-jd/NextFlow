"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Handle, Position } from "@xyflow/react";
import { Bot, Loader2 } from "lucide-react";
import BaseNode from "./BaseNode";
import { useWorkflowStore } from "@/lib/store/workflowStore";

interface LLMNodeProps {
  id: string;
  data: {
    model?: string;
    output?: string;
    error?: string;
    status?: "pending" | "running" | "success" | "failed";
  };
  selected?: boolean;
}

export default function LLMNode({ id, data, selected = false }: LLMNodeProps) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const removeNode = useWorkflowStore((state) => state.removeNode);
  const executeWorkflow = useWorkflowStore((state) => state.executeWorkflow);
  const isRunning = useWorkflowStore((state) => state.runningNodes.has(id));
  
  const handleStyle = {
    width: 10,
    height: 10,
    border: "2px solid rgba(10,10,10,0.95)"
  } as const;

  const handleRunNode = async () => {
    const edges = useWorkflowStore.getState().edges;
    const nodes = useWorkflowStore.getState().nodes;
    
    // Check if user_message is connected or has a value
    const userMessageConnected = edges.some(
      (edge) => edge.target === id && edge.targetHandle?.includes("user_message")
    );
    
    if (!userMessageConnected) {
      updateNodeData(id, { error: "user_message is required to run this node" });
      setTimeout(() => updateNodeData(id, { error: undefined }), 3000);
      return;
    }

    // Store current selection and run only this node
    const currentSelection = useWorkflowStore.getState().selectedNodes;
    useWorkflowStore.getState().clearSelection();
    
    // Select only this node for execution
    useWorkflowStore.setState({ selectedNodes: [id] });
    
    try {
      await executeWorkflow("Single");
    } catch (error) {
      console.error("Failed to run node:", error);
    } finally {
      // Restore previous selection
      if (currentSelection.length > 0) {
        useWorkflowStore.setState({ selectedNodes: currentSelection });
      }
    }
  };

  return (
    <BaseNode
      id={id}
      title="Run LLM"
      icon={Bot}
      color="#22c55e"
      isSelected={selected}
      isRunning={isRunning}
      error={data.error}
      onDeleteAction={removeNode}
      minWidthClassName="min-w-[340px] max-w-[340px]"
      contentClassName="px-4 py-4"
    >
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-[var(--text-muted)]">Model</label>
          <select
            value={data.model ?? "llama-3.3-70b-versatile"}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
            onChange={(event) =>
              updateNodeData(id, {
                model: event.target.value as "gemini-2.0-flash" | "llama-3.3-70b-versatile" | "llama-3.1-8b-instant" | "meta-llama/llama-4-scout-17b-16e-instruct"
              })
            }
            className="w-full rounded-md border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-2 text-xs text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-purple)]"
          >
            <optgroup label="Groq (fast)">
              <option value="llama-3.3-70b-versatile">Llama 3.3 70B</option>
              <option value="llama-3.1-8b-instant">Llama 3.1 8B (fastest)</option>
              <option value="meta-llama/llama-4-scout-17b-16e-instruct">Llama 4 Scout (vision)</option>
            </optgroup>
            <optgroup label="Google Gemini">
              <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
            </optgroup>
          </select>
        </div>

        <button
          type="button"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            void handleRunNode();
          }}
          disabled={isRunning}
          className="w-full rounded-md bg-[var(--accent-green)] px-2 py-2 text-xs font-medium text-white transition hover:bg-[#1ea84f] disabled:cursor-wait disabled:opacity-60"
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-1.5 inline-block h-3 w-3 animate-spin" />
              Running...
            </>
          ) : (
            "Run Node"
          )}
        </button>

        <AnimatePresence>
          {data.output && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-2 text-xs text-[var(--text-primary)]"
            >
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">Result</div>
              <div className="max-h-40 max-w-full overflow-x-hidden overflow-y-auto whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                {data.output}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input handles */}
      <Handle 
        type="target" 
        position={Position.Left} 
        id={`${id}-target-system_prompt`}
        style={{ ...handleStyle, top: "30%", background: "#3b82f6" }}
      />
      <div
        className="absolute left-[-72px] top-[30%] -translate-y-1/2 text-[10px] text-[var(--text-muted)] whitespace-nowrap"
        style={{ pointerEvents: "none" }}
      >
        system_prompt
      </div>

      <Handle 
        type="target" 
        position={Position.Left} 
        id={`${id}-target-user_message`}
        style={{ ...handleStyle, top: "45%", background: "#22c55e" }}
      />
      <div
        className="absolute left-[-72px] top-[45%] -translate-y-1/2 text-[10px] text-[var(--text-muted)] whitespace-nowrap"
        style={{ pointerEvents: "none" }}
      >
        user_message *
      </div>

      <Handle 
        type="target" 
        position={Position.Left} 
        id={`${id}-target-images`}
        style={{ ...handleStyle, top: "60%", background: "#8b5cf6" }}
      />
      <div
        className="absolute left-[-72px] top-[60%] -translate-y-1/2 text-[10px] text-[var(--text-muted)] whitespace-nowrap"
        style={{ pointerEvents: "none" }}
      >
        images
      </div>

      {/* Output handle */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id={`${id}-source-output`}
        style={{ ...handleStyle, top: "50%", background: "#22c55e" }}
      />
      <div
        className="absolute right-[-26px] top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] whitespace-nowrap"
        style={{ pointerEvents: "none" }}
      >
        output
      </div>
    </BaseNode>
  );
}
