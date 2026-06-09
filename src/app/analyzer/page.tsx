"use client";

import React, { useState, useRef } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/context/auth-context";
import { dbService, AnalysisRecord } from "@/lib/db-service";
import { useRouter } from "next/navigation";
import {
  FileText,
  Upload,
  Trash2,
  Sparkles,
  AlertCircle,
  HelpCircle,
  Briefcase,
  Check,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Sample Job Description templates for quick developer testing
const SAMPLE_JDS = [
  {
    title: "Software Engineer",
    text: `About the Role:
We are looking for a Senior Software Engineer to join our core product team. You will be responsible for building high-performance web applications using React, Next.js, and TypeScript, backed by robust server-side APIs.

Key Requirements:
- 4+ years of professional software engineering experience.
- Strong proficiency in modern Javascript, React, Next.js, and TypeScript.
- Experience with backend databases (PostgreSQL, NoSQL) and server architecture.
- Experience with cloud platforms (AWS, GCP) and Firebase.
- Familiarity with CI/CD pipelines, Git, and automated testing.
- Strong communication skills and a collaborative mindset.`
  },
  {
    title: "Product Manager",
    text: `About the Role:
We are seeking a Product Manager to drive product definition and execution for our SaaS platform. You will collaborate closely with engineering, design, and marketing teams to deliver features that delight our users.

Key Requirements:
- 3+ years of product management experience, preferably in B2B SaaS.
- Strong analytical skills, using tools like Mixpanel, SQL, or Tableau.
- Proven track record of shipping successful user-facing products.
- Outstanding communication, prioritization, and storytelling capabilities.
- Ability to define detailed PRDs and coordinate cross-functional teams.`
  }
];

export default function Analyzer() {
  const { user } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [targetRole, setTargetRole] = useState("Software Engineer");
  const [jobDescription, setJobDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Status/Flow states
  const [analyzing, setAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const steps = [
    "Reading uploaded PDF Resume file...",
    "Extracting text content and layout structure...",
    "Contacting AI Analysis Engine...",
    "Validating structured AI output schema...",
    "Saving results record to database..."
  ];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf") {
        setFile(droppedFile);
        setErrorMsg(null);
      } else {
        setErrorMsg("Please upload a PDF file only.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile);
        setErrorMsg(null);
      } else {
        setErrorMsg("Please upload a PDF file only.");
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const loadTemplate = (text: string) => {
    setJobDescription(text);
  };

  const runAnalysis = async () => {
    if (!file) {
      setErrorMsg("Please upload your resume PDF.");
      return;
    }
    if (!jobDescription.trim()) {
      setErrorMsg("Please enter a target Job Description.");
      return;
    }

    setAnalyzing(true);
    setErrorMsg(null);

    try {
      // Step 0: Upload / Read PDF
      setCurrentStep(0);
      const extractFormData = new FormData();
      extractFormData.append("file", file);

      // Step 1: PDF text extraction API
      setCurrentStep(1);
      const extractResponse = await fetch("/api/extract", {
        method: "POST",
        body: extractFormData,
      });

      if (!extractResponse.ok) {
        const errData = await extractResponse.json();
        throw new Error(errData.error || "Failed to extract text from PDF.");
      }

      const { text: extractedText } = await extractResponse.json();

      // Step 2: Call analyze API with prompt customization from LocalStorage if edit exists
      setCurrentStep(2);
      const customPrompt = localStorage.getItem("custom_prompt_analysis");
      const analyzeResponse = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: extractedText,
          jobDescription,
          targetRole,
          customPrompt: customPrompt || undefined
        }),
      });

      // Handle custom error for missing API Key specifically
      if (analyzeResponse.status === 412) {
        const errData = await analyzeResponse.json();
        throw new Error(errData.error);
      }

      if (!analyzeResponse.ok) {
        const errData = await analyzeResponse.json();
        throw new Error(errData.error || "Failed to analyze resume.");
      }

      // Step 3: Parse and Zod Validate
      setCurrentStep(3);
      const analysisData = await analyzeResponse.json();

      // Step 4: Write to DB
      setCurrentStep(4);
      const newAnalysis: AnalysisRecord = {
        id: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: user!.uid,
        timestamp: Date.now(),
        fileName: file.name,
        targetRole,
        jobDescription,
        resumeText: extractedText,
        analysis: analysisData
      };

      await dbService.saveAnalysis(newAnalysis);

      // Navigate to Results page
      router.push(`/results/${newAnalysis.id}`);
    } catch (error: any) {
      console.error("Analysis process error:", error);
      setErrorMsg(error.message || "An unexpected error occurred during processing.");
      setAnalyzing(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 transition-colors duration-200">
        <Navbar />

        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-650 dark:from-zinc-50 dark:to-zinc-400 bg-clip-text text-transparent flex items-center gap-2">
              <Sparkles className="h-7 w-7 text-violet-500" />
              AI Resume Scan
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2">
              Scan your resume against a target role and job description. Get detailed mismatch scoring and coaching.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Input Form Column (Takes 2 grid sizes) */}
            <div className="md:col-span-2 space-y-6">
              {/* Target Role Selector */}
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm space-y-3">
                <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">
                  Target Job Title / Role
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-3 h-4.5 w-4.5 text-zinc-400" />
                  <input
                    type="text"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    placeholder="e.g. Software Engineer, Product Manager"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:ring-violet-400 text-sm font-semibold transition-all"
                  />
                </div>
              </div>

              {/* PDF Resume Upload Component */}
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm space-y-3">
                <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">
                  Upload PDF Resume
                </label>

                {!file ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={triggerFileInput}
                    className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl py-8 px-4 text-center cursor-pointer transition-all duration-200 ${isDragOver
                        ? "border-violet-500 bg-violet-50/20 dark:border-violet-400 dark:bg-violet-950/10"
                        : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-950/20"
                      }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".pdf"
                      className="hidden"
                    />
                    <div className="h-10 w-10 rounded-xl bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center text-violet-600 dark:text-violet-400 mb-3">
                      <Upload className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                      Drag and drop your PDF resume here
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      or click to browse from files (PDF only, max 5MB)
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/30">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center text-rose-500 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30">
                        <FileText className="h-5.5 w-5.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-850 dark:text-zinc-200 truncate max-w-[200px] sm:max-w-[320px]">
                          {file.name}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {(file.size / 1024 / 1024).toFixed(2)} MB • PDF file
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={removeFile}
                      className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-850 text-zinc-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                      title="Remove file"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Job Description Textarea */}
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">
                    Target Job Description (JD)
                  </label>
                  <span className="text-xs text-zinc-400 font-medium">
                    {jobDescription.length} characters
                  </span>
                </div>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the target job description requirements and responsibilities here..."
                  rows={8}
                  className="w-full p-4 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:ring-violet-400 text-sm font-semibold transition-all resize-none"
                />
              </div>

              {/* Error Alert Display */}
              {errorMsg && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-200/30 dark:border-rose-900/30 text-sm font-medium">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-bold">Execution Error</p>
                    <p className="text-xs leading-relaxed">{errorMsg}</p>
                  </div>
                </div>
              )}

              {/* Analyze Trigger */}
              <button
                onClick={runAnalysis}
                disabled={analyzing}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-750 text-white font-bold py-3 shadow-md shadow-violet-500/20 hover:shadow-violet-600/30 disabled:opacity-50 transition-all duration-200"
              >
                <Sparkles className="h-5 w-5" />
                Analyze Resume
              </button>
            </div>

            {/* Help / Templates sidebar column (Takes 1 grid size) */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
                  <HelpCircle className="h-4.5 w-4.5 text-zinc-400" />
                  Testing Templates
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Click a template below to auto-fill the target Job Description box instantly:
                </p>
                <div className="space-y-2">
                  {SAMPLE_JDS.map((template) => (
                    <button
                      key={template.title}
                      onClick={() => loadTemplate(template.text)}
                      className="w-full flex items-center justify-between p-3 text-left rounded-xl border border-zinc-200/60 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
                    >
                      <span className="text-xs font-bold text-zinc-750 dark:text-zinc-300">
                        {template.title} Template
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Dynamic Multi-Step Analysis Loading Modal */}
        <AnimatePresence>
          {analyzing && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6 text-center"
              >
                <div className="flex justify-center">
                  <div className="relative flex items-center justify-center h-16 w-16 rounded-2xl bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400 shadow-inner">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-extrabold text-zinc-800 dark:text-zinc-200">
                    Analyzing Resume...
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    We are processing your files and contacting the LLM. Please do not close this window.
                  </p>
                </div>

                {/* Steps Visualizer */}
                <div className="space-y-2.5 text-left border-t border-zinc-100 dark:border-zinc-800 pt-4 max-w-sm mx-auto">
                  {steps.map((step, idx) => {
                    const isDone = idx < currentStep;
                    const isCurrent = idx === currentStep;
                    return (
                      <div
                        key={step}
                        className={`flex items-center gap-3 transition-colors duration-200 ${isDone
                            ? "text-zinc-400 dark:text-zinc-650"
                            : isCurrent
                              ? "text-violet-600 dark:text-violet-400 font-bold"
                              : "text-zinc-300 dark:text-zinc-700"
                          }`}
                      >
                        <div className={`h-4.5 w-4.5 rounded-full flex items-center justify-center border text-[9px] font-bold ${isDone
                            ? "border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400"
                            : isCurrent
                              ? "border-violet-500 bg-violet-50 text-violet-600 animate-pulse dark:bg-violet-950 dark:text-violet-400"
                              : "border-zinc-200 dark:border-zinc-800 bg-transparent"
                          }`}>
                          {isDone ? <Check className="h-2.5 w-2.5" /> : idx + 1}
                        </div>
                        <span className="text-xs">{step}</span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </ProtectedRoute>
  );
}
const ChevronRight = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);
