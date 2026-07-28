"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

export function AiChatFab() {
  const t = useTranslations("common");
  const pathname = usePathname();
  const isHome = pathname === "/";
  // On the home hero the FAB competes with the CTAs and the scroll indicator, so
  // it stays hidden until the visitor scrolls past the fold. Everywhere else it
  // is present from the start.
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!isHome) return;
    const onScroll = () => setScrolled(window.scrollY > 300);
    onScroll(); // catch a restored scroll position on mount
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  const visible = !isHome || scrolled;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed bottom-6 right-6 z-50"
          initial={{ opacity: 0, y: 16, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.9 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <Link
            href="/chat"
            className="flex items-center gap-2 rounded-full px-5 py-3 text-[14px] font-semibold text-white shadow-2xl transition-all hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(181,39,29,0.5)]"
            style={{ background: "#B5271D", boxShadow: "0 4px 24px rgba(181,39,29,0.45)" }}
          >
            <Sparkles className="size-4" />
            {t("aiChat")}
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
