"use client";

import { useRef } from "react";
import { Handle, Position } from "@xyflow/react";
import { Film, Upload, Video as VideoIcon } from "lucide-react";
import BaseNode from "./BaseNode";
import { useWorkflowStore } from "@/lib/store/workflowStore";

const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "webm", "avi", "mkv", "m4v", "ogv", "3gp"]);

function isVideoFile(file: File): boolean {
  if (file.type.startsWith("video/")) return true;
  const extension = file.name.split(".").pop()?.toLowerCase();
  return Boolean(extension && VIDEO_EXTENSIONS.has(extension));
}

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
  const handleStyle = {
    width: 12,
    height: 12,
    background: "#30d158",
    border: "2px solid #30d158",
    boxShadow: "0 0 0 2px rgba(48,209,88,0.18)"
  } as const;

  const handleFileSelect = async (file: File): Promise<void> => {
    if (!isVideoFile(file)) {
      updateNodeData(id, {
        isUploading: false,
        error: "Please select a valid video file (mp4, mov, webm, avi, mkv, m4v, ogv, 3gp)."
      });
      return;
    }

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
      title="Video"
      icon={VideoIcon}
      color="#30d158"
      isSelected={selected}
      isRunning={isRunning}
      error={data.error}
      onDeleteAction={removeNode}
      minWidthClassName="min-w-[184px]"
      contentClassName="px-3.5 py-3.5"
      hideDelete
    >
      <div className="space-y-2.5">
        {data.videoUrl ? (
          <>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video src={data.videoUrl} controls className="h-24 w-full rounded-[10px] bg-black object-cover" />
            <div className="text-[10px] text-[var(--text-muted)]">
              {data.fileName} {data.fileSize ? `• ${(data.fileSize / 1024 / 1024).toFixed(2)} MB` : ""}
            </div>
            <button
              type="button"
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                updateNodeData(id, { videoUrl: "", fileName: "", fileSize: 0 });
              }}
              className="text-[10px] font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            >
              Replace video
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
                if (file) void handleFileSelect(file);
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
              <Film className="h-4 w-4 text-[var(--text-muted)]" strokeWidth={1.8} />
              <span className="text-[11px] text-[var(--text-secondary)]">Select asset</span>
            </button>
          </div>
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
        type="target"
        position={Position.Left}
        id={`${id}-target-video_url`}
        style={{ ...handleStyle, top: "50%", left: -7 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id={`${id}-source-video_url`}
        style={{ ...handleStyle, top: "50%", right: -7 }}
      />
    </BaseNode>
  );
}
