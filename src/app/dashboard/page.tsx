"use client";

import React, { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/context/auth-context";
import { dbService, AnalysisRecord, InterviewSession } from "@/lib/db-service";
import Link from "next/link";
import { 
  FileText, 
  MessageSquare, 
  Award, 
  ArrowRight, 
  Calendar, 
  Brain, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Sparkles
} from "lucide-react";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [interviews, setInterviews] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    async function loadData() {
      try {
        const [userAnalyses, userInterviews] = await Promise.all([
          dbService.getAnalyses(user!.uid),
          dbService.getInterviewSessions(user!.uid)
        ]);
        setAnalyses(userAnalyses);
        setInterviews(userInterviews);
      } catch (error) {
        console.error("Failed to load user analyses & sessions:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  // Statistics calculation
  const totalAnalyses = analyses.length;
  const averageScore = totalAnalyses > 0 
    ? Math.round(analyses.reduce((acc, curr) => acc + curr.analysis.score, 0) / totalAnalyses) 
    : 0;
  const totalInterviews = interviews.length;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30 border-emerald-500/20";
    if (score >= 60) return "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30 border-amber-500/20";
    return "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/30 border-rose-500/20";
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 transition-colors duration-200">
        <Navbar />
        
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-zinc-50 dark:to-zinc-400 bg-clip-text text-transparent">
                Welcome back, {user?.displayName?.split(" ")[0] || "User"}
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                Track your applications, resume scores, and interview performance.
              </p>
            </div>
            
            <Link
              href="/analyzer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 text-sm font-semibold shadow-md shadow-violet-500/20 transition-all duration-200"
            >
              <FileText className="h-4.5 w-4.5" />
              Analyze New Resume
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {loading ? (
            // Skeleton loader
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-28 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 animate-pulse" />
                ))}
              </div>
              <div className="h-96 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 animate-pulse" />
            </div>
          ) : (
            <div className="space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Stat Card 1: Average Score */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-between shadow-sm">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Average Match Score</p>
                    <h3 className="text-3xl font-black tracking-tight text-zinc-850 dark:text-zinc-100">
                      {totalAnalyses > 0 ? `${averageScore}%` : "N/A"}
                    </h3>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center text-violet-600 dark:text-violet-400">
                    <Award className="h-6 w-6" />
                  </div>
                </div>

                {/* Stat Card 2: Total Resumes */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-between shadow-sm">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Resumes Analyzed</p>
                    <h3 className="text-3xl font-black tracking-tight text-zinc-850 dark:text-zinc-100">
                      {totalAnalyses}
                    </h3>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <FileText className="h-6 w-6" />
                  </div>
                </div>

                {/* Stat Card 3: Interviews */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-between shadow-sm sm:col-span-2 lg:col-span-1">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Interview Sessions</p>
                    <h3 className="text-3xl font-black tracking-tight text-zinc-850 dark:text-zinc-100">
                      {totalInterviews}
                    </h3>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Scans History - Left 2 Columns */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-violet-500" />
                      Recent Analyses
                    </h2>
                  </div>

                  {totalAnalyses === 0 ? (
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 p-12 text-center shadow-sm">
                      <div className="mx-auto w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500 mb-4">
                        <FileText className="h-6 w-6" />
                      </div>
                      <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-1">No resumes analyzed yet</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mb-6">
                        Upload your resume against a target job description to get scoring, missing skills analysis, and tailor-made interview prep.
                      </p>
                      <Link
                        href="/analyzer"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 text-white hover:bg-violet-750 px-4 py-2 text-xs font-semibold"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Analyze Resume
                      </Link>
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-zinc-100 dark:border-zinc-800 text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider bg-zinc-50/50 dark:bg-zinc-900/30">
                              <th className="px-6 py-4">Role / File</th>
                              <th className="px-6 py-4 text-center">Score</th>
                              <th className="px-6 py-4">Analyzed On</th>
                              <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
                            {analyses.map((record) => (
                              <tr key={record.id} className="hover:bg-zinc-50/40 dark:hover:bg-zinc-900/10 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-xs">
                                    {record.targetRole || "General Application"}
                                  </div>
                                  <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-xs">
                                    {record.fileName}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <span className={`inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-lg border ${getScoreColor(record.analysis.score)}`}>
                                    {record.analysis.score}%
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 text-xs whitespace-nowrap">
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                                    {new Date(record.timestamp).toLocaleDateString(undefined, {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric"
                                    })}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-right whitespace-nowrap">
                                  <Link
                                    href={`/results/${record.id}`}
                                    className="inline-flex items-center gap-1 text-xs font-bold text-violet-600 dark:text-violet-400 hover:text-violet-850 dark:hover:text-violet-350"
                                  >
                                    View Report
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </Link>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Interviews Coach Section - Right Column */}
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                    <Brain className="h-5 w-5 text-emerald-500" />
                    Interview Sessions
                  </h2>

                  {totalInterviews === 0 ? (
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 p-8 text-center shadow-sm">
                      <MessageSquare className="h-8 w-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Practice mock interview questions generated directly from your resume scans to get AI feedback.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {interviews.slice(0, 5).map((session) => {
                        const targetAnalysis = analyses.find(a => a.id === session.analysisId);
                        return (
                          <div 
                            key={session.id} 
                            className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors shadow-sm group"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                  {session.type} Interview
                                </h4>
                                <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5 line-clamp-1">
                                  {targetAnalysis?.targetRole || "General Role"}
                                </h3>
                              </div>
                              <span className={`text-xs px-2 py-0.5 font-medium rounded-full ${
                                session.completed 
                                  ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                                  : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400"
                              }`}>
                                {session.completed ? "Done" : `Q ${session.currentQuestionIndex + 1}/${session.questions.length}`}
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(session.timestamp).toLocaleDateString()}
                              </span>
                              <Link
                                href={`/coach/${session.id}`}
                                className="inline-flex items-center gap-1 text-zinc-850 dark:text-zinc-200 group-hover:text-violet-600 dark:group-hover:text-violet-400 font-semibold"
                              >
                                {session.completed ? "View Feedback" : "Resume Practice"}
                                <ChevronRight className="h-3 w-3 transform transition-transform group-hover:translate-x-0.5" />
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
