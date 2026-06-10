# Architecture Document

## Architecture Overview

The MVP follows a three-layer web architecture:

1. Presentation Layer: React frontend
2. Application Layer: FastAPI backend
3. Data Layer: SQLite database

## Human-in-the-Loop Workflow

```text
Requirements Input -> Input Validation -> Requirement Pre-processing -> LLM / Mock Analysis Service -> Structured Result Generation -> User Review -> Accept / Modify / Reject -> SQLite Storage -> History and Evaluation
```

## MVP Demonstration Script

1. Start the backend.
2. Start the frontend.
3. Enter a sample requirement.
4. Click Analyse Requirement.
5. Review generated classification, ambiguity warning, priority, acceptance criteria and test case.
6. Accept, modify or reject output.
7. Open History page and show stored result.
