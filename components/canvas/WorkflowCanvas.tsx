"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import {
  Background,
  BackgroundVariant,
  Panel,
  ReactFlow,
  useReactFlow,
  type Connection,
  type XYPosition
} from "@xyflow/react";
import { useRouter } from "next/navigation";
import "@xyflow/react/dist/style.css";
import {
  Clock3,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Diamond,
  Hand,
  Image as ImageIcon,
  ImagePlus,
  Moon,
  MousePointer2,
  Plus,
  Search,
  Scissors,
  Sparkles,
  SunMedium,
  Type,
  Undo2,
  Redo2,
  Share2,
  Users,
  Hammer,
  Download,
  Upload,
  Video,
  Workflow,
  X
} from "lucide-react";
import { KreaExpandedSidebar } from "@/components/krea/KreaSidebar";
import { nodeTypes } from "@/components/nodes/nodeTypes";
import { SaveIndicator } from "@/components/workflow/SaveIndicator";
import { useKeyboardShortcuts } from "@/lib/hooks/useKeyboardShortcuts";
import { useWorkflowStore } from "@/lib/store/workflowStore";
import type { FlowNodeType, NodeData } from "@/lib/types";
import { normalizeConnection, showConnectionValidationError, validateConnection } from "@/lib/utils/connectionValidation";
import type { Node, Edge } from "@xyflow/react";

interface WorkflowCanvasProps {
  workflowId: string;
  workflowName: string;
  initialNodes: Node<NodeData>[];
  initialEdges: Edge[];
  initialRuns: import("@/lib/types").WorkflowRun[];
}

const DEFAULT_NODE_POSITION: XYPosition = { x: 280, y: 180 };
const NODE_MENU_ACTIONS: Array<{
  id: string;
  label: string;
  type: FlowNodeType;
  icon: typeof Type;
  keywords: string[];
  pro?: boolean;
  muted?: boolean;
  enabled?: boolean;
}> = [
  { id: "text", label: "Text", type: "text", icon: Type, keywords: ["text", "asset", "prompt"] },
  { id: "krea-1", label: "Krea 1", type: "llm", icon: Sparkles, keywords: ["krea", "llm", "generate", "image"] },
  { id: "nano-banana", label: "Nano Banana", type: "llm", icon: Sparkles, keywords: ["banana", "image", "generate"], pro: true, muted: true },
  { id: "nano-banana-pro", label: "Nano Banana Pro", type: "llm", icon: Sparkles, keywords: ["banana", "pro", "image"], pro: true, muted: true },
  { id: "chatgpt-2", label: "ChatGPT 2", type: "llm", icon: Sparkles, keywords: ["chatgpt", "image", "generate"], pro: true, muted: true },
  { id: "flux-2-klein", label: "Flux 2 Klein", type: "llm", icon: Sparkles, keywords: ["flux", "image", "generate"] },
  { id: "qwen-2512", label: "Qwen 2512", type: "llm", icon: Sparkles, keywords: ["qwen", "image", "generate"] },
  { id: "krea-enhance", label: "Krea Enhance", type: "crop-image", icon: ImagePlus, keywords: ["enhance", "image"] },
  { id: "upscale-v1", label: "Upscale V1", type: "crop-image", icon: ImagePlus, keywords: ["upscale", "enhance", "image"] },
  { id: "magnific", label: "Magnific", type: "crop-image", icon: ImagePlus, keywords: ["magnific", "enhance", "image"], pro: true, muted: true },
  { id: "topaz", label: "Topaz", type: "crop-image", icon: ImagePlus, keywords: ["topaz", "enhance", "image"], pro: true, muted: true },
  { id: "krea-legacy", label: "Krea Legacy", type: "crop-image", icon: ImagePlus, keywords: ["legacy", "enhance", "image"] },
  { id: "flux-inpaint", label: "Flux Inpaint", type: "crop-image", icon: Scissors, keywords: ["edit", "inpaint", "image"] },
  { id: "qwen-image-edit", label: "Qwen Image Edit", type: "crop-image", icon: Scissors, keywords: ["edit", "image", "qwen"] },
  { id: "flux-kontext", label: "Flux Kontext", type: "crop-image", icon: Scissors, keywords: ["edit", "image", "flux"] },
  { id: "blur-image", label: "Blur Image", type: "crop-image", icon: ImageIcon, keywords: ["image", "utility", "blur"], pro: true, muted: true },
  { id: "crop-image", label: "Crop Image", type: "crop-image", icon: ImageIcon, keywords: ["image", "utility", "crop"] },
  { id: "remove-background", label: "Remove Background", type: "crop-image", icon: ImageIcon, keywords: ["image", "utility", "background"], pro: true, muted: true },
  { id: "upload-image", label: "Image", type: "upload-image", icon: ImagePlus, keywords: ["asset", "upload", "image"] },
  { id: "krea-realtime", label: "Krea Realtime", type: "llm", icon: Video, keywords: ["video", "generate", "realtime"], pro: true, muted: true },
  { id: "hailuo-2-3", label: "Hailuo 2.3", type: "llm", icon: Video, keywords: ["video", "generate", "hailuo"], pro: true, muted: true },
  { id: "wan-2-1", label: "Wan 2.1", type: "llm", icon: Video, keywords: ["video", "generate", "wan"] },
  { id: "topaz-video", label: "Topaz Video", type: "extract-frame", icon: Workflow, keywords: ["video", "enhance", "topaz"], pro: true, muted: true },
  { id: "krea-video", label: "Krea Video", type: "extract-frame", icon: Workflow, keywords: ["video", "enhance", "krea"] },
  { id: "fabric", label: "Fabric", type: "extract-frame", icon: Workflow, keywords: ["video", "lipsync", "fabric"], pro: true, muted: true },
  { id: "get-video-frame", label: "Video Frame", type: "extract-frame", icon: Workflow, keywords: ["video", "utility", "frame"] },
  { id: "upload-video", label: "Video", type: "upload-video", icon: Video, keywords: ["asset", "upload", "video"] },
  { id: "generate-3d", label: "Hunyuan3D-2mini-Turbo", type: "llm", icon: Sparkles, keywords: ["3d", "generate", "object"], enabled: false, muted: true },
  { id: "audio", label: "ElevenLabs TTS", type: "text", icon: Type, keywords: ["audio", "tts"], enabled: false, muted: true },
  { id: "llm-call", label: "LLM Call", type: "llm", icon: Workflow, keywords: ["utility", "llm", "text"], pro: true, muted: true },
  { id: "text-overlay", label: "Text Overlay", type: "text", icon: Type, keywords: ["utility", "text", "overlay"] },
  { id: "style-asset", label: "Style", type: "text", icon: Type, keywords: ["asset", "style"], enabled: false, muted: true },
  { id: "number-asset", label: "Number", type: "text", icon: Type, keywords: ["asset", "number"], enabled: false, muted: true },
  { id: "object-3d-asset", label: "3D Object", type: "llm", icon: Sparkles, keywords: ["asset", "3d", "object"], enabled: false, muted: true },
  { id: "kling-element", label: "Kling Element", type: "upload-image", icon: ImagePlus, keywords: ["asset", "kling", "element"], enabled: false, muted: true }
];

