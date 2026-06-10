# LLM-Assisted Requirements Analysis Tool

A full-stack MSc Software Engineering MVP prototype for requirements analysis. The system supports requirement classification, ambiguity identification, prioritisation, acceptance criteria generation, test case generation, and human-in-the-loop review.

## Current MVP Features

- React frontend for requirement input and result review.
- FastAPI backend with REST API endpoints.
- SQLite storage for requirements, analysis results, and review decisions.
- Mock LLM analysis service so the MVP runs without an API key.
- Optional real LLM integration placeholder via environment variables.
- Human validation workflow: Accept, Modify, or Reject generated outputs.
- History page for reviewed outputs.
- Documentation for architecture, requirements, and weekly progress.

## Tech Stack

- Frontend: React + Vite
- Backend: Python + FastAPI
- Database: SQLite
- API Testing: Postman or FastAPI Swagger UI
- Version Control: Git/GitHub

## Quick Start

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend: `http://127.0.0.1:8000`
Swagger Docs: `http://127.0.0.1:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:5173`

## MVP Workflow

```text
User Input -> React Frontend -> FastAPI Backend -> Input Validation -> Requirement Pre-processing -> Mock LLM / LLM Service -> Structured Result Generation -> User Review -> Accept / Modify / Reject -> SQLite Storage -> History / Evaluation
```

## Suggested Git Commit History

```text
Initial project setup and documentation
Add FastAPI backend boilerplate
Add SQLite models and schemas
Add mock LLM requirements analysis service
Add analysis and review API endpoints
Add React frontend boilerplate
Add requirement input and result review components
Add history page and API integration
Add architecture and weekly progress documentation
```
