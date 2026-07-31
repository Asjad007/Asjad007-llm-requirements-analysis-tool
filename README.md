# LLM-Assisted Requirements Analysis Tool

An MSc Software Engineering research prototype for structured analysis of
natural-language software requirements. The application supports project-based
requirement input, PDF/DOCX extraction, requirement classification,
prioritisation, ambiguity identification, draft acceptance criteria and test
cases, review decisions, traceability, and evaluation reporting.

The tool is decision support. Generated analysis is not treated as verified
requirements-engineering evidence until it has been reviewed.

## Technology

- Frontend: React and Vite
- Backend: Python, FastAPI, and SQLAlchemy
- Database: SQLite
- Analysis: deterministic mock service or OpenAI API
- Document extraction: pdfplumber and python-docx

Gemini integration is not implemented. The configuration and runtime analysis
path currently support mock mode and OpenAI.

## Repository structure

```text
backend/
  app/       FastAPI routes, services, schemas, models, and startup logic
  data/      Tracked evaluation database
  scripts/   Dataset, analysis, simulated-validation, and summary utilities
frontend/
  src/       React pages, components, services, styles, and utilities
docs/        Architecture, requirements, and progress documentation
diagrams/    Architecture workflow source
```

`backend/data/app.db` is intentionally tracked as dissertation evaluation
evidence. Local databases, journals, build output, virtual environments, logs,
and secrets are excluded by `.gitignore`.

## Prerequisites

- Python 3.11
- Node.js 18 or later
- npm
- An OpenAI API key only when running provider-backed analysis

## Backend setup

From the project root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python -m uvicorn app.main:app --reload
```

The API runs at `http://127.0.0.1:8000`; Swagger documentation is available at
`http://127.0.0.1:8000/docs`.

On macOS or Linux, activate the environment with:

```bash
source .venv/bin/activate
```

## Environment configuration

The backend reads `backend/.env`. The submission template defaults to mock
analysis:

```env
USE_MOCK_LLM=true
LLM_PROVIDER=mock
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
DATABASE_URL=sqlite:///./data/app.db
```

For OpenAI-backed analysis:

```env
USE_MOCK_LLM=false
LLM_PROVIDER=openai
OPENAI_API_KEY=your-key
OPENAI_MODEL=gpt-4o-mini
```


## Frontend setup

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`. API base URLs are defined in
`frontend/src/services/api.js`; ensure the local backend is selected when
validating local database contents.

## Application workflow

```text
Project context
  -> manual input or PDF/DOCX extraction
  -> editable requirement preview
  -> mock or OpenAI analysis
  -> requirement and analysis persistence
  -> accept, modify, or reject review
  -> review persistence
  -> history, evaluation metrics, and report views
```

## Evaluation utilities

Run scripts from `backend` with the backend environment activated:

```powershell
python scripts/seed_large_evaluation_dataset.py
python scripts/run_large_scale_analysis.py
python scripts/auto_validate_results.py
python scripts/generate_domain_evaluation_summary.py
```

These commands are not part of normal application startup:

- `seed_large_evaluation_dataset.py` inserts the synthetic project and
  requirement records.
- `run_large_scale_analysis.py` analyses requirements that do not yet have an
  AnalysisResult.
- `auto_validate_results.py` creates rule-based simulated review states for
  metric-pipeline testing. Its decisions are not human review evidence.
- `generate_domain_evaluation_summary.py` prints a read-only summary of stored
  results.

The first three scripts modify the configured database. Do not run them against
the tracked evaluation database unless regeneration is intentional. Work on a
copy when reproducing the procedure.

## Main API groups

- `/api/projects`
- `/api/analysis`
- `/api/history`
- `/api/reference-dataset`

Health endpoints are available at `/` and `/health`.

## Important limitations

- This is a research prototype, not a production requirements-management
  system.
- The repository has no automated backend or frontend test suite.
- SQLite and manual startup schema upgrades are used instead of a production
  database and versioned migration framework.
- Authentication, role-based access control, multi-reviewer identity, load
  testing, concurrency testing, and penetration testing are not implemented.
- The included evaluation requirements are synthetic and do not establish
  industrial generalisability.
- Stored model confidence is not calibrated accuracy.
- Provider output can vary with model version, prompt wording, and service
  behaviour.
- The tracked 250-record evaluation contains simulated review decisions; it
  does not demonstrate that all records were independently reviewed by humans.