const NODE_MENU_CATEGORIES: Array<{
  id: string;
  section: "Image" | "Video" | "Other";
  label: string;
  flyoutTitle: string;
  icon: typeof Type;
  items: string[];
}> = [
  { id: "generate-image", section: "Image", label: "Generate Image", flyoutTitle: "Generate image", icon: Sparkles, items: ["krea-1", "nano-banana", "nano-banana-pro", "chatgpt-2", "flux-2-klein", "qwen-2512"] },
  { id: "enhance-image", section: "Image", label: "Enhance Image", flyoutTitle: "Enhance image", icon: ImagePlus, items: ["krea-enhance", "upscale-v1", "magnific", "topaz", "krea-legacy"] },
  { id: "edit-image", section: "Image", label: "Edit Image", flyoutTitle: "Edit image", icon: Scissors, items: ["flux-inpaint", "nano-banana", "nano-banana-pro", "flux-2-klein", "qwen-image-edit", "flux-kontext"] },
  { id: "image-utility", section: "Image", label: "Image Utility", flyoutTitle: "Image Utility", icon: ImageIcon, items: ["blur-image", "crop-image", "remove-background"] },
  { id: "generate-video", section: "Video", label: "Generate Video", flyoutTitle: "Generate video", icon: Video, items: ["krea-realtime", "hailuo-2-3", "wan-2-1"] },
  { id: "enhance-video", section: "Video", label: "Enhance Video", flyoutTitle: "Enhance video", icon: Workflow, items: ["topaz-video", "krea-video"] },
  { id: "motion-transfer", section: "Video", label: "Motion Transfer", flyoutTitle: "Motion transfer", icon: Workflow, items: ["hailuo-2-3", "wan-2-1"] },
  { id: "lipsync", section: "Video", label: "Lipsync", flyoutTitle: "Lipsync", icon: Workflow, items: ["fabric"] },
  { id: "video-utility", section: "Video", label: "Video Utility", flyoutTitle: "Video Utility", icon: Workflow, items: ["get-video-frame", "upload-video"] },
  { id: "generate-3d", section: "Other", label: "Generate 3D", flyoutTitle: "Generate 3D", icon: Sparkles, items: ["generate-3d"] },
  { id: "audio", section: "Other", label: "Audio", flyoutTitle: "Audio", icon: Type, items: ["audio"] },
  { id: "assets", section: "Other", label: "Assets", flyoutTitle: "Assets", icon: Upload, items: ["text", "upload-image", "audio", "upload-video", "object-3d-asset", "style-asset", "kling-element", "number-asset"] },
  { id: "utility", section: "Other", label: "Utility", flyoutTitle: "Utility", icon: Workflow, items: ["llm-call", "text-overlay", "crop-image"] }
];

const NODE_MENU_RECENT = ["text", "krea-1"] as const;

const NODE_ACTION_MAP = new Map(NODE_MENU_ACTIONS.map((item) => [item.id, item]));

const CORE_PLUS_ITEMS = [
  { id: "text", label: "Text" },
  { id: "krea-1", label: "LLM" },
  { id: "upload-image", label: "Image" },
  { id: "upload-video", label: "Video" },
  { id: "crop-image", label: "Crop" },
  { id: "get-video-frame", label: "Video Frame" }
] as const;

const SCISSOR_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='26' height='26' viewBox='0 0 24 24' fill='none' stroke='%23000000' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='6' cy='6' r='3'/%3E%3Ccircle cx='6' cy='18' r='3'/%3E%3Cpath d='M20 4 8.12 15.88'/%3E%3Cpath d='M14.47 14.48 20 20'/%3E%3Cpath d='M8.12 8.12 12 12'/%3E%3C/svg%3E") 6 6, crosshair`;

type RightPanelMode = "assets" | "history" | null;
type WorkflowAsset = {
  id: string;
  type: "image" | "video";
  url: string;
  label: string;
  nodeType?: string;
};

type StoredWorkflowDraft = {
  name?: string;
  nodes?: Node<NodeData>[];
  edges?: Edge[];
};

function formatRelativeTime(dateString: string): string {
  const timestamp = new Date(dateString).getTime();
  if (Number.isNaN(timestamp)) return "Just now";

  const diffMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes === 1) return "1 minute ago";
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours === 1) return "1 hour ago";
  if (diffHours < 24) return `${diffHours} hours ago`;

  const diffDays = Math.round(diffHours / 24);
  return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
}

function extractWorkflowAssets(nodes: Node<NodeData>[]): WorkflowAsset[] {
  return nodes.flatMap<WorkflowAsset>((node) => {
    const data = node.data;
    const imageUrl = typeof data.imageUrl === "string" ? data.imageUrl : typeof data.outputUrl === "string" && node.type !== "upload-video" ? data.outputUrl : null;
    const videoUrl = typeof data.videoUrl === "string" ? data.videoUrl : typeof data.outputUrl === "string" && node.type === "upload-video" ? data.outputUrl : null;

    if (imageUrl) {
      return [
        {
          id: `${node.id}-image`,
          type: "image" as const,
          url: imageUrl,
          label: data.label || "Image",
          nodeType: node.type
        }
      ];
    }

    if (videoUrl) {
      return [
        {
          id: `${node.id}-video`,
          type: "video" as const,
          url: videoUrl,
          label: data.label || "Video",
          nodeType: node.type
        }
      ];
    }

    return [];
  });
}

function HistoryPreview({
  nodes,
  edges,
  label,
  isCurrent
}: {
  nodes: Array<Pick<Node<NodeData>, "id" | "position">>;
  edges: Array<Pick<Edge, "source" | "target">>;
  label: string;
  isCurrent?: boolean;
}) {
  const normalizedNodes = nodes.slice(0, 6).map((node, index) => ({
    id: node.id,
    left: 16 + (index % 3) * 70 + ((node.position?.x ?? 0) % 24),
    top: 40 + Math.floor(index / 3) * 58 + ((node.position?.y ?? 0) % 18)
  }));

  const hasPreview = normalizedNodes.length > 0;

  return (
    <div className="relative overflow-hidden rounded-[24px] bg-[var(--bg-tertiary)] p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <span className="rounded-[12px] bg-[var(--bg-secondary)] px-3 py-1 text-[13px] font-medium text-[var(--text-secondary)]">{label}</span>
        {isCurrent ? <span className="rounded-[10px] bg-[var(--bg-secondary)] px-3 py-1 text-[12px] font-semibold text-[var(--text-secondary)]">CURRENT</span> : null}
      </div>

      <div className="relative h-[210px] rounded-[18px] bg-[color:color-mix(in_srgb,var(--bg-primary)_65%,transparent)]">
        {hasPreview ? (
          <>
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 240 210" preserveAspectRatio="none" aria-hidden="true">
              {edges.slice(0, 6).map((edge, index) => {
                const source = normalizedNodes.find((node) => node.id === edge.source);
                const target = normalizedNodes.find((node) => node.id === edge.target);
                if (!source || !target) return null;

                return (
                  <line
                    key={`${edge.source}-${edge.target}-${index}`}
                    x1={source.left + 26}
                    y1={source.top + 18}
                    x2={target.left + 26}
                    y2={target.top + 18}
                    stroke="var(--text-muted)"
                    strokeOpacity="0.32"
                    strokeWidth="2"
                  />
                );
              })}
            </svg>

            {normalizedNodes.map((node, index) => (
              <div
                key={node.id}
                className="absolute rounded-[14px] bg-[var(--text-primary)]/85"
                style={{
                  left: `${node.left}px`,
                  top: `${node.top}px`,
                  width: `${index % 2 === 0 ? 56 : 72}px`,
                  height: `${index % 2 === 0 ? 36 : 52}px`,
                  opacity: 0.9 - index * 0.08
                }}
              />
            ))}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-[16px] text-[var(--text-muted)]">No preview</div>
        )}
      </div>

      <div className="mt-4 inline-flex rounded-[12px] bg-[var(--bg-secondary)] px-3 py-1 text-[13px] text-[var(--text-secondary)]">
        {nodes.length} node{nodes.length === 1 ? "" : "s"} · {edges.length} edge{edges.length === 1 ? "" : "s"}
      </div>
    </div>
  );
}

