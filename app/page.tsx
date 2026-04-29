import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { KreaExpandedSidebar } from "@/components/krea/KreaSidebar";
import { homeCards } from "@/lib/kreaData";

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
                    <div className="relative aspect-[1.68/1]">
                      {card.image?.endsWith(".mp4") ? (
                        <video
                          src={card.image}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                          autoPlay
                          muted
                          loop
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <Image src={card.image!} alt={card.title} fill className="object-cover transition duration-300 group-hover:scale-[1.02]" />
                      )}
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
