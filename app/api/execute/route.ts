import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";
import { type Edge, type Node } from "@xyflow/react";
import { z } from "zod";
import { getGeminiApiKey, getGroqApiKey, getTransloaditConfig } from "@/lib/env";
import { getOrCreateUser } from "@/lib/helpers/getOrCreateUser";
import { prisma } from "@/lib/prisma";
import { cropImageWithTransloadit, extractFrameWithTransloadit } from "@/lib/transloadit";
import {
  sanitizeEdgesForPersistence,
  sanitizeExecutionPayload,
  sanitizeNodesForPersistence
} from "@/lib/utils/persistence";
import { SAMPLE_IMAGE_URL, SAMPLE_VIDEO_URL, SAMPLE_WORKFLOW_NAME } from "@/lib/utils/sampleWorkflow";
import { buildDAG, getExecutionOrder, validateDAG } from "@/lib/utils/dagExecutor";
import type { NodeData, NodeExecution, RunScope, WorkflowRun } from "@/lib/types";

const executeSchema = z.object({
  workflowId: z.string().nullable().optional(),
  workflowName: z.string(),
  nodes: z.array(z.record(z.unknown())),
  edges: z.array(z.record(z.unknown())),
  scope: z.enum(["Full", "Single", "Selected"]),
  selectedNodeIds: z.array(z.string()).optional()
});

type NodeResult = {
  output?: string;
  outputUrl?: string;
};

type RunRecord = {
  id: string;
  workflowId: string;
  status: string;
  scope: string;
  startedAt: Date;
  completedAt: Date | null;
  executions: Array<{
    id: string;
    nodeId: string;
    nodeType: string;
    status: string;
    inputs: unknown;
    outputs: unknown;
    executionTime: number | null;
    error: string | null;
  }>;
};

const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";

function mapRun(run: RunRecord, runNumber: number, nodesById: Map<string, Node<NodeData>>): WorkflowRun {
  return {
    id: run.id,
    workflowId: run.workflowId,
    runNumber,
    scope: run.scope as RunScope,
    status: run.status as WorkflowRun["status"],
    startedAt: run.startedAt.toISOString(),
    completedAt: run.completedAt?.toISOString(),
    durationSeconds: ((run.completedAt?.getTime() ?? Date.now()) - run.startedAt.getTime()) / 1000,
    executions: run.executions.map(
      (execution): NodeExecution => ({
        id: execution.id,
        nodeId: execution.nodeId,
        nodeName: nodesById.get(execution.nodeId)?.data.label ?? execution.nodeId,
        nodeType: execution.nodeType as NodeExecution["nodeType"],
        status: execution.status as NodeExecution["status"],
        inputs: execution.inputs as Record<string, unknown>,
        outputs: execution.outputs as Record<string, unknown>,
        executionTime: execution.executionTime ?? 0,
        error: execution.error ?? undefined
      })
    )
  };
}

function getTargetField(
  handleId?: string | null
): "systemPrompt" | "userMessage" | "images" | "imageUrl" | "videoUrl" | "timestamp" | "text" | "xPercent" | "yPercent" | "widthPercent" | "heightPercent" | null {
  if (!handleId) return null;
  if (handleId.includes("system_prompt")) return "systemPrompt";
  if (handleId.includes("user_message")) return "userMessage";
  if (handleId.includes("images")) return "images";
  if (handleId.includes("image_url")) return "imageUrl";
  if (handleId.includes("video_url")) return "videoUrl";
  if (handleId.includes("timestamp")) return "timestamp";
  if (handleId.includes("x_percent")) return "xPercent";
  if (handleId.includes("y_percent")) return "yPercent";
  if (handleId.includes("width_percent")) return "widthPercent";
  if (handleId.includes("height_percent")) return "heightPercent";
  if (handleId.includes("text")) return "text";
  return null;
}

