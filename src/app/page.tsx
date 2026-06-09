"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sparkles,
  FileText,
  Brain,
  Award,
  ArrowRight,
  CheckCircle,
  HelpCircle,
  Code2,
  Lock,
  Loader2
} from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  const { user, loginWithGoogle, loading, isMock } = useAuth();
  const router = useRouter();
  const [signingIn, setSigningIn] = useState(false);

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await loginWithGoogle();
      router.push("/dashboard");
    } catch (err) {
      console.error("Login failed:", err);
      setSigningIn(false);
    }
  };

  const features = [
    {
      title: "Resume Match Scoring",
      desc: "Instant scan checking alignment, experience fit, and formatting strengths with high precision.",
      icon: Award,
      color: "text-violet-500 bg-violet-500/10"
    },
    {
      title: "Missing Skills Detection",
      desc: "Spot exact keywords and core capabilities absent from your CV based on job description requirements.",
      icon: FileText,
      color: "text-blue-500 bg-blue-500/10"
    },
    {
      title: "AI Interview Coach",
      desc: "Face simulated interview prompts tailored to your score gaps and get detailed answer evaluations.",
      icon: Brain,
      color: "text-emerald-500 bg-emerald-500/10"
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 transition-colors duration-200 flex flex-col relative overflow-hidden">
      {/* Decorative background grid and gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] pointer-events-none opacity-40 dark:opacity-20 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-violet-500/20 blur-[120px]" />
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/20 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="w-full max-w-7xl mx-auto h-20 px-4 sm:px-6 lg:px-8 flex items-center justify-between z-10 relative">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-bold shadow-md shadow-violet-500/20">
            🤖
          </div>
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-700 dark:from-zinc-50 dark:to-zinc-300 bg-clip-text text-transparent">
            CareerPilot AI
          </span>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          {user ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 px-4 py-2 text-xs font-bold shadow-sm transition-all"
            >
              Dashboard
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <button
              onClick={handleSignIn}
              disabled={signingIn || loading}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 px-4 py-2 text-xs font-bold shadow-sm transition-all"
            >
              {signingIn ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Sign In"}
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center py-12 sm:py-20 z-10 relative">

        {/* HERO SECTION */}
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-bold border border-violet-500/15">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            Empowered by Gemini
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.08] bg-gradient-to-b from-zinc-900 via-zinc-800 to-zinc-600 dark:from-zinc-50 dark:via-zinc-100 dark:to-zinc-400 bg-clip-text text-transparent">
            Optimize your resume. <br />
            Ace the interview.
          </h1>

          <p className="text-base sm:text-lg text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed max-w-xl mx-auto">
            Scan your CV against target jobs to reveal matching scores, identify skill gaps, practice tailored questions, and receive constructive AI review cards.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            {user ? (
              <Link
                href="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold px-8 py-3.5 shadow-md shadow-violet-500/20 hover:shadow-violet-600/30 transition-all duration-200"
              >
                Go to Dashboard
                <ArrowRight className="h-5 w-5" />
              </Link>
            ) : (
              <button
                onClick={handleSignIn}
                disabled={signingIn || loading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl bg-violet-600 hover:bg-violet-750 text-white font-bold px-8 py-3.5 shadow-md shadow-violet-500/20 hover:shadow-violet-600/30 transition-all duration-200"
              >
                {signingIn ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Connecting to secure login...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                    </svg>
                    Sign In with Google
                  </>
                )}
              </button>
            )}
          </div>

          {isMock && (
            <p className="text-[10px] text-amber-500/80 font-bold max-w-xs mx-auto">
              ℹ Demo mode is enabled. Signing in will use simulated login instantly.
            </p>
          )}
        </div>

        {/* FEATURES GRID SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20 sm:mt-32 max-w-5xl mx-auto">
          {features.map((feat) => (
            <div
              key={feat.title}
              className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 p-6 rounded-2xl shadow-sm flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${feat.color}`}>
                  <feat.icon className="h-5.5 w-5.5" />
                </div>
                <h3 className="font-extrabold text-base text-zinc-850 dark:text-zinc-150">
                  {feat.title}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-semibold">
                  {feat.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-zinc-200/50 dark:border-zinc-850/50 text-center text-xs text-zinc-400 dark:text-zinc-600 z-10 relative">
        <p>© {new Date().getFullYear()} AI Resume Analyzer & Interview Coach. Powered by Next.js & Gemini.</p>
      </footer>
    </div>
  );
}
