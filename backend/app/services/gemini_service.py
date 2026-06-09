import json
import re
import time
import google.generativeai as genai
from app.config import settings, logger
from app.schemas.analysis import ResumeAnalysisResponse
from app.schemas.tailoring import ResumeTailoringResponse
from app.schemas.evaluation import AnswerEvaluationResponse
from app.schemas.interview import InterviewSessionState, InterviewMessage
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from pydantic import BaseModel, Field
from typing import Optional, List

# Combined model for dynamic interview responses
class GeminiInterviewResponse(BaseModel):
    evaluation: AnswerEvaluationResponse = Field(description="Strict evaluation of the candidate's active response")
    next_question: Optional[str] = Field(None, description="The adapted dynamic follow-up question. Return None if completed is True.")
    completed: bool = Field(False, description="Set to True if the interview should wrap up (e.g. after 5 questions or a formal conclusion)")

class GeminiService:
    def __init__(self):
        if settings.gemini_api_key:
            genai.configure(api_key=settings.gemini_api_key)
            self.model = genai.GenerativeModel("gemini-2.5-flash")
            logger.info("Gemini Service: SDK initialized with model gemini-2.5-flash")
        else:
            self.model = None
            logger.warning("Gemini Service: Missing API key. Calls will fail.")

    @retry(
        reraise=True,
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(Exception)
    )
    def _call_gemini_api(self, prompt: str, schema_class):
        """
        Internal wrapper executing call with structured JSON schemas and tenacity retries.
        """
        if not self.model:
            raise ValueError("Gemini model is not configured. Please set GEMINI_API_KEY.")
            
        start_time = time.time()
        logger.info(f"Gemini Service: Sending structured request for schema {schema_class.__name__}...")
        
        try:
            response = self.model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    response_schema=schema_class,
                )
            )
            duration = time.time() - start_time
            logger.info(f"Gemini Service: Response received in {duration:.2f}s.")
            
            # Clean up response string
            text_response = response.text.strip()
            if text_response.startswith("```"):
                text_response = re.sub(r"^```(?:json)?\n?", "", text_response)
                text_response = re.sub(r"\n?```$", "", text_response).strip()
                
            return text_response
        except Exception as e:
            logger.error(f"Gemini Service call failed: {str(e)}", exc_info=True)
            raise e

    def analyze_resume(self, resume_text: str, job_description: str, target_role: Optional[str] = None) -> ResumeAnalysisResponse:
        """
        Grades resume text against a job description.
        """
        prompt = f"""You are an expert technical recruiter and resume reviewer.
Analyze the candidate's resume text against the target Job Description (Target Role: "{target_role or 'General'}"):

Candidate Resume:
{resume_text}

Job Description:
{job_description}

You must evaluate their match score (0-100), identify missing key skills, summarize strengths, write suggestions, and generate exactly 5 starter interview questions testing the candidate on their skills gap.
"""
        raw_json = self._call_gemini_api(prompt, ResumeAnalysisResponse)
        return ResumeAnalysisResponse.model_validate_json(raw_json)

    def tailor_resume(self, resume_text: str, job_description: str, target_role: Optional[str] = None) -> ResumeTailoringResponse:
        """
        Rewrites resume summary and accomplishments tailored to a job description.
        """
        prompt = f"""You are an expert resume writer and technical editor.
Optimize the candidate's resume to align with the target Job Description (Target Role: "{target_role or 'General'}"):

Candidate Resume:
{resume_text}

Job Description:
{job_description}

Provide a tailored summary statement and rewrite accomplishments/bullet points to focus on relevant keywords, impact, and achievements.
"""
        raw_json = self._call_gemini_api(prompt, ResumeTailoringResponse)
        return ResumeTailoringResponse.model_validate_json(raw_json)

    def evaluate_answer(self, question: str, answer: str, job_description: Optional[str] = None) -> AnswerEvaluationResponse:
        """
        Critiques a mock interview response.
        """
        prompt = f"""You are a strict, constructive technical and behavioral mock interviewer.
Evaluate the candidate's response to the given question, taking into account the Job Description context:

Job Description:
{job_description or "Not provided"}

Interview Question:
{question}

Candidate's Answer:
{answer}

Critique clarity, technical correctness, communication rating, and write a model response.
"""
        raw_json = self._call_gemini_api(prompt, AnswerEvaluationResponse)
        return AnswerEvaluationResponse.model_validate_json(raw_json)

    def generate_first_question(self, resume_text: str, job_description: str, interview_type: str) -> str:
        """
        Generates the first question of a mock interview.
        """
        prompt = f"""You are a recruiter conducting a mock interview for this role:
Job Description:
{job_description}

Candidate Resume:
{resume_text}

Interview style: {interview_type}

Write the opening question for the candidate, addressing them professionally. Start directly with the question.
"""
        # Returns simple text
        if not self.model:
            raise ValueError("Gemini model is not configured.")
        response = self.model.generate_content(prompt)
        return response.text.strip()

    def respond_to_interview(self, session: InterviewSessionState, candidate_answer: str) -> GeminiInterviewResponse:
        """
        Evaluates the candidate's response and dynamically generates the next follow-up question.
        """
        # Build chat history string
        history_str = ""
        for msg in session.messages:
            history_str += f"{msg.role.upper()}: {msg.text}\n"
            
        prompt = f"""You are a mock interviewer conducting an interactive conversational mock interview.
Review the candidate's response in the context of the Job Description and Resume:

Job Description:
{session.job_description}

Candidate Resume Context:
{session.resume_text}

Interview Type: {session.interview_type}
Question Count so far: {session.question_count} of 5

Conversation History:
{history_str}
INTERVIEWER CURRENT QUESTION: {session.current_question}
CANDIDATE ACTIVE RESPONSE: {candidate_answer}

Tasks:
1. Constructively critique and evaluate CANDIDATE ACTIVE RESPONSE (grades score, rating, strengths, weaknesses, model answer).
2. Write the next logical follow-up question based on their answer and the conversation context.
3. If they have reached the limit (question_count >= 5) or said goodbye/indicated exit, mark completed as True and leave next_question as None.
"""
        raw_json = self._call_gemini_api(prompt, GeminiInterviewResponse)
        return GeminiInterviewResponse.model_validate_json(raw_json)
