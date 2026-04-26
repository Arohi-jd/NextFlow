"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  ChevronDown,
  Folder,
  Home,
  Image as ImageIcon,
  MoreHorizontal,
  Share2,
  Sparkles,
  Video
} from "lucide-react";

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
      className={`inline-flex h-8 w-8 items-center justify-center rounded-[10px] border ${selected ? "border-white/10 bg-white text-[#111111]" : "border-white/5 text-white"} ${className}`}
    >
      {icon}
    </span>
  );
}

const navItems: NavItem[] = [
  {
    label: "Home",
    href: "/",
    icon: <Home className="h-5 w-5 fill-current" />
  },
  {
    label: "Train Lora",
    href: "#",
    icon: (
      <span className="h-5 w-5 rounded-full bg-[conic-gradient(from_210deg,#ff5f5f,#ffcd57,#3bd873,#3ab6ff,#7c4dff,#ff5f5f)]" />
    )
  },
  {
    label: "Node Editor",
    href: "/workflow",
    icon: (
      <IconTile
        className="border-transparent bg-[linear-gradient(180deg,#4f9cff_0%,#0d66ff_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]"
        icon={<Folder className="h-4 w-4 fill-current" />}
      />
    )
  },
  {
    label: "Assets",
    href: "#",
    icon: <Folder className="h-6 w-6 fill-[#8fd2ff] text-[#8fd2ff]" />
  }
];

const toolItems: ToolItem[] = [
  {
    label: "Image",
    icon: (
      <IconTile
        className="border-transparent bg-[#f3f3f5] text-[#2aa7ff]"
        icon={<ImageIcon className="h-4 w-4" />}
      />
    )
  },
  {
    label: "Video",
    icon: (
      <IconTile
        className="border-transparent bg-[linear-gradient(180deg,#ffd44d_0%,#ffab00_100%)] text-white"
        icon={<Video className="h-4 w-4 fill-current" />}
      />
    )
  },
  {
    label: "Enhancer",
    icon: (
      <IconTile
        className="border-white/10 bg-[linear-gradient(180deg,#454545_0%,#111111_100%)] text-white"
        icon={<Sparkles className="h-4 w-4" />}
      />
    )
  },
  {
    label: "Nano Banana",
    icon: (
      <IconTile
        className="border-transparent bg-[linear-gradient(180deg,#ffe65d_0%,#f6cb00_100%)] text-[#5d3b00]"
        icon={<span className="text-lg leading-none">◔</span>}
      />
    )
  },
  {
    label: "Realtime",
    icon: (
      <IconTile
        className="border-transparent bg-[linear-gradient(180deg,#44b8ff_0%,#145bff_100%)] text-white"
        icon={<span className="text-base italic leading-none">k</span>}
      />
    )
  },
  {
    label: "Edit",
    icon: (
      <IconTile
        className="border-transparent bg-[linear-gradient(180deg,#63319b_0%,#3f186b_100%)] text-white"
        icon={<span className="text-sm leading-none">A</span>}
      />
    )
  }
];

export function KreaExpandedSidebar({
  user = { name: "daringagilefossa", plan: "Free", initial: "D" },
  sessions = []
}: ExpandedSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-[240px] shrink-0 flex-col border-r border-[#2d2d2d] bg-black px-5 py-5 text-white">
      <div className="pb-4">
        <div className="inline-flex h-16 items-start">
          <span className="text-[28px] font-light leading-none text-white/78">◫</span>
        </div>

        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const isActive = item.href !== "#" && (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href));

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 rounded-[8px] px-3 py-2 text-[15px] font-medium tracking-[-0.03em] transition ${
                  isActive ? "bg-[#2c2b2a] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]" : "text-white hover:bg-[#1a1a1a]"
                }`}
              >
                <span className="flex h-7 w-7 items-center justify-center">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="pt-5">
        <p className="mb-4 text-[14px] text-white/28">Tools</p>
        <div className="space-y-3">
          {toolItems.map((item) => (
            <div key={item.label} className="flex items-center gap-3 py-0.5 text-[15px] tracking-[-0.03em] text-white">
              {item.icon}
              <span>{item.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-3 py-0.5 text-[15px] tracking-[-0.03em] text-white/38">
            <MoreHorizontal className="ml-1 h-5 w-5" />
            <span>More</span>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-7">
        <p className="mb-4 text-[14px] text-white/28">Sessions</p>
        <div className="space-y-3">
          {sessions.length > 0 ? (
            <div className="space-y-1">
              {sessions.map((session) => {
                const isActive = pathname === session.href;

                return (
                  <Link
                    key={session.id}
                    href={session.href}
                    className={`flex items-center gap-2.5 rounded-[8px] px-1.5 py-1.5 text-[15px] tracking-[-0.03em] transition ${
                      isActive ? "text-white" : "text-white/78 hover:bg-[#171717] hover:text-white"
                    }`}
                  >
                    <Share2 className="h-4 w-4 shrink-0 text-white/48" />
                    <span className="truncate">{session.name}</span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <>
              <div>
                <p className="text-[16px] tracking-[-0.03em] text-white">Earn 3,000 Credits</p>
              </div>
              <button
                type="button"
                className="h-[50px] w-full rounded-[16px] bg-[linear-gradient(90deg,#d7e9ff_0%,#7ca6ff_56%,#355fff_100%)] px-5 text-left text-[15px] font-medium text-[#1d3f91] shadow-[0_0_30px_rgba(76,110,255,0.3)]"
              >
                Upgrade
              </button>
            </>
          )}

          <div className="flex items-center gap-3 pt-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#242424] text-[20px] text-white">
              {user.initial}
            </div>
            <div>
              <div className="text-[15px] font-medium tracking-[-0.03em] text-white">{user.name}</div>
              <div className="text-[14px] text-white/58">{user.plan}</div>
            </div>
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
