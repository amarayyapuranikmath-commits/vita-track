# Backend update for deployment
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import traceback

from database import connect_db, close_db
from routes.auth import router as auth_router
from routes.users import router as users_router
from routes.logs import router as logs_router
from routes.reminders import router as reminders_router
from routes.ai import router as ai_router
from routes.dashboard import router as dashboard_router          # ← NEW


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()


app = FastAPI(title="VitaTrack API", lifespan=lifespan)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    traceback.print_exc()
    return JSONResponse(status_code=500, content={"detail": str(exc)})


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(logs_router)
app.include_router(reminders_router)
app.include_router(ai_router)
app.include_router(dashboard_router)                             # ← NEW


@app.get("/")
def root():
    return {"message": "VitaTrack API running ✅"}