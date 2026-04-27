import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAppAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function NewWorkflowPage() {
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

  const workflow = await prisma.workflow.create({
    data: {
      name: "Untitled",
      userId: user.id,
      nodes: [],
      edges: []
    }
  });

  revalidatePath("/workflow");

  redirect(`/workflow/${workflow.id}`);
}
