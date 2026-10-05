from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.models import RecyclerAssignment, RecoveryUpdate
from app.schemas.schemas import (
    RecyclerAssignmentCreate,
    RecyclerAssignmentUpdate,
    RecyclerAssignmentResponse
)

router = APIRouter(prefix="/recycling", tags=["Circular Recycling"])

@router.post("/assignments", response_model=RecyclerAssignmentResponse, status_code=status.HTTP_201_CREATED)
def create_recycler_assignment(assign_in: RecyclerAssignmentCreate, db: Session = Depends(get_db)):
    update = db.query(RecoveryUpdate).filter(RecoveryUpdate.id == assign_in.recovery_update_id).first()
    if not update:
        raise HTTPException(status_code=404, detail="Recovery update record not found")
        
    assignment = RecyclerAssignment(**assign_in.model_dump(), status="pending")
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment

@router.get("/assignments", response_model=List[RecyclerAssignmentResponse])
def list_assignments(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(RecyclerAssignment).order_by(RecyclerAssignment.created_at.desc()).offset(skip).limit(limit).all()

@router.patch("/assignments/{assignment_id}", response_model=RecyclerAssignmentResponse)
def update_assignment_status(assignment_id: str, update_in: RecyclerAssignmentUpdate, db: Session = Depends(get_db)):
    assignment = db.query(RecyclerAssignment).filter(RecyclerAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Recycler assignment not found")
        
    assignment.status = update_in.status
    db.commit()
    db.refresh(assignment)
    return assignment
