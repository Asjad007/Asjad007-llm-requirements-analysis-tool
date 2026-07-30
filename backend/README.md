# FastAPI backend

## Setup

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python -m uvicorn app.main:app --reload
```

API documentation: `http://127.0.0.1:8000/docs`

## Main endpoint groups

- `GET /`
- `GET /health`
- `/api/projects`
- `/api/analysis`
- `/api/history`
- `/api/reference-dataset`

Review submission is handled by
`POST /api/analysis/review/{analysis_id}`.

See the repository README for environment settings, mock/OpenAI behaviour,
evaluation scripts, and project limitations.
