import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/helpers/getOrCreateUser";
import { prisma } from "@/lib/prisma";

export async function GET(): Promise<NextResponse> {
  try {
    const user = await getOrCreateUser();

    const workflows = await prisma.workflow.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        runs: {
          orderBy: { startedAt: "desc" },
          take: 1,
          select: {
            status: true,
            startedAt: true
          }
        }
      }
    });

    return NextResponse.json({
      workflows: workflows.map((workflow) => ({
        id: workflow.id,
        name: workflow.name,
        nodeCount: Array.isArray(workflow.nodes) ? workflow.nodes.length : 0,
        updatedAt: workflow.updatedAt.toISOString(),
        lastOpenedAt: workflow.lastOpenedAt.toISOString(),
        lastRunStatus: workflow.runs[0]?.status ?? null,
        lastRunDate: workflow.runs[0]?.startedAt.toISOString() ?? null
      }))
    });
  } catch (error) {
    console.error("GET /api/workflows failed:", error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ error: "Failed to fetch workflows" }, { status: 500 });
  }
}

export async function POST(): Promise<NextResponse> {
  try {
    const user = await getOrCreateUser();

    const workflow = await prisma.workflow.create({
      data: {
        userId: user.id,
        name: "Untitled Workflow",
        nodes: [],
        edges: []
      }
    });

    return NextResponse.json({ workflow });
  } catch (error) {
    console.error("POST /api/workflows failed:", error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ error: "Failed to create workflow" }, { status: 500 });
  }
}