function getSourceValue(node: Node<NodeData>, result?: NodeResult): string | string[] | undefined {
  switch (node.type) {
    case "text":
      return typeof node.data.text === "string" ? node.data.text : undefined;
    case "upload-image":
      return result?.outputUrl ?? (typeof node.data.imageUrl === "string" ? node.data.imageUrl : undefined);
    case "upload-video":
      return result?.outputUrl ?? (typeof node.data.videoUrl === "string" ? node.data.videoUrl : undefined);
    case "llm":
      return result?.output ?? (typeof node.data.output === "string" ? node.data.output : undefined);
    case "crop-image":
    case "extract-frame":
      return result?.outputUrl ?? (typeof node.data.outputUrl === "string" ? node.data.outputUrl : undefined);
    default:
      return undefined;
  }
}

function looksLikeSystemPrompt(value: string): boolean {
  const normalized = value.trim().toLowerCase();

  return (
    normalized.startsWith("you are") ||
    normalized.startsWith("act as") ||
    normalized.startsWith("behave as") ||
    normalized.startsWith("system:") ||
    normalized.includes("professional") ||
    normalized.includes("copywriter") ||
    normalized.includes("social media manager") ||
    normalized.includes("assistant")
  );
}

function resolveNodeInputs(
  node: Node<NodeData>,
  edges: Edge[],
  nodesById: Map<string, Node<NodeData>>,
  resultsByNodeId: Map<string, NodeResult>
): Record<string, unknown> {
  const inputs: Record<string, unknown> = {
    text: node.data.text,
    systemPrompt: node.data.systemPrompt,
    userMessage: node.data.userMessage,
    images: Array.isArray(node.data.images) ? [...node.data.images] : [],
    imageUrl: node.data.imageUrl,
    videoUrl: node.data.videoUrl,
    timestamp: node.data.timestamp,
    xPercent: node.data.xPercent,
    yPercent: node.data.yPercent,
    widthPercent: node.data.widthPercent,
    heightPercent: node.data.heightPercent
  };

  const incomingEdges = edges.filter((edge) => edge.target === node.id);
  const llmTextAssignments: Array<{ field: "systemPrompt" | "userMessage" | "text" | null; value: string }> = [];

  for (const edge of incomingEdges) {
    const sourceNode = nodesById.get(edge.source);
    if (!sourceNode) continue;

    const field = getTargetField(edge.targetHandle);
    const sourceValue = getSourceValue(sourceNode, resultsByNodeId.get(sourceNode.id));
    if (!field || sourceValue === undefined) continue;

    if (field === "images") {
      const current = Array.isArray(inputs.images) ? inputs.images : [];
      inputs.images = typeof sourceValue === "string" ? [...current, sourceValue] : current;
      continue;
    }

    if (node.type === "llm" && typeof sourceValue === "string" && (field === "systemPrompt" || field === "userMessage" || field === "text")) {
      llmTextAssignments.push({ field, value: sourceValue });
      continue;
    }

    inputs[field] = sourceValue;
  }

  if (node.type === "llm") {
    const systemCandidates = llmTextAssignments.filter((entry) => entry.field === "systemPrompt").map((entry) => entry.value);
    const userCandidates = llmTextAssignments.filter((entry) => entry.field === "userMessage").map((entry) => entry.value);
    const genericCandidates = llmTextAssignments.filter((entry) => entry.field === "text" || entry.field === null).map((entry) => entry.value);
    const allCandidates = [...systemCandidates, ...userCandidates, ...genericCandidates];

    if (allCandidates.length >= 2) {
      const systemHeuristic = allCandidates.find((value) => looksLikeSystemPrompt(value));
      const userHeuristic = allCandidates.find((value) => value !== systemHeuristic);

      if (systemHeuristic) {
        inputs.systemPrompt = systemHeuristic;
      }

      if (userHeuristic) {
        inputs.userMessage = userHeuristic;
      }
    }

    if (!inputs.systemPrompt && systemCandidates.length > 0) {
      inputs.systemPrompt = systemCandidates.shift();
    }

    if (!inputs.userMessage && userCandidates.length > 0) {
      inputs.userMessage = userCandidates.shift();
    }

    if (!inputs.userMessage && systemCandidates.length > 0) {
      inputs.userMessage = systemCandidates.shift();
    }

    if (!inputs.systemPrompt && userCandidates.length > 0) {
      inputs.systemPrompt = userCandidates.shift();
    }

    if (!inputs.systemPrompt && genericCandidates.length > 0) {
      inputs.systemPrompt = genericCandidates.shift();
    }

    if (!inputs.userMessage && genericCandidates.length > 0) {
      inputs.userMessage = genericCandidates.shift();
    }
  }

  return inputs;
}

