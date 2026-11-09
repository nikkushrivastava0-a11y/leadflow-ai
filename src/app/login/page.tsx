"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { classifyAuthSubmission } from "@/lib/auth-submission-outcome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [accountNotice, setAccountNotice] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setAccountNotice("");

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        const outcome = classifyAuthSubmission("sign_up", { data, error });
        if (outcome.state === "failed") {
          toast.error(outcome.message);
          return;
        }

        setAccountNotice(outcome.message);
        setPassword("");
        if (outcome.state === "verify_email") {
          // Signup is not the same as a validated session. Stay on login.
          setIsSignUp(false);
          return;
        }

        // An Auth session exists, but this does NOT imply an active business
        // profile. Dashboard must independently enforce ownership/RLS.
        toast.success("Signed in. Business workspace access is checked separately.");
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      const outcome = classifyAuthSubmission("sign_in", { data, error });
      if (outcome.state !== "signed_in") {
        toast.error(outcome.message);
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      toast.error("Authentication is temporarily unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-center text-2xl font-bold">LeadFlow AI</h1>
        <p className="mb-6 text-center text-sm text-slate-500">
          {isSignUp ? "Create your account" : "Welcome back"}
        </p>

        {accountNotice && (
          <div
            role="status"
            aria-live="polite"
            className="mb-5 rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm leading-6 text-indigo-900"
          >
            {accountNotice}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              minLength={6}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Please wait..." : isSignUp ? "Sign Up" : "Sign In"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setIsSignUp(!isSignUp);
              setAccountNotice("");
              setPassword("");
            }}
            className="font-medium text-indigo-600 hover:underline disabled:opacity-50"
          >
            {isSignUp ? "Sign In" : "Sign Up"}
          </button>
        </p>
      </Card>
    </div>
  );
}
