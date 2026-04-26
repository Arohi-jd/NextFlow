import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getOrCreateUser } from "@/lib/helpers/getOrCreateUser";
import { prisma } from "@/lib/prisma";

export async function POST(_: Request, context: { params: { id: string } }): Promise<NextResponse> {
  try {
    const user = await getOrCreateUser();

    const workflow = await prisma.workflow.findUnique({
      where: { id: context.params.id }
    });

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    if (workflow.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const duplicated = await prisma.workflow.create({
      data: {
        userId: user.id,
        name: `${workflow.name} (copy)`,
        nodes: JSON.parse(JSON.stringify(workflow.nodes ?? [])) as Prisma.InputJsonValue,
        edges: JSON.parse(JSON.stringify(workflow.edges ?? [])) as Prisma.InputJsonValue
      }
    });

    return NextResponse.json({ workflow: duplicated });
  } catch (error) {
    console.error(`POST /api/workflows/${context.params.id}/duplicate failed:`, error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ error: "Failed to duplicate workflow" }, { status: 500 });
  }
}
