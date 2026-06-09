import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

// Zod Schema for Resume Tailoring
const ResumeTailoringSchema = z.object({
  optimizedSummary: z.string(),
  bulletPoints: z.array(
    z.object({
      original: z.string(),
      optimized: z.string(),
      rationale: z.string(),
    })
  ),
});

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Gemini API key is not configured. Please add GEMINI_API_KEY to your environment variables to tail-optimize resume bullet points.",
      },
      { status: 412 }
    );
  }

  try {
    const { resumeText, jobDescription, targetRole, customPrompt } = await request.json();

    if (!resumeText || !jobDescription) {
      return NextResponse.json(
        { error: "Both resume text and job description are required for optimization." },
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

    const defaultPrompt = `You are an expert resume writer and technical editor.
Your task is to take the candidate's resume text and rewrite it so it is highly optimized for the target Job Description (Target Role: "${targetRole || "General"}").

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
      console.error("Failed to parse Gemini tailoring response as JSON:", rawText);
      return NextResponse.json(
        { error: "AI optimizer returned invalid JSON. Please try again.", rawDetails: rawText },
        { status: 502 }
      );
    }

    // Validate using Zod
    const validation = ResumeTailoringSchema.safeParse(jsonParsed);

    if (!validation.success) {
      console.error("Zod Tailoring Validation Failed:", validation.error, jsonParsed);
      return NextResponse.json(
        {
          error: "AI response failed contract schema validation for tailoring.",
          details: validation.error.format(),
        },
        { status: 502 }
      );
    }

    return NextResponse.json(validation.data);
  } catch (error: any) {
    console.error("Optimize API error:", error);
    return NextResponse.json(
      { error: `An error occurred during resume optimization: ${error.message || error}` },
      { status: 500 }
    );
  }
}
export const dynamic = "force-dynamic";
