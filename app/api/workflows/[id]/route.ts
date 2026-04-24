import { NextResponse } from "next/server";
import { getAppAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { WorkflowRun } from "@/lib/types";

function mapRun(run: {
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
}): WorkflowRun {
  const durationSeconds = ((run.completedAt?.getTime() ?? Date.now()) - run.startedAt.getTime()) / 1000;

  return {
    id: run.id,
    workflowId: run.workflowId,
    runNumber: 0,
    scope: run.scope as WorkflowRun["scope"],
    status: run.status as WorkflowRun["status"],
    startedAt: run.startedAt.toISOString(),
    completedAt: run.completedAt?.toISOString(),
    durationSeconds,
    executions: run.executions.map((execution) => ({
      id: execution.id,
      nodeId: execution.nodeId,
      nodeName: execution.nodeId,
      nodeType: execution.nodeType as WorkflowRun["executions"][number]["nodeType"],
      status: execution.status as WorkflowRun["executions"][number]["status"],
      inputs: execution.inputs as Record<string, unknown>,
      outputs: execution.outputs as Record<string, unknown>,
      executionTime: execution.executionTime ?? 0,
      error: execution.error ?? undefined
    }))
  };
}

async function ensureDbUser(): Promise<{ id: string; clerkId: string; email: string } | null> {
  const authUser = await getAppAuthUser();
  if (!authUser) return null;

  return prisma.user.upsert({
    where: { clerkId: authUser.externalId },
    update: { email: authUser.email },
    create: {
      clerkId: authUser.externalId,
      email: authUser.email
    }
  });
}

export async function GET(_: Request, context: { params: { id: string } }): Promise<NextResponse> {
  try {
    const user = await ensureDbUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let workflow = await prisma.workflow.findFirst({
      where: {
        id: context.params.id,
        userId: user.id
      },
      include: {
        runs: {
          orderBy: { startedAt: "desc" },
          include: {
            executions: true
          }
        }
      }
    });

    if (!workflow) {
      workflow = await prisma.workflow.create({
        data: {
          id: context.params.id,
          name: "Untitled Workflow",
          userId: user.id,
          nodes: [],
          edges: []
        },
        include: {
          runs: {
            orderBy: { startedAt: "desc" },
            include: { executions: true }
          }
        }
      });
    }

    return NextResponse.json({
      id: workflow.id,
      name: workflow.name,
      nodes: workflow.nodes,
      edges: workflow.edges,
      runs: workflow.runs.map((run, index) => ({
        ...mapRun(run),
        runNumber: workflow.runs.length - index
      }))
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch workflow", details: `${error}` }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: { params: { id: string } }): Promise<NextResponse> {
  try {
    const user = await ensureDbUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workflow = await prisma.workflow.findFirst({
      where: {
        id: context.params.id,
        userId: user.id
      }
    });

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    await prisma.workflow.delete({
      where: { id: workflow.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete workflow", details: `${error}` }, { status: 500 });
  }
}