function WorkflowUtilityPanel({
  mode,
  theme,
  assets,
  nodes,
  edges,
  runs
}: {
  mode: RightPanelMode;
  theme: "dark" | "light";
  assets: WorkflowAsset[];
  nodes: Node<NodeData>[];
  edges: Edge[];
  runs: import("@/lib/types").WorkflowRun[];
}) {
  if (!mode) return null;

  if (mode === "assets") {
    return (
      <aside className="w-[260px] shrink-0 border-l border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div className="flex h-full flex-col px-6 py-8">
          {assets.length === 0 ? (
            <div className="mt-[38vh] max-w-[150px] text-[15px] leading-[1.25] text-[var(--text-secondary)]">
              Results will appear here as nodes begin to generate outputs
            </div>
          ) : (
            <div className="space-y-4 overflow-y-auto">
              {assets.map((asset) => (
                <div key={asset.id} className="overflow-hidden rounded-[22px] bg-[var(--bg-tertiary)] p-3">
                  <div className="mb-2 text-[12px] font-medium text-[var(--text-secondary)]">{asset.label}</div>
                  {asset.type === "image" ? (
                    <img src={asset.url} alt={asset.label} className="h-[148px] w-full rounded-[16px] object-cover" />
                  ) : (
                    <video src={asset.url} className="h-[148px] w-full rounded-[16px] object-cover" controls muted playsInline />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    );
  }

  const historyCards = [
    {
      id: "current",
      label: "Current",
      timestampLabel: "Current",
      isCurrent: true,
      nodes,
      edges
    },
    ...runs.map((run) => ({
      id: run.id,
      label: formatRelativeTime(run.startedAt),
      timestampLabel: formatRelativeTime(run.startedAt),
      isCurrent: false,
      nodes,
      edges
    }))
  ];

  return (
    <aside className="w-[480px] shrink-0 border-l border-[var(--border-color)] bg-[var(--bg-secondary)]">
      <div className="h-full overflow-y-auto px-6 py-4">
        <div className="space-y-6">
          {historyCards.map((card) => (
            <HistoryPreview
              key={card.id}
              nodes={card.nodes}
              edges={card.edges}
              label={card.isCurrent ? "Just now" : card.timestampLabel}
              isCurrent={card.isCurrent}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}

function NodeCommandMenu({
  open,
  query,
  onQueryChange,
  onClose,
  onSelect,
  initialCategoryId
}: {
  open: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  onClose: () => void;
  onSelect: (type: FlowNodeType) => void;
  initialCategoryId?: string | null;
}) {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return NODE_MENU_ACTIONS;

    return NODE_MENU_ACTIONS.filter((item) =>
      [item.label, ...item.keywords].some((value) => value.toLowerCase().includes(normalized))
    );
  }, [query]);

  useEffect(() => {
    if (!open) return;
    setActiveCategoryId(query.trim() ? null : initialCategoryId ?? null);
  }, [initialCategoryId, open, query]);

  if (!open) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-40">
      <button type="button" aria-label="Close add node menu" className="absolute inset-0 pointer-events-auto" onClick={onClose} />

      <div className="pointer-events-auto absolute bottom-[88px] left-1/2 z-10 w-[520px] max-w-[calc(100vw-80px)] -translate-x-[330px] overflow-visible">
        <div className="overflow-hidden rounded-[22px] border border-white/10 bg-[#0a0a0a] shadow-[0_30px_80px_rgba(0,0,0,0.58)]">
          <div className="px-5 pb-4 pt-4">
            <div className="flex items-center gap-3 text-white/78">
              <Search className="h-5 w-5 shrink-0 text-white/44" />
              <input
                autoFocus
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Search nodes or models..."
                className="w-full bg-transparent text-[17px] text-white outline-none placeholder:text-white/42"
              />
            </div>
          </div>

          {query.trim() ? (
            <div className="max-h-[560px] overflow-y-auto px-4 pb-4">
              {filteredItems.length === 0 ? (
                <div className="px-3 py-8 text-center text-[14px] text-white/42">No nodes found</div>
              ) : (
                <div className="space-y-1 py-2">
                  {filteredItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          if (item.enabled === false) return;
                          onSelect(item.type);
                        }}
                        className={`flex w-full items-center gap-3 rounded-[12px] px-4 py-2.5 text-left text-white transition ${
                          item.enabled === false ? "cursor-default" : "hover:bg-white/8"
                        }`}
                      >
                        <span className={`flex h-8 w-8 items-center justify-center rounded-[10px] text-white ${item.muted ? "opacity-55" : ""}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className={`text-[14px] font-medium ${item.muted ? "text-white/45" : "text-white"}`}>{item.label}</div>
                        </div>
                        {item.pro ? <span className="rounded-[10px] bg-[#07172b] px-3 py-1 text-[11px] font-semibold tracking-[0.04em] text-[#1984ff]">PRO</span> : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="max-h-[560px] overflow-y-auto px-4 pb-4">
              <div className="space-y-5">
                <div className="py-1">
                  <div className="mb-2 flex items-center gap-2 px-2 text-[12px] text-white/42">
                    <Plus className="h-4 w-4" />
                    <span>Add node</span>
                  </div>
                  <div className="space-y-1">
                    {CORE_PLUS_ITEMS.map(({ id, label }) => {
                      const item = NODE_ACTION_MAP.get(id);
                      if (!item) return null;
                      const Icon = item.icon;
                      return (
                        <button
                          key={`core-${item.id}`}
                          type="button"
                          onClick={() => onSelect(item.type)}
                          className="flex w-full items-center gap-3 rounded-[12px] px-4 py-2.5 text-left text-white transition hover:bg-white/8"
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-[10px] text-white">
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-[14px] font-medium text-white">{label}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="py-1">
                  <div className="mb-2 flex items-center gap-2 px-2 text-[12px] text-white/42">
                    <Clock3 className="h-4 w-4" />
                    <span>Recent</span>
                  </div>
                  <div className="space-y-1">
                    {NODE_MENU_RECENT.map((id) => {
                      const item = NODE_ACTION_MAP.get(id);
                      if (!item) return null;
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onSelect(item.type)}
                          className="flex w-full items-center gap-3 rounded-[12px] px-4 py-2.5 text-left text-white transition hover:bg-white/8"
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-[10px] text-white">
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-[14px] font-medium text-white">{item.label}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {(["Image", "Video", "Other"] as const).map((section) => (
                  <div key={section}>
                    <div className="mb-2 flex items-center gap-2 px-2 text-[12px] text-white/42">
                      {section === "Image" ? <ImageIcon className="h-4 w-4" /> : section === "Video" ? <Video className="h-4 w-4" /> : <Workflow className="h-4 w-4" />}
                      <span>{section}</span>
                    </div>
                    <div className="space-y-1 overflow-visible">
                      {NODE_MENU_CATEGORIES.filter((group) => group.section === section).map((group) => {
                        const Icon = group.icon;
                        const isActive = activeCategoryId === group.id;
                        const flyoutItems = group.items.map((itemId) => NODE_ACTION_MAP.get(itemId)).filter(Boolean) as typeof NODE_MENU_ACTIONS;
                        return (
                          <div key={group.id} className="relative">
                            <button
                              type="button"
                              onMouseEnter={() => setActiveCategoryId(group.id)}
                              onFocus={() => setActiveCategoryId(group.id)}
                              onClick={() => setActiveCategoryId(group.id)}
                              className={`flex w-full items-center gap-3 rounded-[12px] px-4 py-2.5 text-left text-white transition ${
                                isActive ? "bg-white/10" : "hover:bg-white/8"
                              }`}
                            >
                              <span className="flex h-8 w-8 items-center justify-center rounded-[10px] text-white/72">
                                <Icon className="h-4 w-4" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="text-[14px] font-medium text-white">{group.label}</div>
                              </div>
                              <ChevronRight className="h-4 w-4 text-white/48" />
                            </button>

                            {isActive ? (
                              <div className="absolute left-[calc(100%+14px)] top-1/2 z-20 w-[470px] max-w-[calc(100vw-120px)] -translate-y-1/2 overflow-hidden rounded-[22px] border border-white/10 bg-[#0a0a0a] shadow-[0_30px_80px_rgba(0,0,0,0.58)]">
                                <div className="px-7 py-5">
                                  <div className="mb-4 text-[14px] text-white/42">{group.flyoutTitle}</div>
                                  <div className="space-y-1">
                                    {flyoutItems.map((item) => {
                                      const ItemIcon = item.icon;
                                      return (
                                        <button
                                          key={`${group.id}-${item.id}`}
                                          type="button"
                                          onClick={() => {
                                            if (item.enabled === false) return;
                                            onSelect(item.type);
                                          }}
                                          className={`flex w-full items-center gap-4 rounded-[12px] px-4 py-2.5 text-left transition ${
                                            item.enabled === false ? "cursor-default" : "hover:bg-white/6"
                                          }`}
                                        >
                                          <span className={`flex h-8 w-8 items-center justify-center rounded-[10px] ${item.muted ? "text-white/30" : "text-white/90"}`}>
                                            <ItemIcon className="h-4 w-4" />
                                          </span>
                                          <span className={`min-w-0 flex-1 truncate text-[15px] ${item.muted ? "text-white/45" : "text-white"}`}>{item.label}</span>
                                          {item.pro ? (
                                            <span className="rounded-[10px] bg-[#07172b] px-3 py-1 text-[11px] font-semibold tracking-[0.04em] text-[#1984ff]">
                                              PRO
                                            </span>
                                          ) : null}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KeyboardShortcutsDialog({
  open,
  onClose
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  const sections = [
    {
      title: "General",
      items: [
        { label: "Undo", keys: [["Cmd", "Z"]] },
        { label: "Redo", keys: [["Cmd", "Shift", "Z"]] },
        { label: "Save", keys: [["Cmd", "S"]] },
        { label: "Select all", keys: [["Cmd", "A"]] },
        { label: "Deselect all", keys: [["Esc"]] },
        { label: "Multi-select", keys: [["Drag"], ["Shift", "Click"], ["Cmd", "Drag"]], separator: "or" },
        { label: "Pan canvas", keys: [["Space", "Drag"]] },
        { label: "Cut edges (Scissor)", keys: [["X", "Click"]] },
        { label: "Canvas Agent", keys: [["Cmd", "F"]] }
      ]
    },
    {
      title: "Node Creation",
      items: [
        { label: "New node", keys: [["N"]] },
        { label: "Image node", keys: [["I"]] },
        { label: "Video node", keys: [["V"]] },
        { label: "LLM node", keys: [["L"]] },
        { label: "Enhance node", keys: [["E"]] }
      ]
    },
    {
      title: "Node Operations",
      items: [
        { label: "Delete selected", keys: [["Delete"]] },
        { label: "Duplicate selected", keys: [["Cmd", "D"]] },
        { label: "Fit workflow", keys: [["Cmd", "F"]] }
      ]
    }
  ];

  const renderKeyGroup = (keys: string[], key: string) => (
    <div key={key} className="inline-flex items-center gap-2">
      {keys.map((part) => (
        <span
          key={`${key}-${part}`}
          className="inline-flex min-w-[38px] items-center justify-center rounded-[12px] border border-black/12 bg-white px-3 py-1 text-[13px] font-medium text-black/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
        >
          {part}
        </span>
      ))}
    </div>
  );

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 px-6 backdrop-blur-[2px]">
      <button type="button" className="absolute inset-0" aria-label="Close keyboard shortcuts" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[820px] overflow-hidden rounded-[32px] border border-black/8 bg-white p-0 text-black shadow-[0_36px_90px_rgba(0,0,0,0.25)]">
        <div className="max-h-[78vh] overflow-y-auto px-12 py-12">
          <div className="mb-10 flex items-start justify-between gap-8">
            <div>
              <h3 className="text-[32px] font-semibold tracking-[-0.05em] text-black">Keyboard Shortcuts</h3>
              <p className="mt-3 text-[16px] text-black/50">Quickly navigate and create with these shortcuts.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-[74px] w-[74px] shrink-0 items-center justify-center rounded-full border-[4px] border-black/20 bg-white text-black transition hover:scale-[0.98]"
              aria-label="Close keyboard shortcuts"
            >
              <X className="h-9 w-9" strokeWidth={1.8} />
            </button>
          </div>

          <div className="space-y-10">
            {sections.map((section) => (
              <section key={section.title}>
                <h4 className="mb-5 text-[20px] font-semibold tracking-[-0.04em] text-black">{section.title}</h4>
                <div className="space-y-4">
                  {section.items.map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-6">
                      <span className="text-[16px] text-black/65">{item.label}</span>
                      <div className="flex flex-wrap items-center justify-end gap-2 text-[14px] text-black/45">
                        {item.keys.map((group, index) => (
                          <div key={`${item.label}-${index}`} className="flex items-center gap-2">
                            {renderKeyGroup(group, `${item.label}-${index}`)}
                            {item.separator && index < item.keys.length - 1 ? <span className="px-1 text-black/45">{item.separator}</span> : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CanvasShell({
  onOpenLibrary,
  tool,
  setTool,
  isNodeMenuOpen,
  theme,
  onToggleTheme,
  onShare,
  shareState,
  onOpenShortcuts,
  onQuickAddLlm,
  onFitWorkflow,
  onBack,
  onExport,
  onImport,
  rightPanelMode,
  onSelectRightPanel
}: {
  onOpenLibrary: (categoryId?: string | null) => void;
  tool: string;
  setTool: (tool: string) => void;
  isNodeMenuOpen: boolean;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onShare: () => void;
  shareState: "idle" | "copied" | "error";
  onOpenShortcuts: () => void;
  onQuickAddLlm: () => void;
  onFitWorkflow: () => void;
  onBack: () => void;
  onExport: () => void;
  onImport: () => void;
  rightPanelMode: RightPanelMode;
  onSelectRightPanel: (mode: RightPanelMode) => void;
}) {
  const workflowName = useWorkflowStore((state) => state.workflowName);
  const setWorkflowName = useWorkflowStore((state) => state.setWorkflowName);
  const saveNow = useWorkflowStore((state) => state.saveNow);
  const undo = useWorkflowStore((state) => state.undo);
  const redo = useWorkflowStore((state) => state.redo);
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftWorkflowName, setDraftWorkflowName] = useState(workflowName || "Untitled Workflow");
  const [isAssetMenuOpen, setIsAssetMenuOpen] = useState(false);
  const [isWorkflowMenuOpen, setIsWorkflowMenuOpen] = useState(false);

  useEffect(() => {
    if (!isEditingName) {
      setDraftWorkflowName(workflowName || "Untitled Workflow");
    }
  }, [isEditingName, workflowName]);

  return (
    <>
      {/* Top-left: workflow name */}
      <Panel position="top-left" className="!m-3.5">
        <div className="relative">
          <div className="inline-flex items-center gap-3 rounded-[22px] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2.5 text-[var(--text-primary)] shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
            <button
              type="button"
              onClick={() => setIsWorkflowMenuOpen((current) => !current)}
              className="flex h-[44px] items-center gap-2.5 rounded-[14px] bg-[var(--bg-tertiary)] px-3 text-[var(--text-primary)] transition hover:brightness-95"
              aria-label="Workflow options"
            >
              <img
                src="https://optim-images.krea.ai/https---s-krea-ai-icons-NodeEditor-png-128.webp"
                alt="Workflow editor"
                className="h-5 w-5 rounded-[6px] object-cover"
              />
              <ChevronDown className={`h-3.5 w-3.5 text-[var(--text-secondary)] transition ${isWorkflowMenuOpen ? "rotate-180" : ""}`} />
            </button>
            {isEditingName ? (
              <input
                autoFocus
                value={draftWorkflowName}
                onChange={(event) => setDraftWorkflowName(event.target.value)}
                onBlur={() => {
                  const nextName = draftWorkflowName.trim() || "Untitled Workflow";
                  if (nextName !== workflowName) {
                    setWorkflowName(nextName);
                    void saveNow();
                  }
                  setIsEditingName(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }

                  if (event.key === "Escape") {
                    setDraftWorkflowName(workflowName || "Untitled Workflow");
                    setIsEditingName(false);
                  }
                }}
                className="min-w-[160px] border-b border-[#cc00ff] bg-transparent pb-1 text-[18px] font-medium tracking-[-0.04em] text-white outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingName(true)}
                className="text-[18px] font-medium tracking-[-0.04em] text-[var(--text-primary)] transition hover:opacity-80"
                title="Rename workflow"
              >
                {workflowName || "Untitled"}
              </button>
            )}
          </div>

          {isWorkflowMenuOpen ? (
            <div className="absolute left-0 top-[96px] z-30 w-[350px] rounded-[24px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 text-[var(--text-primary)] shadow-[0_20px_60px_rgba(0,0,0,0.14)]">
              <button
                type="button"
                onClick={() => {
                  setIsWorkflowMenuOpen(false);
                  onBack();
                }}
                className="flex w-full items-center gap-4 rounded-[16px] px-3 py-3 text-left text-[15px] font-medium transition hover:bg-[var(--bg-tertiary)]"
              >
                <ChevronLeft className="h-5 w-5" />
                Back
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsWorkflowMenuOpen(false);
                  window.alert("Turn workflow into app is not wired up yet.");
                }}
                className="mt-2 flex w-full items-center gap-4 rounded-[16px] px-3 py-3 text-left text-[15px] font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-tertiary)]"
              >
                <Hammer className="h-5 w-5" />
                <span className="flex-1">Turn into App</span>
                <Diamond className="h-4 w-4 text-[#6aa6ff]" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsWorkflowMenuOpen(false);
                  onImport();
                }}
                className="mt-2 flex w-full items-center gap-4 rounded-[16px] px-3 py-3 text-left text-[15px] font-medium transition hover:bg-[var(--bg-tertiary)]"
              >
                <Upload className="h-5 w-5" />
                Import
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsWorkflowMenuOpen(false);
                  onExport();
                }}
                className="mt-2 flex w-full items-center gap-4 rounded-[16px] px-3 py-3 text-left text-[15px] font-medium transition hover:bg-[var(--bg-tertiary)]"
              >
                <Download className="h-5 w-5" />
                Export
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsWorkflowMenuOpen(false);
                  window.alert("Workspace switching is not wired up yet.");
                }}
                className="mt-2 flex w-full items-center gap-4 rounded-[16px] px-3 py-3 text-left text-[15px] font-medium transition hover:bg-[var(--bg-tertiary)]"
              >
                <Users className="h-5 w-5" />
                <span className="flex-1">Workspaces</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>
      </Panel>

      {/* Top-right: workflow actions */}
      <Panel position="top-right" className="!m-3.5 flex items-center gap-2">
        <SaveIndicator />

        <button
          type="button"
          onClick={onToggleTheme}
          className="flex h-[40px] w-[40px] items-center justify-center rounded-[13px] border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] transition hover:bg-[var(--bg-tertiary)]"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <SunMedium className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5 fill-current" />}
        </button>

        <button
          type="button"
          onClick={onShare}
          className="inline-flex h-[40px] items-center gap-2 rounded-[13px] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3.5 text-[12px] font-medium tracking-[-0.03em] text-[var(--text-primary)] transition hover:bg-[var(--bg-tertiary)] disabled:opacity-60"
        >
          <Share2 className="h-3.5 w-3.5" />
          {shareState === "copied" ? "Copied" : shareState === "error" ? "Retry share" : "Share"}
        </button>

        <button
          type="button"
          className="inline-flex h-[40px] items-center gap-2 rounded-[13px] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3.5 text-[12px] font-medium tracking-[-0.03em] text-[var(--text-primary)] transition hover:bg-[var(--bg-tertiary)] disabled:opacity-40"
          onClick={() => window.alert("Turn workflow into app is not wired up yet.")}
        >
          <Workflow className="h-3.5 w-3.5" />
          Turn workflow into app
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setIsAssetMenuOpen((current) => !current)}
            className="inline-flex h-[40px] items-center gap-2 rounded-[13px] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 text-[var(--text-primary)] transition hover:bg-[var(--bg-tertiary)]"
            aria-label="Workflow asset actions"
          >
            <ImageIcon className="h-4.5 w-4.5" />
            <ChevronDown className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
          </button>

          {isAssetMenuOpen ? (
            <div className="absolute right-0 top-[52px] z-20 min-w-[320px] rounded-[20px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2 shadow-[0_24px_50px_rgba(0,0,0,0.18)]">
              <button
                type="button"
                onClick={() => {
                  onSelectRightPanel(rightPanelMode === "assets" ? null : "assets");
                  setIsAssetMenuOpen(false);
                }}
                className={`flex w-full items-center gap-4 rounded-[14px] px-4 py-4 text-left transition ${
                  rightPanelMode === "assets" ? "bg-[var(--bg-tertiary)]" : "hover:bg-[var(--bg-tertiary)]"
                }`}
              >
                <ImageIcon className="h-6 w-6 text-[var(--text-secondary)]" />
                <span className="flex-1 text-[16px] font-medium text-[var(--text-primary)]">Assets</span>
                <span className="text-[14px] text-[var(--text-secondary)]">⌥ ⌘ A</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectRightPanel(rightPanelMode === "history" ? null : "history");
                  setIsAssetMenuOpen(false);
                }}
                className={`mt-1 flex w-full items-center gap-4 rounded-[14px] px-4 py-4 text-left transition ${
                  rightPanelMode === "history" ? "bg-[var(--bg-tertiary)]" : "hover:bg-[var(--bg-tertiary)]"
                }`}
              >
                <Clock3 className="h-6 w-6 text-[var(--text-secondary)]" />
                <span className="flex-1 text-[16px] font-medium text-[var(--text-primary)]">Version History</span>
                <span className="text-[14px] text-[var(--text-secondary)]">⌥ ⌘ S</span>
              </button>
            </div>
          ) : null}
        </div>
      </Panel>

      {/* Bottom-left: undo/redo + hint */}
      <Panel position="bottom-left" className="!mb-3.5 !ml-3.5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => undo()}
          title="Undo (⌘Z)"
          className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] transition hover:bg-[var(--bg-tertiary)]"
          aria-label="Undo"
        >
          <Undo2 className="h-4.5 w-4.5" />
        </button>
        <button
          type="button"
          onClick={() => redo()}
          title="Redo (⌘⇧Z)"
          className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] transition hover:bg-[var(--bg-tertiary)]"
          aria-label="Redo"
        >
          <Redo2 className="h-4.5 w-4.5" />
        </button>
        <button
          type="button"
          onClick={onOpenShortcuts}
          className="inline-flex h-[38px] items-center gap-2 rounded-[11px] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3.5 text-[12px] tracking-[-0.03em] text-[var(--text-primary)] transition hover:bg-[var(--bg-tertiary)]"
        >
          <span className="text-[14px]">⌘</span>
          <span className="leading-tight">Keyboard shortcuts</span>
        </button>
      </Panel>

      {/* Bottom-center: tool palette */}
      <Panel position="bottom-center" className="!mb-3.5">
        <div className="inline-flex items-center gap-1 rounded-[16px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.14)]">
          {[
            { id: "plus", label: "Add node", icon: <Plus className="h-4.5 w-4.5" /> },
            { id: "cursor", label: "Pointer tool", icon: <MousePointer2 className="h-4.5 w-4.5" /> },
            { id: "hand", label: "Hand tool", icon: <Hand className="h-4.5 w-4.5" /> },
            { id: "cut", label: "Cut edge tool", icon: <Scissors className="h-4.5 w-4.5" /> },
            { id: "sparkles", label: "Add LLM node", icon: <Sparkles className="h-4.5 w-4.5" /> },
            { id: "nodes", label: "Fit workflow", icon: <Workflow className="h-4.5 w-4.5" /> }
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (item.id === "plus") {
                  onOpenLibrary();
                } else if (item.id === "sparkles") {
                  onQuickAddLlm();
                } else if (item.id === "nodes") {
                  onFitWorkflow();
                } else {
                  setTool(item.id);
                }
              }}
              className={`flex h-[48px] w-[48px] items-center justify-center rounded-[14px] text-[var(--text-primary)] transition ${
                (item.id === "plus" && isNodeMenuOpen) || tool === item.id ? "bg-[var(--bg-tertiary)]" : "bg-transparent hover:bg-[var(--bg-tertiary)]"
              }`}
              title={item.label}
              aria-label={item.label}
            >
              {item.icon}
            </button>
          ))}
        </div>
      </Panel>

      {/* Bottom-right: sparkle FAB (open library) */}
      <Panel position="bottom-right" className="!mb-3.5 !mr-3.5">
        <button
          type="button"
          onClick={() => onOpenLibrary()}
          className="flex h-[48px] w-[48px] items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] transition hover:bg-[var(--bg-tertiary)]"
          aria-label="Open node library"
        >
          <Sparkles className="h-5 w-5" />
        </button>
      </Panel>
    </>
  );
}

function WorkflowCanvasInner({ workflowId, workflowName, initialNodes, initialEdges, initialRuns }: WorkflowCanvasProps) {
  useKeyboardShortcuts();
  const router = useRouter();

  const reactFlow = useReactFlow();
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const runs = useWorkflowStore((state) => state.runs);
  const initWorkflow = useWorkflowStore((state) => state.initWorkflow);
  const addNode = useWorkflowStore((state) => state.addNode);
  const onNodesChange = useWorkflowStore((state) => state.onNodesChange);
  const pushHistory = useWorkflowStore((state) => state.pushHistory);
  const onEdgesChange = useWorkflowStore((state) => state.onEdgesChange);
  const onConnectNodes = useWorkflowStore((state) => state.onConnect);
  const removeEdge = useWorkflowStore((state) => state.removeEdge);
  const saveNow = useWorkflowStore((state) => state.saveNow);
  const storeWorkflowName = useWorkflowStore((state) => state.workflowName);
  const importWorkflow = useWorkflowStore((state) => state.importWorkflow);

  const canvasRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState("cursor");
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "dark";
    return window.localStorage.getItem("nextflow-theme") === "light" ? "light" : "dark";
  });
  const [pendingNodePosition, setPendingNodePosition] = useState<XYPosition | null>(null);
  const [isNodeMenuOpen, setIsNodeMenuOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [nodeMenuQuery, setNodeMenuQuery] = useState("");
  const [nodeMenuCategory, setNodeMenuCategory] = useState<string | null>(null);
  const [shareState, setShareState] = useState<"idle" | "copied" | "error">("idle");
  const [rightPanelMode, setRightPanelMode] = useState<RightPanelMode>(null);
  const [cutCursorPosition, setCutCursorPosition] = useState<{ x: number; y: number } | null>(null);
  const [hoveredCutEdgeId, setHoveredCutEdgeId] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const assets = useMemo(() => extractWorkflowAssets(nodes), [nodes]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("nextflow-theme", theme);
  }, [theme]);

  useEffect(() => {
    initWorkflow(workflowId, workflowName, initialNodes, initialEdges, initialRuns);
  }, [initWorkflow, initialEdges, initialNodes, initialRuns, workflowId, workflowName]);

  const addNodeAtPosition = useCallback(
    (type: FlowNodeType, position?: XYPosition | null) => {
      addNode(type, position ?? pendingNodePosition ?? DEFAULT_NODE_POSITION);
      setPendingNodePosition(null);
      setIsNodeMenuOpen(false);
      setNodeMenuQuery("");
      setNodeMenuCategory(null);
    },
    [addNode, pendingNodePosition]
  );

  const addNodeAtViewportCenter = useCallback(
    (type: FlowNodeType) => {
      const bounds = canvasRef.current?.getBoundingClientRect();

      if (!bounds) {
        addNodeAtPosition(type, DEFAULT_NODE_POSITION);
        return;
      }

      addNodeAtPosition(
        type,
        reactFlow.screenToFlowPosition({
          x: bounds.left + bounds.width / 2,
          y: bounds.top + bounds.height / 2
        })
      );
    },
    [addNodeAtPosition, reactFlow]
  );

  const openNodeLibrary = useCallback((categoryId?: string | null) => {
    setNodeMenuQuery("");
    setNodeMenuCategory(categoryId ?? null);
    setIsNodeMenuOpen(true);
  }, []);

  const fitWorkflow = useCallback(() => {
    void reactFlow.fitView({ padding: 0.18, duration: 240 });
  }, [reactFlow]);

  const handleShare = useCallback(async () => {
    try {
      if (!useWorkflowStore.getState().workflowId) {
        await saveNow();
      }

      const resolvedWorkflowId = useWorkflowStore.getState().workflowId ?? workflowId;
      const shareUrl = `${window.location.origin}/workflow/${resolvedWorkflowId}`;
      await navigator.clipboard.writeText(shareUrl);
      setShareState("copied");
      window.setTimeout(() => setShareState("idle"), 1800);
    } catch (error) {
      console.error("Failed to generate share link:", error);
      setShareState("error");
      window.setTimeout(() => setShareState("idle"), 2200);
    }
  }, [saveNow, workflowId]);

  const persistWorkflowNow = useCallback(async () => {
    try {
      await saveNow();
    } catch (error) {
      console.error("Save before navigation failed:", error);
    }
  }, [saveNow]);

  const handleBackToWorkflowIndex = useCallback(async () => {
    await persistWorkflowNow();
    router.push("/workflow");
  }, [persistWorkflowNow, router]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        void persistWorkflowNow();
      }
    };

    const handlePageHide = () => {
      void persistWorkflowNow();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [persistWorkflowNow]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isInput =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.getAttribute("contenteditable") === "true";

      if (isInput) return;

      const key = event.key.toLowerCase();

      if (key === "n") {
        event.preventDefault();
        addNodeAtViewportCenter("text");
      }

      if (key === "i") {
        event.preventDefault();
        addNodeAtViewportCenter("upload-image");
      }

      if (key === "v") {
        event.preventDefault();
        addNodeAtViewportCenter("upload-video");
      }

      if (key === "l") {
        event.preventDefault();
        addNodeAtViewportCenter("llm");
      }

      if (key === "e") {
        event.preventDefault();
        addNodeAtViewportCenter("crop-image");
      }

      if (key === "h") {
        event.preventDefault();
        setTool("hand");
      }

      if (key === "x") {
        event.preventDefault();
        setTool("cut");
      }

      if (event.key === "?") {
        event.preventDefault();
        setIsShortcutsOpen(true);
      }

      if (event.key === "Escape") {
        setIsNodeMenuOpen(false);
        setIsShortcutsOpen(false);
        setNodeMenuQuery("");
        setNodeMenuCategory(null);
        setTool("cursor");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [addNodeAtViewportCenter]);

  const handleExport = useCallback(() => {
    const state = useWorkflowStore.getState();
      const payload = {
      name: state.workflowName,
      nodes: state.nodes as unknown as Node<NodeData>[],
      edges: state.edges as unknown as Edge[],
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${state.workflowName?.replace(/\s+/g, "_") || "workflow"}-export.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleImport = useCallback(() => {
    importInputRef.current?.click();
  }, []);

  const handleImportFile = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target?.result as string) as {
            name?: string;
            nodes: Node<NodeData>[];
            edges: Edge[];
          };
          if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
            throw new Error("Invalid workflow JSON: missing nodes or edges arrays");
          }
          if (!window.confirm("This will replace your current canvas. Continue?")) {
            return;
          }

          importWorkflow({ name: parsed.name, nodes: parsed.nodes, edges: parsed.edges });
          void saveNow();
        } catch (error) {
          console.error("Failed to import workflow:", error);
          alert("Invalid workflow JSON file. Please check the file and try again.");
        }
      };
      reader.readAsText(file);
      // Reset so same file can be re-imported
      event.target.value = "";
    },
    [importWorkflow, saveNow]
  );

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const payload = event.dataTransfer.getData("application/json");
      if (!payload) return;

      const parsed = JSON.parse(payload) as { type?: FlowNodeType };
      if (!parsed.type) return;

      const position = reactFlow.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY
      });

      addNodeAtPosition(parsed.type, position);
    },
    [addNodeAtPosition, reactFlow]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const state = useWorkflowStore.getState();
      const normalizedConnection = normalizeConnection(connection, state.nodes, state.edges);
      const validation = validateConnection(normalizedConnection);

      if (!validation.isValid) {
        showConnectionValidationError(validation.reason ?? "Invalid connection");
        return;
      }

      if (normalizedConnection.source && normalizedConnection.target) {
        const visited = new Set<string>();
        const queue: string[] = [normalizedConnection.target];
        let isCircular = false;

        while (queue.length > 0 && !isCircular) {
          const current = queue.shift();
          if (!current || visited.has(current)) continue;
          visited.add(current);

          if (current === normalizedConnection.source) {
            isCircular = true;
            break;
          }

          const outgoing = state.edges.filter((edge) => edge.source === current && !visited.has(edge.target));
          for (const edge of outgoing) {
            queue.push(edge.target);
          }
        }

        if (isCircular) {
          showConnectionValidationError("Circular connections are not allowed");
          return;
        }
      }

      onConnectNodes(normalizedConnection);
    },
    [onConnectNodes]
  );

  return (
    <div className="flex h-screen min-h-screen w-full bg-[var(--bg-primary)]">
      {/* Hidden file input for JSON import */}
      <input
        ref={importInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleImportFile}
        className="hidden"
        aria-hidden="true"
      />

      <KreaExpandedSidebar />

      {/* Main canvas */}
      <div
        ref={canvasRef}
        data-tool={tool}
        className="relative min-w-0 flex-1"
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
        onMouseMove={(event) => {
          if (tool !== "cut") return;
          const bounds = canvasRef.current?.getBoundingClientRect();
          if (!bounds) return;
          const target = event.target as HTMLElement | null;
          const edgeElement = target?.closest?.(".react-flow__edge");
          setCutCursorPosition({
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top
          });
          setHoveredCutEdgeId(edgeElement?.getAttribute("data-id") ?? null);
        }}
        onMouseLeave={() => {
          setCutCursorPosition(null);
          setHoveredCutEdgeId(null);
        }}
        onClickCapture={(event) => {
          if (tool !== "cut") return;
          const edgeId = hoveredCutEdgeId;
          if (!edgeId) return;

          event.preventDefault();
          event.stopPropagation();
          removeEdge(edgeId);
          setHoveredCutEdgeId(null);
        }}
        onDoubleClick={(event) => {
          const target = event.target as HTMLElement;
          if (!target.classList.contains("react-flow__pane")) return;

          addNodeAtPosition(
            "text",
            reactFlow.screenToFlowPosition({
              x: event.clientX,
              y: event.clientY
            })
          );
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges.map((edge) => ({
            ...edge,
            animated: true,
            interactionWidth: tool === "cut" ? 36 : 20,
            style:
              tool === "cut" && edge.id === hoveredCutEdgeId
                ? {
                    stroke: "#ef4444",
                    strokeWidth: 3.2,
                    filter: "drop-shadow(0 0 6px rgba(239,68,68,0.45))"
                  }
                : undefined
          }))}
          onNodesChange={onNodesChange}
          onNodeDragStart={() => {
            const state = useWorkflowStore.getState();
            pushHistory(state.nodes, state.edges);
          }}
          onNodeDragStop={() => {
            void saveNow().catch((error: unknown) => {
              console.error("Save after drag failed:", error);
            });
          }}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onPaneClick={() => {
            if (tool === "cut") {
              setTool("cursor");
              setHoveredCutEdgeId(null);
            }
          }}
          onPaneContextMenu={(event) => {
            event.preventDefault();
            addNodeAtPosition(
              "text",
              reactFlow.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY
              })
            );
          }}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.3}
          maxZoom={2}
          nodeTypes={nodeTypes}
          nodesDraggable={tool !== "hand"}
          elementsSelectable={tool !== "hand"}
          deleteKeyCode={null}
          multiSelectionKeyCode={["Meta", "Control"]}
          panOnScroll
          panOnDrag={tool === "hand" ? [0, 1] : false}
        >
          <Background color={theme === "dark" ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.18)"} gap={42} size={2.1} variant={BackgroundVariant.Dots} />

          <CanvasShell
            onOpenLibrary={openNodeLibrary}
            tool={tool}
            setTool={setTool}
            isNodeMenuOpen={isNodeMenuOpen}
            theme={theme}
            onToggleTheme={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
            onShare={handleShare}
            shareState={shareState}
            onOpenShortcuts={() => setIsShortcutsOpen(true)}
            onQuickAddLlm={() => addNodeAtViewportCenter("llm")}
            onFitWorkflow={fitWorkflow}
            onBack={() => void handleBackToWorkflowIndex()}
            onExport={handleExport}
            onImport={handleImport}
            rightPanelMode={rightPanelMode}
            onSelectRightPanel={setRightPanelMode}
          />

          {nodes.length === 0 && (
            <Panel position="top-left" className="!left-1/2 !top-1/2 !m-0 -translate-x-1/2 -translate-y-1/2">
              <button
                type="button"
                onClick={() => addNodeAtViewportCenter("text")}
                className="text-center"
              >
                <div className="text-[20px] font-medium tracking-[-0.04em] text-white/62">Add a text node</div>
                <div className="mt-2 text-[15px] tracking-[-0.04em] text-white/34">
                  Double click, right click, or press{" "}
                  <span className="rounded-[8px] bg-white/8 px-2 py-1 text-white/48">N</span>
                </div>
              </button>
            </Panel>
          )}
        </ReactFlow>

        <NodeCommandMenu
          open={isNodeMenuOpen}
          query={nodeMenuQuery}
          onQueryChange={setNodeMenuQuery}
          initialCategoryId={nodeMenuCategory}
          onClose={() => {
            setIsNodeMenuOpen(false);
            setNodeMenuQuery("");
            setNodeMenuCategory(null);
          }}
          onSelect={addNodeAtPosition}
        />

        <KeyboardShortcutsDialog open={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />

        {tool === "cut" && cutCursorPosition ? (
          <div
            className="pointer-events-none absolute z-[60] flex h-7 w-7 items-center justify-center rounded-full border border-black/25 bg-white/92 text-black shadow-[0_6px_16px_rgba(0,0,0,0.22)]"
            style={{
              left: cutCursorPosition.x,
              top: cutCursorPosition.y,
              transform: "translate(-10px, -10px)"
            }}
          >
            <Scissors className="h-4 w-4" strokeWidth={2.4} />
          </div>
        ) : null}
      </div>

      <WorkflowUtilityPanel mode={rightPanelMode} theme={theme} assets={assets} nodes={nodes} edges={edges} runs={runs} />

      <style jsx global>{`
        .react-flow__renderer {
          background: var(--bg-primary);
        }

        [data-tool="cursor"] .react-flow__pane {
          cursor: default;
        }

        [data-tool="hand"] .react-flow__pane {
          cursor: grab;
        }

        [data-tool="hand"] .react-flow__pane.dragging {
          cursor: grabbing;
        }

        [data-tool="cut"] .react-flow__pane,
        [data-tool="cut"] .react-flow__edge path,
        [data-tool="cut"] .react-flow__edge-interaction,
        [data-tool="cut"] .react-flow__edge {
          cursor: none;
        }

        [data-tool="cut"] .react-flow__edge-interaction {
          pointer-events: stroke;
        }

        .react-flow__edge path {
          stroke: #7c3aed;
          stroke-width: 2px;
        }

        .react-flow__edge.animated path {
          stroke-dasharray: 8 8;
          animation: edge-flow 900ms linear infinite;
        }

        .react-flow__edge.selected path {
          stroke: #a78bfa;
          stroke-width: 2.4px;
          filter: drop-shadow(0 0 6px rgba(139, 92, 246, 0.5));
        }

        .react-flow__handle {
          width: 12px;
          height: 12px;
          border: 2px solid #0e0e0e;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .react-flow__handle-left {
          transform: translate(-50%, -50%);
        }

        .react-flow__handle-right {
          transform: translate(50%, -50%);
        }

        .react-flow__handle-left:hover {
          transform: translate(-50%, -50%) scale(1.18);
          box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.5);
        }

        .react-flow__handle-right:hover {
          transform: translate(50%, -50%) scale(1.18);
          box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.5);
        }

        .react-flow__attribution {
          display: none;
        }
        .react-flow__controls {
          display: none;
        }
      `}</style>
    </div>
  );
}

export default function WorkflowCanvas(props: WorkflowCanvasProps) {
  return <WorkflowCanvasInner {...props} />;
}
