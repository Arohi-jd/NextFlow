"use client";

import { useCallback, useEffect, useMemo, useState, type DragEvent } from "react";
import {
  Background,
  BackgroundVariant,
  Panel,
  ReactFlow,
  useReactFlow,
  type Connection,
  type XYPosition
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Clock3,
  Hand,
  Image as ImageIcon,
  ImagePlus,
  Loader2,
  Moon,
  MousePointer2,
  Plus,
  Play,
  Scissors,
  Sparkles,
  Type,
  Undo2,
  Redo2,
  Video,
  Workflow
} from "lucide-react";
import { nodeTypes } from "@/components/nodes/nodeTypes";
import RightSidebar from "@/components/sidebar/RightSidebar";
import { useKeyboardShortcuts } from "@/lib/hooks/useKeyboardShortcuts";
import { useWorkflowStore } from "@/lib/store/workflowStore";
import type { FlowNodeType, RunScope } from "@/lib/types";
import { normalizeConnection, showConnectionValidationError, validateConnection } from "@/lib/utils/connectionValidation";

interface WorkflowCanvasProps {
  workflowId: string;
}

const DEFAULT_NODE_POSITION: XYPosition = { x: 280, y: 180 };

const NODE_MENU_ITEMS: Array<{
  type: FlowNodeType;
  label: string;
  section: string;
  description: string;
  keywords: string[];
  icon: typeof Type;
}> = [
  {
    type: "text",
    label: "Text",
    section: "Recent",
    description: "Prompt or free text input",
    keywords: ["text", "prompt", "copy", "message"],
    icon: Type
  },
  {
    type: "llm",
    label: "Run Any LLM",
    section: "Recent",
    description: "Use a language model node",
    keywords: ["llm", "ai", "model", "gemini", "llama"],
    icon: Sparkles
  },
  {
    type: "upload-image",
    label: "Upload Image",
    section: "Image",
    description: "Bring an image into the workflow",
    keywords: ["image", "upload", "photo"],
    icon: ImagePlus
  },
  {
    type: "crop-image",
    label: "Crop Image",
    section: "Image",
    description: "Crop an input image",
    keywords: ["crop", "image", "edit"],
    icon: ImageIcon
  },
  {
    type: "upload-video",
    label: "Upload Video",
    section: "Video",
    description: "Bring a video into the workflow",
    keywords: ["video", "upload", "movie"],
    icon: Video
  },
  {
    type: "extract-frame",
    label: "Extract Frame",
    section: "Video",
    description: "Grab a still from a video",
    keywords: ["frame", "video", "still"],
    icon: Workflow
  }
];

