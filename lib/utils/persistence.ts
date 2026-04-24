import { Prisma } from "@prisma/client";
import type { Edge, Node } from "@xyflow/react";
import type { NodeData } from "@/lib/types";

const DATA_URL_PREFIX = "data:";
const MAX_TEXT_PREVIEW_LENGTH = 280;

function isDataUrl(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(DATA_URL_PREFIX);
}

function truncatePreview(value: string): string {
  return value.length > MAX_TEXT_PREVIEW_LENGTH ? `${value.slice(0, MAX_TEXT_PREVIEW_LENGTH)}...` : value;
}

function sanitizeUrlValue(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;
  if (isDataUrl(value)) return undefined;
  return value;
}

export function sanitizeNodeDataForPersistence(data: NodeData): NodeData {
  const sanitizedImages = Array.isArray(data.images) ? data.images.filter((value) => !isDataUrl(value)) : undefined;

  return {
    ...data,
    imageUrl: sanitizeUrlValue(data.imageUrl),
    videoUrl: sanitizeUrlValue(data.videoUrl),
    outputUrl: sanitizeUrlValue(data.outputUrl),
    images: sanitizedImages,
    output: typeof data.output === "string" ? truncatePreview(data.output) : data.output,
    hasUploadedImage: Boolean(data.imageUrl),
    hasUploadedVideo: Boolean(data.videoUrl)
  };
}

export function sanitizeNodesForTransport(nodes: Node<NodeData>[]): Node<NodeData>[] {
  return nodes.map((node) => ({
    ...node,
    selected: false,
    dragging: false,
    data: sanitizeNodeDataForPersistence(node.data)
  }));
}

export function sanitizeNodesForPersistence(nodes: Node<NodeData>[]): Prisma.InputJsonValue {
  return sanitizeNodesForTransport(nodes) as unknown as Prisma.InputJsonValue;
}

export function sanitizeEdgesForPersistence(edges: Edge[]): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(edges)) as Prisma.InputJsonValue;
}

export function sanitizeExecutionPayload(value: unknown): Prisma.InputJsonValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Prisma.InputJsonValue;
  }

  const record = value as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};

  for (const [key, raw] of Object.entries(record)) {
    if (Array.isArray(raw)) {
      const filtered = raw.filter((entry) => !isDataUrl(entry));
      if (filtered.length > 0) sanitized[key] = filtered;
      continue;
    }

    if (isDataUrl(raw)) {
      continue;
    }

    if (typeof raw === "string" && key === "output") {
      sanitized[key] = truncatePreview(raw);
      continue;
    }

    sanitized[key] = raw;
  }

  return sanitized as Prisma.InputJsonValue;
}
