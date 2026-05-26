"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "@/i18n/navigation";

const TRIP_TYPES = ["2 days", "a weekend", "a week", "a honeymoon", "a family trip"];

export function AIPlannerCTA() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % TRIP_TYPES.length), 2400);
    return () => clearInterval(id);
  }, []);

  return (
    <section
      className="relative overflow-hidden px-6 py-20 md:px-12"
      style={{
        background: "linear-gradient(135deg, #1a0a08 0%, #2d1408 40%, #1a0d00 100%)",
        borderTop: "1px solid rgba(232,160,32,0.2)",
        borderBottom: "1px solid rgba(232,160,32,0.2)",
      }}
    >
      {/* Ambient blobs */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 65% 50%, rgba(181,39,29,0.22) 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, rgba(232,160,32,0.12) 0%, transparent 50%)",
        }}
      />

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-16 md:grid-cols-2">
        {/* Left: copy */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[12px] font-semibold tracking-wide"
            style={{ borderColor: "rgba(232,160,32,0.3)", background: "rgba(232,160,32,0.12)", color: "#F5C842" }}
          >
            ◆ Powered by Claude AI
          </div>

          <h2
            className="font-display mb-5 leading-tight text-white"
            style={{ fontSize: "clamp(36px, 4vw, 56px)", letterSpacing: "-1px" }}
          >
            Plan{" "}
            <motion.span
              key={idx}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
              className="italic"
              style={{ color: "#F5C842" }}
            >
              {TRIP_TYPES[idx]}
            </motion.span>
            <br />in Tbilisi
          </h2>

          <p className="mb-8 max-w-md text-base leading-relaxed text-white/60">
            Tell our AI how long you&apos;re staying, what you love, and your budget.
            It builds a day-by-day itinerary — instantly.
          </p>

          <Link
            href="/chat"
            className="inline-block rounded-full px-9 py-4 text-[15px] font-semibold text-white transition-all duration-250 hover:-translate-y-0.5"
            style={{ background: "#B5271D", boxShadow: "0 8px 32px rgba(181,39,29,0.45)" }}
          >
            Start planning — it&apos;s free
          </Link>
        </motion.div>

        {/* Right: chat mock */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="rounded-3xl p-7"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(20px)" }}
        >
          {/* User message */}
          <div className="mb-4 flex gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full text-sm" style={{ background: "#B5271D" }}>👤</div>
            <div className="rounded-2xl px-4 py-3 text-[13px] leading-relaxed text-white/80" style={{ background: "rgba(255,255,255,0.07)" }}>
              I have 3 days in Tbilisi. I love food, history, and nightlife.
            </div>
          </div>

          {/* AI message */}
          <div className="mb-4 flex gap-3">
            <div
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-sm text-white"
              style={{ background: "linear-gradient(135deg, #E8A020, #B5271D)" }}
            >
              ✦
            </div>
            <div
              className="rounded-2xl px-4 py-3 text-[13px] leading-relaxed text-white/80"
              style={{ background: "rgba(181,39,29,0.18)", border: "1px solid rgba(181,39,29,0.3)" }}
            >
              <strong className="text-white">Day 1:</strong> Old Town → Narikala → Abanotubani baths → dinner in Shardeni St.
              <br /><strong className="text-white">Day 2:</strong> National Museum → Dry Bridge market → rooftop bar
              <br /><strong className="text-white">Day 3:</strong> Vake Park → wine tasting → farewell khinkali feast
            </div>
          </div>

          {/* Input bar */}
          <div className="flex items-center gap-2.5 border-t pt-4" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            <div className="flex-1 rounded-full px-4 py-2.5 text-[13px] text-white/35" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
              Ask anything about Tbilisi…
            </div>
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full text-white text-base" style={{ background: "#B5271D" }}>
              ↑
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
