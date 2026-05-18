from pydantic_settings import BaseSettings
from dotenv import load_dotenv

from typing import Optional

load_dotenv()


class Settings(BaseSettings):
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "vitatrack"
    SECRET_KEY: str = "vitatrack_super_secret_key_2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    GROQ_API_KEY: Optional[str] = None

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()