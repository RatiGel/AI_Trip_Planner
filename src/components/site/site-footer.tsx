import { Link } from "@/i18n/navigation";
import { DEFAULT_FOOTER } from "@/lib/site-config-defaults";
import type { ResolvedFooter } from "@/lib/site-config-resolve";

export function SiteFooter({ config }: { config?: ResolvedFooter }) {
  const year = new Date().getFullYear();
  const columns = config?.columns ?? DEFAULT_FOOTER.columns;
  const socials = config?.socialLinks ?? DEFAULT_FOOTER.socialLinks;

  return (
    <footer style={{ background: "#050505", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="mx-auto max-w-7xl px-6 pb-8 pt-16 md:px-12">
        <div className="grid gap-12 md:grid-cols-3 lg:grid-cols-6">
          {/* Brand column */}
          <div className="md:col-span-2">
            <Link href="/" className="font-display mb-5 block text-3xl tracking-[-0.5px] text-white">
              Tbilisi<span style={{ color: "#E8A020" }}>.</span>
            </Link>
            <p className="mb-6 max-w-xs text-[14px] leading-relaxed" style={{ color: "#666" }}>
              Your guide to one of the world&apos;s most exciting cities. Ancient history,
              modern culture, legendary hospitality.
            </p>
            <div className="flex gap-3">
              {socials.map(({ platform, url }) =>
                url ? (
                  <a
                    key={platform}
                    href={url}
                    className="flex size-9 cursor-pointer items-center justify-center rounded-full text-[11px] font-bold text-white/40 transition-colors hover:text-white"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    {platform[0]}
                  </a>
                ) : (
                  <span
                    key={platform}
                    className="flex size-9 items-center justify-center rounded-full text-[11px] font-bold text-white/40 transition-colors hover:text-white"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    {platform[0]}
                  </span>
                )
              )}
            </div>
          </div>

          {/* Link columns */}
          {columns.map(({ heading, links }) => (
            <div key={heading}>
              <h4 className="mb-5 text-[11px] font-bold uppercase tracking-[2px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                {heading}
              </h4>
              <ul className="space-y-3">
                {links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-[14px] transition-colors hover:text-white"
                      style={{ color: "rgba(255,255,255,0.55)" }}
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          className="mt-14 flex flex-col items-start justify-between gap-4 border-t pt-6 text-[13px] sm:flex-row sm:items-center"
          style={{ borderColor: "rgba(255,255,255,0.06)", color: "#555" }}
        >
          <p>{config?.copyrightText || `© ${year} Tbilisi Tourism Portal. Built with ♥ in Georgia.`}</p>
          <div className="flex gap-5">
            <Link href="/en" className="transition-colors hover:text-white">EN</Link>
            <Link href="/ka" className="transition-colors hover:text-white">KA</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
