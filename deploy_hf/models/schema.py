from typing import List, Optional, Literal, Union, Any
from pydantic import BaseModel, Field

class ColorPalette(BaseModel):
    primary: str = Field(..., description="Hex code of the dominant accent color")
    background: str = Field(..., description="Hex code of the document background")
    text: str = Field(..., description="Hex code of the primary text color")

class Typography(BaseModel):
    heading_font: str = Field(..., description="Font family name for headings")
    body_font: str = Field(..., description="Font family name for body text")
    body_size: int = Field(..., description="Base font size in points")

class Layout(BaseModel):
    columns: int = Field(..., ge=1, le=3)
    sidebar_position: Literal["left", "right", "none"]
    margin_global: int

class DesignTokens(BaseModel):
    theme_colors: ColorPalette
    typography: Typography
    layout: Layout

class Profile(BaseModel):
    network: Optional[str] = None
    username: Optional[str] = None
    url: Optional[str] = None

class Basics(BaseModel):
    name: str = "Your Name"
    label: str = "Job Title"
    email: str = "email@example.com"
    phone: str = ""
    summary: str = ""
    location: Union[str, dict, None] = None
    profiles: List[Profile] = []

class Work(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None # Fallback
    position: Optional[str] = None
    url: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    summary: Optional[str] = None
    highlights: List[str] = []

class Education(BaseModel):
    institution: Optional[str] = None
    area: Optional[str] = None
    studyType: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None

class Skill(BaseModel):
    name: Optional[str] = None
    level: Optional[str] = None
    keywords: List[str] = []

class ResumeData(BaseModel):
    basics: Basics
    work: List[Work] = []
    education: List[Education] = []
    skills: List[Skill] = []
    languages: Optional[List[Any]] = [] # Extra fields model might add
    references: Optional[List[Any]] = []

class AnalysisResult(BaseModel):
    design_tokens: DesignTokens
    resume_data: ResumeData
