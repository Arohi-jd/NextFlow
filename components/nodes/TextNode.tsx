"use client";

import { Handle, Position } from "@xyflow/react";
import { Type } from "lucide-react";
import BaseNode from "./BaseNode";
import { useWorkflowStore } from "@/lib/store/workflowStore";

interface TextNodeProps {
  id: string;
  data: {
    text?: string;
    output?: string;
    error?: string;
    status?: "pending" | "running" | "success" | "failed";
  };
  selected?: boolean;
}

export default function TextNode({ id, data, selected = false }: TextNodeProps) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const removeNode = useWorkflowStore((state) => state.removeNode);
  const isRunning = useWorkflowStore((state) => state.runningNodes.has(id));

  const textContent = data.text ?? "";
  const charCount = textContent.length;

  return (
    <BaseNode
      id={id}
      title="Text"
      icon={Type}
      color="#3b82f6"
      isSelected={selected}
      isRunning={isRunning}
      error={data.error}
      onDeleteAction={removeNode}
    >
      <div className="space-y-2">
        <textarea
          value={textContent}
          onChange={(event) => updateNodeData(id, { text: event.target.value, output: event.target.value })}
          placeholder="Enter your text..."
          className="min-h-20 w-full resize-none rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-2 text-xs text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-purple)]"
        />
        <div className="flex items-center justify-between">
          <div className="text-right flex-1 text-xs text-[var(--text-muted)]">
            {charCount} char{charCount !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <Handle 
        type="source" 
        position={Position.Right} 
        id={`${id}-source-output`}
        style={{ background: "#3b82f6", top: "50%" }}
      />
      <div
        className="absolute right-[-24px] top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] whitespace-nowrap"
        style={{ pointerEvents: "none" }}
      >
        output
      </div>
    </BaseNode>
  );
}
