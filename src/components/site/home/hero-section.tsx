"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1565008576549-57569a49371d?w=1920&q=70";

// next.config.ts remotePatterns only allows these hosts; an admin-supplied
// heroImageUrl on any other host would make next/image throw at runtime.
const ALLOWED_IMAGE_HOSTS = [
  "images.unsplash.com",
  "source.unsplash.com",
  "upload.wikimedia.org",
];

function isAllowedImageHost(url: string): boolean {
  try {
    return ALLOWED_IMAGE_HOSTS.includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

export function HeroSection({
  title,
  subtitle,
  imageUrl,
}: {
  title?: string;
  subtitle?: string;
  imageUrl?: string;
} = {}) {
  const t = useTranslations("hero");
  const resolvedImage = imageUrl || HERO_IMAGE;
  const useNextImage = isAllowedImageHost(resolvedImage);

  return (
    <div className="relative w-full overflow-hidden" style={{ height: "100svh", minHeight: "min(700px, 100svh)" }}>
      {/* Background image with zoom animation */}
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.08 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.8, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {useNextImage ? (
          <Image
            src={resolvedImage}
            alt=""
            fill
            priority
            fetchPriority="high"
            sizes="100vw"
            quality={70}
            className="object-cover object-center"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary admin-supplied host, not in next.config remotePatterns
          <img
            src={resolvedImage}
            alt=""
            className="absolute inset-0 size-full object-cover object-center"
          />
        )}
        {/* Gradient overlay for text contrast */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.75) 100%)",
          }}
        />
      </motion.div>

      {/* Content */}
      {/* pt clears the fixed 72px header; pb clears the scroll indicator. */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 pb-24 pt-[72px] text-center">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {/* Eyebrow */}
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-md sm:mb-7">
            <span className="text-[10px] font-bold tracking-[2.5px] uppercase text-yellow-300">
              ✦ {t("eyebrow")}
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-display mb-4 leading-[0.88] tracking-[-0.025em] text-white sm:mb-6"
            style={{ fontSize: "clamp(48px, 11vw, 120px)" }}>
            {title || t("headline")}<br />
            <em className="text-yellow-300">Tbilisi</em>
          </h1>

          {/* Sub */}
          <p className="mx-auto mb-7 max-w-lg font-light leading-relaxed text-white/80 sm:mb-10"
            style={{ fontSize: "clamp(15px, 2vw, 20px)" }}>
            {subtitle || t("sub")}
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <Link
              href="/chat"
              className="rounded-full px-6 py-3.5 text-[14px] font-semibold text-white transition-all duration-250 hover:-translate-y-0.5 sm:px-9 sm:py-4 sm:text-[15px]"
              style={{
                background: "#B5271D",
                boxShadow: "0 8px 32px rgba(181,39,29,0.5)",
              }}
            >
              {t("ctaAI")}
            </Link>
            <Link
              href="/discover"
              className="rounded-full border border-white/30 bg-white/10 px-6 py-3.5 text-[14px] font-medium text-white backdrop-blur-md transition-all duration-250 hover:bg-white/20 sm:px-9 sm:py-4 sm:text-[15px]"
            >
              {t("ctaExplore")}
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
        <span className="text-[10px] tracking-[2px] uppercase text-white/40">{t("scroll")}</span>
      </motion.div>
    </div>
  );
}
