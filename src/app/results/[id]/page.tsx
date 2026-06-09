"use client";

import React, { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/context/auth-context";
import { dbService, AnalysisRecord, InterviewSession } from "@/lib/db-service";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Award, 
  ArrowLeft, 
  Brain, 
  CheckCircle, 
  AlertTriangle, 
  FileText, 
  AlertCircle, 
  TrendingUp, 
  Play, 
  Sparkles,
  Printer,
  ChevronRight,
  BookOpen,
  Loader2,
  Calendar
} from "lucide-react";
import { motion } from "framer-motion";

export default function Results() {
  const { id } = useParams() as { id: string };
  const { user } = useAuth();
  const router = useRouter();

  const [record, setRecord] = useState<AnalysisRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "skills" | "questions">("overview");
  const [creatingCoach, setCreatingCoach] = useState(false);

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

  const handleStartPractice = async () => {
    if (!record || !user) return;
    setCreatingCoach(true);

    try {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newSession: InterviewSession = {
        id: sessionId,
        analysisId: record.id,
        userId: user.uid,
        timestamp: Date.now(),
        type: "Technical & Behavioral",
        questions: record.analysis.suggestedQuestions,
        currentQuestionIndex: 0,
        responses: [],
        completed: false
      };

      await dbService.saveInterviewSession(newSession);
      router.push(`/coach/${sessionId}`);
    } catch (err) {
      console.error("Failed to initialize interview coach session:", err);
      setCreatingCoach(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-violet-600" />
          <p className="text-sm font-semibold text-zinc-500">Loading analysis report...</p>
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
          <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-200">Report Not Found</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 mb-6">
            The resume analysis report you are looking for does not exist or has been deleted.
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

  const { score, fitSummary, matchingSkills, missingSkills, strengths, improvements } = record.analysis;

  // Custom visual values
  const getScoreColor = (scoreValue: number) => {
    if (scoreValue >= 80) return "#10b981"; // Emerald
    if (scoreValue >= 60) return "#f59e0b"; // Amber
    return "#ef4444"; // Rose
  };

  const getScoreBg = (scoreValue: number) => {
    if (scoreValue >= 80) return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    if (scoreValue >= 60) return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    return "bg-rose-500/10 text-rose-500 border-rose-500/20";
  };

  const getImportanceBadge = (importance: string) => {
    switch (importance) {
      case "high":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-450 border border-rose-500/20";
      case "medium":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20";
      default:
        return "bg-zinc-100 text-zinc-650 dark:bg-zinc-900 dark:text-zinc-400 border border-zinc-200/30 dark:border-zinc-800/40";
    }
  };

  const scoreColor = getScoreColor(score);
  const circ = 2 * Math.PI * 40; // ~251.32

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 transition-colors duration-200 printable-section">
        <Navbar />

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb / Back Link */}
          <div className="mb-6 non-printable">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </div>

          {/* Results Summary Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 sm:p-8 shadow-sm mb-8">
            {/* Animated Score Gauge */}
            <div className="flex flex-col items-center justify-center p-4 border-b md:border-b-0 md:border-r border-zinc-100 dark:border-zinc-800/60">
              <div className="relative w-36 h-36">
                <svg className="w-full h-full transform -rotate-95" viewBox="0 0 100 100">
                  {/* Track ring */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="stroke-zinc-100 dark:stroke-zinc-800/80"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  {/* Score ring */}
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke={scoreColor}
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={circ}
                    initial={{ strokeDashoffset: circ }}
                    animate={{ strokeDashoffset: circ - (score / 100) * circ }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    strokeLinecap="round"
                  />
                </svg>
                {/* Score text overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black tracking-tighter" style={{ color: scoreColor }}>
                    {score}%
                  </span>
                  <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                    Match Score
                  </span>
                </div>
              </div>
              <div className="text-center mt-4 space-y-1">
                <h3 className="font-extrabold text-sm">{record.targetRole}</h3>
                <p className="text-xs text-zinc-400 truncate max-w-[180px]">{record.fileName}</p>
              </div>
            </div>

            {/* Fit Evaluation */}
            <div className="md:col-span-2 flex flex-col justify-between p-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 text-xs font-black rounded-lg border uppercase tracking-wider ${getScoreBg(score)}`}>
                    {score >= 80 ? "Excellent Fit" : score >= 60 ? "Strong Potential" : "Needs Optimization"}
                  </span>
                  <span className="text-xs text-zinc-400 font-semibold flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Analyzed on {new Date(record.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-zinc-850 dark:text-zinc-200">Role Alignment Review</h2>
                <p className="text-sm text-zinc-650 dark:text-zinc-400 leading-relaxed font-medium">
                  {fitSummary}
                </p>
              </div>

              {/* Quick Action Button Group */}
              <div className="flex flex-wrap gap-3 mt-6 border-t border-zinc-100 dark:border-zinc-800/60 pt-5 non-printable">
                <button
                  onClick={handleStartPractice}
                  disabled={creatingCoach}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-750 text-white font-bold px-4 py-2.5 text-xs shadow-md shadow-violet-500/10 disabled:opacity-50 transition-all"
                >
                  {creatingCoach ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Brain className="h-4 w-4" />
                  )}
                  Practice with AI Coach
                </button>
                <Link
                  href={`/optimize/${record.id}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-bold px-4 py-2.5 text-xs transition-colors"
                >
                  <Sparkles className="h-4 w-4 text-violet-500" />
                  Optimize Resume
                </Link>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-bold px-4 py-2.5 text-xs transition-colors"
                >
                  <Printer className="h-4 w-4" />
                  Print Report
                </button>
              </div>
            </div>
          </div>

          {/* Interactive tabs navigation */}
          <div className="border-b border-zinc-200 dark:border-zinc-800 mb-6 flex gap-6 non-printable">
            {[
              { id: "overview", label: "Overview", icon: BookOpen },
              { id: "skills", label: "Skills Gap Analysis", icon: Award },
              { id: "questions", label: "Simulated Questions", icon: Brain }
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 pb-3.5 text-sm font-bold border-b-2 transition-all relative ${
                    isActive 
                      ? "border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400"
                      : "border-transparent text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-350"
                  }`}
                >
                  <tab.icon className="h-4.5 w-4.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tabs Content */}
          <div className="space-y-6">
            
            {/* OVERVIEW TAB */}
            {(activeTab === "overview" || typeof window !== "undefined" && window.matchMedia("print").matches) && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {/* Strengths Card */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                    Resume Strengths
                  </h3>
                  <ul className="space-y-3.5 text-sm font-medium">
                    {strengths.map((strength, index) => (
                      <li key={index} className="flex items-start gap-2.5 text-zinc-650 dark:text-zinc-400 leading-relaxed">
                        <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2" />
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Improvements Card */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Suggested Optimizations
                  </h3>
                  <ul className="space-y-3.5 text-sm font-medium">
                    {improvements.map((improvement, index) => (
                      <li key={index} className="flex items-start gap-2.5 text-zinc-650 dark:text-zinc-400 leading-relaxed">
                        <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-amber-500 mt-2" />
                        {improvement}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}

            {/* SKILLS TAB */}
            {activeTab === "skills" && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Missing Skills */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                    Identified Missing or Weak Skills
                  </h3>
                  {missingSkills.length === 0 ? (
                    <p className="text-sm text-zinc-550 dark:text-zinc-400">
                      Incredible! No missing skills detected. You cover all core components of this job description.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2.5">
                      {missingSkills.map((skill) => (
                        <div
                          key={skill.name}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold ${getImportanceBadge(
                            skill.importance
                          )}`}
                        >
                          {skill.name}
                          <span className="text-[9px] font-black uppercase opacity-70">
                            • {skill.importance}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Matching Skills */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                    Matched Skills
                  </h3>
                  <div className="flex flex-wrap gap-2.5">
                    {matchingSkills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* QUESTIONS TAB */}
            {activeTab === "questions" && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-6 shadow-sm space-y-4"
              >
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  AI-Generated Mock Interview Questions
                </h3>
                <div className="space-y-4">
                  {record.analysis.suggestedQuestions.map((question, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800/60"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400 font-bold shrink-0">
                        {idx + 1}
                      </div>
                      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-250 leading-relaxed self-center">
                        {question}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

