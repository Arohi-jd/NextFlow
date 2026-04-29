import { task } from "@trigger.dev/sdk/v3";
import { prisma } from "../../lib/prisma";
import { extractFrameWithTransloadit } from "../../lib/transloadit";
import { sanitizeExecutionPayload } from "../../lib/utils/persistence";

type ExtractFrameTaskPayload = {
  nodeExecutionId: string;
  videoUrl: string;
  timestamp: string;
};

type ExtractFrameTaskOutput = {
  outputUrl: string;
};

export const extractFrameTask = task({
  id: "extract-frame",
  run: async (payload: ExtractFrameTaskPayload): Promise<ExtractFrameTaskOutput> => {
    const startedAt = Date.now();
    const normalizedTimestamp = String(payload.timestamp ?? "").trim() || "0";

    await prisma.nodeExecution.update({
      where: { id: payload.nodeExecutionId },
      data: { status: "running" }
    });

    try {
      if (!payload.videoUrl) {
        throw new Error("videoUrl is required");
      }

      const outputUrl = await extractFrameWithTransloadit(payload.videoUrl, normalizedTimestamp);

      await prisma.nodeExecution.update({
        where: { id: payload.nodeExecutionId },
        data: {
          status: "success",
          outputs: sanitizeExecutionPayload({ outputUrl }),
          executionTime: Date.now() - startedAt
        }
      });

      return { outputUrl };
    } catch (error) {
      await prisma.nodeExecution.update({
        where: { id: payload.nodeExecutionId },
        data: {
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown extract-frame error",
          executionTime: Date.now() - startedAt
        }
      });
      throw error;
    }
  }
});
