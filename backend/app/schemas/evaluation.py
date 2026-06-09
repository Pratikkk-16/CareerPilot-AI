from pydantic import BaseModel, Field
from typing import List

class AnswerEvaluationResponse(BaseModel):
    score: int = Field(..., ge=0, le=100, description="Answer score out of 100")
    communication_rating: str = Field(description="Critique rating of communication clarity, STAR formatting, etc.")
    technical_accuracy_rating: str = Field(description="Critique rating of technical conceptual accuracy")
    feedback: str = Field(description="Constructive evaluation summary of candidate's response")
    strengths: List[str] = Field(description="What the candidate answered correctly or highlighted well")
    improvements: List[str] = Field(description="What was missing or could be phrased better")
    suggested_model_answer: str = Field(description="An exemplar model response to this question")
