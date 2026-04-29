import { task } from "@trigger.dev/sdk/v3";
import { prisma } from "../../lib/prisma";
import { cropImageWithTransloadit } from "../../lib/transloadit";
import { sanitizeExecutionPayload } from "../../lib/utils/persistence";

type CropImageTaskPayload = {
  nodeExecutionId: string;
  imageUrl: string;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
};

type CropImageTaskOutput = {
  outputUrl: string;
};

export const cropImageTask = task({
  id: "crop-image",
  run: async (payload: CropImageTaskPayload): Promise<CropImageTaskOutput> => {
    const startedAt = Date.now();

    await prisma.nodeExecution.update({
      where: { id: payload.nodeExecutionId },
      data: { status: "running" }
    });

    try {
      if (!payload.imageUrl) {
        throw new Error("imageUrl is required");
      }

      const outputUrl = await cropImageWithTransloadit(payload.imageUrl, {
        xPercent: payload.xPercent,
        yPercent: payload.yPercent,
        widthPercent: payload.widthPercent,
        heightPercent: payload.heightPercent
      });

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
          error: error instanceof Error ? error.message : "Unknown crop error",
          executionTime: Date.now() - startedAt
        }
      });
      throw error;
    }
  }
});
