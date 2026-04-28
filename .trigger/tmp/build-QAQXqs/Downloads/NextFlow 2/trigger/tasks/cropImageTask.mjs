import {
  cropImageWithTransloadit,
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

// trigger/tasks/cropImageTask.ts
init_esm();
var cropImageTask = task({
  id: "crop-image",
  run: /* @__PURE__ */ __name(async (payload) => {
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
  }, "run")
});
export {
  cropImageTask
};
//# sourceMappingURL=cropImageTask.mjs.map
