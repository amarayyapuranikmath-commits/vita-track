import re
from fastapi import APIRouter, HTTPException, status
from datetime import datetime
from database import get_database
from schemas.user import SignupRequest, LoginRequest, TokenResponse
from core.security import hash_password, verify_password, create_access_token
router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/signup", status_code=201)
async def signup(body: SignupRequest):
    db = get_database()
    if await db["users"].find_one({"email": body.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    if await db["users"].find_one({"mobile": body.mobile}):
        raise HTTPException(status_code=400, detail="Mobile already registered")

    doc = {
        "full_name": body.full_name,
        "email": body.email,
        "mobile": body.mobile,
        "hashed_password": hash_password(body.password),
        "created_at": datetime.utcnow(),
        "gender": None, "age": None, "height": None,
        "weight": None, "blood_group": None,
        "target_weight": None, "daily_steps_goal": None,
        "water_goal": None, "sleep_goal": None,
        "calories_goal": None, "profile_complete": False,
    }
    result = await db["users"].insert_one(doc)
    return {"message": "Account created", "user_id": str(result.inserted_id)}

@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    db = get_database()
    identifier = body.identifier.strip()
    query = {"email": identifier} if "@" in identifier else \
            {"mobile": re.sub(r"[\s\-\(\)\+]", "", identifier)}
    user = await db["users"].find_one(query)
    if not user or not verify_password(body.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return TokenResponse(access_token=create_access_token(str(user["_id"])))