function getDemoUploadValue(workflowName: string, node: Node<NodeData>): string {
  if (workflowName !== SAMPLE_WORKFLOW_NAME) return "";
  if (node.id === "upload-image-1") return SAMPLE_IMAGE_URL;
  if (node.id === "upload-video-1") return SAMPLE_VIDEO_URL;
  return "";
}

function normalizeTimestampInput(value: unknown): string {
  const raw = typeof value === "string" ? value : String(value ?? "");
  return raw.trim() || "0";
}

function isGroqModel(modelName: string): boolean {
  return !modelName.startsWith("gemini-");
}

function isGeminiRecoverableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes("429") ||
    message.includes("quota") ||
    message.includes("rate limit") ||
    (message.includes("404") && message.includes("not found"))
  );
}

async function runGroqInline(inputs: Record<string, unknown>): Promise<NodeResult> {
  const apiKey = getGroqApiKey();
  if (!apiKey) throw new Error("Missing GROQ_API_KEY environment variable.");

  const modelName = String(inputs.model ?? "llama-3.3-70b-versatile");
  const groq = new Groq({ apiKey });

  const isVisionModel = modelName.includes("llama-4") || modelName.includes("vision");
  const systemPrompt = inputs.systemPrompt ? String(inputs.systemPrompt) : "";
  const userMessage = inputs.userMessage ? String(inputs.userMessage) : "";

  if (!systemPrompt && !userMessage) {
    throw new Error("LLM node requires at least a system prompt or user message.");
  }

  type TextPart = { type: "text"; text: string };
  type ImagePart = { type: "image_url"; image_url: { url: string } };
  type ContentPart = TextPart | ImagePart;

  const messages: Groq.Chat.ChatCompletionMessageParam[] = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }

  if (isVisionModel) {
    const userContent: ContentPart[] = [];
    if (userMessage) userContent.push({ type: "text", text: userMessage });
    if (Array.isArray(inputs.images)) {
      for (const imageUrl of inputs.images) {
        if (typeof imageUrl === "string" && imageUrl) {
          userContent.push({ type: "image_url", image_url: { url: imageUrl } });
        }
      }
    }
    if (userContent.length === 0) userContent.push({ type: "text", text: systemPrompt });
    messages.push({ role: "user", content: userContent });
  } else {
    const textContent = userMessage || systemPrompt;
    messages.push({ role: "user", content: textContent });
  }

  const completion = await groq.chat.completions.create({ model: modelName, messages });
  const output = completion.choices[0]?.message?.content;
  if (!output) throw new Error("Groq returned an empty response.");
  return { output };
}

