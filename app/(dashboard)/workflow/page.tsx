import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { KreaExpandedSidebar } from "@/components/krea/KreaSidebar";
import { getOrCreateUser } from "@/lib/helpers/getOrCreateUser";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatEditedLabel(value: Date) {
  const diffSeconds = Math.max(1, Math.floor((Date.now() - value.getTime()) / 1000));

  if (diffSeconds < 60) return `Edited ${diffSeconds} second${diffSeconds === 1 ? "" : "s"} ago`;

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `Edited ${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Edited ${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `Edited ${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

function WorkflowPreview({
  nodes,
  edges,
  isNew
}: {
  nodes: Array<{ id: string; position?: { x?: number; y?: number } }>;
  edges: Array<{ source: string; target: string }>;
  isNew?: boolean;
}) {
  if (isNew) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[32px] leading-none text-[#111111]">
          +
        </div>
      </div>
    );
  }

  const slicedNodes = nodes.slice(0, 5).map((node, index) => ({
    id: node.id,
    x: 16 + (index % 3) * 62 + (((node.position?.x ?? 0) / 12) % 18),
    y: 14 + Math.floor(index / 3) * 60 + (((node.position?.y ?? 0) / 12) % 16),
    width: index === 2 ? 56 : 42,
    height: index === 2 ? 72 : 34
  }));

  const byId = new Map(slicedNodes.map((node) => [node.id, node]));
  const previewEdges = edges
    .filter((edge) => byId.has(edge.source) && byId.has(edge.target))
    .slice(0, 4);

  return (
    <svg viewBox="0 0 220 136" className="h-full w-full">
      {previewEdges.map((edge) => {
        const source = byId.get(edge.source);
        const target = byId.get(edge.target);
        if (!source || !target) return null;

        const startX = source.x + source.width;
        const startY = source.y + source.height / 2;
        const endX = target.x;
        const endY = target.y + target.height / 2;
        const controlOffset = Math.max(16, Math.abs(endX - startX) / 2);

        return (
          <path
            key={`${edge.source}-${edge.target}`}
            d={`M ${startX} ${startY} C ${startX + controlOffset} ${startY}, ${endX - controlOffset} ${endY}, ${endX} ${endY}`}
            fill="none"
            stroke="#7c3aed"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        );
      })}

      {slicedNodes.map((node) => (
        <g key={node.id}>
          <rect x={node.x} y={node.y} width={node.width} height={node.height} rx="6" fill="#4a4a4a" />
          <circle cx={node.x + node.width} cy={node.y + node.height / 2} r="2.5" fill="#9b5cff" />
          <circle cx={node.x} cy={node.y + node.height / 2} r="2.5" fill="#f4c430" />
        </g>
      ))}
    </svg>
  );
}

function WorkflowCard({
  href,
  title,
  subtitle,
  nodes,
  edges,
  isNew
}: {
  href: string;
  title: string;
  subtitle: string;
  nodes: Array<{ id: string; position?: { x?: number; y?: number } }>;
  edges: Array<{ source: string; target: string }>;
  isNew?: boolean;
}) {
  return (
    <Link href={href} className="group block">
      <div className="overflow-hidden rounded-[14px] border border-white/8 bg-[#171717] transition hover:border-white/14 hover:bg-[#1a1a1a]">
        <div className="aspect-[1.35/1] p-4">
          <WorkflowPreview nodes={nodes} edges={edges} isNew={isNew} />
        </div>
      </div>
      <div className="mt-3">
        <div className="truncate text-[14px] font-medium tracking-[-0.03em] text-white">{title}</div>
        <div className="mt-1 text-[11px] text-white/42">{subtitle}</div>
      </div>
    </Link>
  );
}

export default async function WorkflowIndexPage() {
  const { userId } = auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await getOrCreateUser();

  const workflows = await prisma.workflow.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      name: true,
      nodes: true,
      edges: true,
      createdAt: true
    }
  });

  return (
    <div className="flex min-h-screen bg-[var(--bg-primary)]">
      <KreaExpandedSidebar />

      <main className="flex-1 overflow-y-auto bg-[#111111]">
        <div className="border-b border-white/6">
          <div className="relative aspect-[2.68/1] min-h-[280px] overflow-hidden">
            <img
              src="/krea/nodes-hero-reference.png"
              alt="Node Editor"
              className="h-full w-full object-contain object-top"
              draggable={false}
            />
            <Link
              href="/workflow/new"
              className="absolute left-[7.2%] top-[58.5%] h-[8.8%] w-[15.8%] min-h-[44px] min-w-[170px] rounded-full"
              aria-label="New Workflow"
              title="New Workflow"
            />
          </div>
        </div>

        <section className="px-8 pb-12 pt-8">
          <div className="mb-6 flex items-center justify-between gap-4 border-b border-white/6 pb-5">
            <div className="flex items-center gap-6">
              {["Projects", "Apps", "Examples", "Templates"].map((tab, index) => (
                <button
                  key={tab}
                  type="button"
                  className={`rounded-[12px] px-5 py-3 text-[13px] tracking-[-0.03em] transition ${
                    index === 0 ? "bg-[#242424] text-white" : "text-white/84 hover:bg-[#1a1a1a]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-[44px] w-[290px] items-center rounded-[12px] border border-white/10 px-4 text-[13px] text-white/35">
                Search projects...
              </div>
              <div className="flex h-[44px] items-center rounded-[12px] border border-white/10 px-5 text-[13px] text-white/84">
                Last viewed
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-x-6 gap-y-8 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
            <WorkflowCard
              href="/workflow/new"
              title="New Workflow"
              subtitle="Create from scratch"
              nodes={[]}
              edges={[]}
              isNew
            />

            {workflows.map((workflow) => (
              <WorkflowCard
                key={workflow.id}
                href={`/workflow/${workflow.id}`}
                title={workflow.name || "Untitled"}
                subtitle={formatEditedLabel(workflow.createdAt)}
                nodes={Array.isArray(workflow.nodes) ? ((workflow.nodes as unknown) as Array<{ id: string; position?: { x?: number; y?: number } }>) : []}
                edges={Array.isArray(workflow.edges) ? ((workflow.edges as unknown) as Array<{ source: string; target: string }>) : []}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
