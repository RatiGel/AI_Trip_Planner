"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/navigation";

export function HeroSection() {
  return (
    <div className="relative w-full overflow-hidden" style={{ height: "100svh", minHeight: "700px" }}>
      {/* Background image with zoom animation */}
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.08 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{
          backgroundImage:
            "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.75) 100%), url('https://images.unsplash.com/photo-1565008576549-57569a49371d?w=2000&q=85')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {/* Eyebrow */}
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-md">
            <span className="text-[10px] font-bold tracking-[2.5px] uppercase text-yellow-300">
              ✦ Georgia, Caucasus
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-display mb-6 leading-[0.88] tracking-[-3px] text-white"
            style={{ fontSize: "clamp(60px, 11vw, 120px)" }}>
            Discover<br />
            <em className="text-yellow-300">Tbilisi</em>
          </h1>

          {/* Sub */}
          <p className="mx-auto mb-10 max-w-lg font-light leading-relaxed text-white/80"
            style={{ fontSize: "clamp(16px, 2vw, 20px)" }}>
            Ancient city. Modern soul. Where sulphur baths meet rooftop bars,
            and medieval towers overlook a thriving art scene.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/chat"
              className="rounded-full px-9 py-4 text-[15px] font-semibold text-white transition-all duration-250 hover:-translate-y-0.5"
              style={{
                background: "#B5271D",
                boxShadow: "0 8px 32px rgba(181,39,29,0.5)",
              }}
            >
              Plan My Trip with AI
            </Link>
            <Link
              href="/discover"
              className="rounded-full border border-white/30 bg-white/10 px-9 py-4 text-[15px] font-medium text-white backdrop-blur-md transition-all duration-250 hover:bg-white/20"
            >
              Explore the City
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.6 }}
      >
        <motion.div
          className="h-10 w-px"
          style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.5), transparent)" }}
          animate={{ scaleY: [1, 1.2, 1], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <span className="text-[10px] tracking-[2px] uppercase text-white/40">Scroll</span>
      </motion.div>
    </div>
  );
}
