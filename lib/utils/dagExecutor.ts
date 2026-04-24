import type { Edge, Node } from "@xyflow/react";
import type { NodeData } from "@/lib/types";

export type DagNode = {
  id: string;
  node: Node<NodeData>;
  in: Set<string>;
  out: Set<string>;
};

export type Dag = {
  nodes: Map<string, DagNode>;
};

export function buildDAG(nodes: Node<NodeData>[], edges: Edge[]): Dag {
  const dagNodes = new Map<string, DagNode>();

  for (const node of nodes) {
    dagNodes.set(node.id, {
      id: node.id,
      node,
      in: new Set<string>(),
      out: new Set<string>()
    });
  }

  for (const edge of edges) {
    const sourceNode = dagNodes.get(edge.source);
    const targetNode = dagNodes.get(edge.target);

    if (!sourceNode || !targetNode) continue;

    sourceNode.out.add(targetNode.id);
    targetNode.in.add(sourceNode.id);
  }

  return { nodes: dagNodes };
}

export function validateDAG(nodes: Node<NodeData>[], edges: Edge[]): boolean {
  const dag = buildDAG(nodes, edges);
  const inDegree = new Map<string, number>();

  dag.nodes.forEach((dagNode, id) => {
    inDegree.set(id, dagNode.in.size);
  });

  const queue: string[] = [];
  inDegree.forEach((degree, id) => {
    if (degree === 0) queue.push(id);
  });

  let visitedCount = 0;

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) break;

    visitedCount += 1;
    const currentNode = dag.nodes.get(currentId);
    if (!currentNode) continue;

    for (const childId of currentNode.out) {
      const nextDegree = (inDegree.get(childId) ?? 0) - 1;
      inDegree.set(childId, nextDegree);
      if (nextDegree === 0) queue.push(childId);
    }
  }

  return visitedCount === dag.nodes.size;
}

export function getExecutionOrder(dag: Dag): string[][] {
  const inDegree = new Map<string, number>();
  dag.nodes.forEach((dagNode, id) => {
    inDegree.set(id, dagNode.in.size);
  });

  let frontier: string[] = [];
  inDegree.forEach((degree, id) => {
    if (degree === 0) frontier.push(id);
  });

  const executionGroups: string[][] = [];

  while (frontier.length > 0) {
    const currentGroup = [...frontier];
    executionGroups.push(currentGroup);

    const nextFrontier: string[] = [];
    for (const nodeId of currentGroup) {
      const dagNode = dag.nodes.get(nodeId);
      if (!dagNode) continue;

      for (const childId of dagNode.out) {
        const nextDegree = (inDegree.get(childId) ?? 0) - 1;
        inDegree.set(childId, nextDegree);
        if (nextDegree === 0) nextFrontier.push(childId);
      }
    }

    frontier = nextFrontier;
  }

  return executionGroups;
}
