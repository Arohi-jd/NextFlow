import { redirect } from "next/navigation";
import { getAppAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function WorkflowIndexPage() {
  const authUser = await getAppAuthUser();

  if (!authUser) {
    redirect("/sign-in");
  }

  const user = await prisma.user.upsert({
    where: { clerkId: authUser.externalId },
    update: { email: authUser.email },
    create: {
      clerkId: authUser.externalId,
      email: authUser.email
    }
  });

  const existingWorkflow = await prisma.workflow.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" }
  });

  if (existingWorkflow) {
    redirect(`/workflow/${existingWorkflow.id}`);
  }

  const workflow = await prisma.workflow.create({
    data: {
      name: "Untitled Workflow",
      userId: user.id,
      nodes: [],
      edges: []
    }
  });

  redirect(`/workflow/${workflow.id}`);
}
