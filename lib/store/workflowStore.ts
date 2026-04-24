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
import { applySampleMediaDefaults, createSampleWorkflow } from "@/lib/utils/sampleWorkflow";
import { sanitizeNodesForTransport } from "@/lib/utils/persistence";
import type { FlowNodeType, NodeData, NodeType, RunScope, WorkflowRun } from "@/lib/types";

export type { NodeData } from "@/lib/types";

type WorkflowSnapshot = {
  nodes: Node<NodeData>[];
  edges: Edge[];
  workflowName: string;
};

interface WorkflowStoreState {
  nodes: Node<NodeData>[];
  edges: Edge[];
  workflowId: string | null;
  workflowName: string;
  runs: WorkflowRun[];
  isRunning: boolean;
  runningNodes: Set<string>;
  selectedNodes: string[];
  isLoaded: boolean;
  saveState: "idle" | "saving" | "saved" | "error";
  lastSavedAt: string | null;
  lastSavedPayload: string | null;
  past: WorkflowSnapshot[];
  future: WorkflowSnapshot[];
}

interface WorkflowStoreActions {
  loadWorkflow: (id: string) => Promise<void>;
  saveWorkflow: () => Promise<void>;
  setWorkflowName: (name: string, options?: { recordHistory?: boolean }) => void;
  addNode: (type: FlowNodeType, position: XYPosition) => void;
  updateNodeData: (nodeId: string, data: Partial<NodeData>) => void;
  removeNode: (nodeId: string) => void;
  removeSelectedNodes: () => void;
  duplicateSelectedNodes: () => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  connectNodes: (connection: Connection) => void;
  clearSelection: () => void;
  selectAllNodes: () => void;
  importWorkflow: (payload: { name?: string; nodes: Node<NodeData>[]; edges: Edge[] }) => void;
  loadSampleWorkflow: () => void;
  refreshHistory: () => Promise<void>;
  executeWorkflow: (scope: RunScope) => Promise<WorkflowRun>;
  undo: () => void;
  redo: () => void;
}

type WorkflowStore = WorkflowStoreState & WorkflowStoreActions;

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
  "upload-image": "Upload Image",
  "upload-video": "Upload Video",
  llm: "Run LLM",
  "crop-image": "Crop Image",
  "extract-frame": "Extract Frame"
};

