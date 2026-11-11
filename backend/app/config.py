import os
from pathlib import Path
from dataclasses import dataclass, field

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
BACKUP_DIR = DATA_DIR / "backups"

DATA_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
BACKUP_DIR.mkdir(parents=True, exist_ok=True)

@dataclass
class Settings:
    PROJECT_NAME: str = "Employee Management & HR Portal"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Database
    DATABASE_PATH: Path = field(default_factory=lambda: Path(os.getenv("DATABASE_PATH", str(DATA_DIR / "hrportal.db"))))
    
    @property
    def DATABASE_URL(self) -> str:
        # SQLite URL with forward slashes for cross-platform compatibility
        db_path = self.DATABASE_PATH.resolve().as_posix()
        return f"sqlite:///{db_path}"
    
    # JWT & Auth
    SECRET_KEY: str = os.getenv("SECRET_KEY", "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    COOKIE_NAME: str = "hrportal_access_token"
    
    # File limits
    MAX_UPLOAD_SIZE_MB: int = 10
    ALLOWED_EXTENSIONS: set = field(default_factory=lambda: {".pdf", ".png", ".jpg", ".jpeg", ".webp"})
    
    # CORS
    CORS_ORIGINS: list = field(default_factory=lambda: [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ])

settings = Settings()
