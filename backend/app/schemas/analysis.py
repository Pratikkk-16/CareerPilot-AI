from pydantic import BaseModel, Field
from typing import List

class InterviewQuestions(BaseModel):
    technical: List[str] = Field(description="List of technical questions testing skills gap areas")
    behavioral: List[str] = Field(description="List of behavioral questions targeting experience fit")
    hr: List[str] = Field(description="List of standard HR/cultural fit questions")

class ResumeAnalysisResponse(BaseModel):
    match_score: int = Field(..., ge=0, le=100, description="Match score from 0 to 100")
    strengths: List[str] = Field(description="Key strengths matching the Job Description")
    missing_skills: List[str] = Field(description="Missing keywords or capabilities from the Job Description")
    suggestions: List[str] = Field(description="Actionable suggestions for CV improvement")
    interview_questions: InterviewQuestions = Field(description="Simulated mock questions categorized by type")
