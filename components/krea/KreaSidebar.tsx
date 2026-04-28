"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  ChevronDown,
  Copy,
  Folder,
  Home,
  PanelLeft,
  MoreHorizontal,
  Plus,
  Share2,
  Sparkles,
  Trash2
} from "lucide-react";
import type { WorkflowListItem } from "@/lib/types";

type SidebarUser = {
  name: string;
  plan: string;
  initial: string;
};

type ExpandedSidebarProps = {
  user?: SidebarUser;
  sessions?: Array<{
    id: string;
    name: string;
    href: string;
  }>;
};

type RailSidebarProps = {
  user?: SidebarUser;
};

type NavItem = {
  label: string;
  href: string;
  icon: ReactNode;
};

type ToolItem = {
  label: string;
  icon: ReactNode;
};

function RunStatusDot({ status }: { status?: string | null }) {
  const cls =
    status === "success"
      ? "bg-emerald-400"
      : status === "failed"
        ? "bg-red-400"
        : status === "partial" || status === "running" || status === "pending"
          ? "bg-amber-400"
          : "bg-[var(--text-muted)]";

  return <span className={`h-1.5 w-1.5 rounded-full ${cls}`} />;
}

function WorkflowSidebarSection() {
  const pathname = usePathname();
  const router = useRouter();
  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const currentWorkflowId = useMemo(() => {
    if (!pathname.startsWith("/workflow/")) return null;
    return pathname.split("/")[2] ?? null;
  }, [pathname]);

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/workflows", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to fetch workflows (${response.status})`);
      }

      const payload = (await response.json()) as { workflows?: WorkflowListItem[] };
      setWorkflows(Array.isArray(payload.workflows) ? payload.workflows : []);
    } catch (error) {
      console.error("Failed to fetch workflow list:", error);
      setWorkflows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchWorkflows();
  }, []);

  const createWorkflow = async () => {
    try {
      const response = await fetch("/api/workflows", { method: "POST" });
      if (!response.ok) throw new Error(`Failed to create workflow (${response.status})`);
      const payload = (await response.json()) as { workflow?: { id: string } };
      if (!payload.workflow?.id) throw new Error("Workflow id missing from create response");
      await fetchWorkflows();
      router.push(`/workflow/${payload.workflow.id}`);
    } catch (error) {
      console.error("Failed to create workflow:", error);
    }
  };

  const duplicateWorkflow = async (workflowId: string) => {
    try {
      setBusyId(workflowId);
      const response = await fetch(`/api/workflows/${workflowId}/duplicate`, { method: "POST" });
      if (!response.ok) throw new Error(`Failed to duplicate workflow (${response.status})`);
      const payload = (await response.json()) as { workflow?: { id: string } };
      if (!payload.workflow?.id) throw new Error("Workflow id missing from duplicate response");
      await fetchWorkflows();
      router.push(`/workflow/${payload.workflow.id}`);
    } catch (error) {
      console.error("Failed to duplicate workflow:", error);
    } finally {
      setBusyId(null);
    }
  };

  const deleteWorkflow = async (workflowId: string) => {
    if (!window.confirm("Delete this workflow?")) return;

    try {
      setBusyId(workflowId);
      const response = await fetch(`/api/workflows/${workflowId}`, { method: "DELETE" });
      if (!response.ok) throw new Error(`Failed to delete workflow (${response.status})`);
      await fetchWorkflows();
      if (currentWorkflowId === workflowId) {
        router.push("/workflow");
      }
    } catch (error) {
      console.error("Failed to delete workflow:", error);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="pt-2">
      <div className="mb-2 flex items-center justify-between px-4">
        <span className="text-sm text-[var(--text-muted)]">Workflows</span>
        <button
          type="button"
          onClick={() => void createWorkflow()}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-[var(--border-color)] px-2 text-xs text-[var(--text-secondary)] transition hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
        >
          <Plus className="h-3.5 w-3.5" />
          New
        </button>
      </div>

      <div className="space-y-1 px-2">
        {loading ? (
          <div className="rounded-md px-3 py-2 text-xs text-[var(--text-muted)]">Loading workflows…</div>
        ) : workflows.length === 0 ? (
          <div className="rounded-md px-3 py-2 text-xs text-[var(--text-muted)]">No workflows yet</div>
        ) : (
          workflows.map((workflow) => {
            const isActive = workflow.id === currentWorkflowId;
            const href = `/workflow/${workflow.id}`;

            return (
              <div
                key={workflow.id}
                className={`group flex items-center gap-2 rounded-md border px-2.5 py-2 transition ${
                  isActive
                    ? "border-[#7c3aed] bg-[var(--bg-tertiary)]"
                    : "border-transparent hover:border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]"
                }`}
              >
                <Link href={href} className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm text-[var(--text-primary)]">{workflow.name}</span>
                    <span className="rounded-full bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[10px] text-[var(--text-secondary)]">
                      {workflow.nodeCount}
                    </span>
                    <RunStatusDot status={workflow.lastRunStatus} />
                  </div>
                </Link>

                <div className="hidden items-center gap-1 group-hover:flex">
                  <button
                    type="button"
                    onClick={() => void duplicateWorkflow(workflow.id)}
                    disabled={busyId === workflow.id}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--text-secondary)] transition hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
                    title="Duplicate workflow"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteWorkflow(workflow.id)}
                    disabled={busyId === workflow.id}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--text-secondary)] transition hover:bg-[var(--bg-secondary)] hover:text-red-400 disabled:opacity-50"
                    title="Delete workflow"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function SidebarLogo({
  src,
  alt,
  className
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return <img draggable={false} src={src} alt={alt} className={className} />;
}

function IconTile({
  className,
  icon,
  selected = false
}: {
  className: string;
  icon: ReactNode;
  selected?: boolean;
}) {
  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded-[9px] border ${selected ? "border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)]" : "border-[var(--border-color)] text-[var(--text-primary)]"} ${className}`}
    >
      {icon}
    </span>
  );
}

const navItems: NavItem[] = [
  {
    label: "Home",
    href: "/",
    icon: <SidebarLogo src="https://optim-images.krea.ai/https---s-krea-ai-icons-HomeIcon-png-128.webp" alt="Home" className="h-5 w-5 rounded-[8px]" />
  },
  {
    label: "Train Lora",
    href: "#",
    icon: <SidebarLogo src="https://optim-images.krea.ai/https---s-krea-ai-icons-Train-png-128.webp" alt="Train Lora" className="h-5 w-5 rounded-[8px]" />
  },
  {
    label: "Node Editor",
    href: "/workflow",
    icon: <SidebarLogo src="https://optim-images.krea.ai/https---s-krea-ai-icons-NodeEditor-png-128.webp" alt="Node Editor" className="h-5 w-5 rounded-[8px]" />
  },
  {
    label: "Assets",
    href: "#",
    icon: <SidebarLogo src="https://optim-images.krea.ai/https---s-krea-ai-icons-Assets-png-128.webp" alt="Assets" className="h-5 w-5 rounded-[8px]" />
  }
];

const toolItems: ToolItem[] = [
  {
    label: "Image",
    icon: <SidebarLogo src="https://optim-images.krea.ai/https---s-krea-ai-icons-imageV4-png-128.webp" alt="Image" className="h-5 w-5 rounded-[8px]" />
  },
  {
    label: "Video",
    icon: <SidebarLogo src="https://optim-images.krea.ai/https---s-krea-ai-icons-videoV2-png-128.webp" alt="Video" className="h-5 w-5 rounded-[8px]" />
  },
  {
    label: "Enhancer",
    icon: <SidebarLogo src="https://optim-images.krea.ai/https---s-krea-ai-icons-Enhance-png-128.webp" alt="Enhancer" className="h-5 w-5 rounded-[8px]" />
  },
  {
    label: "Nano Banana",
    icon: <SidebarLogo src="https://optim-images.krea.ai/https---s-krea-ai-icons-NanoBanana-png-128.webp" alt="Nano Banana" className="h-5 w-5 rounded-[8px]" />
  },
  {
    label: "Realtime",
    icon: <SidebarLogo src="https://optim-images.krea.ai/https---s-krea-ai-icons-realtimeV2-png-128.webp" alt="Realtime" className="h-5 w-5 rounded-[8px]" />
  },
  {
    label: "Edit",
    icon: <SidebarLogo src="https://optim-images.krea.ai/https---s-krea-ai-icons-Edit-png-128.webp" alt="Edit" className="h-5 w-5 rounded-[8px]" />
  }
];

export function KreaExpandedSidebar({
  user = { name: "daringagilefossa", plan: "Free", initial: "D" },
  sessions = []
}: ExpandedSidebarProps) {
  const pathname = usePathname();
  const { signOut: authSignOut } = useAuth();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeToolLabel, setActiveToolLabel] = useState("Image");

  const activeNav = useMemo(
    () =>
      navItems.find((item) => item.href !== "#" && (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)))?.label ??
      "Node Editor",
    [pathname]
  );

  if (isCollapsed) {
    return (
      <aside className="flex h-screen w-[52px] shrink-0 flex-col border-r border-[var(--border-color)] bg-[var(--sidebar)] text-[var(--sidebar-foreground)]">
        <div className="flex h-full w-full flex-col items-center px-1.5 pt-3">
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="mb-5 flex h-[30px] w-[30px] items-center justify-center rounded-md text-[var(--text-secondary)] transition hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            aria-label="Expand sidebar"
          >
            <PanelLeft className="h-4 w-4" />
          </button>

          <div className="flex flex-col items-center gap-[18px]">
            {navItems.map((item) => {
              const isActive = item.label === activeNav;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex h-[30px] w-[30px] items-center justify-center rounded-[12px] transition ${
                    isActive ? "bg-[var(--bg-tertiary)] shadow-[inset_0_0_0_1px_var(--border-color)]" : "hover:bg-[var(--bg-tertiary)]"
                  }`}
                  title={item.label}
                >
                  {item.icon}
                </Link>
              );
            })}
          </div>

          <div className="mt-9 flex flex-col items-center gap-[18px]">
            {toolItems.map((item) => {
              const isActive = item.label === activeToolLabel;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setActiveToolLabel(item.label)}
                  className={`flex h-[30px] w-[30px] items-center justify-center rounded-[12px] transition ${
                    isActive ? "bg-[var(--bg-tertiary)] shadow-[inset_0_0_0_1px_var(--border-color)]" : "hover:bg-[var(--bg-tertiary)]"
                  }`}
                  title={item.label}
                >
                  {item.icon}
                </button>
              );
            })}

            <button
              type="button"
              className="flex h-[30px] w-[30px] items-center justify-center rounded-md text-[var(--text-muted)] transition hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-secondary)]"
              title="More"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-auto flex flex-col items-center gap-4 pb-4">
            <button
              type="button"
              className="flex h-[30px] w-[30px] items-center justify-center rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] transition hover:bg-[var(--bg-tertiary)]"
              title="Create"
            >
              <Plus className="h-4 w-4" />
            </button>

            <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[12px] bg-[var(--bg-tertiary)] text-[13px] text-[var(--text-primary)]">
              {user.initial}
            </div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-screen w-[288px] shrink-0 flex-col border-r border-[var(--border-color)] bg-[var(--sidebar)] p-2 text-[var(--sidebar-foreground)]">
      <div className="pb-1">
        <button
          type="button"
          onClick={() => setIsCollapsed(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[var(--text-secondary)] transition hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
          aria-label="Collapse sidebar"
        >
          <PanelLeft className="h-5 w-5" />
        </button>

        <nav className="mt-1 space-y-px">
          {navItems.map((item) => {
            const isActive = item.href !== "#" && (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href));

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex h-9 items-center gap-2 overflow-hidden rounded-md px-4 text-sm transition ${
                  isActive
                    ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)] shadow-[inset_0_0_0_1px_var(--border-color)]"
                    : "text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
                }`}
              >
                <span className="flex h-5 w-5 items-center justify-center overflow-hidden [&_svg]:h-5 [&_svg]:w-5">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="pt-2">
        <div className="mb-1 flex h-9 items-center px-4 text-sm text-[var(--text-muted)]">Tools</div>
        <div className="space-y-px">
          {toolItems.map((item) => {
            const isActive = item.label === activeToolLabel;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => setActiveToolLabel(item.label)}
                className={`flex h-9 w-full items-center gap-2 rounded-md px-4 text-left text-sm transition ${
                  isActive ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)] shadow-[inset_0_0_0_1px_var(--border-color)]" : "text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
                }`}
              >
                <span className="flex h-5 w-5 items-center justify-center overflow-hidden">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
          <button type="button" className="flex h-9 w-full items-center gap-2 rounded-md px-4 text-left text-sm text-[var(--text-muted)] transition hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-secondary)]">
            <MoreHorizontal className="h-5 w-5" />
            <span>More</span>
          </button>
        </div>
      </div>

      <WorkflowSidebarSection />

      <div className="mt-auto pt-2">
        <div className="mb-1 flex h-9 items-center px-4 text-sm text-[var(--text-muted)]">Sessions</div>
        <div className="space-y-px">
          {sessions.length > 0 ? (
            <div className="space-y-px">
              {sessions.map((session) => {
                const isActive = pathname === session.href;

                return (
                  <Link
                    key={session.id}
                    href={session.href}
                    className={`flex min-h-12 items-center gap-3 rounded-md px-4 py-2 text-sm transition ${
                      isActive ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)] shadow-[inset_0_0_0_1px_var(--border-color)]" : "text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
                    }`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                      <Share2 className="h-4 w-4 shrink-0" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm">{session.name}</div>
                      <div className="truncate text-xs text-[var(--text-secondary)]">Node Editor</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <>
              <div className="px-4 py-2 text-sm text-[var(--text-primary)]">Earn 3,000 Credits</div>
              <button
                type="button"
                className="mx-2 h-11 rounded-xl bg-[linear-gradient(90deg,#d7e9ff_0%,#7ca6ff_56%,#355fff_100%)] px-4 text-left text-sm font-medium text-[#1d3f91] shadow-[0_0_24px_rgba(76,110,255,0.25)]"
              >
                Upgrade
              </button>
            </>
          )}

          <div className="flex items-center gap-3 px-2 pt-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--bg-tertiary)] text-base text-[var(--text-primary)]">
              {user.initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-[var(--text-primary)]">{user.name}</div>
              <div className="text-xs text-[var(--text-secondary)]">{user.plan}</div>
            </div>
            <button
              type="button"
              onClick={async () => {
                await authSignOut();
                window.location.href = "/sign-in";
              }}
              className="rounded-md border border-[var(--border-color)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function KreaRailSidebar({ user = { name: "daringagilefossa", plan: "Free", initial: "D" } }: RailSidebarProps) {
  const pathname = usePathname();
  const activeRail = pathname.startsWith("/workflow/") ? "/workflow" : "/";

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[78px] flex-col items-center border-r border-white/5 bg-black pt-6 text-white">
      <span className="mb-9 text-[26px] font-light leading-none text-white/78">◫</span>

      <div className="flex flex-col items-center gap-6">
        <Link href="/" className={`rounded-[14px] p-1 ${activeRail === "/" ? "bg-white text-[#111111]" : "text-white"}`}>
          <Home className="h-8 w-8 fill-current" />
        </Link>
        <span className="h-8 w-8 rounded-full bg-[conic-gradient(from_210deg,#ff5f5f,#ffcd57,#3bd873,#3ab6ff,#7c4dff,#ff5f5f)]" />
        <Link href="/workflow" className="rounded-[14px]">
          <IconTile
            className={`${activeRail === "/workflow" ? "shadow-[0_0_0_1px_rgba(255,255,255,0.08)]" : ""} border-transparent bg-[linear-gradient(180deg,#4f9cff_0%,#0d66ff_100%)] text-white`}
            icon={<Folder className="h-4 w-4 fill-current" />}
          />
        </Link>
        <Folder className="h-8 w-8 fill-[#8fd2ff] text-[#8fd2ff]" />
      </div>

      <div className="mt-14 flex flex-col items-center gap-7">
        {toolItems.map((item) => (
          <span key={item.label}>{item.icon}</span>
        ))}
        <MoreHorizontal className="h-5 w-5 text-white/46" />
      </div>

      <div className="mt-auto flex flex-col items-center gap-4 pb-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#242424] text-[20px] text-white">
          {user.initial}
        </div>
      </div>
    </aside>
  );
}

export function KreaNodeBadge() {
  return (
    <div className="inline-flex items-center gap-3 rounded-[16px] bg-[#242424] px-5 py-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
      <IconTile
        className="border-transparent bg-[linear-gradient(180deg,#4f9cff_0%,#0d66ff_100%)] text-white"
        icon={<Folder className="h-5 w-5 fill-current" />}
      />
      <span className="text-[24px] font-medium tracking-[-0.03em] text-white">Node Editor</span>
    </div>
  );
}

export function KreaCanvasTitle({ title }: { title: string }) {
  return (
    <div className="inline-flex items-center gap-4 rounded-[22px] bg-[#232323] px-10 py-7 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
      <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#191919]">
        <Sparkles className="h-8 w-8 fill-current text-white" />
      </span>
      <ChevronDown className="h-5 w-5 text-white/72" />
      <span className="text-[27px] font-medium tracking-[-0.03em] text-white">{title}</span>
    </div>
  );
}
