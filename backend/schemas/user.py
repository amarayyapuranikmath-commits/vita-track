from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
import re

class SignupRequest(BaseModel):
    full_name: str
    email: EmailStr
    mobile: str
    password: str

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v):
        cleaned = re.sub(r"[\s\-\(\)\+]", "", v)
        if not re.fullmatch(r"\d{7,15}", cleaned):
            raise ValueError("Invalid mobile number")
        return cleaned

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("full_name")
    @classmethod
    def validate_name(cls, v):
        if len(v.strip()) < 2:
            raise ValueError("Full name is too short")
        return v.strip()

class LoginRequest(BaseModel):
    identifier: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserPublic(BaseModel):
    full_name: str
    email: str
    mobile: str
    gender: Optional[str] = None
    age: Optional[int] = None
    height: Optional[str] = None
    weight: Optional[str] = None
    blood_group: Optional[str] = None
    target_weight: Optional[str] = None
    daily_steps_goal: Optional[int] = None
    water_goal: Optional[str] = None
    sleep_goal: Optional[str] = None
    calories_goal: Optional[int] = None
    protein_goal: Optional[int] = None   # ADD THIS
    profile_complete: bool = False


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    mobile: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    height: Optional[str] = None
    weight: Optional[str] = None
    blood_group: Optional[str] = None
    target_weight: Optional[str] = None
    daily_steps_goal: Optional[int] = None
    water_goal: Optional[str] = None
    sleep_goal: Optional[str] = None
    calories_goal: Optional[int] = None
    protein_goal: Optional[int] = None
    profile_complete: bool = False
