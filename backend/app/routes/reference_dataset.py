import csv
import io
from difflib import SequenceMatcher

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Project, ReferenceRequirement, Requirement
from app.schemas import (
    ReferenceDatasetImportResponse,
    ReferenceRequirementCreate,
    ReferenceRequirementResponse,
    ReferenceRequirementUpdate,
)

router = APIRouter(prefix="/api/reference-dataset", tags=["Reference Dataset"])


def normalize_text(value: str | None) -> str:
    return " ".join(str(value or "").strip().lower().split())


def find_linked_requirement(
    db: Session,
    original_requirement_text: str,
    project_id: int | None = None,
):
    query = db.query(Requirement)

    if project_id:
        query = query.filter(Requirement.project_id == project_id)

    requirements = query.all()
    target = normalize_text(original_requirement_text)

    exact_match = next(
        (requirement for requirement in requirements if normalize_text(requirement.requirement_text) == target),
        None,
    )

    if exact_match:
        return exact_match

    best_match = None
    best_score = 0.0

    for requirement in requirements:
        score = SequenceMatcher(None, target, normalize_text(requirement.requirement_text)).ratio()
        if score > best_score:
            best_score = score
            best_match = requirement

    return best_match if best_score >= 0.92 else None


def build_reference_response(reference: ReferenceRequirement) -> ReferenceRequirementResponse:
    return ReferenceRequirementResponse(
        id=reference.id,
        project_id=reference.project_id,
        project_name=reference.project.name if reference.project else None,
        requirement_id=reference.requirement_id,
        linked_requirement_text=reference.requirement.requirement_text if reference.requirement else None,
        original_requirement_text=reference.original_requirement_text,
        reference_type=reference.reference_type,
        reference_priority=reference.reference_priority,
        reference_ambiguity_status=reference.reference_ambiguity_status,
        reference_acceptance_criteria=reference.reference_acceptance_criteria,
        reference_test_cases=reference.reference_test_cases,
        reference_notes=reference.reference_notes,
        created_at=reference.created_at,
        updated_at=reference.updated_at,
    )


@router.get("", response_model=list[ReferenceRequirementResponse])
def list_reference_requirements(db: Session = Depends(get_db)):
    references = (
        db.query(ReferenceRequirement)
        .order_by(ReferenceRequirement.updated_at.desc(), ReferenceRequirement.created_at.desc())
        .all()
    )
    return [build_reference_response(reference) for reference in references]


