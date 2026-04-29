export type KreaCard = {
  title: string;
  subtitle?: string;
  href: string;
  image?: string;
  kind: "image" | "video" | "enhance" | "realtime" | "new" | "flow" | "untitled" | "sunset";
};

export const homeCards: KreaCard[] = [
  {
    title: "Generate Image",
    href: "/workflow",
    image: "/krea/home-generate-image.mp4",
    kind: "image"
  },
  {
    title: "Generate Video",
    href: "/workflow",
    image: "/krea/home-generate-video.mp4",
    kind: "video"
  },
  {
    title: "Upscale & Enhance",
    href: "/workflow",
    image: "/krea/home-enhance.mp4",
    kind: "enhance"
  },
  {
    title: "Realtime",
    href: "/workflow",
    image: "/krea/home-realtime.mp4",
    kind: "realtime"
  }
];
