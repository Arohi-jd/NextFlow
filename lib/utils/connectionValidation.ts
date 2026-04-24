import { type Connection, type Edge, type Node } from "@xyflow/react";
import { CONNECTION_VALIDATION_MAP, type FlowNodeType, type HandleKind, type NodeData } from "@/lib/types";

export function extractHandleType(handleId?: string | null): HandleKind | null {
  if (!handleId) return null;

  if (handleId.includes("images") || handleId.includes("image_url")) return "image_url";
  if (handleId.includes("video_url")) return "video_url";
  if (handleId.includes("system_prompt") || handleId.includes("user_message") || handleId.includes("timestamp") || 
      handleId.includes("x_percent") || handleId.includes("y_percent") || handleId.includes("width_percent") || 
      handleId.includes("height_percent")) {
    return "text";
  }
  if (handleId.includes("output")) return "text";

  return null;
}

function hasPath(fromNode: string, toNode: string, edges: Edge[]): boolean {
  if (fromNode === toNode) return true;
  
  const visited = new Set<string>();
  const queue: string[] = [fromNode];
  
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    
    if (visited.has(current)) continue;
    visited.add(current);
    
    if (current === toNode) return true;
    
    const outgoing = edges.filter(e => e.source === current && !visited.has(e.target));
    for (const edge of outgoing) {
      queue.push(edge.target);
    }
  }
  
  return false;
}

export function validateConnection(connection: Connection): {
  isValid: boolean;
  reason?: string;
} {
  const sourceType = extractHandleType(connection.sourceHandle);
  const targetType = extractHandleType(connection.targetHandle);

  if (!sourceType || !targetType) {
    return {
      isValid: false,
      reason: "Both connection points must be compatible."
    };
  }

  if (connection.source === connection.target) {
    return {
      isValid: false,
      reason: "A node cannot connect to itself."
    };
  }

  const isValid = CONNECTION_VALIDATION_MAP[sourceType]?.includes(targetType) ?? false;

  return isValid
    ? { isValid: true }
    : {
        isValid: false,
        reason: `Cannot connect ${sourceType} output to ${targetType} input`
      };
}

function isHandleOccupied(edges: Edge[], target: string, targetHandle: string): boolean {
  return edges.some((edge) => edge.target === target && edge.targetHandle === targetHandle);
}

export function normalizeConnection(
  connection: Connection,
  nodes: Node<NodeData>[],
  edges: Edge[]
): Connection {
  if (!connection.target) {
    return connection;
  }

  const targetNode = nodes.find((node) => node.id === connection.target);
  if (!targetNode) {
    return connection;
  }

  const sourceType = extractHandleType(connection.sourceHandle);
  const targetType = targetNode.type as FlowNodeType | undefined;

  if (targetType === "llm") {
    if (sourceType === "image_url" || sourceType === "video_url") {
      return {
        ...connection,
        targetHandle: `${targetNode.id}-target-images`
      };
    }

    if (sourceType === "text") {
      const systemHandle = `${targetNode.id}-target-system_prompt`;
      const userHandle = `${targetNode.id}-target-user_message`;
      const requested = connection.targetHandle;

      if (!requested) {
        return {
          ...connection,
          targetHandle: isHandleOccupied(edges, targetNode.id, systemHandle) ? userHandle : systemHandle
        };
      }

      if (
        requested === systemHandle &&
        isHandleOccupied(edges, targetNode.id, systemHandle) &&
        !isHandleOccupied(edges, targetNode.id, userHandle)
      ) {
        return {
          ...connection,
          targetHandle: userHandle
        };
      }

      if (
        requested === userHandle &&
        isHandleOccupied(edges, targetNode.id, userHandle) &&
        !isHandleOccupied(edges, targetNode.id, systemHandle)
      ) {
        return {
          ...connection,
          targetHandle: systemHandle
        };
      }
    }
  }

  if (targetType === "crop-image" && sourceType === "image_url" && !connection.targetHandle) {
    return {
      ...connection,
      targetHandle: `${targetNode.id}-target-image_url`
    };
  }

  if (targetType === "extract-frame" && !connection.targetHandle) {
    if (sourceType === "video_url") {
      return {
        ...connection,
        targetHandle: `${targetNode.id}-target-video_url`
      };
    }

    if (sourceType === "text") {
      return {
        ...connection,
        targetHandle: `${targetNode.id}-target-timestamp`
      };
    }
  }

  return connection;
}

export function showConnectionValidationError(reason: string): void {
  const tooltip = document.createElement("div");
  tooltip.className =
    "fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-md border border-red-400/40 bg-red-500/95 px-3 py-2 text-xs font-semibold text-white shadow-2xl";
  tooltip.textContent = reason;
  document.body.appendChild(tooltip);

  setTimeout(() => {
    tooltip.remove();
  }, 1600);
}