@router.post("", response_model=ReferenceRequirementResponse)
def create_reference_requirement(payload: ReferenceRequirementCreate, db: Session = Depends(get_db)):
    project = None
    if payload.project_id:
        project = db.query(Project).filter(Project.id == payload.project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Selected project not found")

    requirement_id = payload.requirement_id
    requirement = None

    if requirement_id:
        requirement = db.query(Requirement).filter(Requirement.id == requirement_id).first()
        if not requirement:
            raise HTTPException(status_code=404, detail="Linked requirement not found")
    else:
        requirement = find_linked_requirement(db, payload.original_requirement_text, payload.project_id)
        requirement_id = requirement.id if requirement else None

    reference = ReferenceRequirement(
        project_id=payload.project_id,
        requirement_id=requirement_id,
        original_requirement_text=payload.original_requirement_text.strip(),
        reference_type=payload.reference_type.strip() if payload.reference_type else None,
        reference_priority=payload.reference_priority.strip() if payload.reference_priority else None,
        reference_ambiguity_status=payload.reference_ambiguity_status.strip() if payload.reference_ambiguity_status else None,
        reference_acceptance_criteria=payload.reference_acceptance_criteria.strip() if payload.reference_acceptance_criteria else None,
        reference_test_cases=payload.reference_test_cases.strip() if payload.reference_test_cases else None,
        reference_notes=payload.reference_notes.strip() if payload.reference_notes else None,
    )

    db.add(reference)
    db.commit()
    db.refresh(reference)

    return build_reference_response(reference)


@router.put("/{reference_id}", response_model=ReferenceRequirementResponse)
def update_reference_requirement(reference_id: int, payload: ReferenceRequirementUpdate, db: Session = Depends(get_db)):
    reference = db.query(ReferenceRequirement).filter(ReferenceRequirement.id == reference_id).first()

    if not reference:
        raise HTTPException(status_code=404, detail="Reference dataset entry not found")

    if payload.project_id:
        project = db.query(Project).filter(Project.id == payload.project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Selected project not found")

    requirement_id = payload.requirement_id
    if requirement_id:
        requirement = db.query(Requirement).filter(Requirement.id == requirement_id).first()
        if not requirement:
            raise HTTPException(status_code=404, detail="Linked requirement not found")
    else:
        linked = find_linked_requirement(db, payload.original_requirement_text, payload.project_id)
        requirement_id = linked.id if linked else None

    reference.project_id = payload.project_id
    reference.requirement_id = requirement_id
    reference.original_requirement_text = payload.original_requirement_text.strip()
    reference.reference_type = payload.reference_type.strip() if payload.reference_type else None
    reference.reference_priority = payload.reference_priority.strip() if payload.reference_priority else None
    reference.reference_ambiguity_status = payload.reference_ambiguity_status.strip() if payload.reference_ambiguity_status else None
    reference.reference_acceptance_criteria = payload.reference_acceptance_criteria.strip() if payload.reference_acceptance_criteria else None
    reference.reference_test_cases = payload.reference_test_cases.strip() if payload.reference_test_cases else None
    reference.reference_notes = payload.reference_notes.strip() if payload.reference_notes else None

    db.commit()
    db.refresh(reference)

    return build_reference_response(reference)


@router.delete("/{reference_id}")
def delete_reference_requirement(reference_id: int, db: Session = Depends(get_db)):
    reference = db.query(ReferenceRequirement).filter(ReferenceRequirement.id == reference_id).first()

    if not reference:
        raise HTTPException(status_code=404, detail="Reference dataset entry not found")

    db.delete(reference)
    db.commit()

    return {"message": "Reference dataset entry deleted successfully"}


@router.post("/import", response_model=ReferenceDatasetImportResponse)
async def import_reference_dataset(
    file: UploadFile = File(...),
    project_id: int | None = Form(default=None),
    db: Session = Depends(get_db),
):
    if not (file.filename or "").lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV import is supported for the reference dataset.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="The uploaded CSV file is empty.")

    try:
        csv_text = file_bytes.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=400, detail="The uploaded CSV file could not be decoded as UTF-8.") from exc

    reader = csv.DictReader(io.StringIO(csv_text))
    required_columns = {
        "original_requirement_text",
        "reference_type",
        "reference_priority",
        "reference_ambiguity_status",
        "reference_acceptance_criteria",
        "reference_test_cases",
        "reference_notes",
    }

    if not reader.fieldnames or not required_columns.issubset(set(reader.fieldnames)):
        raise HTTPException(
            status_code=400,
            detail="CSV import requires columns: original_requirement_text, reference_type, reference_priority, reference_ambiguity_status, reference_acceptance_criteria, reference_test_cases, reference_notes",
        )

    if project_id:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Selected project not found")

    imported_count = 0
    linked_count = 0

    for row in reader:
        original_requirement_text = (row.get("original_requirement_text") or "").strip()
        if not original_requirement_text:
            continue

        linked_requirement = find_linked_requirement(db, original_requirement_text, project_id)
        if linked_requirement:
            linked_count += 1

        reference = ReferenceRequirement(
            project_id=project_id,
            requirement_id=linked_requirement.id if linked_requirement else None,
            original_requirement_text=original_requirement_text,
            reference_type=(row.get("reference_type") or "").strip() or None,
            reference_priority=(row.get("reference_priority") or "").strip() or None,
            reference_ambiguity_status=(row.get("reference_ambiguity_status") or "").strip() or None,
            reference_acceptance_criteria=(row.get("reference_acceptance_criteria") or "").strip() or None,
            reference_test_cases=(row.get("reference_test_cases") or "").strip() or None,
            reference_notes=(row.get("reference_notes") or "").strip() or None,
        )
        db.add(reference)
        imported_count += 1

    db.commit()

    return ReferenceDatasetImportResponse(imported_count=imported_count, linked_count=linked_count)
