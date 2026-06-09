import time
from fastapi import APIRouter, HTTPException, Form, status
from app.schemas.evaluation import AnswerEvaluationResponse
from app.services.gemini_service import GeminiService
from app.config import logger
from typing import Optional

router = APIRouter()
gemini_service = GeminiService()

@router.post("/evaluate-answer", response_model=AnswerEvaluationResponse)
async def evaluate_answer_endpoint(
    question: str = Form(..., description="The mock interview question asked"),
    answer: str = Form(..., description="The candidate's typed response"),
    job_description: Optional[str] = Form(None, description="Optional job context for rating accuracy")
):
    start_time = time.time()
    logger.info("API Route: Evaluate request received.")
    
    if not question.strip() or not answer.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both question and answer parameters must be non-empty text strings."
        )

    try:
        evaluation = gemini_service.evaluate_answer(
            question=question,
            answer=answer,
            job_description=job_description
        )
        
        duration = time.time() - start_time
        logger.info(f"API Route: Evaluation processed successfully in {duration:.2f}s.")
        return evaluation

    except ValueError as val_err:
        logger.error(f"Validation/SDK Error: {str(val_err)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )
    except Exception as e:
        logger.error(f"Evaluation endpoint failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to evaluate response answer: {str(e)}"
        )
