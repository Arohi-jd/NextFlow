"use client";

import { useRef } from "react";
import { Handle, Position } from "@xyflow/react";
import { UploadCloud, Video as VideoIcon } from "lucide-react";
import BaseNode from "./BaseNode";
import { useWorkflowStore } from "@/lib/store/workflowStore";

interface UploadVideoNodeProps {
  id: string;
  data: {
    videoUrl?: string;
    fileName?: string;
    fileSize?: number;
    error?: string;
    isUploading?: boolean;
  };
  selected?: boolean;
}

export default function UploadVideoNode({ id, data, selected = false }: UploadVideoNodeProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const removeNode = useWorkflowStore((state) => state.removeNode);
  const isRunning = useWorkflowStore((state) => state.runningNodes.has(id));

  const handleFileSelect = async (file: File): Promise<void> => {
    updateNodeData(id, {
      isUploading: true,
      error: undefined
    });

    try {
      const body = new FormData();
      body.set("file", file);
      body.set("mediaType", "video");

      const response = await fetch("/api/uploads/transloadit", {
        method: "POST",
        body
      });

      if (!response.ok) {
        const details = await response.json().catch(() => ({ error: "Video upload failed" }));
        throw new Error(typeof details.error === "string" ? details.error : "Video upload failed");
      }

      const payload = (await response.json()) as { url: string; fileName: string; fileSize: number };

      updateNodeData(id, {
        videoUrl: payload.url,
        fileName: payload.fileName,
        fileSize: payload.fileSize,
        isUploading: false,
        error: undefined
      });
    } catch (error) {
      updateNodeData(id, {
        isUploading: false,
        error: error instanceof Error ? error.message : "Video upload failed"
      });
    }
  };

  return (
    <BaseNode
      id={id}
      title="Upload Video"
      icon={VideoIcon}
      color="#ec4899"
      isSelected={selected}
      isRunning={isRunning}
      error={data.error}
      onDeleteAction={removeNode}
    >
      <div className="space-y-2">
        {data.videoUrl ? (
          <>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video src={data.videoUrl} controls className="h-32 w-full rounded-lg bg-black object-cover" />
            <div className="text-xs text-[var(--text-muted)]">
              {data.fileName} {data.fileSize ? `• ${(data.fileSize / 1024 / 1024).toFixed(2)} MB` : ""}
            </div>
            <button
              type="button"
              onClick={() => updateNodeData(id, { videoUrl: "", fileName: "", fileSize: 0 })}
              className="text-xs font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            >
              Replace video
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={Boolean(data.isUploading)}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const file = event.dataTransfer.files?.[0];
              if (file?.type.startsWith("video/")) void handleFileSelect(file);
            }}
            className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-[var(--border-hover)] bg-[var(--bg-tertiary)] px-4 py-6 text-center transition hover:border-[#ec4899] hover:bg-[#2d1322] disabled:cursor-wait disabled:opacity-60"
          >
            <UploadCloud className="h-5 w-5 text-[var(--text-muted)]" />
            <span className="text-xs text-[var(--text-primary)]">{data.isUploading ? "Uploading..." : "Upload video"}</span>
            <span className="text-[11px] text-[var(--text-muted)]">MP4, MOV, WebM</span>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFileSelect(file);
          }}
        />
      </div>

      <Handle 
        type="source" 
        position={Position.Right} 
        id={`${id}-source-video_url`}
        style={{ background: "#ec4899", top: "50%" }}
      />
      <div
        className="absolute right-[-26px] top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] whitespace-nowrap"
        style={{ pointerEvents: "none" }}
      >
        video_url
      </div>
    </BaseNode>
  );
}
