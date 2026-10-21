import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { SiteHeader, Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Staff sign in — Khaosan" },
      { name: "description", content: "Sign in to the Khaosan staff dashboard." },
      { property: "og:title", content: "Staff sign in — Khaosan" },
      { property: "og:description", content: "Khaosan staff dashboard sign in." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/staff" });
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/staff" } });
        if (error) throw error;
        if (data.session) navigate({ to: "/staff" });
        else setSent(true);
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error("Google sign-in failed");
    else if (!r.redirected) navigate({ to: "/staff" });
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-sm px-4 pt-10">
        <div className="surface space-y-5 p-6">
          <div className="flex items-center gap-3">
            <Logo className="h-12 w-12" />
            <div>
              <h1 className="text-xl font-bold">Staff {mode === "in" ? "sign in" : "sign up"}</h1>
              <p className="text-sm text-muted-foreground">Host dashboard for Khaosan</p>
            </div>
          </div>
          {sent ? (
            <p className="rounded-xl bg-success-soft p-4 text-sm text-success">Check your email to confirm your account, then sign in.</p>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 text-base" autoComplete="email" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw">Password</Label>
                <Input id="pw" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 text-base" autoComplete={mode === "in" ? "current-password" : "new-password"} />
              </div>
              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
                {busy && <Loader2 className="animate-spin" />} {mode === "in" ? "Sign in" : "Create account"}
              </Button>
            </form>
          )}
          <Button variant="outline" size="lg" className="w-full" onClick={google}>Continue with Google</Button>
          <button className="w-full text-center text-sm text-primary" onClick={() => setMode(mode === "in" ? "up" : "in")}>
            {mode === "in" ? "New staff member? Create an account" : "Already have an account? Sign in"}
          </button>
          <p className="text-xs text-muted-foreground">The first account created becomes the manager. Other staff need the manager to grant access.</p>
        </div>
      </main>
    </div>
  );
}
