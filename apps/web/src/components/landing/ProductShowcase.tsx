"use client";

import { useInView } from "@/hooks/useInView";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/lib/i18n/client";

export function ProductShowcase() {
  const { ref, inView } = useInView<HTMLDivElement>();
  const { t } = useLocale();

  const products = [
    {
      ...t.products.keyring,
      emoji: "🔑",
      gradient: "from-amber-100 to-orange-100",
    },
    {
      ...t.products.sticker,
      emoji: "✨",
      gradient: "from-sky-100 to-indigo-100",
    },
  ];

  return (
    <section className="px-4 py-20 md:py-28">
      <div ref={ref} className="mx-auto max-w-4xl">
        <h2 className="text-center text-2xl font-bold md:text-3xl">
          {t.products.title}
        </h2>
        <p className="mt-2 text-center text-muted-foreground">
          {t.products.subtitle}
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
