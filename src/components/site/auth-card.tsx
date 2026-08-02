"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { getSession, signIn } from "next-auth/react";
import { Bookmark, Sparkles, Ticket } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { useReducedMotionSafe } from "@/hooks/use-reduced-motion-safe";
import { postLoginPath, isSafeCallbackPath } from "@/lib/permissions-core";

const PANEL_IMAGE =
  "https://images.unsplash.com/photo-1565008576549-57569a49371d?w=1400&q=70";

export function AuthCard({ mode }: { mode: "signin" | "signup" }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const reduceMotion = useReducedMotionSafe();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    if (isSignup) {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Registration failed");
        setLoading(false);
        return;
      }
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      toast.error("Invalid email or password");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const callbackUrl = params.get("callbackUrl");
    if (callbackUrl && isSafeCallbackPath(callbackUrl)) {
      router.push(callbackUrl);
    } else {
      const session = await getSession();
      router.push(postLoginPath((session?.user as { role?: string } | undefined)?.role));
    }
    router.refresh();
  }

  // Staggered fade-up for the form column; a single instant state when the
  // visitor prefers reduced motion.
  const rise = (i: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: {
            duration: 0.5,
            delay: 0.15 + i * 0.07,
            ease: [0.22, 1, 0.36, 1] as const,
          },
        };

  const perks = [
    { icon: Bookmark, label: t("perkTrips") },
    { icon: Ticket, label: t("perkBook") },
    { icon: Sparkles, label: t("perkAI") },
  ];

  return (
    <div
      className="grid w-full lg:grid-cols-[1.05fr_1fr]"
      style={{
        background: "var(--site-bg-base)",
        minHeight: "calc(100svh - 72px)",
      }}
    >
      {/* ── Visual panel ──────────────────────────────────────────── */}
      <aside className="relative overflow-hidden max-lg:h-44">
        <motion.div
          className="absolute inset-0"
          initial={reduceMotion ? undefined : { scale: 1.08 }}
          animate={reduceMotion ? undefined : { scale: 1 }}
          transition={{ duration: 2, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <Image
            src={PANEL_IMAGE}
            alt="Tbilisi old town at dusk"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 55vw"
            quality={70}
            className="object-cover object-center"
          />
        </motion.div>
        {/* Legibility gradient — darker on the left/bottom where text sits. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(115deg, rgba(10,10,10,0.82) 0%, rgba(10,10,10,0.45) 45%, rgba(10,10,10,0.15) 100%)",
          }}
        />
        <div
          className="absolute inset-0 lg:hidden"
          style={{
            background:
              "linear-gradient(to bottom, rgba(10,10,10,0.2), rgba(10,10,10,0.85))",
          }}
        />

        <div className="relative flex h-full flex-col justify-end p-8 lg:p-12">
          {/* Tagline + perks — desktop only, the panel earns its width.
              Logo is intentionally omitted: the site header already carries it. */}
          <motion.div
            className="hidden max-w-sm lg:block"
            initial={reduceMotion ? undefined : { opacity: 0, y: 20 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <p
              className="font-display text-3xl leading-snug text-white text-balance"
              style={{ textWrap: "balance" }}
            >
              {t("panelTagline")}
            </p>
            <ul className="mt-8 space-y-3.5">
              {perks.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-3 text-[15px] text-white/85"
                >
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: "rgba(232,160,32,0.15)",
                      border: "1px solid rgba(232,160,32,0.35)",
                    }}
                  >
                    <Icon className="size-4" style={{ color: "#E8A020" }} />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </aside>

      {/* ── Form panel ────────────────────────────────────────────── */}
      <main
        className="flex items-center justify-center px-6 py-12 sm:px-10"
        style={{ background: "var(--site-bg-surface)" }}
      >
        <div className="w-full max-w-sm">
          <motion.div {...rise(0)}>
            <h1
              className="font-display text-[34px] leading-tight tracking-[-0.5px]"
              style={{ color: "var(--site-text)" }}
            >
              {isSignup ? t("signUpTitle") : t("signInTitle")}
            </h1>
            <p
              className="mt-2 text-[15px]"
              style={{ color: "var(--site-text-65)" }}
            >
              {isSignup ? t("signUpSubtitle") : t("signInSubtitle")}
            </p>
          </motion.div>

          {/* Google */}
          <motion.button
            {...rise(1)}
            type="button"
            disabled={loading}
            onClick={() => signIn("google", { callbackUrl: `/${locale}/after-login` })}
            className="mt-8 flex w-full items-center justify-center gap-2.5 rounded-full px-5 py-3 text-[15px] font-medium transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60"
            style={{
              color: "var(--site-text)",
              background: "var(--site-surface-08)",
              border: "1px solid var(--site-border-20)",
              // @ts-expect-error CSS custom prop for ring offset
              "--tw-ring-color": "#E8A020",
              "--tw-ring-offset-color": "var(--site-bg-surface)",
            }}
          >
            <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {t("google")}
          </motion.button>

          {/* Divider */}
          <motion.div
            {...rise(2)}
            className="my-6 flex items-center gap-4"
            aria-hidden="true"
          >
            <span
              className="h-px flex-1"
              style={{ background: "var(--site-border-10)" }}
            />
            <span
              className="text-[11px] font-medium uppercase tracking-[1.5px]"
              style={{ color: "var(--site-text-40)" }}
            >
              {t("or")}
            </span>
            <span
              className="h-px flex-1"
              style={{ background: "var(--site-border-10)" }}
            />
          </motion.div>

          {/* Credentials */}
          <form onSubmit={submit} className="space-y-4">
            {isSignup && (
              <motion.div {...rise(3)}>
                <Field
                  id="name"
                  label={t("name")}
                  value={name}
                  onChange={setName}
                  autoComplete="name"
                  disabled={loading}
                />
              </motion.div>
            )}
            <motion.div {...rise(isSignup ? 4 : 3)}>
              <Field
                id="email"
                label={t("email")}
                type="email"
                value={email}
                onChange={setEmail}
                autoComplete="email"
                disabled={loading}
              />
            </motion.div>
            <motion.div {...rise(isSignup ? 5 : 4)}>
              <Field
                id="password"
                label={t("password")}
                type="password"
                value={password}
                onChange={setPassword}
                autoComplete={isSignup ? "new-password" : "current-password"}
                minLength={8}
                disabled={loading}
              />
            </motion.div>

            <motion.button
              {...rise(isSignup ? 6 : 5)}
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center rounded-full px-6 py-3.5 text-[15px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-70"
              style={{
                background: "#B5271D",
                boxShadow: "0 8px 28px -8px rgba(181,39,29,0.6)",
                // @ts-expect-error CSS custom prop
                "--tw-ring-color": "#B5271D",
                "--tw-ring-offset-color": "var(--site-bg-surface)",
              }}
            >
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <span className="ai-think-dot size-1.5 rounded-full bg-white" />
                  <span
                    className="ai-think-dot size-1.5 rounded-full bg-white"
                    style={{ animationDelay: "0.15s" }}
                  />
                  <span
                    className="ai-think-dot size-1.5 rounded-full bg-white"
                    style={{ animationDelay: "0.3s" }}
                  />
                </span>
              ) : isSignup ? (
                t("signUpButton")
              ) : (
                t("signInButton")
              )}
            </motion.button>
          </form>

          <motion.p
            {...rise(isSignup ? 7 : 6)}
            className="mt-7 text-center text-[14px]"
            style={{ color: "var(--site-text-60)" }}
          >
            {isSignup ? t("hasAccount") : t("noAccount")}{" "}
            <Link
              href={isSignup ? "/login" : "/register"}
              className="font-semibold underline-offset-4 transition-colors hover:underline"
              style={{ color: "#E8A020" }}
            >
              {isSignup ? t("signInLink") : t("createOne")}
            </Link>
          </motion.p>
        </div>
      </main>
    </div>
  );
}

/* Dark-native labeled input with the site's gold focus glow. */
function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  minLength,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  minLength?: number;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-[13px] font-medium"
        style={{ color: "var(--site-text-80)" }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        disabled={disabled}
        className="ai-composer w-full rounded-xl px-4 py-3 text-[15px] outline-none transition-colors disabled:opacity-60"
        style={{
          color: "var(--site-text)",
          background: "var(--site-surface-08)",
          border: "1px solid var(--site-border-10)",
        }}
      />
    </div>
  );
}
