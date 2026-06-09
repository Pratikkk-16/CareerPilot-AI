import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

// Zod Schema for Resume Analysis
const ResumeAnalysisSchema = z.object({
  score: z.number().min(0).max(100),
  fitSummary: z.string(),
  matchingSkills: z.array(z.string()),
  missingSkills: z.array(
    z.object({
      name: z.string(),
      importance: z.enum(["high", "medium", "low"]),
    })
  ),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  suggestedQuestions: z.array(z.string()),
});

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Gemini API key is not configured. Please add GEMINI_API_KEY to your backend environment variables (e.g. in .env.local) to enable real AI processing.",
      },
      { status: 412 }
    );
  }

  try {
    const { resumeText, jobDescription, targetRole, customPrompt } = await request.json();

    if (!resumeText || !jobDescription) {
      return NextResponse.json(
        { error: "Both resume text and job description are required for analysis." },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const defaultPrompt = `You are an expert technical recruiter and resume coach.
Analyze the candidate's resume text against the target Job Description (and optionally the Target Role: "${targetRole || "General"}").

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

Respond ONLY with the JSON. Do not add any conversational text or formatting.`;

    const promptToUse = customPrompt 
      ? customPrompt
          .replace("{{resumeText}}", resumeText)
          .replace("{{jobDescription}}", jobDescription)
          .replace("{{targetRole}}", targetRole || "General")
      : `${defaultPrompt}\n\nCandidate Resume:\n${resumeText}\n\nJob Description:\n${jobDescription}`;

    const result = await model.generateContent(promptToUse);
    const response = await result.response;
    let rawText = response.text().trim();

    // Clean up response formatting if there are markdown wrappers
    if (rawText.startsWith("```")) {
      rawText = rawText.replace(/^```(json)?\n?/, "").replace(/\n?```$/, "").trim();
    }

    let jsonParsed;
    try {
      jsonParsed = JSON.parse(rawText);
    } catch (parseErr) {
      console.error("Failed to parse Gemini response as JSON:", rawText);
      return NextResponse.json(
        { error: "AI returned invalid JSON. Please try again.", rawDetails: rawText },
        { status: 502 }
      );
    }

    // Validate using Zod
    const validation = ResumeAnalysisSchema.safeParse(jsonParsed);

    if (!validation.success) {
      console.error("Zod Schema Validation Failed:", validation.error, jsonParsed);
      return NextResponse.json(
        {
          error: "AI response failed contract schema validation.",
          details: validation.error.format(),
        },
        { status: 502 }
      );
    }

    return NextResponse.json(validation.data);
  } catch (error: any) {
    console.error("Analyze API error:", error);
    return NextResponse.json(
      { error: `An error occurred during analysis: ${error.message || error}` },
      { status: 500 }
    );
  }
}
export const dynamic = "force-dynamic";
