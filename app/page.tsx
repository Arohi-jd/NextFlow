import Link from "next/link";
import { redirect } from "next/navigation";
import { getAppAuthUser, isDevelopmentAuthBypassEnabled } from "@/lib/auth";

export default async function HomePage() {
  const user = await getAppAuthUser();

  if (user) {
    redirect("/workflow");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#201339_0%,#0a0a0a_42%,#0a0a0a_100%)] text-white">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="text-sm uppercase tracking-[0.35em] text-violet-300">NextFlow</p>
        <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-balance">
          Visual AI workflows for text, image, video, and LLM pipelines.
        </h1>
        <p className="max-w-2xl text-sm text-zinc-400">
          Build DAG-based workflows with React Flow, Clerk auth, Prisma persistence, Trigger.dev execution, and a dark canvas tuned for production work.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {isDevelopmentAuthBypassEnabled() && (
            <Link className="rounded-full bg-emerald-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-400" href="/workflow">
              Enter local dev mode
            </Link>
          )}
          <Link className="rounded-full bg-violet-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-violet-400" href="/sign-in">
            Sign in
          </Link>
          <Link className="rounded-full border border-zinc-800 px-5 py-3 text-sm font-medium text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-900" href="/sign-up">
            Sign up
          </Link>
        </div>
      </div>
    </main>
  );
}
