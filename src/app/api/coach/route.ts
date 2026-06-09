import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

// Zod Schema for Answer Evaluation
const AnswerEvaluationSchema = z.object({
  score: z.number().min(0).max(100),
  feedback: z.string(),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  modelAnswer: z.string(),
});

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Gemini API key is not configured. Please add GEMINI_API_KEY to your environment variables (e.g. in .env.local) to evaluate mock interview responses.",
      },
      { status: 412 }
    );
  }

  try {
    const { question, answer, jobDescription, customPrompt } = await request.json();

    if (!question || !answer) {
      return NextResponse.json(
        { error: "Both the interview question and the candidate's answer are required." },
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

    const defaultPrompt = `You are a strict, constructive technical and behavioral interviewer.
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

Respond ONLY with the JSON. Do not add any conversational text or formatting.`;

    const promptToUse = customPrompt
      ? customPrompt
          .replace("{{question}}", question)
          .replace("{{answer}}", answer)
          .replace("{{jobDescription}}", jobDescription || "")
      : `${defaultPrompt}\n\nJob Description:\n${jobDescription || "Not provided"}\n\nInterview Question:\n${question}\n\nCandidate's Response:\n${answer}`;

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
      console.error("Failed to parse Gemini feedback as JSON:", rawText);
      return NextResponse.json(
        { error: "AI evaluator returned invalid JSON. Please try again.", rawDetails: rawText },
        { status: 502 }
      );
    }

    // Validate using Zod
    const validation = AnswerEvaluationSchema.safeParse(jsonParsed);

    if (!validation.success) {
      console.error("Zod Answer Validation Failed:", validation.error, jsonParsed);
      return NextResponse.json(
        {
          error: "AI feedback response failed validation against Zod schema.",
          details: validation.error.format(),
        },
        { status: 502 }
      );
    }

    return NextResponse.json(validation.data);
  } catch (error: any) {
    console.error("Coach API error:", error);
    return NextResponse.json(
      { error: `An error occurred during evaluation: ${error.message || error}` },
      { status: 500 }
    );
  }
}
export const dynamic = "force-dynamic";
