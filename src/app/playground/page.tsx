"use client";

import React, { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { Navbar } from "@/components/navbar";
import {
  Sparkles,
  Save,
  RotateCcw,
  CheckCircle,
  HelpCircle,
  Sliders,
  Cpu,
  Info
} from "lucide-react";
import { motion } from "framer-motion";

// Default prompt values for initialization and resets
const DEFAULT_PROMPTS = {
  analysis: `You are an expert technical recruiter and resume coach.
Analyze the candidate's resume text against the target Job Description (and optionally the Target Role: "{{targetRole}}").

Calculate a matching percentage score (0-100) based on alignment of skills, experience level, and requirements.
Identify missing key skills (tagging importance as high, medium, or low).
List specific strengths and positive match elements.
Provide concrete, actionable improvements for the resume.
Generate exactly 5 tailored interview questions designed to test the candidate on the gap areas between their resume and the job description.

Your response MUST be a single, valid JSON object conforming exactly to this structure:
{
  "score": number, // integer 0-100
  "fitSummary": "string describing overall fit",
  "matchingSkills": ["skill1", "skill2"],
  "missingSkills": [
    { "name": "skillName", "importance": "high" | "medium" | "low" }
  ],
  "strengths": ["strength1", "strength2"],
  "improvements": ["suggestion1", "suggestion2"],
  "suggestedQuestions": ["question1", "question2", "question3", "question4", "question5"]
}

Respond ONLY with the JSON. Do not add any conversational text or formatting.

Candidate Resume:
{{resumeText}}

Job Description:
{{jobDescription}}`,

  evaluation: `You are a strict, constructive technical and behavioral interviewer.
Evaluate the candidate's response to the given interview question, keeping the target Job Description context in mind.

Assess the answer based on:
1. Accuracy & correctness.
2. Completeness & structural clarity (e.g., did they use STAR method for behavioral, or clarify assumptions for technical).
3. Professional communication.

Your response MUST be a single, valid JSON object conforming exactly to this structure:
{
  "score": number, // integer 0-100 representing performance quality
  "feedback": "string summarizing response critique",
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"],
  "modelAnswer": "string containing an exemplar or optimal answer the candidate should have given"
}

Respond ONLY with the JSON. Do not add any conversational text or formatting.

Job Description:
{{jobDescription}}

Interview Question:
{{question}}

Candidate's Response:
{{answer}}`,

  tailoring: `You are an expert resume writer and technical editor.
Your task is to take the candidate's resume text and rewrite it so it is highly optimized for the target Job Description (Target Role: "{{targetRole}}").

1. Generate a compelling, tailored professional summary statement.
2. Extract the candidate's primary work accomplishments / experience bullet points, and rewrite them to highlight key matching skills, achievements, and impact relative to the Job Description requirements.
3. For each bullet point, provide a brief rationale explaining why you changed it and how it maps to the target job requirements.

Your response MUST be a single, valid JSON object conforming exactly to this structure:
{
  "optimizedSummary": "compelling 3-4 sentence professional summary",
  "bulletPoints": [
    {
      "original": "original extracted bullet point text from resume",
      "optimized": "optimized rewritten version of that bullet point focusing on impact",
      "rationale": "explanation of how this change targets the job description requirements"
    }
  ]
}

Respond ONLY with the JSON. Do not add any conversational text or formatting.

Candidate Resume:
{{resumeText}}

Job Description:
{{jobDescription}}`
};

export default function PromptPlayground() {
  const [activeTab, setActiveTab] = useState<"analysis" | "evaluation" | "tailoring">("analysis");
  const [prompts, setPrompts] = useState({
    analysis: "",
    evaluation: "",
    tailoring: ""
  });

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load custom prompts from localStorage, or use defaults
    const loadedPrompts = {
      analysis: localStorage.getItem("custom_prompt_analysis") || DEFAULT_PROMPTS.analysis,
      evaluation: localStorage.getItem("custom_prompt_evaluation") || DEFAULT_PROMPTS.evaluation,
      tailoring: localStorage.getItem("custom_prompt_tailoring") || DEFAULT_PROMPTS.tailoring
    };
    setPrompts(loadedPrompts);
  }, []);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompts({
      ...prompts,
      [activeTab]: e.target.value
    });
  };

  const handleSave = () => {
    localStorage.setItem(`custom_prompt_${activeTab}`, prompts[activeTab]);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    const defaultVal = DEFAULT_PROMPTS[activeTab];
    setPrompts({
      ...prompts,
      [activeTab]: defaultVal
    });
    localStorage.removeItem(`custom_prompt_${activeTab}`);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const getVariableDocs = () => {
    switch (activeTab) {
      case "analysis":
        return [
          { name: "{{resumeText}}", desc: "Replaced with the parsed plain text of the candidate's PDF resume file." },
          { name: "{{jobDescription}}", desc: "Replaced with the target job details submitted by the user." },
          { name: "{{targetRole}}", desc: "Replaced with the title of the target position (e.g. 'Software Engineer')." }
        ];
      case "evaluation":
        return [
          { name: "{{question}}", desc: "Replaced with the active interview question being asked." },
          { name: "{{answer}}", desc: "Replaced with the text answer submitted by the candidate." },
          { name: "{{jobDescription}}", desc: "Replaced with the target job details submitted by the user." }
        ];
      default:
        return [
          { name: "{{resumeText}}", desc: "Replaced with the parsed plain text of the candidate's PDF resume file." },
          { name: "{{jobDescription}}", desc: "Replaced with the target job details submitted by the user." },
          { name: "{{targetRole}}", desc: "Replaced with the title of the target position." }
        ];
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 transition-colors duration-200">
        <Navbar />

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-650 dark:from-zinc-50 dark:to-zinc-400 bg-clip-text text-transparent flex items-center gap-2">
              <Sliders className="h-7 w-7 text-violet-500" />
              Prompt Engineering Playground
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2">
              View and edit the underlying system prompts powering the AI workflows. Your custom prompts are compiled dynamically on subsequent scans.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar select tabs */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                  <Cpu className="h-4 w-4" />
                  AI Workflows
                </h3>
                <div className="space-y-2">
                  {[
                    { id: "analysis", label: "Resume Analysis" },
                    { id: "evaluation", label: "Answer Evaluation" },
                    { id: "tailoring", label: "Resume Tailoring" }
                  ].map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left text-xs font-bold transition-all ${isActive
                            ? "border-violet-500 bg-violet-500/5 text-violet-600 dark:text-violet-400"
                            : "border-transparent text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-850 dark:text-zinc-450"
                          }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Context variables guide */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-5 shadow-sm space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Info className="h-4 w-4" />
                  Context Variables
                </h3>
                <p className="text-[10px] text-zinc-400 leading-normal">
                  Make sure your prompt uses these double curly bracket parameters so the server can inject target context properly:
                </p>
                <div className="space-y-2.5 pt-2">
                  {getVariableDocs().map((v) => (
                    <div key={v.name} className="space-y-0.5">
                      <code className="text-xs font-bold text-violet-600 dark:text-violet-400 bg-zinc-100 dark:bg-zinc-950 px-1 py-0.5 rounded">
                        {v.name}
                      </code>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-450 leading-relaxed font-semibold">
                        {v.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Prompt editor panel */}
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-zinc-400">
                    System Prompt Instructions
                  </span>

                  {saved && (
                    <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-450">
                      <CheckCircle className="h-4 w-4" />
                      Changes Saved Successfully!
                    </div>
                  )}
                </div>

                <textarea
                  value={prompts[activeTab]}
                  onChange={handleTextareaChange}
                  rows={20}
                  className="w-full p-4 rounded-2xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:ring-violet-400 text-xs font-mono leading-relaxed transition-all resize-y"
                />

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-100 dark:border-zinc-800 pt-4">
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-normal max-w-sm">
                    ⚠️ Edit with caution. AI requires a specific structured JSON contract. Breaking the structure schema (keys or types) will fail Zod validation.
                  </p>

                  <div className="flex gap-3 shrink-0">
                    <button
                      onClick={handleReset}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-300 font-bold px-4 py-2.5 text-xs transition-colors"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reset to Default
                    </button>
                    <button
                      onClick={handleSave}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-750 text-white font-bold px-4 py-2.5 text-xs shadow-md shadow-violet-500/10"
                    >
                      <Save className="h-4 w-4" />
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
