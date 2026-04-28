import {
  extractFrameWithTransloadit,
  prisma,
  sanitizeExecutionPayload
} from "../../../../chunk-5NRAUS3J.mjs";
import {
  task
} from "../../../../chunk-J7CZHYWT.mjs";
import "../../../../chunk-WZGQJWAS.mjs";
import {
  __name,
  init_esm
} from "../../../../chunk-FUV6SSYK.mjs";

// trigger/tasks/extractFrameTask.ts
init_esm();
var extractFrameTask = task({
  id: "extract-frame",
  run: /* @__PURE__ */ __name(async (payload) => {
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
  }, "run")
});
export {
  extractFrameTask
};
//# sourceMappingURL=extractFrameTask.mjs.map
