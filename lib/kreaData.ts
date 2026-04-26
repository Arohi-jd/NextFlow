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
    image: "/krea/home-generate-image.png",
    kind: "image"
  },
  {
    title: "Generate Video",
    href: "/workflow",
    image: "/krea/home-generate-video.png",
    kind: "video"
  },
  {
    title: "Upscale & Enhance",
    href: "/workflow",
    image: "/krea/home-enhance.png",
    kind: "enhance"
  },
  {
    title: "Realtime",
    href: "/workflow",
    image: "/krea/home-realtime.png",
    kind: "realtime"
  }
];
