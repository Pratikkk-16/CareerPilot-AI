from pydantic import BaseModel, Field
from typing import List

class TailoredBullet(BaseModel):
    original: str = Field(description="Original resume bullet point")
    optimized: str = Field(description="Rewritten bullet point targeting job requirements and highlighting impact")
    rationale: str = Field(description="Explanation of how this change aligns with the job description")

class ResumeTailoringResponse(BaseModel):
    optimized_summary: str = Field(description="Optimized professional summary statement tailored for the role")
    bullet_points: List[TailoredBullet] = Field(description="Comparisons of original and optimized accomplishments")
