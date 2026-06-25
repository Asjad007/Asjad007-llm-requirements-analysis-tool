from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Project, Requirement
from app.schemas import ProjectCreate, ProjectResponse, ProjectUpdate

router = APIRouter(prefix="/api/projects", tags=["Projects"])


def build_project_response(project: Project, requirement_count: int) -> ProjectResponse:
    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        domain_system_type=project.domain_system_type,
        requirement_count=requirement_count,
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


@router.get("", response_model=list[ProjectResponse])
def list_projects(db: Session = Depends(get_db)):
    projects = db.query(Project).order_by(Project.updated_at.desc(), Project.created_at.desc()).all()

    return [
        build_project_response(
            project,
            db.query(Requirement).filter(Requirement.project_id == project.id).count(),
        )
        for project in projects
    ]


@router.post("", response_model=ProjectResponse)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)):
    project = Project(
        name=payload.name.strip(),
        description=payload.description.strip() if payload.description else None,
        domain_system_type=payload.domain_system_type.strip() if payload.domain_system_type else None,
    )

    db.add(project)
    db.commit()
    db.refresh(project)

    return build_project_response(project, 0)


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: int, payload: ProjectUpdate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project.name = payload.name.strip()
    project.description = payload.description.strip() if payload.description else None
    project.domain_system_type = payload.domain_system_type.strip() if payload.domain_system_type else None

    db.commit()
    db.refresh(project)

    requirement_count = db.query(Requirement).filter(Requirement.project_id == project.id).count()
    return build_project_response(project, requirement_count)


@router.delete("/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    requirement_count = db.query(Requirement).filter(Requirement.project_id == project.id).count()

    if requirement_count > 0:
        raise HTTPException(
            status_code=400,
            detail="This project cannot be deleted because it still contains requirements.",
        )

    db.delete(project)
    db.commit()

    return {"message": "Project deleted successfully"}
