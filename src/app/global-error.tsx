"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#0a0a0a", color: "#fafafa" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "1rem", padding: "2rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ color: "#888", maxWidth: "440px", fontSize: "0.875rem" }}>
            {error.message || "An unexpected error occurred."}
            {error.digest && (
              <span style={{ display: "block", fontFamily: "monospace", fontSize: "0.75rem", marginTop: "0.5rem", opacity: 0.5 }}>
                {error.digest}
              </span>
            )}
          </p>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={reset}
              style={{ padding: "0.5rem 1.25rem", borderRadius: "0.5rem", background: "#B5271D", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.875rem" }}
            >
              Try again
            </button>
            <button
              onClick={() => (window.location.href = "/")}
              style={{ padding: "0.5rem 1.25rem", borderRadius: "0.5rem", background: "transparent", color: "#fafafa", border: "1px solid #444", cursor: "pointer", fontSize: "0.875rem" }}
            >
              Go home
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
