"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export async function signOutAction() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/");
    return;
  }

  const client = await clerkClient();
  await client.sessions.getSessionList({ userId }).then(async (sessions) => {
    for (const session of sessions.data) {
      await client.sessions.revokeSession(session.id);
    }
  });

  redirect("/");
}
