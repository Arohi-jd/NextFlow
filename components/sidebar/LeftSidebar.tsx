"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import {
  Bot,
  Crop,
  Film,
  Folder,
  Home,
  Image,
  MoreHorizontal,
  Search,
  Sparkles,
  Type,
  Video,
  Plus,
  Copy,
  Trash2,
  Dot
} from "lucide-react";

type NodeType = "text" | "upload-image" | "upload-video" | "llm" | "crop-image" | "extract-frame";

interface WorkflowItem {
  id: string;
  name: string;
  nodeCount: number;
  updatedAt: string;
  lastRunStatus?: string | null;
  lastRunDate?: string | null;
}

interface NodeDefinition {
  type: NodeType;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconTile: string;
}

const navItems = [
  {
    label: "Home",
    href: "/",
    icon: <Home className="h-5 w-5 fill-current" />
  },
  {
    label: "Train Lora",
    href: "#",
    icon: <span className="h-5 w-5 rounded-full bg-[conic-gradient(from_210deg,#ff5f5f,#ffcd57,#3bd873,#3ab6ff,#7c4dff,#ff5f5f)]" />
  },
  {
    label: "Node Editor",
    href: "/workflow",
    icon: (
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-transparent bg-[linear-gradient(180deg,#4f9cff_0%,#0d66ff_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]">
        <Folder className="h-4 w-4 fill-current" />
      </span>
    )
  },
  {
    label: "Assets",
    href: "#",
    icon: <Folder className="h-6 w-6 fill-[#8fd2ff] text-[#8fd2ff]" />
  }
];

const nodeDefinitions: NodeDefinition[] = [
  {
    type: "text",
    name: "Text",
    description: "Prompt or free text input",
    icon: Type,
    iconTile: "bg-[linear-gradient(180deg,#7f38e8_0%,#5a1bb5_100%)]"
  },
  {
    type: "upload-image",
    name: "Upload Image",
    description: "Bring an image into the workflow",
    icon: Image,
    iconTile: "bg-[linear-gradient(180deg,#7fd7ff_0%,#4297ff_100%)]"
  },
  {
    type: "upload-video",
    name: "Upload Video",
    description: "Bring a video into the workflow",
    icon: Video,
    iconTile: "bg-[linear-gradient(180deg,#ffd44d_0%,#ffab00_100%)]"
  },
  {
    type: "llm",
    name: "Run Any LLM",
    description: "AI language model node",
    icon: Bot,
    iconTile: "bg-[linear-gradient(180deg,#6eb4ff_0%,#2563eb_100%)]"
  },
  {
    type: "crop-image",
    name: "Crop Image",
    description: "Crop image region",
    icon: Crop,
    iconTile: "bg-[linear-gradient(180deg,#ffd566_0%,#f0aa18_100%)]"
  },
  {
    type: "extract-frame",
    name: "Extract Frame from Vi...",
    description: "Grab a still from a video",
    icon: Film,
    iconTile: "bg-[linear-gradient(180deg,#8ed4ff_0%,#2a8fff_100%)]"
  }
];

interface LeftSidebarProps {
  isCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  onAddNode?: (type: NodeType) => void;
  onOpenLibraryCategory?: (categoryId: string) => void;
  currentWorkflowId?: string;
}

function NodeIconTile({ className, icon }: { className: string; icon: React.ReactNode }) {
  return (
    <span
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] ${className}`}
    >
      {icon}
    </span>
  );
}

const toolLaunchers = [
  { label: "Image", categoryId: "generate-image" },
  { label: "Video", categoryId: "generate-video" },
  { label: "Enhancer", categoryId: "enhance-image" },
  { label: "Nano Banana", categoryId: "edit-image" },
  { label: "Realtime", categoryId: "generate-video" },
  { label: "Edit", categoryId: "utility" }
] as const;

export default function LeftSidebar({
  isCollapsed = false,
  onCollapsedChange,
  onAddNode,
  onOpenLibraryCategory,
  currentWorkflowId
}: LeftSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false);
  const [workflowHovered, setWorkflowHovered] = useState<string | null>(null);

  // Fetch workflows on mount
  useEffect(() => {
    const fetchWorkflows = async () => {
      setIsLoadingWorkflows(true);
      try {
        const response = await fetch("/api/workflows");
        if (response.ok) {
          const data = (await response.json()) as { workflows: WorkflowItem[] };
          setWorkflows(data.workflows);
        }
      } catch (error) {
        console.error("Failed to fetch workflows:", error);
      } finally {
        setIsLoadingWorkflows(false);
      }
    };

    void fetchWorkflows();
  }, []);

  const handleNewWorkflow = async () => {
    try {
      const response = await fetch("/api/workflows", { method: "POST" });
      if (response.ok) {
        const data = (await response.json()) as { workflow: { id: string } };
        router.push(`/workflow/${data.workflow.id}`);
      }
    } catch (error) {
      console.error("Failed to create workflow:", error);
    }
  };

  const handleDuplicateWorkflow = async (workflowId: string) => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}/duplicate`, { method: "POST" });
      if (response.ok) {
        const data = (await response.json()) as { workflow: { id: string } };
        setWorkflows([...workflows, data.workflow as unknown as WorkflowItem]);
        router.push(`/workflow/${data.workflow.id}`);
      }
    } catch (error) {
      console.error("Failed to duplicate workflow:", error);
    }
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    if (!window.confirm("Are you sure you want to delete this workflow?")) return;

    try {
      const response = await fetch(`/api/workflows/${workflowId}`, { method: "DELETE" });
      if (response.ok) {
        setWorkflows(workflows.filter((w) => w.id !== workflowId));
        if (currentWorkflowId === workflowId) {
          router.push("/workflow");
        }
      }
    } catch (error) {
      console.error("Failed to delete workflow:", error);
    }
  };

  const getStatusDotColor = (status?: string | null) => {
    if (!status) return "bg-gray-500";
    if (status === "completed") return "bg-green-500";
    if (status === "failed") return "bg-red-500";
    return "bg-yellow-500";
  };

  const filteredNodes = useMemo(
    () =>
      nodeDefinitions.filter(
        (node) =>
          node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          node.description.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [searchQuery]
  );

  const handleNodeDragStart = (event: React.DragEvent<HTMLButtonElement>, nodeType: NodeType) => {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/json", JSON.stringify({ type: nodeType }));
  };

  if (isCollapsed) {
    return (
      <aside className="flex h-screen w-[54px] shrink-0 flex-col items-center border-r border-white/8 bg-black pt-4 text-white">
        <button
          type="button"
          onClick={() => onCollapsedChange?.(false)}
          className="mb-4 flex h-8 w-8 items-center justify-center rounded-[10px] border border-white/8 text-white/70 transition hover:bg-white/5 hover:text-white"
          aria-label="Expand sidebar"
        >
          <span className="text-lg leading-none">◫</span>
        </button>

        <div className="flex flex-col items-center gap-6">
          {navItems.map((item) => {
            const isActive = item.href !== "#" && (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href));
            if (item.label === "Assets" && onOpenLibraryCategory) {
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => onOpenLibraryCategory("assets")}
                  className="rounded-[12px] p-1 transition hover:bg-white/5"
                  title={item.label}
                >
                  {item.icon}
                </button>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`rounded-[12px] p-1 transition ${isActive ? "bg-white/10" : "hover:bg-white/5"}`}
                title={item.label}
              >
                {item.icon}
              </Link>
            );
          })}
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-screen w-[344px] shrink-0 border-r border-white/8 bg-black text-white">
      <div className="flex w-[54px] shrink-0 flex-col items-center border-r border-white/6 pt-4">
        <button
          type="button"
          onClick={() => onCollapsedChange?.(true)}
          className="mb-6 flex h-8 w-8 items-center justify-center rounded-[10px] text-white/70 transition hover:bg-white/5 hover:text-white"
          aria-label="Collapse sidebar"
        >
          <span className="text-lg leading-none">◫</span>
        </button>

        <div className="flex flex-col items-center gap-5">
          {navItems.map((item) => {
            const isActive = item.href !== "#" && (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href));
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`rounded-[12px] p-1 transition ${isActive ? "bg-white/10" : "hover:bg-white/5"}`}
                title={item.label}
              >
                {item.icon}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-white/8 px-3 py-3">
          <nav className="space-y-1.5">
          {navItems.map((item) => {
            const isActive = item.href !== "#" && (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href));
            if (item.label === "Assets" && onOpenLibraryCategory) {
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => onOpenLibraryCategory("assets")}
                  className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-[14px] font-medium text-white/72 transition hover:bg-white/5 hover:text-white"
                >
                  <span className="flex h-7 w-7 items-center justify-center">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 rounded-[10px] px-3 py-2 text-[14px] font-medium transition ${
                  isActive ? "bg-[#2d2d2d] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]" : "text-white/72 hover:bg-white/5 hover:text-white"
                }`}
              >
                  <span className="flex h-7 w-7 items-center justify-center">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="px-3 pb-3 pt-3">
          <div className="flex h-10 items-center gap-2.5 rounded-[12px] border border-white/8 bg-white/[0.03] px-3">
            <Search className="h-4 w-4 shrink-0 text-white/35" />
            <input
              type="text"
              placeholder="Search nodes..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full bg-transparent text-[14px] text-white outline-none placeholder:text-white/28"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <p className="mb-3 px-1 text-[12px] uppercase tracking-[0.08em] text-white/24">Quick Access</p>

          <div className="space-y-1">
            {filteredNodes.map((node) => {
              const Icon = node.icon;
              return (
                <button
                  key={node.type}
                  type="button"
                  draggable
                  onDragStart={(event) => handleNodeDragStart(event, node.type)}
                  onClick={() => onAddNode?.(node.type)}
                  className="flex w-full cursor-grab items-center gap-3 rounded-[10px] px-3 py-2 text-left transition hover:bg-white/5 active:cursor-grabbing"
                >
                  <NodeIconTile className={node.iconTile} icon={<Icon className="h-4 w-4" />} />
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-medium text-white">{node.name}</div>
                  </div>
                </button>
              );
            })}

            {filteredNodes.length === 0 && <p className="px-3 py-4 text-center text-[13px] text-white/28">No nodes found</p>}
          </div>

          <div className="mt-6 border-t border-white/6 pt-4">
            <div className="mb-3 flex items-center justify-between px-1">
              <p className="text-[12px] uppercase tracking-[0.08em] text-white/24">Workflows</p>
              <button
                type="button"
                onClick={handleNewWorkflow}
                className="flex h-6 w-6 items-center justify-center rounded-[6px] text-white/55 transition hover:bg-white/10 hover:text-white"
                title="Create new workflow"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {isLoadingWorkflows ? (
                <p className="px-3 py-2 text-[13px] text-white/28">Loading...</p>
              ) : workflows.length === 0 ? (
                <p className="px-3 py-2 text-[13px] text-white/28">No workflows yet</p>
              ) : (
                workflows.map((workflow) => (
                  <div
                    key={workflow.id}
                    onMouseEnter={() => setWorkflowHovered(workflow.id)}
                    onMouseLeave={() => setWorkflowHovered(null)}
                    className={`group flex items-center gap-2 rounded-[10px] px-3 py-2 transition ${
                      currentWorkflowId === workflow.id
                        ? "bg-white/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]"
                        : "hover:bg-white/5"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => router.push(`/workflow/${workflow.id}`)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="truncate text-[13px] font-medium text-white">{workflow.name}</div>
                          <div className="text-[11px] text-white/45">{workflow.nodeCount} nodes</div>
                        </div>
                        {workflow.lastRunStatus && (
                          <Dot className={`h-3 w-3 ${getStatusDotColor(workflow.lastRunStatus)}`} />
                        )}
                      </div>
                    </button>

                    {workflowHovered === workflow.id && (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDuplicateWorkflow(workflow.id);
                          }}
                          className="flex h-6 w-6 items-center justify-center rounded-[6px] text-white/55 transition hover:bg-white/10 hover:text-white"
                          title="Duplicate workflow"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDeleteWorkflow(workflow.id);
                          }}
                          className="flex h-6 w-6 items-center justify-center rounded-[6px] text-white/55 transition hover:bg-red-500/20 hover:text-red-400"
                          title="Delete workflow"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-5 border-t border-white/6 pt-4">
            <p className="mb-3 px-1 text-[12px] uppercase tracking-[0.08em] text-white/24">Tools</p>
            {toolLaunchers.map((tool) => (
              <button
                key={tool.label}
                type="button"
                onClick={() => onOpenLibraryCategory?.(tool.categoryId)}
                className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-left text-white/88 transition hover:bg-white/5"
              >
                <span className="flex h-8 w-8 items-center justify-center text-white/55">
                  {tool.label === "Image" ? (
                    <Image className="h-4 w-4" />
                  ) : tool.label === "Video" ? (
                    <Video className="h-4 w-4" />
                  ) : tool.label === "Enhancer" ? (
                    <Sparkles className="h-4 w-4" />
                  ) : tool.label === "Edit" ? (
                    <Crop className="h-4 w-4" />
                  ) : (
                    <MoreHorizontal className="h-4 w-4" />
                  )}
                </span>
                <span className="text-[14px]">{tool.label}</span>
              </button>
            ))}

            <button
              type="button"
              onClick={() => onOpenLibraryCategory?.("assets")}
              className="mt-1 flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-white/36 transition hover:bg-white/5 hover:text-white/58"
            >
              <span className="flex h-8 w-8 items-center justify-center">
                <MoreHorizontal className="h-5 w-5" />
              </span>
              <span className="text-[14px]">More</span>
            </button>
          </div>
        </div>

        <div className="border-t border-white/6 px-3 pb-4 pt-4">
          <p className="mb-3 px-1 text-[12px] uppercase tracking-[0.08em] text-white/24">Sessions</p>
          <p className="px-1 text-[14px] text-white/82">Earn 3,000 Credits</p>
          <button
            type="button"
            className="mt-3 h-[50px] w-full rounded-[16px] bg-[linear-gradient(90deg,#d7e9ff_0%,#7ca6ff_56%,#355fff_100%)] px-5 text-left text-[15px] font-medium text-[#1d3f91] shadow-[0_0_30px_rgba(76,110,255,0.3)]"
          >
            Upgrade
          </button>

          <div className="mt-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#242424] text-[20px] text-white">A</div>
            <div className="min-w-0">
              <div className="truncate text-[15px] font-medium text-white">athleticastoundinga...</div>
              <div className="text-[14px] text-white/58">Free</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
