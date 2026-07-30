"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Target = { href: string; label?: string };
type Store = {
  target: Target | null;
  setTarget: (t: Target | null) => void;
};

const EditTargetContext = createContext<Store>({ target: null, setTarget: () => {} });

export function EditTargetProvider({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<Target | null>(null);
  return (
    <EditTargetContext.Provider value={{ target, setTarget }}>
      {children}
    </EditTargetContext.Provider>
  );
}

export function useEditTarget() {
  return useContext(EditTargetContext).target;
}

/**
 * Rendered by a page to tell the superadmin bar what "edit this" means here.
 * Renders nothing; clears itself on unmount so the link never leaks to the
 * next route.
 */
export function DeclareEditTarget({ href, label }: Target) {
  const { setTarget } = useContext(EditTargetContext);
  useEffect(() => {
    setTarget({ href, label });
    return () => setTarget(null);
  }, [href, label, setTarget]);
  return null;
}
