import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const { userId } = auth();

    if (!userId) {
      return NextResponse.redirect(new URL("/sign-in", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3002"));
    }

    const client = await clerkClient();
    const sessions = await client.sessions.getSessionList({ userId });

    for (const session of sessions.data) {
      await client.sessions.revokeSession(session.id);
    }

    return NextResponse.redirect(new URL("/sign-in", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3002"));
  } catch (error) {
    console.error("POST /api/logout failed:", error);
    return NextResponse.redirect(new URL("/sign-in", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3002"));
  }
}
