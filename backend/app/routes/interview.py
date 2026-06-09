import time
import uuid
from fastapi import APIRouter, HTTPException, Form, status, Body
from app.schemas.interview import (
    InterviewStartRequest,
    InterviewStartResponse,
    InterviewRespondRequest,
    InterviewRespondResponse,
    InterviewSessionState,
    InterviewMessage
)
from app.services.gemini_service import GeminiService
from app.services.firestore_service import FirestoreService
from app.config import logger

router = APIRouter()
gemini_service = GeminiService()
firestore_service = FirestoreService()

@router.post("/interview/start", response_model=InterviewStartResponse)
async def start_interview_endpoint(
    request: InterviewStartRequest = Body(...)
):
    start_time = time.time()
    logger.info(f"API Route: Start interview session for analysis {request.analysis_id}")

    try:
        # 1. Fetch scanned resume details from DB
        record = firestore_service.get_analysis(request.analysis_id)
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Associated resume analysis record '{request.analysis_id}' not found."
            )

        # 2. Check ownership
        if record.get("user_id") != request.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access Denied. You do not own this scanned resume record."
            )

        resume_text = record.get("resume_text", "")
        job_description = record.get("job_description", "")
        if not resume_text or not job_description:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Resume text or Job Description is missing from the record."
            )

        # 3. Request Gemini to formulate the first question
        first_question = gemini_service.generate_first_question(
            resume_text=resume_text,
            job_description=job_description,
            interview_type=request.interview_type
        )

        session_id = f"session_{uuid.uuid4().hex[:12]}"

        # 4. Initialize session state in DB
        initial_session = {
            "session_id": session_id,
            "analysis_id": request.analysis_id,
            "user_id": request.user_id,
            "interview_type": request.interview_type,
            "job_description": job_description,
            "resume_text": resume_text,
            "messages": [
                {"role": "interviewer", "text": first_question}
            ],
            "current_question": first_question,
            "question_count": 1,
            "completed": False
        }

        firestore_service.save_interview_session(session_id, initial_session)

        duration = time.time() - start_time
        logger.info(f"API Route: Interview started successfully in {duration:.2f}s. Session ID: {session_id}")
        
        return InterviewStartResponse(
            session_id=session_id,
            first_question=first_question
        )

    except HTTPException as http_err:
        raise http_err
    except Exception as e:
        logger.error(f"Failed to start interview: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while starting the mock interview: {str(e)}"
        )


@router.post("/interview/respond", response_model=InterviewRespondResponse)
async def respond_interview_endpoint(
    request: InterviewRespondRequest = Body(...)
):
    start_time = time.time()
    logger.info(f"API Route: Respond request received for session {request.session_id}")

    try:
        # 1. Fetch active session state from DB
        session_data = firestore_service.get_interview_session(request.session_id)
        if not session_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Interview session '{request.session_id}' not found."
            )

        session = InterviewSessionState.model_validate(session_data)

        if session.completed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This mock interview session is already complete and closed."
            )

        # 2. Append candidate's answer to messages
        session.messages.append(InterviewMessage(role="candidate", text=request.candidate_answer))

        # 3. Call Gemini dynamic response system to get answer critique AND next question
        gemini_response = gemini_service.respond_to_interview(
            session=session,
            candidate_answer=request.candidate_answer
        )

        # 4. Update session details based on AI response
        session.completed = gemini_response.completed
        
        if not gemini_response.completed and gemini_response.next_question:
            session.messages.append(InterviewMessage(role="interviewer", text=gemini_response.next_question))
            session.current_question = gemini_response.next_question
            session.question_count += 1
        else:
            session.completed = True

        # Save state update back to DB
        firestore_service.save_interview_session(session.session_id, session.model_dump())

        duration = time.time() - start_time
        logger.info(f"API Route: Processed answer in {duration:.2f}s. Next question generated: {bool(gemini_response.next_question)}")

        return InterviewRespondResponse(
            evaluation=gemini_response.evaluation,
            next_question=gemini_response.next_question,
            completed=session.completed
        )

    except HTTPException as http_err:
        raise http_err
    except Exception as e:
        logger.error(f"Dynamic respond failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process answer and generate follow-up: {str(e)}"
        )