async function runGeminiInline(inputs: Record<string, unknown>): Promise<NodeResult> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error("Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable.");

  const systemPrompt = inputs.systemPrompt ? String(inputs.systemPrompt) : "";
  const userMessage = inputs.userMessage ? String(inputs.userMessage) : "";

  if (!systemPrompt && !userMessage) {
    throw new Error("LLM node requires at least a system prompt or user message.");
  }

  const modelName = String(inputs.model ?? "gemini-2.0-flash");
  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({
    model: modelName,
    ...(systemPrompt ? { systemInstruction: systemPrompt } : {})
  });

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

  if (userMessage) parts.push({ text: userMessage });

  if (Array.isArray(inputs.images)) {
    for (const imageUrl of inputs.images) {
      if (typeof imageUrl !== "string" || !imageUrl) continue;
      try {
        const imageResponse = await fetch(imageUrl);
        const buffer = await imageResponse.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const mimeType = (imageResponse.headers.get("content-type") ?? "image/jpeg").split(";")[0] ?? "image/jpeg";
        parts.push({ inlineData: { mimeType, data: base64 } });
      } catch {
        // skip images that cannot be fetched — text parts still run
      }
    }
  }

  // Gemini requires at least one user part
  if (parts.length === 0) parts.push({ text: systemPrompt });

  const response = await model.generateContent({ contents: [{ role: "user", parts }] });
  const output = response.response.text();
  if (!output) throw new Error("Gemini returned an empty response.");
  return { output };
}

async function runGeminiInlineWithFallback(inputs: Record<string, unknown>): Promise<NodeResult> {
  try {
    return await runGeminiInline(inputs);
  } catch (error) {
    if (!isGeminiRecoverableError(error)) {
      throw error;
    }

    return runGroqInline({ ...inputs, model: DEFAULT_GROQ_MODEL });
  }
}

