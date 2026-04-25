"use client";

import { useState } from "react";
import { Search, Type, Image, Video, Bot, Crop, Film, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type NodeType = "text" | "upload-image" | "upload-video" | "llm" | "crop-image" | "extract-frame";

interface NodeDefinition {
  type: NodeType;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const nodeDefinitions: NodeDefinition[] = [
  {
    type: "text",
    name: "Text",
    description: "Add text input",
    icon: Type,
    color: "#3b82f6"
  },
  {
    type: "upload-image",
    name: "Upload Image",
    description: "Upload image file",
    icon: Image,
    color: "#8b5cf6"
  },
  {
    type: "upload-video",
    name: "Upload Video",
    description: "Upload video file",
    icon: Video,
    color: "#ec4899"
  },
  {
    type: "llm",
    name: "Run LLM",
    description: "AI language model",
    icon: Bot,
    color: "#22c55e"
  },
  {
    type: "crop-image",
    name: "Crop Image",
    description: "Crop image region",
    icon: Crop,
    color: "#f59e0b"
  },
  {
    type: "extract-frame",
    name: "Extract Frame",
    description: "Extract video frame",
    icon: Film,
    color: "#06b6d4"
  }
];

interface LeftSidebarProps {
  isCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export default function LeftSidebar({ isCollapsed = false, onCollapsedChange }: LeftSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredNode, setHoveredNode] = useState<NodeType | null>(null);
  const [workflows] = useState<string[]>(["Product Marketing Kit", "Social Media Content", "Email Generator"]);

  const handleNodeDragStart = (event: React.DragEvent<HTMLButtonElement>, nodeType: NodeType) => {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/json", JSON.stringify({ type: nodeType }));
  };

  const filteredNodes = nodeDefinitions.filter(
    (node) =>
      node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.aside
      layout
      className={`relative flex h-screen flex-col transition-all duration-300 ${
        isCollapsed ? "w-12" : "w-[260px]"
      } shrink-0 border-r border-[var(--border-color)] bg-[var(--bg-secondary)]`}
    >
      {/* Collapse Toggle */}
      <button
        type="button"
        onClick={() => onCollapsedChange?.(!isCollapsed)}
        className="absolute -right-3 top-12 z-50 inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            key="left-sidebar-content"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18 }}
            className="flex h-full flex-col"
          >
          {/* Search Bar */}
          <div className="border-b border-[var(--border-color)] p-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search nodes..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-8 w-full rounded-md border border-[var(--border-color)] bg-[var(--bg-node)] pl-8 pr-2 text-xs text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent-purple)]"
              />
            </div>
          </div>

          {/* Quick Access Section */}
          <div className="flex-1 overflow-y-auto p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Quick Access
            </p>

            <div className="space-y-2">
              {filteredNodes.map((node) => {
                const IconComponent = node.icon;
                return (
                  <button
                    key={node.type}
                    type="button"
                    draggable
                    onDragStart={(event) => handleNodeDragStart(event, node.type)}
                    onMouseEnter={() => setHoveredNode(node.type)}
                    onMouseLeave={() => setHoveredNode(null)}
                    className="group w-full cursor-grab rounded-[10px] border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-3 text-left transition-all duration-200 hover:border-[var(--accent-purple)] hover:bg-[#1f1a2e] active:cursor-grabbing"
                  >
                    <div className="flex items-center gap-3">
                      {/* Icon */}
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-md flex-shrink-0"
                        style={{ backgroundColor: `${node.color}20` }}
                      >
                        <div style={{ color: node.color }}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[var(--text-primary)]">{node.name}</p>
                        <p className="truncate text-xs text-[var(--text-muted)]">{node.description}</p>
                      </div>

                      {/* Plus Icon on Hover */}
                      {hoveredNode === node.type && (
                        <Plus className="h-4 w-4 flex-shrink-0 text-[var(--accent-purple)] animate-fade-in" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {filteredNodes.length === 0 && (
              <p className="mt-4 text-center text-xs text-[var(--text-muted)]">No nodes found</p>
            )}

            {/* Divider */}
            <div className="my-4 border-t border-[var(--border-color)]" />

            {/* Workflows Section */}
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Workflows
            </p>

            <div className="space-y-1">
              {workflows.map((workflow) => (
                <button
                  key={workflow}
                  type="button"
                  className="w-full truncate rounded-md px-2 py-1.5 text-left text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-node)] hover:text-[var(--text-primary)]"
                  title={workflow}
                >
                  {workflow}
                </button>
              ))}
            </div>
          </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
