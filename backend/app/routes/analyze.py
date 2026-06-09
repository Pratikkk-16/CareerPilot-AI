import time
import uuid
from fastapi import APIRouter, File, UploadFile, Form, HTTPException, status
from app.schemas.analysis import ResumeAnalysisResponse
from app.services.pdf_service import PDFService
from app.services.gemini_service import GeminiService
from app.services.firestore_service import FirestoreService
from app.config import logger
from typing import Optional

router = APIRouter()
gemini_service = GeminiService()
firestore_service = FirestoreService()

@router.post("/analyze", response_model=ResumeAnalysisResponse)
async def analyze_resume_endpoint(
    user_id: str = Form(..., description="ID of the authenticated user"),
    job_description: str = Form(..., description="The target position requirements"),
    target_role: Optional[str] = Form(None, description="E.g., Software Engineer"),
    file: UploadFile = File(..., description="PDF Resume file")
):
    # Performance timer start
    start_time = time.time()
    
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file extension. Only PDF resumes are supported."
        )

    try:
        # 1. Read file bytes
        file_bytes = await file.read()
        
        # 2. Extract plain text
        resume_text = PDFService.extract_text(file_bytes)
        if not resume_text.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Successfully parsed PDF, but no text content was found. Is it a scanned image?"
            )
            
        # 3. Call Gemini API for structured evaluation
        analysis_result = gemini_service.analyze_resume(
            resume_text=resume_text,
            job_description=job_description,
            target_role=target_role
        )
        
        # 4. Generate record identifiers
        analysis_id = f"analysis_{uuid.uuid4().hex[:12]}"
        
        # 5. Upload file bytes to cloud storage (or fallback)
        pdf_storage_path = firestore_service.upload_resume_pdf(
            analysis_id=analysis_id,
            file_name=file.filename,
            content=file_bytes
        )
        
        # 6. Save data logs in firestore history (or fallback)
        record = {
            "id": analysis_id,
            "user_id": user_id,
            "timestamp": int(time.time() * 1000),
            "file_name": file.filename,
            "target_role": target_role or "General Application",
            "job_description": job_description,
            "resume_text": resume_text,
            "pdf_url": pdf_storage_path,
            "analysis": analysis_result.model_dump()
        }
        
        firestore_service.save_analysis(analysis_id, record)
        
        duration = time.time() - start_time
        logger.info(f"API Route: Analysis completed successfully in {duration:.2f}s for user {user_id}.")
        return analysis_result

    except ValueError as val_err:
        logger.error(f"Value/SDK Error: {str(val_err)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )
    except Exception as e:
        logger.error(f"Internal processing error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process and analyze resume: {str(e)}"
        )
