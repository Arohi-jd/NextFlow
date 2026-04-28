"use client";

import { Handle, Position } from "@xyflow/react";
import { Copy, Pencil, Type } from "lucide-react";
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
  const handleStyle = {
    width: 12,
    height: 12,
    background: "#facc15",
    border: "2px solid #facc15",
    boxShadow: "0 0 0 2px rgba(250,204,21,0.18)"
  } as const;

  return (
    <BaseNode
      id={id}
      title="Text"
      icon={Type}
      color="#facc15"
      isSelected={selected}
      isRunning={isRunning}
      error={data.error}
      onDeleteAction={removeNode}
      minWidthClassName="min-w-[186px]"
      contentClassName="px-3 pb-3 pt-2.5"
      hideDelete
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-medium text-[var(--text-secondary)]">
          <span>Input</span>
          <span>Output</span>
        </div>

        <div className="flex items-center justify-between px-0.5 text-[var(--text-muted)]">
          <Pencil className="h-3 w-3" strokeWidth={1.8} />
          <Copy className="h-3 w-3" strokeWidth={1.8} />
        </div>

        <textarea
          value={textContent}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onChange={(event) => updateNodeData(id, { text: event.target.value, output: event.target.value })}
          placeholder="Write something..."
          className="min-h-[88px] w-full resize-none rounded-[8px] border border-white/5 bg-black/18 p-2.5 text-[11px] text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-white/10"
        />
      </div>

      <Handle
        type="target"
        position={Position.Left}
        id={`${id}-target-text`}
        style={{ ...handleStyle, top: 4, left: -7 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id={`${id}-source-output`}
        style={{ ...handleStyle, top: 4, right: -7 }}
      />
    </BaseNode>
  );
}
