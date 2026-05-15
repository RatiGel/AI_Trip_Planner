"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Link } from "@/i18n/navigation";

export function AuthCard({ mode }: { mode: "signin" | "signup" }) {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    toast.success(mode === "signin" ? t("signInButton") : t("signUpButton"));
  }

  const isSignup = mode === "signup";

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">
          {isSignup ? t("signUpTitle") : t("signInTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isSignup ? t("signUpSubtitle") : t("signInSubtitle")}
        </p>

        <Button variant="outline" className="mt-6 w-full">
          {t("google")}
        </Button>

        <div className="my-6 flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs uppercase text-muted-foreground">or</span>
          <Separator className="flex-1" />
        </div>

        <form onSubmit={submit} className="space-y-4">
          {isSignup && (
            <div className="space-y-2">
              <Label htmlFor="name">{t("name")}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("password")}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <Button type="submit" className="w-full">
            {isSignup ? t("signUpButton") : t("signInButton")}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {isSignup ? t("hasAccount") : t("noAccount")}{" "}
          <Link
            href={isSignup ? "/login" : "/register"}
            className="font-medium text-primary hover:underline"
          >
            {isSignup ? t("signInLink") : t("createOne")}
          </Link>
        </p>
      </div>
    </div>
  );
}
