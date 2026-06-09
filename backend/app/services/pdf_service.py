import pypdf
import io
from app.config import logger

class PDFService:
    @staticmethod
    def extract_text(file_bytes: bytes) -> str:
        """
        Extract plain text from uploaded PDF file bytes using pypdf.
        """
        try:
            logger.info("PDF Service: Extracting text from PDF upload...")
            pdf_reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            extracted_pages = []
            
            for page_num, page in enumerate(pdf_reader.pages):
                page_text = page.extract_text()
                if page_text:
                    extracted_pages.append(page_text)
                    
            full_text = "\n\n".join(extracted_pages).strip()
            logger.info(f"PDF Service: Successfully extracted {len(full_text)} characters across {len(pdf_reader.pages)} pages.")
            return full_text
        except Exception as e:
            logger.error(f"PDF Service error: {str(e)}", exc_info=True)
            raise ValueError(f"Failed to parse PDF document: {str(e)}")