const VIDEO_EXTENSION_RE = /\.(mp4|mov|webm|avi|mkv|m4v|ogv|3gp)(\?|#|$)/i;

async function resolveImageUrls(urls: unknown[]): Promise<string[]> {
  const resolved: string[] = [];
  for (const url of urls) {
    if (typeof url !== "string" || !url) continue;
    if (VIDEO_EXTENSION_RE.test(url)) {
      // Auto-extract first frame so the LLM receives a proper image
      const frameUrl = await extractFrameWithTransloadit(url, "0");
      resolved.push(frameUrl);
    } else {
      resolved.push(url);
    }
  }
  return resolved;
}

async function runLlmInline(inputs: Record<string, unknown>): Promise<NodeResult> {
  const modelName = String(inputs.model ?? DEFAULT_GROQ_MODEL);
  const resolvedImages = await resolveImageUrls(Array.isArray(inputs.images) ? inputs.images : []);
  const resolvedInputs = { ...inputs, images: resolvedImages };
  if (isGroqModel(modelName)) {
    return runGroqInline(resolvedInputs);
  }
  return runGeminiInlineWithFallback(resolvedInputs);
}

async function runCropInline(inputs: Record<string, unknown>): Promise<NodeResult> {
  const imageUrl = String(inputs.imageUrl ?? "");
  if (!imageUrl) throw new Error("Crop Image node requires a connected image input.");
  return {
    outputUrl: await cropImageWithTransloadit(imageUrl, {
      xPercent: Number(inputs.xPercent ?? 0),
      yPercent: Number(inputs.yPercent ?? 0),
      widthPercent: Number(inputs.widthPercent ?? 100),
      heightPercent: Number(inputs.heightPercent ?? 100)
    })
  };
}

async function runExtractFrameInline(inputs: Record<string, unknown>): Promise<NodeResult> {
  const videoUrl = String(inputs.videoUrl ?? "");
  if (!videoUrl) throw new Error("Extract Frame node requires a connected video input.");
  return {
    outputUrl: await extractFrameWithTransloadit(videoUrl, String(inputs.timestamp ?? "0"))
  };
}

async function runTriggerTask<TPayload extends Record<string, unknown>, TOutput extends NodeResult>(
  taskId: string,
  payload: TPayload,
  fallback: () => Promise<TOutput> | TOutput
): Promise<TOutput> {
  const apiKey = process.env.TRIGGER_API_KEY;
  const apiUrl = process.env.TRIGGER_API_URL;

  // tr_dev_* keys require a running local Trigger.dev dev server.
  // Skip Trigger.dev and run inline when using a dev key or no key is set.
  const isProductionKey = apiKey && apiUrl && !apiKey.startsWith("tr_dev_");

  if (isProductionKey) {
    const taskResult = await tasks.triggerAndWait(taskId, payload);
    if (taskResult.ok) {
      return taskResult.output as TOutput;
    }
    const errorMessage = taskResult.error instanceof Error
      ? taskResult.error.message
      : String(taskResult.error);
    throw new Error(`Trigger.dev task "${taskId}" failed: ${errorMessage}`);
  }

  // Dev key or no Trigger.dev configured — call real APIs inline.
  return fallback();
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await getOrCreateUser();

    const parsed = executeSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
    }

    const nodes = parsed.data.nodes as unknown as Node<NodeData>[];
    const edges = parsed.data.edges as unknown as Edge[];
    const selectedNodeIds = new Set(parsed.data.selectedNodeIds ?? []);
    const scope = parsed.data.scope;
    const workflowName = parsed.data.workflowName;

    const workflow = parsed.data.workflowId
      ? await prisma.workflow.findFirst({
          where: {
            id: parsed.data.workflowId,
            userId: user.id
          }
        })
      : null;

    const serializedNodes = sanitizeNodesForPersistence(JSON.parse(JSON.stringify(nodes)));
    const serializedEdges = sanitizeEdgesForPersistence(JSON.parse(JSON.stringify(edges)));

    const workflowId = workflow
      ? workflow.id
      : (
          await prisma.workflow.create({
            data: {
              name: parsed.data.workflowName,
              userId: user.id,
              nodes: serializedNodes,
              edges: serializedEdges
            }
          })
        ).id;

    const scopedNodes =
      scope === "Selected" || scope === "Single"
        ? nodes.filter((node) => selectedNodeIds.has(node.id))
        : nodes;
    const scopedIds = new Set(scopedNodes.map((node) => node.id));
    const scopedEdges = edges.filter((edge) => scopedIds.has(edge.source) && scopedIds.has(edge.target));

    if (!validateDAG(scopedNodes, scopedEdges)) {
      return NextResponse.json({ error: "Workflow contains a cycle and cannot be executed." }, { status: 400 });
    }

    const dag = buildDAG(scopedNodes, scopedEdges);
    const executionOrder = getExecutionOrder(dag);
    const nodesById = new Map(scopedNodes.map((node) => [node.id, node]));

    // For input resolution we need ALL nodes and ALL edges so that a single-node
    // run (e.g. "Run Node" on an LLM) can still read values from upstream nodes
    // that are not part of the current execution scope.
    const allNodesById = new Map(nodes.map((node) => [node.id, node]));
    const runStartedAt = new Date();
    const run = await prisma.workflowRun.create({
      data: {
        workflowId,
        status: "running",
        scope,
        startedAt: runStartedAt
      }
    });

    const executionIds = new Map<string, string>();
    for (const node of scopedNodes) {
      const execution = await prisma.nodeExecution.create({
        data: {
          runId: run.id,
          nodeId: node.id,
          nodeType: String(node.data.nodeType ?? node.type ?? "UNKNOWN"),
          status: "pending",
          inputs: {},
          outputs: {}
        }
      });
      executionIds.set(node.id, execution.id);
    }

    const resultsByNodeId = new Map<string, NodeResult>();

    const executeNode = async (node: Node<NodeData>): Promise<void> => {
      const executionId = executionIds.get(node.id);
      if (!executionId) return;

      const startedAt = Date.now();
      const inputs = resolveNodeInputs(node, edges, allNodesById, resultsByNodeId);

      await prisma.nodeExecution.update({
        where: { id: executionId },
        data: {
          status: "running",
          inputs: sanitizeExecutionPayload(JSON.parse(JSON.stringify(inputs)))
        }
      });

      try {
        let result: NodeResult;

        if (node.type === "llm") {
          result = await runTriggerTask(
            "llm-execute",
            {
              nodeExecutionId: executionId,
              model: String(inputs.model ?? node.data.model ?? DEFAULT_GROQ_MODEL),
              systemPrompt: String(inputs.systemPrompt ?? ""),
              userMessage: String(inputs.userMessage ?? inputs.text ?? ""),
              images: Array.isArray(inputs.images) ? inputs.images : []
            },
            () =>
              runLlmInline({
                ...inputs,
                model: inputs.model ?? node.data.model ?? DEFAULT_GROQ_MODEL
              })
          );
        } else if (node.type === "crop-image") {
          result = await runTriggerTask(
            "crop-image",
            {
              nodeExecutionId: executionId,
              imageUrl: String(inputs.imageUrl ?? ""),
              xPercent: Number(inputs.xPercent ?? 0),
              yPercent: Number(inputs.yPercent ?? 0),
              widthPercent: Number(inputs.widthPercent ?? 100),
              heightPercent: Number(inputs.heightPercent ?? 100)
            },
            () => runCropInline(inputs)
          );
        } else if (node.type === "extract-frame") {
          const timestamp = normalizeTimestampInput(inputs.timestamp);

          result = await runTriggerTask(
            "extract-frame",
            {
              nodeExecutionId: executionId,
              videoUrl: String(inputs.videoUrl ?? ""),
              timestamp
            },
            () => runExtractFrameInline({ ...inputs, timestamp })
          );
        } else if (node.type === "upload-image") {
          const imageUrl = String(inputs.imageUrl ?? node.data.imageUrl ?? getDemoUploadValue(workflowName, node) ?? "");
          if (!imageUrl) throw new Error("Upload Image requires an uploaded file.");
          result = { outputUrl: imageUrl };
        } else if (node.type === "upload-video") {
          const videoUrl = String(inputs.videoUrl ?? node.data.videoUrl ?? getDemoUploadValue(workflowName, node) ?? "");
          if (!videoUrl) throw new Error("Upload Video requires an uploaded file.");
          result = { outputUrl: videoUrl };
        } else {
          const output = String(inputs.text ?? "");
          if (!output) throw new Error("Text node is empty.");
          result = { output };
        }

        resultsByNodeId.set(node.id, result);

        await prisma.nodeExecution.update({
          where: { id: executionId },
          data: {
            status: "success",
            outputs: sanitizeExecutionPayload(result),
            executionTime: Date.now() - startedAt
          }
        });
      } catch (error) {
        await prisma.nodeExecution.update({
          where: { id: executionId },
          data: {
            status: "failed",
            error: error instanceof Error ? error.message : "Unknown execution error",
            executionTime: Date.now() - startedAt
          }
        });
        throw error;
      }
    };

    let failed = false;
    let hadSuccess = false;

    for (const group of executionOrder) {
      const groupResults = await Promise.allSettled(
        group.map(async (nodeId) => {
          const node = nodesById.get(nodeId);
          if (!node) return;
          await executeNode(node);
          hadSuccess = true;
        })
      );

      if (groupResults.some((result) => result.status === "rejected")) {
        failed = true;
        break;
      }
    }

    if (failed) {
      await prisma.nodeExecution.updateMany({
        where: {
          runId: run.id,
          status: "pending"
        },
        data: {
          status: "failed",
          error: "Skipped because an upstream dependency failed."
        }
      });
    }

    const runCompletedAt = new Date();
    await prisma.workflowRun.update({
      where: { id: run.id },
      data: {
        status: failed ? (hadSuccess ? "partial" : "failed") : "success",
        completedAt: runCompletedAt,
        duration: (runCompletedAt.getTime() - runStartedAt.getTime()) / 1000
      }
    });

    const runCount = await prisma.workflowRun.count({
      where: { workflowId }
    });

    const completedRun = (await prisma.workflowRun.findUnique({
      where: { id: run.id },
      include: { executions: true }
    })) as RunRecord | null;

    if (!completedRun) {
      return NextResponse.json({ error: "Run not found after execution" }, { status: 500 });
    }

    return NextResponse.json({
      run: mapRun(completedRun, runCount, nodesById)
    });
  } catch (error) {
    console.error("POST /api/execute failed:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ error: "Failed to execute workflow", details: `${error}` }, { status: 500 });
  }
}
