import { cn } from "@/lib/utils";

// Consistent section wrapper: anchor id, scroll offset for the sticky nav,
// alternating surface background, and a heading block.
export function SectionShell({
  id,
  heading,
  sub,
  alt,
  children,
}: {
  id: string;
  heading: string;
  sub?: string;
  alt?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-32 px-6 py-16 md:px-12 md:py-20"
      style={alt ? { background: "var(--site-bg-surface)" } : undefined}
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 max-w-2xl">
          <h2
            className="font-display mb-3 leading-tight"
            style={{
              fontSize: "clamp(28px, 4vw, 44px)",
              letterSpacing: "-1px",
              color: "var(--site-text)",
            }}
          >
            {heading}
          </h2>
          {sub && (
            <p
              className="text-base leading-relaxed"
              style={{ color: "var(--site-text-60)" }}
            >
              {sub}
            </p>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}

// Shared glass card styling used across sections.
export const glassCard = cn(
  "rounded-2xl border p-6 transition-all duration-200"
);

export const glassStyle: React.CSSProperties = {
  background: "var(--site-surface-08)",
  borderColor: "var(--site-border-08)",
};
