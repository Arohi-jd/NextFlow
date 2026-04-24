import { type Edge, type Node } from "@xyflow/react";
import { type NodeData, NodeType } from "@/lib/types";

export const SAMPLE_WORKFLOW_NAME = "Product Marketing Kit Generator";
export const SAMPLE_IMAGE_URL = "https://interactive-examples.mdn.mozilla.net/media/cc0-images/grapefruit-slice-332-332.jpg";
export const SAMPLE_VIDEO_URL = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

export function applySampleMediaDefaults(name: string, nodes: Node<NodeData>[]): Node<NodeData>[] {
  if (name !== SAMPLE_WORKFLOW_NAME) {
    return nodes;
  }

  return nodes.map((node) => {
    if (node.id === "upload-image-1" && !node.data.imageUrl) {
      return {
        ...node,
        data: {
          ...node.data,
          imageUrl: SAMPLE_IMAGE_URL,
          fileName: "demo-image.svg"
        }
      };
    }

    if (node.id === "upload-video-1" && !node.data.videoUrl) {
      return {
        ...node,
        data: {
          ...node.data,
          videoUrl: SAMPLE_VIDEO_URL,
          fileName: "demo-video.mp4"
        }
      };
    }

    return node;
  });
}

export function createSampleWorkflow(): { name: string; nodes: Node<NodeData>[]; edges: Edge[] } {
  const nodes: Node<NodeData>[] = [
    {
      id: "upload-image-1",
      type: "upload-image",
      position: { x: 80, y: 80 },
      data: {
        label: "Upload Image",
        type: "upload-image",
        nodeType: NodeType.UPLOAD_IMAGE,
        imageUrl: SAMPLE_IMAGE_URL,
        fileName: "demo-image.svg"
      }
    },
    {
      id: "crop-image-1",
      type: "crop-image",
      position: { x: 380, y: 80 },
      data: {
        label: "Crop Image",
        type: "crop-image",
        nodeType: NodeType.CROP_IMAGE,
        xPercent: 10,
        yPercent: 10,
        widthPercent: 80,
        heightPercent: 80
      }
    },
    {
      id: "text-1",
      type: "text",
      position: { x: 80, y: 280 },
      data: {
        label: "System Prompt",
        type: "text",
        nodeType: NodeType.TEXT,
        text: `You are a professional marketing copywriter. Generate a compelling one-paragraph product description.`
      }
    },
    {
      id: "text-2",
      type: "text",
      position: { x: 80, y: 440 },
      data: {
        label: "Product Details",
        type: "text",
        nodeType: NodeType.TEXT,
        text: `Product: Wireless Bluetooth Headphones.
Features: Noise cancellation, 30-hour battery, foldable design.`
      }
    },
    {
      id: "llm-1",
      type: "llm",
      position: { x: 720, y: 220 },
      data: {
        label: "Generate Marketing Copy",
        type: "llm",
        nodeType: NodeType.LLM,
        model: "llama-3.3-70b-versatile"
      }
    },
    {
      id: "upload-video-1",
      type: "upload-video",
      position: { x: 80, y: 640 },
      data: {
        label: "Upload Video",
        type: "upload-video",
        nodeType: NodeType.UPLOAD_VIDEO,
        videoUrl: SAMPLE_VIDEO_URL,
        fileName: "demo-video.mp4"
      }
    },
    {
      id: "extract-frame-1",
      type: "extract-frame",
      position: { x: 380, y: 640 },
      data: {
        label: "Extract Frame",
        type: "extract-frame",
        nodeType: NodeType.EXTRACT_FRAME,
        timestamp: "50%"
      }
    },
    {
      id: "text-3",
      type: "text",
      position: { x: 720, y: 520 },
      data: {
        label: "Campaign Prompt",
        type: "text",
        nodeType: NodeType.TEXT,
        text: `You are a social media manager. Create a tweet-length marketing post based on the product image and video frame.`
      }
    },
    {
      id: "llm-2",
      type: "llm",
      position: { x: 1040, y: 420 },
      data: {
        label: "Create Full Campaign",
        type: "llm",
        nodeType: NodeType.LLM,
        model: "llama-3.3-70b-versatile"
      }
    }
  ];

  const edges: Edge[] = [
    {
      id: "edge-upload-image-crop-image",
      source: "upload-image-1",
      target: "crop-image-1",
      sourceHandle: "upload-image-1-source-image_url",
      targetHandle: "crop-image-1-target-image_url",
      animated: true
    },
    {
      id: "edge-text-1-llm-1",
      source: "text-1",
      target: "llm-1",
      sourceHandle: "text-1-source-output",
      targetHandle: "llm-1-target-system_prompt",
      animated: true
    },
    {
      id: "edge-text-2-llm-1",
      source: "text-2",
      target: "llm-1",
      sourceHandle: "text-2-source-output",
      targetHandle: "llm-1-target-user_message",
      animated: true
    },
    {
      id: "edge-crop-image-llm-1",
      source: "crop-image-1",
      target: "llm-1",
      sourceHandle: "crop-image-1-source-image_url",
      targetHandle: "llm-1-target-images",
      animated: true
    },
    {
      id: "edge-upload-video-extract-frame",
      source: "upload-video-1",
      target: "extract-frame-1",
      sourceHandle: "upload-video-1-source-video_url",
      targetHandle: "extract-frame-1-target-video_url",
      animated: true
    },
    {
      id: "edge-llm-1-llm-2",
      source: "llm-1",
      target: "llm-2",
      sourceHandle: "llm-1-source-output",
      targetHandle: "llm-2-target-user_message",
      animated: true
    },
    {
      id: "edge-extract-frame-llm-2",
      source: "extract-frame-1",
      target: "llm-2",
      sourceHandle: "extract-frame-1-source-image_url",
      targetHandle: "llm-2-target-images",
      animated: true
    },
    {
      id: "edge-text-3-llm-2",
      source: "text-3",
      target: "llm-2",
      sourceHandle: "text-3-source-output",
      targetHandle: "llm-2-target-system_prompt",
      animated: true
    }
  ];

  return {
    name: SAMPLE_WORKFLOW_NAME,
    nodes,
    edges
  };
}