function createNode(type: FlowNodeType, position: XYPosition): Node<NodeData> {
  const id = `${type}-${crypto.randomUUID()}`;

  const baseData: NodeData = {
    label: flowTypeToLabel[type],
    type,
    nodeType: flowTypeToEnum[type],
    status: "pending"
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

function cloneSnapshot(state: WorkflowStoreState): WorkflowSnapshot {
  return {
    nodes: structuredClone(state.nodes),
    edges: structuredClone(state.edges),
    workflowName: state.workflowName
  };
}

function snapshotFromValues(nodes: Node<NodeData>[], edges: Edge[], workflowName: string): WorkflowSnapshot {
  return {
    nodes: structuredClone(nodes),
    edges: structuredClone(edges),
    workflowName
  };
}

function sanitizeNodes(nodes: Node<NodeData>[]): Node<NodeData>[] {
  return sanitizeNodesForTransport(nodes);
}

function hydrateNodeOutputs(nodes: Node<NodeData>[], run: WorkflowRun): Node<NodeData>[] {
  const executionByNodeId = new Map(run.executions.map((execution) => [execution.nodeId, execution]));

  return nodes.map((node) => {
    const execution = executionByNodeId.get(node.id);
    if (!execution) return { ...node, data: { ...node.data, status: undefined, error: undefined } };

    const outputs = execution.outputs ?? {};

    return {
      ...node,
      data: {
        ...node.data,
        status: execution.status,
        error: execution.error,
        output: typeof outputs.output === "string" ? outputs.output : node.data.output,
        outputUrl: typeof outputs.outputUrl === "string" ? outputs.outputUrl : node.data.outputUrl,
        imageUrl: typeof outputs.outputUrl === "string" && node.type !== "upload-image" ? outputs.outputUrl : node.data.imageUrl,
        videoUrl: typeof outputs.outputUrl === "string" && node.type !== "upload-video" ? outputs.outputUrl : node.data.videoUrl
      }
    };
  });
}

async function fetchWorkflow(workflowId: string): Promise<{
  id: string;
  name: string;
  nodes: Node<NodeData>[];
  edges: Edge[];
  runs: WorkflowRun[];
}> {
  const response = await fetch(`/api/workflows/${workflowId}`);
  if (!response.ok) throw new Error("Failed to load workflow");
  return response.json();
}

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  nodes: [],
  edges: [],
  workflowId: null,
  workflowName: "Untitled Workflow",
  runs: [],
  isRunning: false,
  runningNodes: new Set<string>(),
  selectedNodes: [],
  isLoaded: false,
  saveState: "idle",
  lastSavedAt: null,
  lastSavedPayload: null,
  past: [],
  future: [],

  async loadWorkflow(id) {
    const payload = await fetchWorkflow(id);
    const hydratedNodes = applySampleMediaDefaults(payload.name, payload.nodes);
    set({
      workflowId: payload.id,
      workflowName: payload.name,
      nodes: hydratedNodes,
      edges: payload.edges,
      runs: payload.runs,
      isLoaded: true,
      lastSavedPayload: JSON.stringify({
        name: payload.name,
        nodes: sanitizeNodes(hydratedNodes),
        edges: payload.edges
      }),
      past: [],
      future: [],
      selectedNodes: [],
      runningNodes: new Set<string>()
    });
  },

  async refreshHistory() {
    const workflowId = get().workflowId;
    if (!workflowId) return;
    const payload = await fetchWorkflow(workflowId);
    set({
      runs: payload.runs
    });
  },

  async saveWorkflow() {
    const state = get();
    const payloadSignature = JSON.stringify({
      name: state.workflowName,
      nodes: sanitizeNodes(state.nodes),
      edges: state.edges
    });

    if (state.lastSavedPayload === payloadSignature || state.saveState === "saving") {
      return;
    }

    set({ saveState: "saving" });

    const response = await fetch("/api/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: state.workflowId ?? undefined,
        name: state.workflowName,
        nodes: sanitizeNodes(state.nodes),
        edges: state.edges
      })
    });

    if (!response.ok) {
      set({ saveState: "error" });
      const details = await response.text();
      throw new Error(`Failed to save workflow: ${details}`);
    }

    const payload: { workflow: { id: string } } = await response.json();
    set({
      workflowId: payload.workflow.id,
      saveState: "saved",
      lastSavedAt: new Date().toISOString(),
      lastSavedPayload: payloadSignature
    });
  },

  setWorkflowName(name, options) {
    set((state) => ({
      workflowName: name,
      lastSavedPayload: options?.recordHistory === false ? state.lastSavedPayload : null,
      past: options?.recordHistory === false ? state.past : [...state.past, cloneSnapshot(state)].slice(-100),
      future: options?.recordHistory === false ? state.future : []
    }));
  },

  addNode(type, position) {
    set((state) => ({
      nodes: [...state.nodes, createNode(type, position)],
      lastSavedPayload: null,
      past: [...state.past, cloneSnapshot(state)].slice(-100),
      future: []
    }));
  },

  updateNodeData(nodeId, data) {
    set((state) => ({
      nodes: state.nodes.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node)),
      lastSavedPayload: null
    }));
  },

  removeNode(nodeId) {
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== nodeId),
      edges: state.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      lastSavedPayload: null,
      past: [...state.past, cloneSnapshot(state)].slice(-100),
      future: []
    }));
  },

  removeSelectedNodes() {
    const selected = new Set(get().selectedNodes);
    if (selected.size === 0) return;

    set((state) => ({
      nodes: state.nodes.filter((node) => !selected.has(node.id)),
      edges: state.edges.filter((edge) => !selected.has(edge.source) && !selected.has(edge.target)),
      selectedNodes: [],
      lastSavedPayload: null,
      past: [...state.past, cloneSnapshot(state)].slice(-100),
      future: []
    }));
  },

  duplicateSelectedNodes() {
    const selected = new Set(get().selectedNodes);
    if (selected.size === 0) return;

    set((state) => {
      const selectedNodes = state.nodes.filter((node) => selected.has(node.id));
      const selectedEdges = state.edges.filter(
        (edge) => selected.has(edge.source) && selected.has(edge.target)
      );

      // Create ID mapping from old to new
      const idMap = new Map<string, string>();
      const duplicatedNodes = selectedNodes.map((node) => {
        const newId = `${node.id.split("-")[0]}-${Math.random().toString(36).slice(2, 9)}`;
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

      // Remap edges to use new node IDs
      const duplicatedEdges = selectedEdges.map((edge) => ({
        ...structuredClone(edge),
        id: `${idMap.get(edge.source)}-${idMap.get(edge.target)}`,
        source: idMap.get(edge.source) ?? edge.source,
        target: idMap.get(edge.target) ?? edge.target
      }));

      const newSelectedIds = Array.from(idMap.values());

      return {
        nodes: [...state.nodes, ...duplicatedNodes],
        edges: [...state.edges, ...duplicatedEdges],
        selectedNodes: newSelectedIds,
        lastSavedPayload: null,
        past: [...state.past, cloneSnapshot(state)].slice(-100),
        future: []
      };
    });
  },

  onNodesChange(changes) {
    set((state) => {
      const nextNodes = applyNodeChanges(changes, state.nodes) as Node<NodeData>[];
      const structuralChange = changes.some((change) => change.type !== "select");

      return {
        nodes: nextNodes,
        selectedNodes: nextNodes.filter((node) => node.selected).map((node) => node.id),
        lastSavedPayload: structuralChange ? null : state.lastSavedPayload,
        past: structuralChange ? [...state.past, cloneSnapshot(state)].slice(-100) : state.past,
        future: structuralChange ? [] : state.future
      };
    });
  },

  onEdgesChange(changes) {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
      lastSavedPayload: changes.length > 0 ? null : state.lastSavedPayload,
      past: changes.length > 0 ? [...state.past, cloneSnapshot(state)].slice(-100) : state.past,
      future: changes.length > 0 ? [] : state.future
    }));
  },

  connectNodes(connection) {
    set((state) => ({
      edges: addReactFlowEdge(
        {
          ...connection,
          id: `${connection.source}-${connection.target}-${crypto.randomUUID()}`,
          animated: true
        },
        state.edges
      ),
      lastSavedPayload: null,
      past: [...state.past, cloneSnapshot(state)].slice(-100),
      future: []
    }));
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

  importWorkflow(payload) {
    set((state) => ({
      workflowName: payload.name || state.workflowName,
      nodes: payload.nodes,
      edges: payload.edges,
      lastSavedPayload: null,
      past: [...state.past, cloneSnapshot(state)].slice(-100),
      future: [],
      selectedNodes: []
    }));
  },

  loadSampleWorkflow() {
    const sample = createSampleWorkflow();
    set((state) => ({
      workflowId: null,
      workflowName: sample.name,
      nodes: sample.nodes,
      edges: sample.edges,
      lastSavedPayload: null,
      runs: [],
      selectedNodes: [],
      runningNodes: new Set<string>(),
      past: [...state.past, cloneSnapshot(state)].slice(-100),
      future: []
    }));
  },

  async executeWorkflow(scope) {
    const state = get();

    if (!state.workflowId) {
      await get().saveWorkflow();
    }

    const runScope: RunScope = scope === "Selected" && state.selectedNodes.length === 1 ? "Single" : scope;

    set({
      isRunning: true,
      runningNodes: new Set(
        runScope === "Selected" ? state.selectedNodes : state.nodes.map((node) => node.id)
      ),
      nodes: state.nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          status: "pending",
          error: undefined
        }
      }))
    });

    const response = await fetch("/api/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workflowId: get().workflowId,
        workflowName: get().workflowName,
        nodes: sanitizeNodes(get().nodes),
        edges: get().edges,
        scope: runScope,
        selectedNodeIds: get().selectedNodes
      })
    });

    if (!response.ok) {
      set({
        isRunning: false,
        runningNodes: new Set<string>()
      });
      throw new Error("Failed to execute workflow");
    }

    const payload: { run: WorkflowRun } = await response.json();

    set((current) => ({
      isRunning: false,
      runningNodes: new Set<string>(),
      runs: [payload.run, ...current.runs.filter((run) => run.id !== payload.run.id)],
      nodes: hydrateNodeOutputs(current.nodes, payload.run)
    }));

    return payload.run;
  },

  undo() {
    set((state) => {
      const previous = state.past.at(-1);
      if (!previous) return state;

      return {
        nodes: previous.nodes,
        edges: previous.edges,
        workflowName: previous.workflowName,
        past: state.past.slice(0, -1),
        future: [snapshotFromValues(state.nodes, state.edges, state.workflowName), ...state.future].slice(0, 100),
        selectedNodes: []
      };
    });
  },

  redo() {
    set((state) => {
      const next = state.future[0];
      if (!next) return state;

      return {
        nodes: next.nodes,
        edges: next.edges,
        workflowName: next.workflowName,
        future: state.future.slice(1),
        past: [...state.past, snapshotFromValues(state.nodes, state.edges, state.workflowName)].slice(-100),
        selectedNodes: []
      };
    });
  }
}));
