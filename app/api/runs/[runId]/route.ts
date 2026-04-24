import { NextResponse } from "next/server";
import { getAppAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, context: { params: { runId: string } }): Promise<NextResponse> {
  try {
    const authUser = await getAppAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: authUser.externalId }
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const run = await prisma.workflowRun.findFirst({
      where: {
        id: context.params.runId,
        workflow: {
          userId: dbUser.id
        }
      },
      include: {
        executions: true
      }
    });

    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    return NextResponse.json({ run });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch run", details: `${error}` }, { status: 500 });
  }
}
