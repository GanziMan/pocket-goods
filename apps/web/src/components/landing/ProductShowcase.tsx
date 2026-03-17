"use client";

import { useInView } from "@/hooks/useInView";
import { Badge } from "@/components/ui/badge";

const products = [
  {
    name: "아크릴 키링",
    badge: "인기",
    specs: ["투명 아크릴 소재", "양면 인쇄", "약 5 × 7 cm", "볼체인 포함"],
    emoji: "🔑",
    gradient: "from-amber-100 to-orange-100",
  },
  {
    name: "투명 스티커",
    badge: "NEW",
    specs: ["투명 PET 소재", "방수 코팅", "약 5 × 7 cm", "다꾸·폰꾸에 딱"],
    emoji: "✨",
    gradient: "from-sky-100 to-indigo-100",
  },
];

export function ProductShowcase() {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <section className="px-4 py-20 md:py-28">
      <div ref={ref} className="mx-auto max-w-4xl">
        <h2 className="text-center text-2xl font-bold md:text-3xl">
          어떤 굿즈를 만들 수 있나요?
        </h2>
        <p className="mt-2 text-center text-muted-foreground">
          고퀄리티 제품으로 제작해드려요
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 md:gap-8">
          {products.map((product, i) => (
            <div
              key={product.name}
              className={`group relative overflow-hidden rounded-2xl ring-1 ring-foreground/5 transition-all duration-500 hover:scale-[1.02] hover:shadow-lg ${
                inView
                  ? "animate-fade-in-up opacity-100"
                  : "opacity-0 translate-y-6"
              }`}
              style={{ animationDelay: `${i * 150}ms` }}
            >
              <div
                className={`flex h-44 items-center justify-center bg-gradient-to-br ${product.gradient}`}
              >
                <span className="text-7xl transition-transform duration-300 group-hover:scale-110">
                  {product.emoji}
                </span>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{product.name}</h3>
                  <Badge variant="secondary">{product.badge}</Badge>
                </div>
                <ul className="mt-3 space-y-1">
                  {product.specs.map((spec) => (
                    <li
                      key={spec}
                      className="text-sm text-muted-foreground before:mr-1.5 before:content-['·']"
                    >
                      {spec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
