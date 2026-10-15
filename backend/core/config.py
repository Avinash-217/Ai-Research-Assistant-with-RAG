"""Core configuration using Pydantic Settings."""
from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_NAME: str = "AI Research Assistant with RAG"
    APP_ENV: str = "development"
    PORT: int = 8000
    HOST: str = "127.0.0.1"
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"

    # Security
    JWT_SECRET: str = "super_secret_jwt_key_research_assistant_32_chars_min"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Storage & Uploads
    MAX_UPLOAD_SIZE_MB: int = 25
    ALLOWED_EXTENSIONS: str = "pdf,docx,txt"
    UPLOAD_DIR: str = "./data/uploads"

    # Database & Vectors
    DATABASE_URL: str = "sqlite:///./data/research_assistant.db"
    CHROMA_PERSIST_DIR: str = "./data/chroma_db"

    # Embeddings
    EMBEDDING_MODEL_NAME: str = "all-MiniLM-L6-v2"
    EMBEDDING_DEVICE: str = "cpu"

    # LLM Settings
    LLM_PROVIDER: str = "fallback"  # gemini, openai, grok, ollama, fallback
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"
    GROK_API_KEY: str = ""
    GROK_MODEL: str = "grok-beta"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2"

    # Web & OCR
    WEB_SEARCH_ENABLED: bool = True
    TAVILY_API_KEY: str = ""
    OCR_ENABLED: bool = True
    TESSERACT_CMD: str = ""

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def allowed_extensions_list(self) -> List[str]:
        return [ext.strip().lower() for ext in self.ALLOWED_EXTENSIONS.split(",") if ext.strip()]


@lru_cache()
def get_settings() -> Settings:
    return Settings()
