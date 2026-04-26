import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Image as ImageIcon, Sparkles, Video } from "lucide-react";
import { KreaExpandedSidebar } from "@/components/krea/KreaSidebar";
import { homeCards } from "@/lib/kreaData";

function CardOverlayIcon({ kind }: { kind: "image" | "video" | "enhance" | "realtime" }) {
  if (kind === "image") {
    return (
      <div className="flex h-[62px] w-[62px] items-center justify-center rounded-[18px] bg-[#f1f1f1] shadow-[0_12px_24px_rgba(0,0,0,0.3)]">
        <div className="flex h-[44px] w-[44px] items-center justify-center rounded-[13px] bg-[linear-gradient(180deg,#53c1ff_0%,#1a88ff_100%)]">
          <ImageIcon className="h-5 w-5 text-white" />
        </div>
      </div>
    );
  }

  if (kind === "video") {
    return (
      <div className="flex h-[62px] w-[62px] items-center justify-center rounded-[18px] bg-[linear-gradient(180deg,#ffc942_0%,#ffae00_100%)] shadow-[0_12px_24px_rgba(0,0,0,0.3)]">
        <Video className="h-6 w-6 fill-current text-white" />
      </div>
    );
  }

  if (kind === "enhance") {
    return (
      <div className="flex h-[62px] w-[62px] items-center justify-center rounded-[18px] bg-[#0f0f10] shadow-[0_12px_24px_rgba(0,0,0,0.3)]">
        <Sparkles className="h-6 w-6 text-white" />
      </div>
    );
  }

  return (
    <div className="flex h-[62px] w-[62px] items-center justify-center rounded-[18px] bg-[linear-gradient(180deg,#53c1ff_0%,#1a88ff_100%)] shadow-[0_12px_24px_rgba(0,0,0,0.3)]">
      <span className="text-[28px] italic leading-none text-white">k</span>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#111111] text-white">
      <div className="flex min-h-screen">
        <KreaExpandedSidebar />

        <section className="min-w-0 flex-1 bg-[#151515] px-7 pb-8 pt-7 xl:px-8 xl:pt-8">
          <div className="mx-auto max-w-[1680px]">
            <div className="rounded-[22px] border border-[#223241] bg-[radial-gradient(circle_at_68%_62%,rgba(46,70,86,0.72),transparent_26%),radial-gradient(circle_at_44%_36%,rgba(27,49,64,0.5),transparent_22%),linear-gradient(180deg,#0f2a3c_0%,#07141c_58%,#071117_100%)] px-7 py-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] xl:px-8 xl:py-8">
              <div className="flex min-h-[21vh] items-center justify-center xl:min-h-[24vh]">
                <h1 className="max-w-[980px] text-center text-[clamp(30px,3vw,42px)] font-medium tracking-[-0.03em] text-white">
                  Start by generating a free image
                </h1>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2 pr-1">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/7 text-white/65 transition hover:bg-white/10 hover:text-white"
                aria-label="Previous"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/7 text-white/85 transition hover:bg-white/10"
                aria-label="Next"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-6 md:grid-cols-2 xl:grid-cols-4">
              {homeCards.map((card, index) => (
                <Link key={card.title} href={card.href} className="group block">
                  <div className="relative overflow-hidden rounded-[20px] bg-[#101010] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
                    {index === 0 && (
                      <div className="absolute left-3 top-[-2px] z-10 rounded-[12px] bg-[#2d65ff] px-3.5 py-1.5 text-[12px] font-medium tracking-[-0.02em] text-white shadow-[0_12px_24px_rgba(45,101,255,0.34)]">
                        <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-white/85 align-middle" />
                        Click here to open the image tool
                        <span className="absolute left-1/2 top-full h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[3px] bg-[#2d65ff]" />
                      </div>
                    )}

                    <div className="relative aspect-[1.68/1]">
                      <Image src={card.image!} alt={card.title} fill className="object-cover transition duration-300 group-hover:scale-[1.02]" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <CardOverlayIcon kind={card.kind as "image" | "video" | "enhance" | "realtime"} />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 text-[15px] font-medium tracking-[-0.03em] text-white">{card.title}</div>
                </Link>
              ))}
            </div>

            <div className="mt-7 border-t border-white/10" />
          </div>
        </section>
      </div>
    </main>
  );
}
