"use client";

import { useEffect, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { Crop, Loader2 } from "lucide-react";
import BaseNode from "./BaseNode";
import { useWorkflowStore } from "@/lib/store/workflowStore";

interface CropImageNodeProps {
  id: string;
  data: {
    xPercent?: number;
    yPercent?: number;
    widthPercent?: number;
    heightPercent?: number;
    outputUrl?: string;
    output?: string;
    error?: string;
    status?: "pending" | "running" | "success" | "failed";
  };
  selected?: boolean;
}

export default function CropImageNode({ id, data, selected = false }: CropImageNodeProps) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const removeNode = useWorkflowStore((state) => state.removeNode);
  const edges = useWorkflowStore((state) => state.edges);
  const executeWorkflow = useWorkflowStore((state) => state.executeWorkflow);
  const isRunning = useWorkflowStore((state) => state.runningNodes.has(id));

  const [draftValues, setDraftValues] = useState<{
    xPercent: string;
    yPercent: string;
    widthPercent: string;
    heightPercent: string;
  }>({
    xPercent: String(data.xPercent ?? 0),
    yPercent: String(data.yPercent ?? 0),
    widthPercent: String(data.widthPercent ?? 100),
    heightPercent: String(data.heightPercent ?? 100)
  });

  useEffect(() => {
    setDraftValues({
      xPercent: String(data.xPercent ?? 0),
      yPercent: String(data.yPercent ?? 0),
      widthPercent: String(data.widthPercent ?? 100),
      heightPercent: String(data.heightPercent ?? 100)
    });
  }, [data.xPercent, data.yPercent, data.widthPercent, data.heightPercent]);

  const hasConnectedImageInput = edges.some((edge) => edge.target === id && edge.targetHandle?.includes("image_url"));
  const hasConnectedParamInput = (paramName: string) =>
    edges.some((edge) => edge.target === id && edge.targetHandle?.includes(paramName));

  const commitDraftValue = (key: "xPercent" | "yPercent" | "widthPercent" | "heightPercent") => {
    const fallback = key === "xPercent" || key === "yPercent" ? 0 : 100;
    const raw = draftValues[key].trim();

    if (raw.length === 0) {
      setDraftValues((current) => ({ ...current, [key]: String((data[key] as number | undefined) ?? fallback) }));
      return;
    }

    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      setDraftValues((current) => ({ ...current, [key]: String((data[key] as number | undefined) ?? fallback) }));
      return;
    }

    const clamped = Math.max(0, Math.min(100, parsed));
    setDraftValues((current) => ({ ...current, [key]: String(clamped) }));
    updateNodeData(id, { [key]: clamped });
  };

  const renderInput = (label: string, key: "xPercent" | "yPercent" | "widthPercent" | "heightPercent", paramHandle: string) => {
    const isLocked = hasConnectedParamInput(paramHandle);
    return (
      <label className="flex items-center justify-between gap-3 text-xs text-[var(--text-primary)]">
        <span className="font-medium text-[var(--text-muted)]">{label}</span>
        <div className="flex items-center gap-1">
          <input
            type="text"
            inputMode="decimal"
            value={draftValues[key]}
            disabled={isLocked}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === "Enter") {
                event.preventDefault();
                commitDraftValue(key);
              }
              if (event.key === "Escape") {
                event.preventDefault();
                const fallback = key === "xPercent" || key === "yPercent" ? 0 : 100;
                setDraftValues((current) => ({ ...current, [key]: String((data[key] as number | undefined) ?? fallback) }));
              }
            }}
            onBlur={() => commitDraftValue(key)}
            onChange={(event) => {
              const next = event.target.value;
              if (/^\d{0,3}(\.\d{0,2})?$/.test(next)) {
                setDraftValues((current) => ({ ...current, [key]: next }));
              }
            }}
            className="h-8 w-16 rounded-md border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 text-right outline-none transition disabled:opacity-40 focus:border-[var(--accent-purple)]"
          />
          <span className="text-[var(--text-muted)]">%</span>
          {isLocked && <span className="text-[10px] text-[var(--text-muted)]">From node</span>}
        </div>
      </label>
    );
  };

  const handleRunNode = async () => {
    if (!hasConnectedImageInput) {
      updateNodeData(id, { error: "Connect an image node to image_url input" });
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
      useWorkflowStore.getState().clearSelection();
      if (currentSelection.length > 0) {
        useWorkflowStore.setState({ selectedNodes: currentSelection });
      }
    }
  };

  return (
    <BaseNode
      id={id}
      title="Crop Image"
      icon={Crop}
      color="#f59e0b"
      isSelected={selected}
      isRunning={isRunning}
      error={data.error}
      onDeleteAction={removeNode}
    >
      <div className="space-y-2">
        {!hasConnectedImageInput && (
          <div className="rounded-md border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1.5 text-xs text-[var(--text-muted)]">
            Connect an image node to image_url input
          </div>
        )}

        {renderInput("x%", "xPercent", "x_percent")}
        {renderInput("y%", "yPercent", "y_percent")}
        {renderInput("width%", "widthPercent", "width_percent")}
        {renderInput("height%", "heightPercent", "height_percent")}

        {hasConnectedImageInput && (
          <button
            type="button"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              void handleRunNode();
            }}
            disabled={isRunning}
            className="w-full rounded-md bg-[#f59e0b] px-2 py-2 text-xs font-medium text-black transition hover:bg-[#f5b922] disabled:cursor-wait disabled:opacity-60"
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
          <div className="space-y-2 rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-2 text-[11px] text-[var(--text-primary)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.outputUrl} alt="Cropped output preview" className="h-28 w-full rounded object-cover" />
            <div>Cropped output ready</div>
          </div>
        )}
      </div>

      {/* Input handle */}
      <Handle 
        type="target" 
        position={Position.Left} 
        id={`${id}-target-image_url`}
        style={{ background: "#8b5cf6", top: "20%", width: 10, height: 10 }}
      />
      <div
        className="absolute left-[-70px] top-[20%] -translate-y-1/2 text-xs text-[var(--text-muted)] whitespace-nowrap"
        style={{ pointerEvents: "none" }}
      >
        image_url
      </div>

      {/* Parameter input handles (not visible in render but available for connections) */}
      <Handle 
        type="target" 
        position={Position.Left} 
        id={`${id}-target-x_percent`}
        style={{ background: "#9ca3af", top: "40%", width: 8, height: 8 }}
      />
      <Handle 
        type="target" 
        position={Position.Left} 
        id={`${id}-target-y_percent`}
        style={{ background: "#9ca3af", top: "52%", width: 8, height: 8 }}
      />
      <Handle 
        type="target" 
        position={Position.Left} 
        id={`${id}-target-width_percent`}
        style={{ background: "#9ca3af", top: "64%", width: 8, height: 8 }}
      />
      <Handle 
        type="target" 
        position={Position.Left} 
        id={`${id}-target-height_percent`}
        style={{ background: "#9ca3af", top: "76%", width: 8, height: 8 }}
      />

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id={`${id}-source-image_url`}
        style={{ background: "#f59e0b", top: "50%", width: 10, height: 10 }}
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
