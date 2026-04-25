import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

const userSelect = {
  id: true,
  clerkId: true,
  email: true
} as const;

export async function getOrCreateUser() {
  const { userId } = auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const existingUser = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: userSelect
  });

  if (existingUser) {
    return existingUser;
  }

  const client = await clerkClient();
  const clerkUser = await client.users.getUser(userId);
  const email =
    clerkUser.emailAddresses.find((entry) => entry.id === clerkUser.primaryEmailAddressId)?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    `${userId}@nextflow.local`;

  return prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        clerkId: userId,
        email
      },
      select: userSelect
    });

    await tx.workflow.create({
      data: {
        userId: createdUser.id,
        name: "Untitled Workflow",
        nodes: [],
        edges: []
      }
    });

    return createdUser;
  });
}
