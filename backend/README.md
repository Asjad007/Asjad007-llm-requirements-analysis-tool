# Backend - FastAPI

## Run

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API docs: `http://127.0.0.1:8000/docs`

## Main Endpoints

- `GET /`
- `GET /health`
- `POST /api/analysis/analyse`
- `POST /api/review/{analysis_id}`
- `GET /api/history`
- `GET /api/history/{analysis_id}`
- `DELETE /api/history/{analysis_id}`
