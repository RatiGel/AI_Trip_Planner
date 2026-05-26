"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { useTranslations } from "next-intl";

function CountUp({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1400;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, target]);

  return (
    <span ref={ref} className="font-display text-4xl" style={{ color: "#E8A020" }}>
      {count.toLocaleString()}{suffix}
    </span>
  );
}

export function StatsBar() {
  const t = useTranslations("statsSection");

  const STATS = [
    { num: 80, suffix: "+", label: t("attractions") },
    { num: 4, suffix: "", label: t("districts") },
    { num: 1500, suffix: "", label: t("history") },
    { num: 3, suffix: "", label: t("languages") },
  ];

  return (
    <div
      className="flex justify-center"
      style={{ background: "var(--site-bg-surface)", borderTop: "1px solid var(--site-border-06)", borderBottom: "1px solid var(--site-border-06)" }}
    >
      {STATS.map((s, i) => (
        <motion.div
          key={s.label}
          className="flex flex-1 flex-col items-center px-8 py-7 text-center"
          style={{
            maxWidth: 220,
            borderRight: i < STATS.length - 1 ? "1px solid var(--site-border-06)" : "none",
          }}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1, duration: 0.5 }}
        >
          <CountUp target={s.num} suffix={s.suffix} />
          <span className="mt-1 text-xs tracking-wide" style={{ color: "var(--site-text-40)" }}>{s.label}</span>
        </motion.div>
      ))}
    </div>
  );
}
