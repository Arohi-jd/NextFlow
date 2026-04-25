"use client";

import { useCallback, useEffect, useMemo } from "react";
import {
  Background,
  MiniMap,
  Panel,
  ReactFlow,
  useReactFlow,
  type Connection
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Download, Maximize, Play, Save, Upload, ZoomIn, ZoomOut } from "lucide-react";
import { nodeTypes } from "@/components/nodes/nodeTypes";
import { useKeyboardShortcuts } from "@/lib/hooks/useKeyboardShortcuts";
import { useWorkflowStore } from "@/lib/store/workflowStore";
import { normalizeConnection, showConnectionValidationError, validateConnection } from "@/lib/utils/connectionValidation";
import type { NodeData } from "@/lib/store/workflowStore";

interface WorkflowCanvasProps {
  workflowId: string;
}

function CanvasControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const saveWorkflow = useWorkflowStore((state) => state.saveWorkflow);
  const executeWorkflow = useWorkflowStore((state) => state.executeWorkflow);
  const importWorkflow = useWorkflowStore((state) => state.importWorkflow);
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const workflowName = useWorkflowStore((state) => state.workflowName);
  const selectedNodes = useWorkflowStore((state) => state.selectedNodes);
  const canRunSelected = selectedNodes.length > 0;

  return (
    <>
      <Panel position="bottom-left" className="flex gap-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/95 p-1 backdrop-blur">
        <button type="button" onClick={() => void zoomIn()} className="canvas-control-button" title="Zoom in">
          <ZoomIn className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => void zoomOut()} className="canvas-control-button" title="Zoom out">
          <ZoomOut className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => void fitView({ padding: 0.18 })} className="canvas-control-button" title="Fit view">
          <Maximize className="h-4 w-4" />
        </button>
      </Panel>

      <Panel position="top-center" className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/95 px-3 py-2 backdrop-blur">
        <button
          type="button"
          onClick={() => void saveWorkflow()}
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] transition hover:border-[var(--border-hover)]"
        >
          <Save className="h-3.5 w-3.5" />
          Save
        </button>
        <button
          type="button"
          onClick={() => void executeWorkflow("Selected")}
          disabled={!canRunSelected}
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] transition disabled:opacity-40 hover:border-[var(--border-hover)]"
        >
          <Play className="h-3.5 w-3.5" />
          Run Selected
        </button>
        <button
          type="button"
          onClick={() => void executeWorkflow("Full")}
          className="inline-flex items-center gap-1.5 rounded-md bg-[var(--accent-purple)] px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--accent-purple-bright)]"
        >
          <Play className="h-3.5 w-3.5" />
          Run All
        </button>
        <button
          type="button"
          onClick={() => {
            const blob = new Blob([JSON.stringify({ name: workflowName, nodes, edges }, null, 2)], {
              type: "application/json"
            });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = `${workflowName.toLowerCase().replace(/\s+/g, "-") || "workflow"}.json`;
            anchor.click();
            URL.revokeObjectURL(url);
          }}
          className="canvas-control-button"
          title="Export workflow"
        >
          <Download className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "application/json";
            input.onchange = () => {
              const file = input.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                const payload = JSON.parse(String(reader.result));
                importWorkflow({
                  name: payload.name,
                  nodes: payload.nodes,
                  edges: payload.edges
                });
              };
              reader.readAsText(file);
            };
            input.click();
          }}
          className="canvas-control-button"
          title="Import workflow"
        >
          <Upload className="h-4 w-4" />
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

  useEffect(() => {
    if (!isLoaded || useWorkflowStore.getState().workflowId !== workflowId) {
      void loadWorkflow(workflowId);
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

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const payload = event.dataTransfer.getData("application/json");
      if (!payload) return;

      const parsed = JSON.parse(payload) as { type?: "text" | "upload-image" | "upload-video" | "llm" | "crop-image" | "extract-frame" };
      if (!parsed.type) return;

      const position = reactFlow.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY
      });

      addNode(parsed.type, position);
    },
    [addNode, reactFlow]
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

      // Check for circular dependencies using BFS
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

          const outgoing = state.edges.filter((e) => e.source === current && !visited.has(e.target));
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

  const miniMapNodeColor = useMemo(
    () => (node: { data?: Record<string, unknown> }) => {
      const data = node.data as NodeData | undefined;
      switch (data?.type) {
        case "text":
          return "#3b82f6";
        case "upload-image":
          return "#8b5cf6";
        case "upload-video":
          return "#ec4899";
        case "llm":
          return "#22c55e";
        case "crop-image":
          return "#f59e0b";
        case "extract-frame":
          return "#06b6d4";
        default:
          return "#888";
      }
    },
    []
  );

  return (
    <div className="relative h-full min-h-0 w-full bg-[var(--bg-primary)]" onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
      <ReactFlow
        nodes={nodes}
        edges={edges.map((edge) => ({ ...edge, animated: true }))}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        minZoom={0.3}
        maxZoom={2}
        nodeTypes={nodeTypes}
        deleteKeyCode={null}
        multiSelectionKeyCode={["Meta", "Control"]}
        panOnScroll
        panOnDrag={[0, 1]}
      >
        <Background 
          color="#2a2a2a" 
          gap={24} 
          size={1}
        />
        <MiniMap
          position="bottom-right"
          nodeColor={miniMapNodeColor}
          style={{
            backgroundColor: "#111111",
            border: "1px solid #2a2a2a",
            borderRadius: "12px"
          }}
        />
        <CanvasControls />
      </ReactFlow>

      {nodes.length === 0 && (
        <Panel position="top-left" className="pointer-events-none left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="text-center text-sm text-[var(--text-muted)]">
            Drag nodes from the sidebar to get started
          </div>
        </Panel>
      )}

      <style jsx global>{`
        .canvas-control-button {
          display: inline-flex;
          height: 2rem;
          width: 2rem;
          align-items: center;
          justify-content: center;
          border-radius: 0.5rem;
          border: 1px solid var(--border-color);
          background: var(--bg-tertiary);
          color: var(--text-secondary);
          transition: 160ms ease;
        }

        .canvas-control-button:hover {
          border-color: var(--border-hover);
          color: var(--text-primary);
        }

        .react-flow__edge path {
          stroke: #8b5cf6;
          stroke-width: 2.2px;
        }

        .react-flow__edge.animated path {
          stroke-dasharray: 8 6;
          animation: edge-flow 900ms linear infinite;
        }

        .react-flow__handle {
          width: 12px;
          height: 12px;
          border: 2px solid #111111;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08);
        }

        .react-flow__node.selected {
          box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.18);
        }
      `}</style>
    </div>
  );
}

export default function WorkflowCanvas({ workflowId }: WorkflowCanvasProps) {
  return <WorkflowCanvasInner workflowId={workflowId} />;
}
