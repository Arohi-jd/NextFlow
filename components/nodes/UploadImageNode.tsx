"use client";

import { useRef } from "react";
import { Handle, Position } from "@xyflow/react";
import { Image as ImageIcon, ImagePlus, Upload } from "lucide-react";
import BaseNode from "./BaseNode";
import { useWorkflowStore } from "@/lib/store/workflowStore";

interface UploadImageNodeProps {
  id: string;
  data: {
    imageUrl?: string;
    fileName?: string;
    fileSize?: number;
    error?: string;
    isUploading?: boolean;
  };
  selected?: boolean;
}

export default function UploadImageNode({ id, data, selected = false }: UploadImageNodeProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const removeNode = useWorkflowStore((state) => state.removeNode);
  const isRunning = useWorkflowStore((state) => state.runningNodes.has(id));
  const handleStyle = {
    width: 12,
    height: 12,
    background: "#1e7bf0",
    border: "2px solid #1e7bf0",
    boxShadow: "0 0 0 2px rgba(30,123,240,0.18)"
  } as const;

  const handleFileSelect = async (file: File): Promise<void> => {
    updateNodeData(id, {
      isUploading: true,
      error: undefined
    });

    try {
      const body = new FormData();
      body.set("file", file);
      body.set("mediaType", "image");

      const response = await fetch("/api/uploads/transloadit", {
        method: "POST",
        body
      });

      if (!response.ok) {
        const details = await response.json().catch(() => ({ error: "Image upload failed" }));
        throw new Error(typeof details.error === "string" ? details.error : "Image upload failed");
      }

      const payload = (await response.json()) as { url: string; fileName: string; fileSize: number };

      updateNodeData(id, {
        imageUrl: payload.url,
        fileName: payload.fileName,
        fileSize: payload.fileSize,
        isUploading: false,
        error: undefined
      });
    } catch (error) {
      updateNodeData(id, {
        isUploading: false,
        error: error instanceof Error ? error.message : "Image upload failed"
      });
    }
  };

  return (
    <BaseNode
      id={id}
      title="Image"
      icon={ImageIcon}
      color="#1e7bf0"
      isSelected={selected}
      isRunning={isRunning}
      error={data.error}
      onDeleteAction={removeNode}
      minWidthClassName="min-w-[184px]"
      contentClassName="px-3.5 py-3.5"
      hideDelete
    >
      <div className="space-y-2.5">
        {data.imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.imageUrl} alt="Uploaded preview" className="h-24 w-full rounded-[10px] object-cover" />
            <div className="text-[10px] text-[var(--text-muted)]">
              {data.fileName} {data.fileSize ? `• ${(data.fileSize / 1024).toFixed(1)} KB` : ""}
            </div>
            <button
              type="button"
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                updateNodeData(id, { imageUrl: "", fileName: "", fileSize: 0 });
              }}
              className="text-[10px] font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            >
              Replace image
            </button>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={Boolean(data.isUploading)}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                fileInputRef.current?.click();
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const file = event.dataTransfer.files?.[0];
                if (file?.type.startsWith("image/")) void handleFileSelect(file);
              }}
              className="flex h-[92px] flex-col items-center justify-center gap-2 rounded-[10px] bg-black/14 text-center transition hover:bg-black/18 disabled:cursor-wait disabled:opacity-60"
            >
              <Upload className="h-4 w-4 text-[var(--text-muted)]" strokeWidth={1.8} />
              <span className="text-[11px] text-[var(--text-secondary)]">{data.isUploading ? "Uploading..." : "Upload"}</span>
            </button>

            <button
              type="button"
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="flex h-[92px] flex-col items-center justify-center gap-2 rounded-[10px] bg-black/14 text-center transition hover:bg-black/18"
            >
              <ImagePlus className="h-4 w-4 text-[var(--text-muted)]" strokeWidth={1.8} />
              <span className="text-[11px] text-[var(--text-secondary)]">Select asset</span>
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFileSelect(file);
          }}
        />
      </div>

      <Handle
        type="target"
        position={Position.Left}
        id={`${id}-target-image_url`}
        style={{ ...handleStyle, top: "50%", left: -7 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id={`${id}-source-image_url`}
        style={{ ...handleStyle, top: "50%", right: -7 }}
      />
    </BaseNode>
  );
}
