import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import { task } from "@trigger.dev/sdk/v3";
import { getGeminiApiKey, getGroqApiKey } from "../../lib/env";
import { extractFrameWithTransloadit } from "../../lib/transloadit";
import { prisma } from "../../lib/prisma";
import { sanitizeExecutionPayload } from "../../lib/utils/persistence";

type LlmTaskPayload = {
  nodeExecutionId: string;
  model: string;
  systemPrompt: string;
  userMessage: string;
  images: string[];
};

type LlmTaskOutput = {
  output: string;
};

const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";

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

const VIDEO_EXTENSION_RE = /\.(mp4|mov|webm|avi|mkv|m4v|ogv|3gp)(\?|#|$)/i;

async function resolveImageUrls(urls: string[]): Promise<string[]> {
  const resolved: string[] = [];
  for (const url of urls) {
    if (!url) continue;
    if (VIDEO_EXTENSION_RE.test(url)) {
      const frameUrl = await extractFrameWithTransloadit(url, "0");
      resolved.push(frameUrl);
    } else {
      resolved.push(url);
    }
  }
  return resolved;
}

async function callGroq(payload: LlmTaskPayload): Promise<string> {
  const apiKey = getGroqApiKey();
  if (!apiKey) throw new Error("Missing GROQ_API_KEY environment variable.");

  if (!payload.systemPrompt && !payload.userMessage) {
    throw new Error("LLM node requires at least a system prompt or user message.");
  }

  const groq = new Groq({ apiKey });
  const isVisionModel = payload.model.includes("llama-4") || payload.model.includes("vision");

  type TextPart = { type: "text"; text: string };
  type ImagePart = { type: "image_url"; image_url: { url: string } };
  type ContentPart = TextPart | ImagePart;

  const messages: Groq.Chat.ChatCompletionMessageParam[] = [];

  if (payload.systemPrompt) {
    messages.push({ role: "system", content: payload.systemPrompt });
  }

  if (isVisionModel) {
    const userContent: ContentPart[] = [];
    if (payload.userMessage) userContent.push({ type: "text", text: payload.userMessage });
    for (const imageUrl of payload.images) {
      if (imageUrl) userContent.push({ type: "image_url", image_url: { url: imageUrl } });
    }
    if (userContent.length === 0) userContent.push({ type: "text", text: payload.systemPrompt });
    messages.push({ role: "user", content: userContent });
  } else {
    messages.push({ role: "user", content: payload.userMessage || payload.systemPrompt });
  }

  const completion = await groq.chat.completions.create({ model: payload.model, messages });
  const output = completion.choices[0]?.message?.content;
  if (!output) throw new Error("Groq returned an empty response.");
  return output;
}

async function callGemini(payload: LlmTaskPayload): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error("Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable.");

  if (!payload.systemPrompt && !payload.userMessage) {
    throw new Error("LLM node requires at least a system prompt or user message.");
  }

  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({
    model: payload.model,
    ...(payload.systemPrompt ? { systemInstruction: payload.systemPrompt } : {})
  });

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

  if (payload.userMessage) parts.push({ text: payload.userMessage });

  for (const imageUrl of payload.images) {
    if (!imageUrl) continue;
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

  // Gemini requires at least one user part
  if (parts.length === 0) parts.push({ text: payload.systemPrompt });

  const response = await model.generateContent({ contents: [{ role: "user", parts }] });
  const output = response.response.text();
  if (!output) throw new Error("Gemini returned an empty response.");
  return output;
}

async function callGeminiWithFallback(payload: LlmTaskPayload): Promise<string> {
  try {
    return await callGemini(payload);
  } catch (error) {
    if (!isGeminiRecoverableError(error)) {
      throw error;
    }

    return callGroq({ ...payload, model: DEFAULT_GROQ_MODEL });
  }
}

export const llmTask = task({
  id: "llm-execute",
  run: async (payload: LlmTaskPayload): Promise<LlmTaskOutput> => {
    const startedAt = Date.now();

    await prisma.nodeExecution.update({
      where: { id: payload.nodeExecutionId },
      data: { status: "running" }
    });

    try {
      const resolvedImages = await resolveImageUrls(payload.images);
      const resolvedPayload = { ...payload, images: resolvedImages };

      const output = isGroqModel(resolvedPayload.model)
        ? await callGroq(resolvedPayload)
        : await callGeminiWithFallback(resolvedPayload);

      await prisma.nodeExecution.update({
        where: { id: payload.nodeExecutionId },
        data: {
          status: "success",
          outputs: sanitizeExecutionPayload({ output }),
          executionTime: Date.now() - startedAt
        }
      });

      return { output };
    } catch (error) {
      await prisma.nodeExecution.update({
        where: { id: payload.nodeExecutionId },
        data: {
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown LLM error",
          executionTime: Date.now() - startedAt
        }
      });
      throw error;
    }
  }
});
