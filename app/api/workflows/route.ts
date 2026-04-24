import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeEdgesForPersistence, sanitizeNodesForPersistence } from "@/lib/utils/persistence";

const workflowSchema = z.object({
  id: z.string().nullable().optional(),
  name: z.string().min(1),
  nodes: z.array(z.any()),
  edges: z.array(z.any())
});

async function ensureDbUser(): Promise<{ id: string; clerkId: string; email: string } | null> {
  const authUser = await getAppAuthUser();
  if (!authUser) return null;

  const user = await prisma.user.upsert({
    where: { clerkId: authUser.externalId },
    update: { email: authUser.email },
    create: {
      clerkId: authUser.externalId,
      email: authUser.email
    }
  });

  return user;
}

export async function GET(): Promise<NextResponse> {
  try {
    const user = await ensureDbUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workflows = await prisma.workflow.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ workflows });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch workflows", details: `${error}` }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await ensureDbUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = workflowSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
    }

    const { id, name, nodes, edges } = parsed.data;

    const nodeData = sanitizeNodesForPersistence(JSON.parse(JSON.stringify(nodes)));
    const edgeData = sanitizeEdgesForPersistence(JSON.parse(JSON.stringify(edges)));

    if (id) {
      const existing = await prisma.workflow.findFirst({
        where: {
          id,
          userId: user.id
        }
      });

      if (existing) {
        const updated = await prisma.workflow.update({
          where: { id: existing.id },
          data: {
            name,
            nodes: nodeData,
            edges: edgeData
          }
        });

        return NextResponse.json({ workflow: updated });
      }
    }

    const created = await prisma.workflow.create({
      data: {
        name,
        userId: user.id,
        nodes: nodeData,
        edges: edgeData
      }
    });

    return NextResponse.json({ workflow: created });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save workflow", details: `${error}` }, { status: 500 });
  }
}
