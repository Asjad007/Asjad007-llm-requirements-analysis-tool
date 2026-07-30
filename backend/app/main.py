from sqlalchemy import inspect, text

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import Base, engine
from .routes import analysis, history, projects, reference_dataset
from app.startup import seed_database


Base.metadata.create_all(bind=engine)


def ensure_user_review_columns():
    inspector = inspect(engine)

    if "user_reviews" not in inspector.get_table_names():
        return

    existing_columns = {
        column["name"]
        for column in inspector.get_columns("user_reviews")
    }

    required_columns = {
        "requirement_id": "INTEGER",
        "refined_analysis_result_id": "INTEGER",
        "final_refined_requirement": "TEXT",
        "final_type": "VARCHAR(100)",
        "final_priority": "VARCHAR(100)",
        "final_ambiguity_status": "VARCHAR(100)",
        "final_acceptance_criteria": "TEXT",
        "final_test_cases": "TEXT",
        "field_level_decisions": "TEXT",
        "reviewer_notes": "TEXT",
        "rejection_reason": "TEXT",
        "created_at": "DATETIME",
        "updated_at": "DATETIME",
    }

    with engine.begin() as connection:

        for column_name, column_type in required_columns.items():

            if column_name not in existing_columns:

                connection.execute(
                    text(
                        f"""
                        ALTER TABLE user_reviews
                        ADD COLUMN {column_name} {column_type}
                        """
                    )
                )


        if "created_at" not in existing_columns:

            connection.execute(
                text(
                    """
                    UPDATE user_reviews
                    SET created_at = reviewed_at
                    WHERE created_at IS NULL
                    """
                )
            )


        if "updated_at" not in existing_columns:

            connection.execute(
                text(
                    """
                    UPDATE user_reviews
                    SET updated_at = reviewed_at
                    WHERE updated_at IS NULL
                    """
                )
            )


        connection.execute(
            text(
                """
                UPDATE user_reviews

                SET requirement_id = (
                    SELECT analysis_results.requirement_id
                    FROM analysis_results
                    WHERE analysis_results.id =
                    user_reviews.analysis_result_id
                )

                WHERE requirement_id IS NULL
                """
            )
        )



def ensure_project_tables_and_requirement_columns():

    inspector = inspect(engine)

    tables = set(
        inspector.get_table_names()
    )


    if "requirements" in tables:

        columns = {
            column["name"]
            for column in inspector.get_columns(
                "requirements"
            )
        }


        if "project_id" not in columns:

            with engine.begin() as connection:

                connection.execute(
                    text(
                        """
                        ALTER TABLE requirements
                        ADD COLUMN project_id INTEGER
                        """
                    )
                )



def ensure_reference_dataset_table():

    inspector = inspect(engine)

    tables = set(
        inspector.get_table_names()
    )


    if "reference_requirements" in tables:

        columns = {
            column["name"]
            for column in inspector.get_columns(
                "reference_requirements"
            )
        }


        required_columns = {

            "project_id": "INTEGER",
            "requirement_id": "INTEGER",
            "original_requirement_text": "TEXT",
            "reference_type": "VARCHAR(100)",
            "reference_priority": "VARCHAR(100)",
            "reference_ambiguity_status": "VARCHAR(100)",
            "reference_acceptance_criteria": "TEXT",
            "reference_test_cases": "TEXT",
            "reference_notes": "TEXT",
            "created_at": "DATETIME",
            "updated_at": "DATETIME",
        }


        with engine.begin() as connection:

            for column_name, column_type in required_columns.items():

                if column_name not in columns:

                    connection.execute(
                        text(
                            f"""
                            ALTER TABLE reference_requirements
                            ADD COLUMN {column_name} {column_type}
                            """
                        )
                    )

        return



    with engine.begin() as connection:

        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS reference_requirements (

                    id INTEGER PRIMARY KEY,

                    project_id INTEGER,

                    requirement_id INTEGER,

                    original_requirement_text TEXT NOT NULL,

                    reference_type VARCHAR(100),

                    reference_priority VARCHAR(100),

                    reference_ambiguity_status VARCHAR(100),

                    reference_acceptance_criteria TEXT,

                    reference_test_cases TEXT,

                    reference_notes TEXT,

                    created_at DATETIME,

                    updated_at DATETIME

                )
                """
            )
        )



ensure_user_review_columns()
ensure_project_tables_and_requirement_columns()
ensure_reference_dataset_table()

app = FastAPI(

    title=settings.APP_NAME,

    description=(
        "LLM-assisted Requirements Engineering platform "
        "with human-in-the-loop validation."
    ),

    version="1.0.0"

)



app.add_middleware(

    CORSMiddleware,

    allow_origins=settings.CORS_ORIGINS,

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],

)



@app.on_event("startup")
def startup_event():

    """
    Render deployment startup.

    If database is empty:
    - create evaluation projects
    - create requirements
    - prepare demo environment
    """

    seed_database()



app.include_router(
    analysis.router
)

app.include_router(
    history.router
)

app.include_router(
    projects.router
)

app.include_router(
    reference_dataset.router
)



@app.get("/")
def root():

    return {

        "message":
        "LLM-Assisted Requirements Analysis Tool API",

        "status":
        "running",

        "docs":
        "/docs"

    }



@app.get("/health")
def health():

    return {

        "status":
        "healthy"

    }
