import Image from "next/image";
import Link from "next/link";
import type { Edge, Node } from "@xyflow/react";
import { EyeOff, Folder, Plus, Search, ChevronDown, ArrowRight } from "lucide-react";
import { KreaExpandedSidebar, KreaNodeBadge } from "@/components/krea/KreaSidebar";
import { getAppAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { NodeData } from "@/lib/types";

async function getWorkflows() {
  const authUser = await getAppAuthUser();

  if (!authUser) {
    return { workflows: [], authUser: null };
  }

  const user = await prisma.user.upsert({
    where: { clerkId: authUser.externalId },
    update: { email: authUser.email },
    create: {
      clerkId: authUser.externalId,
      email: authUser.email
    }
  });

  const workflows = await prisma.workflow.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 8
  });

  return { workflows, authUser };
}

function formatRelativeCreatedAt(value: Date): string {
  const diffSeconds = Math.max(1, Math.floor((Date.now() - value.getTime()) / 1000));

  if (diffSeconds < 60) return `Edited ${diffSeconds} second${diffSeconds === 1 ? "" : "s"} ago`;

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `Edited ${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Edited ${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `Edited ${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

type PreviewNode = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

type PreviewEdge = {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  stroke: string;
};

type WorkflowPreview = {
  nodes: PreviewNode[];
  edges: PreviewEdge[];
};

function normalizeNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function buildWorkflowPreview(rawNodes: unknown, rawEdges: unknown): WorkflowPreview {
  const nodes = Array.isArray(rawNodes) ? (rawNodes as Node<NodeData>[]) : [];
  const edges = Array.isArray(rawEdges) ? (rawEdges as Edge[]) : [];

  if (nodes.length === 0) {
    return {
      nodes: [],
      edges: []
    };
  }

  const nodeBoxes = nodes.map((node, index) => {
    const width = node.type === "text" ? 22 : node.type === "llm" ? 24 : 18;
    const height = node.type === "llm" ? 36 : node.type === "upload-video" ? 24 : 18;

    return {
      id: node.id,
      x: normalizeNumber(node.position?.x, index * 110),
      y: normalizeNumber(node.position?.y, (index % 3) * 88),
      w: width,
      h: height
    };
  });

  const minX = Math.min(...nodeBoxes.map((node) => node.x));
  const minY = Math.min(...nodeBoxes.map((node) => node.y));
  const maxX = Math.max(...nodeBoxes.map((node) => node.x + node.w));
  const maxY = Math.max(...nodeBoxes.map((node) => node.y + node.h));
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);

  const previewNodes = nodeBoxes.map((node) => ({
    id: node.id,
    x: 10 + ((node.x - minX) / spanX) * 72,
    y: 10 + ((node.y - minY) / spanY) * 58,
    w: Math.max(10, (node.w / spanX) * 72),
    h: Math.max(10, (node.h / spanY) * 58)
  }));

  const previewNodeMap = new Map(previewNodes.map((node) => [node.id, node]));
  const edgeColors = ["#7d54ff", "#9b6fff", "#ffd64d", "#5ad0ff", "#7ee787"];

  const previewEdges = edges
    .map((edge, index) => {
      const source = previewNodeMap.get(edge.source);
      const target = previewNodeMap.get(edge.target);
      if (!source || !target) return null;

      return {
        sourceX: source.x + source.w,
        sourceY: source.y + source.h / 2,
        targetX: target.x,
        targetY: target.y + target.h / 2,
        stroke: edgeColors[index % edgeColors.length]
      };
    })
    .filter((edge): edge is PreviewEdge => edge !== null);

  return {
    nodes: previewNodes,
    edges: previewEdges
  };
}

function WorkflowThumbnail({ kind, preview }: { kind: "new" | "preview"; preview?: WorkflowPreview }) {
  if (kind === "new") {
    return (
      <div className="relative h-full rounded-[24px] bg-[#2b2b2b]">
        <div className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black">
          <Plus className="h-10 w-10" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full rounded-[24px] bg-[#181818]">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 80" preserveAspectRatio="none">
        {preview?.edges.map((edge, index) => (
          <path
            key={`${edge.sourceX}-${edge.targetX}-${index}`}
            d={`M ${edge.sourceX} ${edge.sourceY} C ${edge.sourceX + 10} ${edge.sourceY}, ${edge.targetX - 10} ${edge.targetY}, ${edge.targetX} ${edge.targetY}`}
            fill="none"
            stroke={edge.stroke}
            strokeWidth="1.35"
            strokeLinecap="round"
            opacity="0.92"
          />
        ))}
        {preview?.nodes.map((node) => (
          <g key={node.id}>
            <rect x={node.x} y={node.y} width={node.w} height={node.h} rx="3.6" fill="#535353" />
            <circle cx={node.x + node.w} cy={node.y + node.h / 2} r="1.25" fill="#9f7aea" />
            <circle cx={node.x} cy={node.y + node.h / 2} r="1.25" fill="#5ad0ff" />
          </g>
        ))}
      </svg>
    </div>
  );
}

export default async function WorkflowIndexPage() {
  const { workflows, authUser } = await getWorkflows();

  const userName = authUser?.isDevelopmentBypass
    ? "Vipul"
    : authUser?.email.split("@")[0] || "Vipul";
  const sidebarUser = {
    name: userName,
    plan: "Free",
    initial: userName.charAt(0).toUpperCase() || "V"
  };

  const cards = [
    {
      id: "new",
      name: "New Workflow",
      subtitle: "",
      href: "/workflow/new",
      kind: "new" as const,
      preview: undefined
    },
    ...workflows.map((workflow) => ({
      id: workflow.id,
      name: workflow.name || "Untitled",
      subtitle: formatRelativeCreatedAt(workflow.createdAt),
      href: `/workflow/${workflow.id}`,
      kind: "preview" as const,
      preview: buildWorkflowPreview(workflow.nodes, workflow.edges)
    }))
  ];

  return (
    <main className="min-h-screen bg-[#111111] text-white">
      <div className="flex min-h-screen">
        <KreaExpandedSidebar user={sidebarUser} />

        <section className="min-w-0 flex-1 bg-[#151515]">
          <div className="relative h-[620px] overflow-hidden">
            <Image src="/krea/nodes-hero.png" alt="Node Editor hero" fill className="object-cover" priority />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.34)_0%,rgba(0,0,0,0.12)_38%,rgba(0,0,0,0.18)_100%)]" />

            <div className="absolute inset-x-0 top-[116px] px-16">
              <div className="max-w-[760px]">
                <KreaNodeBadge />
                <p className="mt-8 max-w-[860px] text-[28px] leading-[1.34] tracking-[-0.05em] text-white">
                  Nodes is the most powerful way to operate Krea. Connect every tool and model into complex automated
                  pipelines.
                </p>
                <Link
                  href="/workflow/new"
                  className="mt-12 inline-flex h-[70px] items-center gap-4 rounded-full bg-white px-8 text-[22px] font-medium tracking-[-0.04em] text-black"
                >
                  New Workflow
                  <ArrowRight className="h-6 w-6" />
                </Link>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 bg-[linear-gradient(180deg,#1c1c1c_0%,#141414_100%)] px-16 pb-16 pt-8">
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-8 text-[20px] tracking-[-0.04em] text-white">
                <button type="button" className="rounded-[14px] bg-[#2a2a2a] px-6 py-3 font-medium">
                  Projects
                </button>
                <button type="button" className="text-white/92">
                  Apps
                </button>
                <button type="button" className="text-white/92">
                  Examples
                </button>
                <button type="button" className="text-white/92">
                  Templates
                </button>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-[54px] items-center gap-3 rounded-[16px] border border-white/12 bg-transparent px-5 text-[16px] text-white/52">
                  <Search className="h-5 w-5" />
                  <span>Search projects...</span>
                </div>
                <button
                  type="button"
                  className="inline-flex h-[54px] items-center gap-4 rounded-[16px] border border-white/12 px-5 text-[16px] text-white"
                >
                  Last viewed
                  <ChevronDown className="h-4 w-4 text-white/55" />
                </button>
                <button
                  type="button"
                  className="flex h-[54px] w-[54px] items-center justify-center rounded-[16px] border border-white/12 text-white/55"
                  aria-label="Hide"
                >
                  <EyeOff className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="mt-8 border-t border-white/8 pt-10">
              <div className="grid grid-cols-1 gap-x-8 gap-y-10 xl:grid-cols-2 2xl:grid-cols-3">
                {cards.map((card) => (
                  <Link key={card.id} href={card.href} className="group block">
                    <div className="relative aspect-[1.06/1] overflow-hidden rounded-[20px] border border-white/6 bg-[#171717]">
                      <WorkflowThumbnail kind={card.kind} preview={card.preview} />
                    </div>
                    <div className="pt-4 text-[22px] font-medium tracking-[-0.04em] text-white">{card.name}</div>
                    <div className="pt-1 text-[15px] tracking-[-0.03em] text-white/42">{card.subtitle}</div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
