import os
import json
import firebase_admin
from firebase_admin import credentials, firestore, storage
from app.config import settings, logger
from typing import Optional, List, Dict, Any

class FirestoreService:
    def __init__(self):
        self.is_mock = True
        self.db = None
        self.bucket = None
        
        # Check if Service Account JSON is provided
        cred_path = settings.firebase_service_account_json_path
        if cred_path and os.path.exists(cred_path):
            try:
                logger.info(f"Firebase Service: Initializing Admin SDK with credential {cred_path}...")
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred, {
                    'storageBucket': settings.firebase_storage_bucket
                })
                self.db = firestore.client()
                self.bucket = storage.bucket()
                self.is_mock = False
                logger.info("Firebase Service: Real Firestore and Cloud Storage initialized successfully.")
            except Exception as e:
                logger.warning(f"Firebase Service: Failed to initialize Admin SDK ({str(e)}). Falling back to Local Storage.")
        else:
            logger.info("Firebase Service: Service account path not configured or file missing. Fallback Mock DB active.")

        # Setup local file folders if running in mock mode
        if self.is_mock:
            self.local_db_path = "storage/db.json"
            self.local_files_dir = "storage/files"
            os.makedirs(self.local_files_dir, exist_ok=True)
            os.makedirs(os.path.dirname(self.local_db_path), exist_ok=True)
            if not os.path.exists(self.local_db_path):
                with open(self.local_db_path, "w") as f:
                    json.dump({"analyses": {}, "interviews": {}}, f)

    # LOCAL FILE DB HELPERS
    def _read_local_db(self) -> Dict[str, Any]:
        try:
            with open(self.local_db_path, "r") as f:
                return json.load(f)
        except Exception:
            return {"analyses": {}, "interviews": {}}

    def _write_local_db(self, data: Dict[str, Any]):
        try:
            with open(self.local_db_path, "w") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error(f"Local DB write error: {str(e)}")

    # UPLOAD RESUME PDF
    def upload_resume_pdf(self, analysis_id: str, file_name: str, content: bytes) -> str:
        """
        Uploads PDF file to Firebase Storage (or local storage fallback) and returns access path.
        """
        if self.is_mock:
            safe_name = f"{analysis_id}_{file_name}"
            local_path = os.path.join(self.local_files_dir, safe_name)
            try:
                with open(local_path, "wb") as f:
                    f.write(content)
                logger.info(f"Local Storage: Saved uploaded file to {local_path}")
                return local_path
            except Exception as e:
                logger.error(f"Local storage upload failed: {str(e)}")
                raise e
        
        try:
            blob_path = f"resumes/{analysis_id}/{file_name}"
            blob = self.bucket.blob(blob_path)
            blob.upload_from_string(content, content_type="application/pdf")
            # Generate a v4 signed URL to allow retrieval (valid for e.g. 7 days)
            url = blob.generate_signed_url(expiration=604800)
            logger.info(f"Firebase Storage: Uploaded resume to {blob_path}")
            return url
        except Exception as e:
            logger.error(f"Firebase Storage upload failed: {str(e)}", exc_info=True)
            raise e

    # SAVE ANALYSIS HISTORY
    def save_analysis(self, analysis_id: str, analysis_record: Dict[str, Any]) -> None:
        """
        Saves a resume analysis record.
        """
        if self.is_mock:
            db_data = self._read_local_db()
            db_data["analyses"][analysis_id] = analysis_record
            self._write_local_db(db_data)
            logger.info(f"Local DB: Saved analysis record {analysis_id}")
            return

        try:
            self.db.collection("analyses").document(analysis_id).set(analysis_record)
            logger.info(f"Firestore: Saved analysis record {analysis_id}")
        except Exception as e:
            logger.error(f"Firestore save_analysis failed: {str(e)}", exc_info=True)
            raise e

    # GET SINGLE ANALYSIS
    def get_analysis(self, analysis_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves a single analysis record by ID.
        """
        if self.is_mock:
            db_data = self._read_local_db()
            return db_data["analyses"].get(analysis_id)

        try:
            doc = self.db.collection("analyses").document(analysis_id).get()
            return doc.to_dict() if doc.exists else None
        except Exception as e:
            logger.error(f"Firestore get_analysis failed: {str(e)}", exc_info=True)
            raise e

    # GET ALL ANALYSES FOR A USER
    def get_user_analyses(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Retrieves all analysis history records for a user.
        """
        if self.is_mock:
            db_data = self._read_local_db()
            records = [v for v in db_data["analyses"].values() if v.get("user_id") == user_id]
            return sorted(records, key=lambda x: x.get("timestamp", 0), reverse=True)

        try:
            docs = self.db.collection("analyses").where("user_id", "==", user_id).stream()
            records = [doc.to_dict() for doc in docs]
            return sorted(records, key=lambda x: x.get("timestamp", 0), reverse=True)
        except Exception as e:
            logger.error(f"Firestore get_user_analyses failed: {str(e)}", exc_info=True)
            raise e

    # UPDATE TAILORED RESUME
    def update_tailored_resume(self, analysis_id: str, tailored_data: Dict[str, Any]) -> None:
        """
        Updates an analysis record with its tailored bullet points.
        """
        if self.is_mock:
            db_data = self._read_local_db()
            if analysis_id in db_data["analyses"]:
                db_data["analyses"][analysis_id]["tailored_resume"] = tailored_data
                self._write_local_db(db_data)
                logger.info(f"Local DB: Updated tailored resume on analysis {analysis_id}")
            return

        try:
            self.db.collection("analyses").document(analysis_id).update({
                "tailored_resume": tailored_data
            })
            logger.info(f"Firestore: Updated tailored resume on analysis {analysis_id}")
        except Exception as e:
            logger.error(f"Firestore update_tailored_resume failed: {str(e)}", exc_info=True)
            raise e

    # SAVE INTERVIEW SESSION
    def save_interview_session(self, session_id: str, session_data: Dict[str, Any]) -> None:
        """
        Saves a mock conversational interview session state.
        """
        if self.is_mock:
            db_data = self._read_local_db()
            db_data["interviews"][session_id] = session_data
            self._write_local_db(db_data)
            logger.info(f"Local DB: Saved interview session {session_id}")
            return

        try:
            self.db.collection("interviews").document(session_id).set(session_data)
            logger.info(f"Firestore: Saved interview session {session_id}")
        except Exception as e:
            logger.error(f"Firestore save_interview_session failed: {str(e)}", exc_info=True)
            raise e

    # GET INTERVIEW SESSION BY ID
    def get_interview_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves a single interview session state by ID.
        """
        if self.is_mock:
            db_data = self._read_local_db()
            return db_data["interviews"].get(session_id)

        try:
            doc = self.db.collection("interviews").document(session_id).get()
            return doc.to_dict() if doc.exists else None
        except Exception as e:
            logger.error(f"Firestore get_interview_session failed: {str(e)}", exc_info=True)
            raise e
