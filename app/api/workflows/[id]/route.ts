import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateUser } from "@/lib/helpers/getOrCreateUser";
import { prisma } from "@/lib/prisma";

const nodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  position: z.object({
    x: z.number(),
    y: z.number()
  }),
  data: z.record(z.any())
});

const edgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().nullable().optional(),
  targetHandle: z.string().nullable().optional(),
  animated: z.boolean().optional(),
  type: z.string().optional(),
  style: z.record(z.any()).optional()
});

const updateWorkflowSchema = z
  .object({
    name: z.string().max(100).optional(),
    nodes: z.array(nodeSchema).optional(),
    edges: z.array(edgeSchema).optional()
  })
  .refine((value) => value.name !== undefined || value.nodes !== undefined || value.edges !== undefined, {
    message: "At least one field must be provided"
  });

function mapRun(run: {
  id: string;
  workflowId: string;
  status: string;
  scope: string;
  startedAt: Date;
  completedAt: Date | null;
  duration: number | null;
  executions: Array<{
    id: string;
    nodeId: string;
    nodeType: string;
    status: string;
    inputs: unknown;
    outputs: unknown;
    error: string | null;
    executionTime: number | null;
    startedAt: Date;
    completedAt: Date | null;
  }>;
}) {
  return {
    id: run.id,
    workflowId: run.workflowId,
    status: run.status,
    scope: run.scope,
    startedAt: run.startedAt.toISOString(),
    completedAt: run.completedAt?.toISOString() ?? null,
    duration: run.duration,
    executions: run.executions.map((execution) => ({
      id: execution.id,
      nodeId: execution.nodeId,
      nodeType: execution.nodeType,
      status: execution.status,
      inputs: execution.inputs,
      outputs: execution.outputs,
      error: execution.error,
      executionTime: execution.executionTime,
      startedAt: execution.startedAt.toISOString(),
      completedAt: execution.completedAt?.toISOString() ?? null
    }))
  };
}

async function getOwnedWorkflowOrError(workflowId: string, userId: string) {
  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId },
    include: {
      runs: {
        orderBy: { startedAt: "desc" },
        include: {
          executions: {
            orderBy: { id: "asc" }
          }
        }
      }
    }
  });

  if (!workflow) {
    return { error: NextResponse.json({ error: "Workflow not found" }, { status: 404 }) };
  }

  if (workflow.userId !== userId) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { workflow };
}

export async function GET(_: Request, context: { params: { id: string } }): Promise<NextResponse> {
  try {
    const user = await getOrCreateUser();
    const result = await getOwnedWorkflowOrError(context.params.id, user.id);
    if (result.error) return result.error;

    const workflow = await prisma.workflow.update({
      where: { id: result.workflow.id },
      data: { lastOpenedAt: new Date() },
      include: {
        runs: {
          orderBy: { startedAt: "desc" },
          include: {
            executions: {
              orderBy: { id: "asc" }
            }
          }
        }
      }
    });

    return NextResponse.json({
      workflow: {
        id: workflow.id,
        name: workflow.name,
        nodes: workflow.nodes,
        edges: workflow.edges,
        lastOpenedAt: workflow.lastOpenedAt.toISOString(),
        updatedAt: workflow.updatedAt.toISOString(),
        runs: workflow.runs.map(mapRun)
      }
    });
  } catch (error) {
    console.error(`GET /api/workflows/${context.params.id} failed:`, error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ error: "Failed to fetch workflow" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: { id: string } }): Promise<NextResponse> {
  try {
    const user = await getOrCreateUser();
    const result = await getOwnedWorkflowOrError(context.params.id, user.id);
    if (result.error) return result.error;

    const json = await request.json();
    const parsed = updateWorkflowSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.nodes !== undefined) data.nodes = parsed.data.nodes;
    if (parsed.data.edges !== undefined) data.edges = parsed.data.edges;

    const updated = await prisma.workflow.update({
      where: { id: result.workflow.id },
      data
    });

    return NextResponse.json({
      success: true,
      updatedAt: updated.updatedAt.toISOString()
    });
  } catch (error) {
    console.error(`PATCH /api/workflows/${context.params.id} failed:`, error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ error: "Failed to save workflow" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: { params: { id: string } }): Promise<NextResponse> {
  try {
    const user = await getOrCreateUser();
    const result = await getOwnedWorkflowOrError(context.params.id, user.id);
    if (result.error) return result.error;

    const runIds = result.workflow.runs.map((run) => run.id);

    await prisma.$transaction(async (tx) => {
      if (runIds.length > 0) {
        await tx.nodeExecution.deleteMany({
          where: {
            runId: {
              in: runIds
            }
          }
        });

        await tx.workflowRun.deleteMany({
          where: {
            id: {
              in: runIds
            }
          }
        });
      }

      await tx.workflow.delete({
        where: { id: result.workflow.id }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`DELETE /api/workflows/${context.params.id} failed:`, error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ error: "Failed to delete workflow" }, { status: 500 });
  }
}
