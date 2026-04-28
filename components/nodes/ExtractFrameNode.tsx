"use client";

import { Handle, Position } from "@xyflow/react";
import { Film, Loader2 } from "lucide-react";
import BaseNode from "./BaseNode";
import { useWorkflowStore } from "@/lib/store/workflowStore";

interface ExtractFrameNodeProps {
  id: string;
  data: {
    timestamp?: string;
    output?: string;
    outputUrl?: string;
    error?: string;
    status?: "pending" | "running" | "success" | "failed";
  };
  selected?: boolean;
}

export default function ExtractFrameNode({ id, data, selected = false }: ExtractFrameNodeProps) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const removeNode = useWorkflowStore((state) => state.removeNode);
  const edges = useWorkflowStore((state) => state.edges);
  const executeWorkflow = useWorkflowStore((state) => state.executeWorkflow);
  const isRunning = useWorkflowStore((state) => state.runningNodes.has(id));

  const hasConnectedVideoInput = edges.some((edge) => edge.target === id && edge.targetHandle?.includes("video_url"));
  const hasConnectedTimestamp = edges.some((edge) => edge.target === id && edge.targetHandle?.includes("timestamp"));

  const handleRunNode = async () => {
    if (!hasConnectedVideoInput) {
      updateNodeData(id, { error: "Connect a video node to video_url input" });
      setTimeout(() => updateNodeData(id, { error: undefined }), 3000);
      return;
    }

    const currentSelection = useWorkflowStore.getState().selectedNodes;
    useWorkflowStore.getState().clearSelection();
    useWorkflowStore.setState({ selectedNodes: [id] });
    
    try {
      await executeWorkflow("Single");
    } catch (error) {
      console.error("Failed to run node:", error);
    } finally {
      if (currentSelection.length > 0) {
        useWorkflowStore.setState({ selectedNodes: currentSelection });
      }
    }
  };

  return (
    <BaseNode
      id={id}
      title="Extract Frame"
      icon={Film}
      color="#06b6d4"
      isSelected={selected}
      isRunning={isRunning}
      error={data.error}
      onDeleteAction={removeNode}
    >
      <div className="space-y-2">
        {!hasConnectedVideoInput && (
          <div className="rounded-md border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1.5 text-xs text-[var(--text-muted)]">
            Connect a video node to video_url input
          </div>
        )}

        <label className="block text-xs font-medium text-[var(--text-muted)]">
          Timestamp
          <input
            type="text"
            value={data.timestamp ?? "0"}
            disabled={hasConnectedTimestamp}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
            onChange={(event) => updateNodeData(id, { timestamp: event.target.value })}
            className="mt-1 w-full rounded-md border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-2 text-xs text-[var(--text-primary)] outline-none transition disabled:opacity-40 focus:border-[var(--accent-purple)]"
            placeholder="0 (seconds) or 50% (percentage)"
          />
        </label>

        <div className="text-[11px] text-[var(--text-muted)]">Seconds or percentage of video</div>

        {hasConnectedTimestamp && <span className="text-[10px] text-[var(--text-muted)]">From node</span>}

        {hasConnectedVideoInput && (
          <button
            type="button"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              void handleRunNode();
            }}
            disabled={isRunning}
            className="w-full rounded-md bg-[#06b6d4] px-2 py-2 text-xs font-medium text-black transition hover:bg-[#06d9f5] disabled:cursor-wait disabled:opacity-60"
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
        )}

        {data.outputUrl && (
          <div className="space-y-2 rounded-md border border-cyan-500/25 bg-cyan-500/10 px-2 py-2 text-[11px] text-[var(--text-primary)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.outputUrl} alt="Extracted video frame" className="h-28 w-full rounded object-cover" />
            <div>Frame extracted successfully</div>
          </div>
        )}
      </div>

      {/* Input handles */}
      <Handle 
        type="target" 
        position={Position.Left} 
        id={`${id}-target-video_url`}
        style={{ top: "30%", background: "#ec4899", width: 10, height: 10 }}
      />
      <div
        className="absolute left-[-64px] top-[30%] -translate-y-1/2 text-xs text-[var(--text-muted)] whitespace-nowrap"
        style={{ pointerEvents: "none" }}
      >
        video_url
      </div>

      <Handle 
        type="target" 
        position={Position.Left} 
        id={`${id}-target-timestamp`}
        style={{ top: "55%", background: "#06b6d4", width: 10, height: 10 }}
      />
      <div
        className="absolute left-[-60px] top-[55%] -translate-y-1/2 text-xs text-[var(--text-muted)] whitespace-nowrap"
        style={{ pointerEvents: "none" }}
      >
        timestamp
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id={`${id}-source-image_url`}
        style={{ top: "50%", background: "#06b6d4", width: 10, height: 10 }}
      />
      <div
        className="absolute right-[-26px] top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] whitespace-nowrap"
        style={{ pointerEvents: "none" }}
      >
        image_url
      </div>
    </BaseNode>
  );
}
