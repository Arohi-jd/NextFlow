import type { XYPosition } from "@xyflow/react";

export enum NodeType {
  TEXT = "TEXT",
  UPLOAD_IMAGE = "UPLOAD_IMAGE",
  UPLOAD_VIDEO = "UPLOAD_VIDEO",
  LLM = "LLM",
  CROP_IMAGE = "CROP_IMAGE",
  EXTRACT_FRAME = "EXTRACT_FRAME"
}

export type FlowNodeType = "text" | "upload-image" | "upload-video" | "llm" | "crop-image" | "extract-frame";

export type HandleKind = "text" | "image_url" | "video_url";

export type RunStatus = "success" | "failed" | "running" | "partial" | "pending";
export type RunScope = "Full" | "Single" | "Selected";

export interface NodeData {
  [key: string]: unknown;
  label: string;
  type: FlowNodeType;
  nodeType: NodeType;
  text?: string;
  systemPrompt?: string;
  userMessage?: string;
  images?: string[];
  model?: "gemini-2.0-flash" | "llama-3.3-70b-versatile" | "llama-3.1-8b-instant" | "meta-llama/llama-4-scout-17b-16e-instruct";
  imageUrl?: string;
  videoUrl?: string;
  output?: string;
  outputUrl?: string;
  error?: string;
  status?: RunStatus;
  timestamp?: string;
  xPercent?: number;
  yPercent?: number;
  widthPercent?: number;
  heightPercent?: number;
  progress?: number;
  fileName?: string;
  fileSize?: number;
  isUploading?: boolean;
  position?: XYPosition;
}

export interface NodeExecution {
  id: string;
  nodeId: string;
  nodeName: string;
  nodeType: NodeType;
  status: RunStatus;
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  executionTime: number;
  error?: string;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  runNumber: number;
  scope: RunScope;
  status: RunStatus;
  startedAt: string;
  completedAt?: string;
  durationSeconds: number;
  executions: NodeExecution[];
}

export const CONNECTION_VALIDATION_MAP: Record<HandleKind, HandleKind[]> = {
  text: ["text"],
  image_url: ["image_url"],
  video_url: ["video_url", "image_url"]
};
