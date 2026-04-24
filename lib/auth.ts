import { auth, currentUser } from "@clerk/nextjs/server";

export type AppAuthUser = {
  externalId: string;
  email: string;
  isDevelopmentBypass: boolean;
};

export function isDevelopmentAuthBypassEnabled(): boolean {
  return false;
}

export async function getAppAuthUser(): Promise<AppAuthUser | null> {
  const { userId } = auth();

  if (userId) {
    const clerkUser = await currentUser();
    return {
      externalId: userId,
      email: clerkUser?.emailAddresses?.[0]?.emailAddress ?? `${userId}@nextflow.local`,
      isDevelopmentBypass: false
    };
  }

  if (!isDevelopmentAuthBypassEnabled()) {
    return null;
  }

  return {
    externalId: "dev-local-user",
    email: "dev@nextflow.local",
    isDevelopmentBypass: true
  };
}