function NodeCommandMenu({
  open,
  query,
  onQueryChange,
  onClose,
  onSelect
}: {
  open: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  onClose: () => void;
  onSelect: (type: FlowNodeType) => void;
}) {
  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return NODE_MENU_ITEMS;

    return NODE_MENU_ITEMS.filter((item) =>
      [item.label, item.description, item.section, ...item.keywords].some((value) => value.toLowerCase().includes(normalized))
    );
  }, [query]);

  const sections = useMemo(() => {
    const grouped = new Map<string, typeof filteredItems>();

    filteredItems.forEach((item) => {
      const existing = grouped.get(item.section) ?? [];
      grouped.set(item.section, [...existing, item]);
    });

    return Array.from(grouped.entries());
  }, [filteredItems]);

  if (!open) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
      <button type="button" aria-label="Close add node menu" className="absolute inset-0 pointer-events-auto" onClick={onClose} />

      <div className="pointer-events-auto relative z-10 w-[390px] max-w-[calc(100vw-40px)] overflow-hidden rounded-[20px] border border-white/10 bg-[#0b0b0b] shadow-[0_30px_80px_rgba(0,0,0,0.58)]">
        <div className="border-b border-white/8 px-4 py-3.5">
          <div className="flex items-center gap-3 rounded-[14px] bg-transparent text-white/78">
            <Sparkles className="h-5 w-5 text-white/55" />
            <input
              autoFocus
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search nodes or models..."
              className="w-full bg-transparent text-[15px] text-white outline-none placeholder:text-white/38"
            />
          </div>
        </div>

        <div className="max-h-[520px] overflow-y-auto px-3 py-2">
          {sections.length === 0 ? (
            <div className="px-3 py-8 text-center text-[14px] text-white/42">No nodes found</div>
          ) : (
            sections.map(([section, items]) => (
              <div key={section} className="py-2">
                <div className="mb-2 flex items-center gap-2 px-2 text-[13px] text-white/42">
                  {section === "Recent" ? <Clock3 className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                  <span>{section}</span>
                </div>
                <div className="space-y-1">
                  {items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => onSelect(item.type)}
                        className="flex w-full items-center gap-3 rounded-[12px] px-2.5 py-2.5 text-left text-white transition hover:bg-white/8"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-white/5 text-white/72">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[15px] font-medium tracking-[-0.03em] text-white">{item.label}</div>
                          <div className="truncate text-[12px] text-white/34">{item.description}</div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-white/34" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function CanvasShell({
  onOpenLibrary,
  tool,
  setTool,
  isNodeMenuOpen
}: {
  onOpenLibrary: () => void;
  tool: string;
  setTool: (tool: string) => void;
  isNodeMenuOpen: boolean;
}) {
  const workflowName = useWorkflowStore((state) => state.workflowName);
  const setWorkflowName = useWorkflowStore((state) => state.setWorkflowName);
  const undo = useWorkflowStore((state) => state.undo);
  const redo = useWorkflowStore((state) => state.redo);
  const executeWorkflow = useWorkflowStore((state) => state.executeWorkflow);
  const isRunning = useWorkflowStore((state) => state.isRunning);
  const selectedNodes = useWorkflowStore((state) => state.selectedNodes);
  const saveState = useWorkflowStore((state) => state.saveState);
  const lastSavedAt = useWorkflowStore((state) => state.lastSavedAt);
  const [isEditingName, setIsEditingName] = useState(false);

  const saveLabel = useMemo(() => {
    if (saveState === "saving") return "Saving...";
    if (saveState === "saved" && lastSavedAt) return "Saved";
    if (saveState === "error") return "Save failed";
    return "Autosave";
  }, [lastSavedAt, saveState]);

  const runScope: RunScope = selectedNodes.length === 1 ? "Single" : "Selected";

  return (
    <>
      <Panel position="top-left" className="!m-5">
        <div className="inline-flex items-center gap-3 rounded-[18px] bg-[#232323] px-5 py-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
          <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#191919]">
            <Sparkles className="h-6 w-6 fill-current text-white" />
          </span>
          <ChevronDown className="h-4 w-4 text-white/72" />
          {isEditingName ? (
            <input
              autoFocus
              value={workflowName || ""}
              onChange={(event) => setWorkflowName(event.target.value)}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(event) => {
                if (event.key === "Enter") setIsEditingName(false);
                if (event.key === "Escape") setIsEditingName(false);
              }}
              className="min-w-[220px] bg-transparent text-[18px] font-medium tracking-[-0.03em] text-white outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingName(true)}
              className="text-[18px] font-medium tracking-[-0.03em] text-white"
            >
              {workflowName || "Untitled"}
            </button>
          )}
        </div>
      </Panel>

      <Panel position="top-right" className="!m-5 flex items-center gap-2.5">
        <button
          type="button"
          className="flex h-[48px] w-[48px] items-center justify-center rounded-[16px] bg-[#232323] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
          aria-label="Theme"
        >
          <Moon className="h-5 w-5 fill-current" />
        </button>
        <button
          type="button"
          onClick={() => void executeWorkflow("Full")}
          disabled={isRunning}
          className="inline-flex h-[48px] items-center gap-2.5 rounded-[16px] bg-[#232323] px-5 text-[14px] font-medium tracking-[-0.03em] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] disabled:opacity-60"
        >
          {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
          Run workflow
        </button>
        <button
          type="button"
          onClick={() => void executeWorkflow(runScope)}
          disabled={isRunning || selectedNodes.length === 0}
          className="inline-flex h-[48px] items-center gap-2.5 rounded-[16px] bg-[#232323] px-5 text-[14px] font-medium tracking-[-0.03em] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] disabled:opacity-40"
        >
          <Workflow className="h-4 w-4" />
          {selectedNodes.length <= 1 ? "Run node" : `Run selected (${selectedNodes.length})`}
        </button>
        <div className="inline-flex h-[48px] items-center gap-2 rounded-[16px] bg-[#232323] px-4 text-[13px] font-medium text-white/72 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
          {saveState === "saved" ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Circle className="h-3 w-3 fill-current text-white/35" />}
          {saveLabel}
        </div>
      </Panel>

      <Panel position="bottom-left" className="!mb-5 !ml-5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => undo()}
          className="flex h-[48px] w-[48px] items-center justify-center rounded-[14px] bg-[#232323] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
          aria-label="Undo"
        >
          <Undo2 className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => redo()}
          className="flex h-[48px] w-[48px] items-center justify-center rounded-[14px] bg-[#232323] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
          aria-label="Redo"
        >
          <Redo2 className="h-5 w-5" />
        </button>
        <div className="inline-flex h-[48px] items-center gap-3 rounded-[14px] bg-[#232323] px-5 text-[14px] tracking-[-0.03em] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
          <span className="text-[18px]">⌘</span>
          <span className="leading-tight">A select all</span>
        </div>
      </Panel>

      <Panel position="bottom-center" className="!mb-5">
        <div className="inline-flex items-center gap-1 rounded-[20px] bg-[#232323] p-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
          {[
            { id: "plus", icon: <Plus className="h-6 w-6" /> },
            { id: "cursor", icon: <MousePointer2 className="h-6 w-6" /> },
            { id: "hand", icon: <Hand className="h-6 w-6" /> },
            { id: "cut", icon: <Scissors className="h-6 w-6" /> },
            { id: "sparkles", icon: <Sparkles className="h-6 w-6" /> },
            { id: "nodes", icon: <span className="text-[26px] leading-none">⌘</span> }
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (item.id === "plus") {
                  onOpenLibrary();
                } else {
                  setTool(item.id);
                }
              }}
              className={`flex h-[64px] w-[64px] items-center justify-center rounded-[18px] text-white transition ${
                (item.id === "plus" && isNodeMenuOpen) || tool === item.id ? "bg-[#4a4a4a]" : "bg-transparent hover:bg-white/6"
              }`}
            >
              {item.icon}
            </button>
          ))}
        </div>
      </Panel>

      <Panel position="bottom-right" className="!mb-5 !mr-5">
        <button
          type="button"
          onClick={onOpenLibrary}
          className="flex h-[64px] w-[64px] items-center justify-center rounded-full bg-[#232323] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
          aria-label="Open library"
        >
          <Sparkles className="h-7 w-7" />
        </button>
      </Panel>
    </>
  );
}

