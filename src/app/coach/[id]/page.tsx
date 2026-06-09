"use client";

import React, { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/context/auth-context";
import { dbService, InterviewSession, AnalysisRecord } from "@/lib/db-service";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Brain,
  CheckCircle,
  Send,
  Loader2,
  ChevronRight,
  Award,
  AlertCircle,
  HelpCircle,
  Eye,
  EyeOff,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function InterviewCoachPage() {
  const { id } = useParams() as { id: string };
  const { user } = useAuth();
  const router = useRouter();

  // Database states
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisRecord | null>(null);
  const [loading, setLoading] = useState(true);

  // User input & flow states
  const [answerInput, setAnswerInput] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [showModelAnswer, setShowModelAnswer] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const sessionData = await dbService.getInterviewSessionById(id);
        if (sessionData) {
          setSession(sessionData);
          const analysisData = await dbService.getAnalysisById(sessionData.analysisId);
          setAnalysis(analysisData);
        }
      } catch (error) {
        console.error("Failed to load interview session:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-violet-600" />
          <p className="text-sm font-semibold text-zinc-500">Loading interview coach...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
        <Navbar />
        <div className="flex-1 max-w-md mx-auto flex flex-col items-center justify-center p-6 text-center">
          <AlertCircle className="h-12 w-12 text-rose-500 mb-4" />
          <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-200">Session Not Found</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 mb-6">
            The interview session report you are looking for does not exist or has been deleted.
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

  const currentQuestionIndex = session.currentQuestionIndex;
  const currentQuestionText = session.questions[currentQuestionIndex];
  const isQuestionAnswered = session.responses[currentQuestionIndex] !== undefined;
  const currentResponse = session.responses[currentQuestionIndex];

  const handleSubmitAnswer = async () => {
    if (!answerInput.trim()) return;
    setEvaluating(true);
    setErrorMsg(null);

    try {
      // Call coach critique API with custom prompt customization from LocalStorage if edit exists
      const customPrompt = localStorage.getItem("custom_prompt_evaluation");
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: currentQuestionText,
          answer: answerInput,
          jobDescription: analysis?.jobDescription || "",
          customPrompt: customPrompt || undefined
        }),
      });

      if (res.status === 412) {
        const errData = await res.json();
        throw new Error(errData.error);
      }

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to evaluate answer.");
      }

      const evaluation = await res.json();

      // Append response
      const updatedResponses = [...session.responses];
      updatedResponses[currentQuestionIndex] = {
        question: currentQuestionText,
        answer: answerInput,
        evaluation: evaluation
      };

      // If we are at the end of the question list, mark session completed
      const isLastQuestion = currentQuestionIndex === session.questions.length - 1;
      const updatedSession: InterviewSession = {
        ...session,
        responses: updatedResponses,
        completed: isLastQuestion ? true : session.completed
      };

      await dbService.saveInterviewSession(updatedSession);
      setSession(updatedSession);
      setAnswerInput("");
      setShowModelAnswer(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An unexpected error occurred during evaluation.");
    } finally {
      setEvaluating(false);
    }
  };

  const handleNext = async () => {
    const nextIdx = currentQuestionIndex + 1;
    if (nextIdx < session.questions.length) {
      const updatedSession = {
        ...session,
        currentQuestionIndex: nextIdx
      };
      await dbService.saveInterviewSession(updatedSession);
      setSession(updatedSession);
      setAnswerInput("");
      setShowModelAnswer(false);
      setErrorMsg(null);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500 border-emerald-500/20 bg-emerald-500/5";
    if (score >= 60) return "text-amber-500 border-amber-500/20 bg-amber-500/5";
    return "text-rose-500 border-rose-500/20 bg-rose-500/5";
  };

  // Compile final results metrics
  const totalScore = session.responses.reduce((sum, res) => sum + (res.evaluation?.score || 0), 0);
  const averageSessionScore = session.responses.length > 0
    ? Math.round(totalScore / session.responses.length)
    : 0;

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 transition-colors duration-200">
        <Navbar />

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header breadcrumb */}
          <div className="mb-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </div>

          {session.completed && !isQuestionAnswered ? (
            // Interview Completion Summary View
            <div className="max-w-3xl mx-auto bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-8 shadow-sm space-y-8 text-center">
              <div className="flex justify-center">
                <div className="relative flex items-center justify-center h-20 w-20 rounded-3xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <CheckCircle className="h-10 w-10 animate-bounce" />
                </div>
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Practice Session Complete!</h1>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-md mx-auto">
                  You have successfully completed all mock questions for this target role. Here is your evaluation breakdown:
                </p>
              </div>

              {/* Score gauge summary */}
              <div className="max-w-xs mx-auto p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-850/50 space-y-2">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Average Answer Rating</p>
                <h2 className="text-4xl font-black text-violet-600 dark:text-violet-400">{averageSessionScore}%</h2>
                <span className={`inline-block px-2.5 py-0.5 text-[10px] font-black rounded-lg border uppercase tracking-wider ${averageSessionScore >= 80
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    : averageSessionScore >= 60
                      ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                      : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                  }`}>
                  {averageSessionScore >= 80 ? "Interview Ready" : averageSessionScore >= 60 ? "Almost Ready" : "Requires Practice"}
                </span>
              </div>

              {/* Question list review */}
              <div className="text-left space-y-4 max-w-2xl mx-auto">
                <h3 className="font-bold text-sm text-zinc-700 dark:text-zinc-300">Detailed Answer History</h3>
                <div className="space-y-3">
                  {session.responses.map((resp, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20"
                    >
                      <div className="min-w-0 pr-4">
                        <p className="text-xs font-bold text-zinc-400">Question {idx + 1}</p>
                        <p className="text-sm font-semibold text-zinc-850 dark:text-zinc-200 truncate">{resp.question}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-black rounded-lg border shrink-0 ${resp.evaluation?.score && resp.evaluation.score >= 80
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          : resp.evaluation?.score && resp.evaluation.score >= 60
                            ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                            : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                        }`}>
                        {resp.evaluation?.score}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-center gap-4">
                <Link
                  href="/dashboard"
                  className="rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-bold px-6 py-2.5 text-xs transition-colors"
                >
                  Return to Dashboard
                </Link>
                <button
                  onClick={async () => {
                    const resetSession = {
                      ...session,
                      currentQuestionIndex: 0,
                      responses: [],
                      completed: false
                    };
                    await dbService.saveInterviewSession(resetSession);
                    setSession(resetSession);
                    setAnswerInput("");
                  }}
                  className="rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-750 px-6 py-2.5 text-xs shadow-md shadow-violet-500/10"
                >
                  Retry Session
                </button>
              </div>
            </div>
          ) : (
            // Core Interview Question & evaluation loop
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {/* Question list navigation sidebar */}
              <div className="md:col-span-1 space-y-4">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">Questions Queue</h3>
                  <div className="space-y-2.5">
                    {session.questions.map((q, idx) => {
                      const isAnswered = session.responses[idx] !== undefined;
                      const isCurrent = idx === currentQuestionIndex;

                      return (
                        <button
                          key={idx}
                          disabled={!isAnswered && idx !== currentQuestionIndex}
                          onClick={async () => {
                            const updatedSession = { ...session, currentQuestionIndex: idx };
                            await dbService.saveInterviewSession(updatedSession);
                            setSession(updatedSession);
                            setAnswerInput("");
                            setShowModelAnswer(false);
                            setErrorMsg(null);
                          }}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left text-xs transition-all ${isCurrent
                              ? "border-violet-500 bg-violet-500/5 text-violet-600 dark:text-violet-400 font-bold"
                              : isAnswered
                                ? "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/30 text-zinc-500"
                                : "border-transparent text-zinc-300 dark:text-zinc-700"
                            }`}
                        >
                          <div className={`h-4.5 w-4.5 rounded-full flex items-center justify-center border text-[9px] font-bold ${isAnswered
                              ? "border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-450"
                              : isCurrent
                                ? "border-violet-500 bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-450"
                                : "border-zinc-200 dark:border-zinc-800"
                            }`}>
                            {isAnswered ? "✓" : idx + 1}
                          </div>
                          <span className="truncate">Question {idx + 1}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Main Workspace content */}
              <div className="md:col-span-3 space-y-6">

                {/* Active Question Box */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-lg uppercase tracking-wider">
                      Question {currentQuestionIndex + 1} of {session.questions.length}
                    </span>
                    {analysis && (
                      <span className="text-xs text-zinc-400 font-semibold">{analysis.targetRole} Coach</span>
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-zinc-850 dark:text-zinc-100 leading-relaxed">
                    {currentQuestionText}
                  </h2>
                </div>

                {/* Question Workspace (if not answered yet) */}
                {!isQuestionAnswered && (
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">
                        Your Professional Answer
                      </label>
                      <span className="text-xs text-zinc-400 font-medium">
                        {answerInput.split(/\s+/).filter(Boolean).length} words
                      </span>
                    </div>

                    <textarea
                      value={answerInput}
                      onChange={(e) => setAnswerInput(e.target.value)}
                      placeholder="Formulate your detailed response. Feel free to structure it using bullet points or describe technical design choices/behavioral steps..."
                      rows={10}
                      disabled={evaluating}
                      className="w-full p-4 rounded-2xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:ring-violet-400 text-sm font-semibold transition-all resize-none disabled:opacity-50"
                    />

                    {/* Alert Banner for errors */}
                    {errorMsg && (
                      <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-200/30 dark:border-rose-900/30 text-sm font-medium">
                        <AlertCircle className="h-5 w-5 shrink-0" />
                        <div className="space-y-1">
                          <p className="font-bold">Evaluation Failed</p>
                          <p className="text-xs">{errorMsg}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={handleSubmitAnswer}
                        disabled={evaluating || !answerInput.trim()}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-750 text-white font-bold px-6 py-3 text-xs shadow-md shadow-violet-500/10 disabled:opacity-50 transition-all duration-200"
                      >
                        {evaluating ? (
                          <>
                            <Loader2 className="h-4.5 w-4.5 animate-spin" />
                            Evaluating answer via AI...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            Submit Answer
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Critique Workspace (if question is already answered) */}
                {isQuestionAnswered && currentResponse.evaluation && (
                  <div className="space-y-6">
                    {/* Collapsible Answer */}
                    <div className="bg-zinc-100 dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200/30 dark:border-zinc-800/60 text-sm space-y-2">
                      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Your Submitted Answer</h4>
                      <p className="text-zinc-650 dark:text-zinc-400 whitespace-pre-line leading-relaxed font-semibold">
                        {currentResponse.answer}
                      </p>
                    </div>

                    {/* Main Evaluation Report Panel */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">

                      {/* Rating Banner */}
                      <div className="flex items-center gap-4 pb-5 border-b border-zinc-100 dark:border-zinc-800/60">
                        <div className={`h-16 w-16 rounded-2xl border flex flex-col items-center justify-center shrink-0 font-black tracking-tighter text-xl ${getScoreColor(
                          currentResponse.evaluation.score
                        )}`}>
                          {currentResponse.evaluation.score}%
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm text-zinc-800 dark:text-zinc-200">Answer Score Rating</h3>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-normal">
                            Critiqued by AI Interviewer based on standard grading schemas.
                          </p>
                        </div>
                      </div>

                      {/* General Feedback summary */}
                      <div className="space-y-2.5">
                        <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                          <HelpCircle className="h-4 w-4" />
                          Feedback Summary
                        </h4>
                        <p className="text-sm font-medium leading-relaxed text-zinc-700 dark:text-zinc-300">
                          {currentResponse.evaluation.feedback}
                        </p>
                      </div>

                      {/* Strengths / Improvements Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                        {/* Strengths list */}
                        <div className="space-y-3 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/30 dark:border-zinc-850/40">
                          <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 border-b border-zinc-100 dark:border-zinc-900 pb-2">
                            ✓ Key Strengths
                          </h4>
                          <ul className="space-y-2 text-xs font-semibold leading-relaxed text-zinc-650 dark:text-zinc-400">
                            {currentResponse.evaluation.strengths.map((str, idx) => (
                              <li key={idx} className="flex items-start gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                {str}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Improvements list */}
                        <div className="space-y-3 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/30 dark:border-zinc-850/40">
                          <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 border-b border-zinc-100 dark:border-zinc-900 pb-2">
                            ⚠ Areas to Improve
                          </h4>
                          <ul className="space-y-2 text-xs font-semibold leading-relaxed text-zinc-650 dark:text-zinc-400">
                            {currentResponse.evaluation.improvements.map((imp, idx) => (
                              <li key={idx} className="flex items-start gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                {imp}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Model/Exemplar Answer Collapsible dropdown */}
                      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                        <button
                          onClick={() => setShowModelAnswer(!showModelAnswer)}
                          className="flex items-center justify-between w-full p-4 rounded-xl border border-zinc-200/60 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-850 text-xs font-bold transition-all"
                        >
                          <span className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
                            <Sparkles className="h-4 w-4" />
                            Reveal Model Exemplar Answer
                          </span>
                          {showModelAnswer ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>

                        {showModelAnswer && (
                          <div className="mt-3 p-4 rounded-xl bg-violet-500/5 border border-violet-500/10 text-xs text-zinc-650 dark:text-zinc-400 leading-relaxed font-semibold">
                            {currentResponse.evaluation.modelAnswer}
                          </div>
                        )}
                      </div>

                      {/* Action buttons (Next step) */}
                      <div className="flex justify-end pt-4 border-t border-zinc-100 dark:border-zinc-800/60">
                        {currentQuestionIndex === session.questions.length - 1 ? (
                          <button
                            onClick={async () => {
                              const updatedSession = { ...session, completed: true };
                              await dbService.saveInterviewSession(updatedSession);
                              setSession(updatedSession);
                            }}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-750 text-white font-bold px-5 py-2.5 text-xs shadow-md shadow-violet-500/10"
                          >
                            Finish & View Session Summary
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={handleNext}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-750 text-white font-bold px-5 py-2.5 text-xs shadow-md shadow-violet-500/10"
                          >
                            Next Question
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
