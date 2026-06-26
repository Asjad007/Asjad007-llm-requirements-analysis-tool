from pathlib import Path
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker
from .config import settings

BACKEND_ROOT = Path(__file__).resolve().parents[1]
BACKEND_DATA_DIR = BACKEND_ROOT / 'data'
BACKEND_DATA_DIR.mkdir(exist_ok=True)


def resolve_database_url(database_url: str) -> str:
    if not database_url.startswith('sqlite:///./'):
        return database_url

    relative_path = database_url.replace('sqlite:///./', '', 1)
    absolute_path = (BACKEND_ROOT / relative_path).resolve()
    return f"sqlite:///{absolute_path.as_posix()}"


resolved_database_url = resolve_database_url(settings.DATABASE_URL)
engine = create_engine(
    resolved_database_url,
    connect_args={'check_same_thread': False} if resolved_database_url.startswith('sqlite') else {},
)

if resolved_database_url.startswith('sqlite'):
    @event.listens_for(engine, "connect")
    def configure_sqlite_connection(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=MEMORY")
        cursor.execute("PRAGMA temp_store=MEMORY")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