function WorkflowCanvasInner({ workflowId }: WorkflowCanvasProps) {
  useKeyboardShortcuts();

  const reactFlow = useReactFlow();
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const isLoaded = useWorkflowStore((state) => state.isLoaded);
  const loadWorkflow = useWorkflowStore((state) => state.loadWorkflow);
  const addNode = useWorkflowStore((state) => state.addNode);
  const onNodesChange = useWorkflowStore((state) => state.onNodesChange);
  const onEdgesChange = useWorkflowStore((state) => state.onEdgesChange);
  const connectNodes = useWorkflowStore((state) => state.connectNodes);
  const workflowName = useWorkflowStore((state) => state.workflowName);
  const saveWorkflow = useWorkflowStore((state) => state.saveWorkflow);
  const executeWorkflow = useWorkflowStore((state) => state.executeWorkflow);
  const selectedNodes = useWorkflowStore((state) => state.selectedNodes);
  const [isRightCollapsed, setIsRightCollapsed] = useState(true);
  const [tool, setTool] = useState("cursor");
  const [pendingNodePosition, setPendingNodePosition] = useState<XYPosition | null>(null);
  const [isNodeMenuOpen, setIsNodeMenuOpen] = useState(false);
  const [nodeMenuQuery, setNodeMenuQuery] = useState("");

  useEffect(() => {
    if (!isLoaded || useWorkflowStore.getState().workflowId !== workflowId) {
      void loadWorkflow(workflowId).catch((error) => {
        console.error("Workflow load failed:", error);
      });
    }
  }, [isLoaded, loadWorkflow, workflowId]);

  useEffect(() => {
    if (!isLoaded) return;

    const timeout = window.setTimeout(() => {
      void saveWorkflow().catch((error) => {
        console.error("Autosave failed:", error);
      });
    }, 800);

    return () => window.clearTimeout(timeout);
  }, [edges, isLoaded, nodes, saveWorkflow, workflowName]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isInput =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.getAttribute("contenteditable") === "true";

      if (isInput) return;

      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        setIsNodeMenuOpen(true);
      }

      if (event.key === "Escape") {
        setIsNodeMenuOpen(false);
        setNodeMenuQuery("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const addNodeAtPosition = useCallback(
    (type: FlowNodeType, position?: XYPosition | null) => {
      addNode(type, position ?? pendingNodePosition ?? DEFAULT_NODE_POSITION);
      setPendingNodePosition(null);
      setIsNodeMenuOpen(false);
      setNodeMenuQuery("");
    },
    [addNode, pendingNodePosition]
  );

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const payload = event.dataTransfer.getData("application/json");
      if (!payload) return;

      const parsed = JSON.parse(payload) as { type?: "text" | "upload-image" | "upload-video" | "llm" | "crop-image" | "extract-frame" };
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

      connectNodes(normalizedConnection);
    },
    [connectNodes]
  );

  return (
    <div className="flex h-screen min-h-screen w-full bg-[#111111]">
      <div
        className="relative min-w-0 flex-1"
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
        onDoubleClick={(event) => {
          const target = event.target as HTMLElement;
          if (!target.closest(".react-flow__pane")) return;

          setPendingNodePosition(
            reactFlow.screenToFlowPosition({
              x: event.clientX,
              y: event.clientY
            })
          );
          setIsNodeMenuOpen(true);
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges.map((edge) => ({ ...edge, animated: true }))}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onPaneContextMenu={(event) => {
            event.preventDefault();
            setPendingNodePosition(
              reactFlow.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY
              })
            );
            setIsNodeMenuOpen(true);
          }}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.3}
          maxZoom={2}
          nodeTypes={nodeTypes}
          deleteKeyCode={null}
          multiSelectionKeyCode={["Meta", "Control"]}
          panOnScroll
          panOnDrag={[0, 1]}
        >
          <Background color="#242424" gap={40} size={1.4} variant={BackgroundVariant.Dots} />
          <CanvasShell onOpenLibrary={() => setIsNodeMenuOpen(true)} tool={tool} setTool={setTool} isNodeMenuOpen={isNodeMenuOpen} />

          {nodes.length === 0 && (
            <Panel position="top-left" className="!left-1/2 !top-1/2 !m-0 -translate-x-1/2 -translate-y-1/2">
              <button
                type="button"
                onClick={() => setIsNodeMenuOpen(true)}
                className="text-center"
              >
                <div className="text-[24px] font-medium tracking-[-0.04em] text-white/62">Add a node</div>
                <div className="mt-3 text-[18px] tracking-[-0.04em] text-white/34">
                  Double click, right click, or press{" "}
                  <span className="rounded-[10px] bg-white/8 px-2 py-1 text-white/48">N</span>
                </div>
              </button>
            </Panel>
          )}
        </ReactFlow>

        <NodeCommandMenu
          open={isNodeMenuOpen}
          query={nodeMenuQuery}
          onQueryChange={setNodeMenuQuery}
          onClose={() => {
            setIsNodeMenuOpen(false);
            setNodeMenuQuery("");
          }}
          onSelect={addNodeAtPosition}
        />
      </div>

      <RightSidebar isCollapsed={isRightCollapsed} onCollapsedChange={setIsRightCollapsed} />

      <style jsx global>{`
        .react-flow__renderer {
          background: #111111;
        }

        .react-flow__pane {
          cursor: default;
        }

        .react-flow__edge path {
          stroke: #7a6522;
          stroke-width: 2.6px;
        }

        .react-flow__edge.animated path {
          stroke-dasharray: 10 10;
          animation: edge-flow 1100ms linear infinite;
        }

        .react-flow__handle {
          width: 13px;
          height: 13px;
          border: 2px solid #181818;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08);
        }

        .react-flow__attribution {
          display: none;
        }
      `}</style>
    </div>
  );
}

export default function WorkflowCanvas({ workflowId }: WorkflowCanvasProps) {
  return <WorkflowCanvasInner workflowId={workflowId} />;
}
