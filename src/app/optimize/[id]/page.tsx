"use client";

import React, { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/context/auth-context";
import { dbService, AnalysisRecord } from "@/lib/db-service";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  AlertCircle,
  Check,
  Copy,
  FileText,
  ChevronRight,
  RefreshCw,
  BookOpen
} from "lucide-react";
import { motion } from "framer-motion";

export default function ResumeOptimizerPage() {
  const { id } = useParams() as { id: string };
  const { user } = useAuth();

  const [record, setRecord] = useState<AnalysisRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);

  useEffect(() => {
    async function loadRecord() {
      try {
        const data = await dbService.getAnalysisById(id);
        setRecord(data);
      } catch (error) {
        console.error("Failed to load analysis record:", error);
      } finally {
        setLoading(false);
      }
    }
    loadRecord();
  }, [id]);

  const handleOptimize = async () => {
    if (!record) return;
    setOptimizing(true);
    setErrorMsg(null);

    try {
      // Call optimize API with custom prompt customization from LocalStorage if edit exists
      const customPrompt = localStorage.getItem("custom_prompt_tailoring");
      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: record.resumeText,
          jobDescription: record.jobDescription,
          targetRole: record.targetRole,
          customPrompt: customPrompt || undefined
        }),
      });

      if (res.status === 412) {
        const errData = await res.json();
        throw new Error(errData.error);
      }

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to optimize resume.");
      }

      const tailoredData = await res.json();

      // Update in DB
      await dbService.updateTailoredResume(record.id, tailoredData);

      // Refresh local state record
      setRecord({
        ...record,
        tailoredResume: tailoredData
      });
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An unexpected error occurred during optimization.");
    } finally {
      setOptimizing(false);
    }
  };

  const copyToClipboard = (text: string, index: number | "summary") => {
    navigator.clipboard.writeText(text);
    if (index === "summary") {
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    } else {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-violet-600" />
          <p className="text-sm font-semibold text-zinc-500">Loading optimization workspace...</p>
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
        <Navbar />
        <div className="flex-1 max-w-md mx-auto flex flex-col items-center justify-center p-6 text-center">
          <AlertCircle className="h-12 w-12 text-rose-500 mb-4" />
          <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-200">Analysis Not Found</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 mb-6">
            The target resume scan was not found. Please analyze a resume before optimizing it.
          </p>
          <Link
            href="/dashboard"
            className="rounded-xl bg-violet-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-violet-750"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const hasTailored = !!record.tailoredResume;

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 transition-colors duration-200">
        <Navbar />

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Link */}
          <div className="mb-6">
            <Link
              href={`/results/${record.id}`}
              className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Report
            </Link>
          </div>

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-650 dark:from-zinc-50 dark:to-zinc-400 bg-clip-text text-transparent flex items-center gap-2">
                <Sparkles className="h-7 w-7 text-violet-500" />
                AI Resume Tailoring
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                Align resume summary and bullets with the <span className="font-semibold text-zinc-700 dark:text-zinc-300">{record.targetRole}</span> JD.
              </p>
            </div>
            {hasTailored && (
              <button
                onClick={handleOptimize}
                disabled={optimizing}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 font-bold px-4 py-2.5 text-xs transition-all disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${optimizing ? "animate-spin" : ""}`} />
                Re-generate Tailoring
              </button>
            )}
          </div>

          {errorMsg && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450 border border-rose-200/30 dark:border-rose-900/30 text-sm font-medium mb-6">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <div className="space-y-1">
                <p className="font-bold">Optimization Failed</p>
                <p className="text-xs">{errorMsg}</p>
              </div>
            </div>
          )}

          {!hasTailored ? (
            // Initial call to action to launch optimization
            <div className="max-w-2xl mx-auto bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-8 text-center shadow-sm space-y-6">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-violet-50 dark:bg-violet-950/50 flex items-center justify-center text-violet-600 dark:text-violet-400">
                <Sparkles className="h-7 w-7" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-black">Tailor Resume Accomplishments</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed font-semibold">
                  Our AI model will analyze your resume context and rewrite bullet points to frame your experiences specifically around the requirements of the job description.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleOptimize}
                  disabled={optimizing}
                  className="inline-flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-750 text-white font-bold px-6 py-3 text-xs shadow-md shadow-violet-500/10 disabled:opacity-50"
                >
                  {optimizing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Rewriting Bullet Points...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Optimize with AI
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            // Tailored comparative details
            <div className="space-y-8 animate-in fade-in duration-300">

              {/* Summary Statement Panel */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-violet-500" />
                    Optimized Professional Summary
                  </h3>
                  <button
                    onClick={() => copyToClipboard(record.tailoredResume?.optimizedSummary || "", "summary")}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[10px] font-bold text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-850 hover:text-zinc-850 dark:hover:text-zinc-200 transition-all"
                  >
                    {copiedSummary ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedSummary ? "Copied" : "Copy Summary"}
                  </button>
                </div>
                <p className="text-sm font-semibold leading-relaxed text-zinc-650 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950/40 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800/80">
                  {record.tailoredResume?.optimizedSummary}
                </p>
              </div>

              {/* Bullet points comparisons */}
              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-zinc-400">
                  Rewritten Accomplishments & Bullet Points
                </h3>

                <div className="space-y-6">
                  {record.tailoredResume?.bulletPoints.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm space-y-4"
                    >
                      {/* Grid containing before & after */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Original Bullet */}
                        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/20 border border-zinc-150 dark:border-zinc-850 text-xs text-zinc-500 space-y-2">
                          <span className="font-black text-[9px] uppercase tracking-wider text-zinc-400">Original Experience Bullet</span>
                          <p className="font-medium leading-relaxed">{item.original}</p>
                        </div>

                        {/* Optimized Bullet */}
                        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-xs text-zinc-800 dark:text-zinc-200 space-y-2 relative group">
                          <div className="flex justify-between items-center">
                            <span className="font-black text-[9px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">AI Optimized Bullet</span>
                            <button
                              onClick={() => copyToClipboard(item.optimized, idx)}
                              className="p-1 rounded border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Copy bullet text"
                            >
                              {copiedIndex === idx ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                          <p className="font-semibold leading-relaxed">{item.optimized}</p>
                        </div>
                      </div>

                      {/* Rationale explanation */}
                      <div className="p-3.5 rounded-xl bg-violet-500/5 border border-violet-500/10 text-xs text-zinc-650 dark:text-zinc-400 flex items-start gap-2">
                        <Sparkles className="h-4.5 w-4.5 text-violet-500 shrink-0 mt-0.5" />
                        <div className="space-y-0.5 font-semibold">
                          <span className="font-bold text-violet-600 dark:text-violet-400">AI Rationale: </span>
                          {item.rationale}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
