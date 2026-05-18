from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    MONGODB_URL: str
    DATABASE_NAME: str = "vitatrackk"
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    GROQ_API_KEY: str                         # ← added this line

    class Config:
        env_file = ".env"


settings = Settings()