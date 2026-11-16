import os
from dotenv import load_dotenv, find_dotenv

env_path = find_dotenv(".env")
load_dotenv()

class Settings:
    APP_NAME = 'LLM-Assisted Requirements Analysis Tool'
    USE_MOCK_LLM = os.getenv('USE_MOCK_LLM', 'true').lower() == 'true'
    LLM_PROVIDER = os.getenv('LLM_PROVIDER', 'mock')
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
    DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///./data/app.db')
    CORS_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']

settings = Settings()
