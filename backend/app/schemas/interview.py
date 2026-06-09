from pydantic import BaseModel, Field
from typing import List, Optional
from app.schemas.evaluation import AnswerEvaluationResponse

class InterviewMessage(BaseModel):
    role: str = Field(description="Must be either 'interviewer' or 'candidate'")
    text: str

class InterviewStartRequest(BaseModel):
    analysis_id: str = Field(description="Reference ID of the scanned resume analysis")
    user_id: str = Field(description="ID of the authenticated user")
    interview_type: str = Field(default="Technical & Behavioral", description="E.g., Technical, Behavioral, System Design")

class InterviewStartResponse(BaseModel):
    session_id: str
    first_question: str

class InterviewRespondRequest(BaseModel):
    session_id: str
    candidate_answer: str

class InterviewRespondResponse(BaseModel):
    evaluation: AnswerEvaluationResponse = Field(description="Evaluation details of the candidate's response")
    next_question: Optional[str] = Field(None, description="The adapted dynamic follow-up question, or null if complete")
    completed: bool = Field(default=False, description="True if the interview has reached its limit and is finished")

class InterviewSessionState(BaseModel):
    session_id: str
    analysis_id: str
    user_id: str
    interview_type: str
    job_description: str
    resume_text: str
    messages: List[InterviewMessage] = []
    current_question: str
    question_count: int = 1
    completed: bool = False
