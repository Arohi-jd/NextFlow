import {
  addEdge as addReactFlowEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type XYPosition
} from "@xyflow/react";
import { create } from "zustand";
import type { FlowNodeType, NodeData, NodeType, RunScope, WorkflowRun } from "@/lib/types";
import { sanitizeNodesForTransport } from "@/lib/utils/persistence";

export type { NodeData } from "@/lib/types";

type HistorySnapshot = {
  nodes: Node<NodeData>[];
  edges: Edge[];
};

type SaveStatus = "saved" | "saving" | "error";

interface WorkflowStoreState {
  nodes: Node<NodeData>[];
  edges: Edge[];
  workflowId: string | null;
  workflowName: string;
  runs: WorkflowRun[];
  isRunning: boolean;
  runningNodes: Set<string>;
  saveStatus: SaveStatus;
  lastSavedAt: Date | null;
  history: HistorySnapshot[];
  historyIndex: number;
  selectedNodes: string[];
}

interface WorkflowStoreActions {
  initWorkflow: (id: string, name: string, nodes: Node<NodeData>[], edges: Edge[], runs: WorkflowRun[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (type: FlowNodeType, position: XYPosition) => void;
  updateNodeData: (nodeId: string, partialData: Partial<NodeData>) => void;
  setWorkflowName: (name: string) => void;
  setRunningNode: (nodeId: string, isRunning: boolean) => void;
  addRun: (run: WorkflowRun) => void;
  updateRun: (runId: string, updates: Partial<WorkflowRun>) => void;
  triggerSave: () => void;
  saveNow: () => Promise<void>;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  pushHistory: (nodes: Node<NodeData>[], edges: Edge[]) => void;
  clearCanvas: () => void;
  removeEdge: (edgeId: string) => void;
  removeNode: (nodeId: string) => void;
  removeSelectedNodes: () => void;
  duplicateSelectedNodes: () => void;
  clearSelection: () => void;
  selectAllNodes: () => void;
  setNodes: (nodes: Node<NodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;
  importWorkflow: (payload: { name?: string; nodes: Node<NodeData>[]; edges: Edge[] }) => void;
  refreshHistory: () => Promise<void>;
  executeWorkflow: (scope: RunScope) => Promise<WorkflowRun>;
}

type WorkflowStore = WorkflowStoreState & WorkflowStoreActions;

const MAX_HISTORY = 50;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

const flowTypeToEnum: Record<FlowNodeType, NodeType> = {
  text: "TEXT" as NodeType,
  "upload-image": "UPLOAD_IMAGE" as NodeType,
  "upload-video": "UPLOAD_VIDEO" as NodeType,
  llm: "LLM" as NodeType,
  "crop-image": "CROP_IMAGE" as NodeType,
  "extract-frame": "EXTRACT_FRAME" as NodeType
};

const flowTypeToLabel: Record<FlowNodeType, string> = {
  text: "Text",
  "upload-image": "Image",
  "upload-video": "Video",
  llm: "LLM",
  "crop-image": "Crop Image",
  "extract-frame": "Extract Frame"
};

function createNode(type: FlowNodeType, position: XYPosition): Node<NodeData> {
  const id = `${type}-${crypto.randomUUID()}`;

  const baseData: NodeData = {
    label: flowTypeToLabel[type],
    type,
    nodeType: flowTypeToEnum[type],
    status: "pending",
    error: null
  };

  if (type === "text") baseData.text = "";
  if (type === "llm") baseData.model = "llama-3.3-70b-versatile";
  if (type === "crop-image") {
    baseData.xPercent = 0;
    baseData.yPercent = 0;
    baseData.widthPercent = 100;
    baseData.heightPercent = 100;
  }
  if (type === "extract-frame") baseData.timestamp = "0";

  return {
    id,
    type,
    position,
    data: baseData
  };
}

function sanitizeNodes(nodes: Node<NodeData>[]): Node<NodeData>[] {
  return sanitizeNodesForTransport(nodes);
}

function cloneSnapshot(nodes: Node<NodeData>[], edges: Edge[]): HistorySnapshot {
  return {
    nodes: structuredClone(nodes),
    edges: structuredClone(edges)
  };
}

function isMeaningfulNodeChange(changes: NodeChange[]): boolean {
  return changes.some((change) => change.type !== "select");
}

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  nodes: [],
  edges: [],
  workflowId: null,
  workflowName: "Untitled Workflow",
  runs: [],
  isRunning: false,
  runningNodes: new Set<string>(),
  saveStatus: "saved",
  lastSavedAt: null,
  history: [],
  historyIndex: 0,
  selectedNodes: [],

  initWorkflow(id, name, nodes, edges, runs) {
    const sanitizedNodes = sanitizeNodes(nodes).map((node) => ({
      ...node,
      data: {
        ...node.data,
        status: undefined,
        error: null
      }
    }));

    set({
      workflowId: id,
      workflowName: name,
      nodes: sanitizedNodes,
      edges: structuredClone(edges),
      runs,
      isRunning: false,
      runningNodes: new Set<string>(),
      saveStatus: "saved",
      lastSavedAt: null,
      history: [cloneSnapshot(sanitizedNodes, edges)],
      historyIndex: 0,
      selectedNodes: []
    });
  },

  onNodesChange(changes) {
    const currentEdges = get().edges;
    set((state) => {
      const nextNodes = applyNodeChanges(changes, state.nodes) as Node<NodeData>[];

      if (state.nodes.length > 0 && nextNodes.length === 0) {
        return state;
      }

      return {
        nodes: nextNodes,
        selectedNodes: nextNodes.filter((node) => node.selected).map((node) => node.id)
      };
    });

    if (isMeaningfulNodeChange(changes)) {
      get().pushHistory(get().nodes, currentEdges);
      get().triggerSave();
    }
  },

  onEdgesChange(changes) {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges)
    }));

    get().pushHistory(get().nodes, get().edges);
    get().triggerSave();
  },

  onConnect(connection) {
    set((state) => ({
      edges: addReactFlowEdge(
        {
          ...connection,
          id: `${connection.source}-${connection.target}-${crypto.randomUUID()}`,
          animated: true,
          type: "smoothstep",
          style: {
            stroke: "#7c3aed",
            strokeWidth: 2
          }
        },
        state.edges
      )
    }));

    get().pushHistory(get().nodes, get().edges);
    get().triggerSave();
  },

  addNode(type, position) {
    set((state) => ({
      nodes: [...state.nodes, createNode(type, position)]
    }));
    get().pushHistory(get().nodes, get().edges);
    get().triggerSave();
  },

  updateNodeData(nodeId, partialData) {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                ...partialData
              }
            }
          : node
      )
    }));
    get().triggerSave();
  },

  setWorkflowName(name) {
    set({ workflowName: name });
    get().triggerSave();
  },

  setRunningNode(nodeId, isRunning) {
    set((state) => {
      const next = new Set(state.runningNodes);
      if (isRunning) next.add(nodeId);
      else next.delete(nodeId);

      return {
        runningNodes: next,
        isRunning: next.size > 0
      };
    });
  },

  addRun(run) {
    set((state) => ({
      runs: [run, ...state.runs].slice(0, 100)
    }));
  },

  updateRun(runId, updates) {
    set((state) => ({
      runs: state.runs.map((run) => (run.id === runId ? { ...run, ...updates } : run))
    }));
  },

  triggerSave() {
    set({ saveStatus: "saving" });

    if (saveTimer) {
      clearTimeout(saveTimer);
    }

    saveTimer = setTimeout(() => {
      void get().saveNow();
    }, 1000);
  },

  async saveNow() {
    const state = get();
    if (!state.workflowId) return;

    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }

    set({ saveStatus: "saving" });

    try {
      const response = await fetch(`/api/workflows/${state.workflowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: state.workflowName,
          nodes: sanitizeNodes(state.nodes),
          edges: state.edges
        })
      });

      if (!response.ok) {
        throw new Error(`Save failed with status ${response.status}`);
      }

      await response.json();
      set({
        saveStatus: "saved",
        lastSavedAt: new Date()
      });
    } catch (error) {
      console.error("Workflow save failed:", error);
      set({ saveStatus: "error" });
    }
  },

  undo() {
    const state = get();
    if (state.historyIndex <= 0) return;

    const nextIndex = state.historyIndex - 1;
    const snapshot = state.history[nextIndex];
    if (!snapshot) return;

    set({
      nodes: structuredClone(snapshot.nodes),
      edges: structuredClone(snapshot.edges),
      historyIndex: nextIndex,
      selectedNodes: []
    });
    get().triggerSave();
  },

  redo() {
    const state = get();
    if (state.historyIndex >= state.history.length - 1) return;

    const nextIndex = state.historyIndex + 1;
    const snapshot = state.history[nextIndex];
    if (!snapshot) return;

    set({
      nodes: structuredClone(snapshot.nodes),
      edges: structuredClone(snapshot.edges),
      historyIndex: nextIndex,
      selectedNodes: []
    });
    get().triggerSave();
  },

  canUndo() {
    return get().historyIndex > 0;
  },

  canRedo() {
    const state = get();
    return state.historyIndex < state.history.length - 1;
  },

  pushHistory(nodes, edges) {
    set((state) => {
      const trimmed = state.history.slice(0, state.historyIndex + 1);
      const snapshot = cloneSnapshot(nodes, edges);
      const previous = trimmed.at(-1);

      if (previous && JSON.stringify(previous) === JSON.stringify(snapshot)) {
        return state;
      }

      const nextHistory = [...trimmed, snapshot].slice(-MAX_HISTORY);

      return {
        history: nextHistory,
        historyIndex: nextHistory.length - 1
      };
    });
  },

  clearCanvas() {
    set({
      nodes: [],
      edges: [],
      history: [cloneSnapshot([], [])],
      historyIndex: 0,
      selectedNodes: []
    });
    get().triggerSave();
  },

  removeEdge(edgeId) {
    set((state) => ({
      edges: state.edges.filter((edge) => edge.id !== edgeId)
    }));
    get().pushHistory(get().nodes, get().edges);
    get().triggerSave();
  },

  removeNode(nodeId) {
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== nodeId),
      edges: state.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      selectedNodes: state.selectedNodes.filter((id) => id !== nodeId)
    }));
    get().pushHistory(get().nodes, get().edges);
    get().triggerSave();
  },

  removeSelectedNodes() {
    const selected = new Set(get().selectedNodes);
    if (selected.size === 0) return;

    set((state) => ({
      nodes: state.nodes.filter((node) => !selected.has(node.id)),
      edges: state.edges.filter((edge) => !selected.has(edge.source) && !selected.has(edge.target)),
      selectedNodes: []
    }));
    get().pushHistory(get().nodes, get().edges);
    get().triggerSave();
  },

  duplicateSelectedNodes() {
    const selected = new Set(get().selectedNodes);
    if (selected.size === 0) return;

    set((state) => {
      const selectedNodes = state.nodes.filter((node) => selected.has(node.id));
      const selectedEdges = state.edges.filter((edge) => selected.has(edge.source) && selected.has(edge.target));
      const idMap = new Map<string, string>();

      const duplicatedNodes = selectedNodes.map((node) => {
        const newId = `${node.id.split("-")[0]}-${crypto.randomUUID()}`;
        idMap.set(node.id, newId);
        return {
          ...structuredClone(node),
          id: newId,
          position: {
            x: node.position.x + 20,
            y: node.position.y + 20
          },
          selected: true
        };
      });

      const duplicatedEdges = selectedEdges.map((edge) => ({
        ...structuredClone(edge),
        id: `${idMap.get(edge.source)}-${idMap.get(edge.target)}-${crypto.randomUUID()}`,
        source: idMap.get(edge.source) ?? edge.source,
        target: idMap.get(edge.target) ?? edge.target
      }));

      return {
        nodes: [...state.nodes, ...duplicatedNodes],
        edges: [...state.edges, ...duplicatedEdges],
        selectedNodes: duplicatedNodes.map((node) => node.id)
      };
    });

    get().pushHistory(get().nodes, get().edges);
    get().triggerSave();
  },

  clearSelection() {
    set((state) => ({
      nodes: state.nodes.map((node) => ({ ...node, selected: false })),
      selectedNodes: []
    }));
  },

  selectAllNodes() {
    set((state) => ({
      nodes: state.nodes.map((node) => ({ ...node, selected: true })),
      selectedNodes: state.nodes.map((node) => node.id)
    }));
  },

  setNodes(nodes) {
    set({ nodes });
    get().pushHistory(nodes, get().edges);
    get().triggerSave();
  },

  setEdges(edges) {
    set({ edges });
    get().pushHistory(get().nodes, edges);
    get().triggerSave();
  },

  importWorkflow(payload) {
    set((state) => ({
      workflowName: payload.name ?? state.workflowName,
      nodes: payload.nodes,
      edges: payload.edges,
      selectedNodes: [],
      history: [cloneSnapshot(payload.nodes, payload.edges)],
      historyIndex: 0
    }));
    get().triggerSave();
  },

  async refreshHistory() {
    const workflowId = get().workflowId;
    if (!workflowId) return;

    const response = await fetch(`/api/workflows/${workflowId}`, {
      method: "GET",
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh workflow history (${response.status})`);
    }

    const payload = (await response.json()) as { workflow: { runs?: WorkflowRun[] } };

    set({
      runs: Array.isArray(payload.workflow?.runs) ? payload.workflow.runs : []
    });
  },

  async executeWorkflow(scope) {
    const state = get();
    if (!state.workflowId) {
      throw new Error("Workflow must be created before execution.");
    }

    await get().saveNow();

    const runScope: RunScope = scope === "Selected" && state.selectedNodes.length === 1 ? "Single" : scope;
    const activeNodeIds = runScope === "Full" ? state.nodes.map((node) => node.id) : [...state.selectedNodes];

    set({
      isRunning: true,
      runningNodes: new Set(activeNodeIds),
      nodes: state.nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          status: "pending",
          error: null
        }
      }))
    });

    const response = await fetch("/api/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workflowId: state.workflowId,
        workflowName: get().workflowName,
        nodes: sanitizeNodes(get().nodes),
        edges: get().edges,
        scope: runScope,
        selectedNodeIds: get().selectedNodes
      })
    });

    if (!response.ok) {
      let errorMessage = "Failed to execute workflow";

      try {
        const payload = (await response.json()) as { error?: string; details?: string };
        errorMessage = payload.details || payload.error || errorMessage;
      } catch {
        try {
          const text = await response.text();
          if (text) errorMessage = text;
        } catch {
          // ignore
        }
      }

      set({
        isRunning: false,
        runningNodes: new Set<string>(),
        nodes: get().nodes.map((node) =>
          activeNodeIds.includes(node.id)
            ? {
                ...node,
                data: {
                  ...node.data,
                  status: "failed",
                  error: errorMessage
                }
              }
            : node
        )
      });

      throw new Error(errorMessage);
    }

    const payload = (await response.json()) as { run: WorkflowRun };
    const run = payload.run;
    const executionByNodeId = new Map(run.executions.map((execution) => [execution.nodeId, execution]));

    set((current) => ({
      isRunning: false,
      runningNodes: new Set<string>(),
      runs: [run, ...current.runs].slice(0, 100),
      nodes: current.nodes.map((node) => {
        const execution = executionByNodeId.get(node.id);
        if (!execution) return node;

        const outputs = execution.outputs ?? {};
        return {
          ...node,
          data: {
            ...node.data,
            status: execution.status,
            error: execution.error ?? null,
            output: typeof outputs.output === "string" ? outputs.output : node.data.output,
            outputUrl: typeof outputs.outputUrl === "string" ? outputs.outputUrl : node.data.outputUrl,
            imageUrl:
              typeof outputs.outputUrl === "string" && node.type !== "upload-image" ? outputs.outputUrl : node.data.imageUrl,
            videoUrl:
              typeof outputs.outputUrl === "string" && node.type === "upload-video" ? outputs.outputUrl : node.data.videoUrl
          }
        };
      })
    }));

    return run;
  }
}));
