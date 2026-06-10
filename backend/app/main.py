from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import Base, engine
from .routes import analysis, history

Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.APP_NAME, description='MVP backend for LLM-assisted requirements analysis with human-in-the-loop validation.', version='0.1.0')
app.add_middleware(CORSMiddleware, allow_origins=settings.CORS_ORIGINS, allow_credentials=True, allow_methods=['*'], allow_headers=['*'])
app.include_router(analysis.router)
app.include_router(history.router)

@app.get('/')
def root():
    return {'message': 'LLM-Assisted Requirements Analysis Tool API', 'status': 'running', 'docs': '/docs'}

@app.get('/health')
def health():
    return {'status': 'healthy'}
