import time
from fastapi import APIRouter, HTTPException, Form, status
from app.schemas.tailoring import ResumeTailoringResponse
from app.services.gemini_service import GeminiService
from app.services.firestore_service import FirestoreService
from app.config import logger

router = APIRouter()
gemini_service = GeminiService()
firestore_service = FirestoreService()

@router.post("/tailor", response_model=ResumeTailoringResponse)
async def tailor_resume_endpoint(
    analysis_id: str = Form(..., description="The ID of the resume scan analysis to tailor"),
    user_id: str = Form(..., description="ID of the authenticated user")
):
    start_time = time.time()
    logger.info(f"API Route: Tailor request received for analysis {analysis_id} by user {user_id}.")

    try:
        # 1. Fetch analysis details from Firestore (or fallback)
        record = firestore_service.get_analysis(analysis_id)
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Resume analysis record '{analysis_id}' not found."
            )

        # 2. Check user ownership
        if record.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access Denied. You do not own this resume record."
            )

        # 3. Pull contents
        resume_text = record.get("resume_text", "")
        job_description = record.get("job_description", "")
        target_role = record.get("target_role", "General Application")

        if not resume_text or not job_description:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Resume text or Job Description is missing from the record."
            )

        # 4. Invoke Gemini Service to tailor bullets
        tailoring_result = gemini_service.tailor_resume(
            resume_text=resume_text,
            job_description=job_description,
            target_role=target_role
        )

        # 5. Save tailored resume updates to DB
        firestore_service.update_tailored_resume(analysis_id, tailoring_result.model_dump())

        duration = time.time() - start_time
        logger.info(f"API Route: Tailoring completed in {duration:.2f}s.")
        return tailoring_result

    except HTTPException as http_err:
        raise http_err
    except Exception as e:
        logger.error(f"Tailoring endpoint failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to tailor resume: {str(e)}"
        )
