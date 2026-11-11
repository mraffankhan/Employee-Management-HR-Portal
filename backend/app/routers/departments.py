from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.database import get_db
from backend.app.deps import get_current_user, require_admin
from backend.app.models.department import Department, Designation
from backend.app.models.employee import Employee
from backend.app.models.user import User
from backend.app.schemas.department import (
    DepartmentCreate,
    DepartmentUpdate,
    DepartmentResponse,
    DesignationBase,
    DesignationCreate,
    DesignationUpdate,
    DesignationResponse,
)
from backend.app.services.audit_service import log_audit_event

router = APIRouter(prefix="/departments", tags=["Departments & Designations"])

@router.get("", response_model=List[DepartmentResponse])
def get_departments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    depts = db.query(Department).all()
    results = []
    for d in depts:
        emp_count = db.query(func.count(Employee.id)).filter(Employee.department_id == d.id).scalar() or 0
        desigs = [
            DesignationResponse(
                id=des.id,
                department_id=des.department_id,
                title=des.title,
                description=des.description,
                is_active=des.is_active,
                created_at=des.created_at
            ) for des in d.designations
        ]
        results.append(DepartmentResponse(
            id=d.id,
            name=d.name,
            code=d.code,
            description=d.description,
            is_active=d.is_active,
            created_at=d.created_at,
            employee_count=emp_count,
            designations=desigs
        ))
    return results

@router.post("", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
def create_department(
    payload: DepartmentCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    existing = db.query(Department).filter(
        (Department.name == payload.name) | (Department.code == payload.code.upper())
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Department with this name or code already exists."
        )

    dept = Department(
        name=payload.name.strip(),
        code=payload.code.strip().upper(),
        description=payload.description,
        is_active=payload.is_active
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)

    log_audit_event(
        db=db,
        user=admin_user,
        action="CREATE",
        target_table="departments",
        target_id=str(dept.id),
        change_summary=f"Created department {dept.name} ({dept.code})"
    )

    return DepartmentResponse(
        id=dept.id,
        name=dept.name,
        code=dept.code,
        description=dept.description,
        is_active=dept.is_active,
        created_at=dept.created_at,
        employee_count=0,
        designations=[]
    )

@router.put("/{dept_id}", response_model=DepartmentResponse)
def update_department(
    dept_id: int,
    payload: DepartmentUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found.")

    if payload.name is not None:
        dept.name = payload.name.strip()
    if payload.code is not None:
        dept.code = payload.code.strip().upper()
    if payload.description is not None:
        dept.description = payload.description
    if payload.is_active is not None:
        dept.is_active = payload.is_active

    db.commit()
    db.refresh(dept)

    log_audit_event(
        db=db,
        user=admin_user,
        action="UPDATE",
        target_table="departments",
        target_id=str(dept.id),
        change_summary=f"Updated department {dept.name}"
    )

    emp_count = db.query(func.count(Employee.id)).filter(Employee.department_id == dept.id).scalar() or 0
    return DepartmentResponse(
        id=dept.id,
        name=dept.name,
        code=dept.code,
        description=dept.description,
        is_active=dept.is_active,
        created_at=dept.created_at,
        employee_count=emp_count,
        designations=[
            DesignationResponse(
                id=des.id,
                department_id=des.department_id,
                title=des.title,
                description=des.description,
                is_active=des.is_active,
                created_at=des.created_at
            ) for des in dept.designations
        ]
    )

@router.delete("/{dept_id}")
def delete_department(
    dept_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found.")

    # Check if active employees assigned
    assigned_count = db.query(Employee).filter(Employee.department_id == dept_id).count()
    if assigned_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete department with {assigned_count} assigned employee(s). Reassign them first."
        )

    dept_name = dept.name
    db.delete(dept)
    db.commit()

    log_audit_event(
        db=db,
        user=admin_user,
        action="DELETE",
        target_table="departments",
        target_id=str(dept_id),
        change_summary=f"Deleted department {dept_name}"
    )

    return {"success": True, "message": f"Department '{dept_name}' deleted."}

# Designation routes
@router.post("/{dept_id}/designations", response_model=DesignationResponse, status_code=status.HTTP_201_CREATED)
def create_designation(
    dept_id: int,
    payload: DesignationBase,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found.")

    desig = Designation(
        department_id=dept_id,
        title=payload.title.strip(),
        description=payload.description,
        is_active=payload.is_active
    )
    db.add(desig)
    db.commit()
    db.refresh(desig)

    log_audit_event(
        db=db,
        user=admin_user,
        action="CREATE",
        target_table="designations",
        target_id=str(desig.id),
        change_summary=f"Created designation '{desig.title}' in {dept.name}"
    )

    return DesignationResponse(
        id=desig.id,
        department_id=desig.department_id,
        title=desig.title,
        description=desig.description,
        is_active=desig.is_active,
        created_at=desig.created_at
    )

@router.put("/designations/{desig_id}", response_model=DesignationResponse)
def update_designation(
    desig_id: int,
    payload: DesignationUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    desig = db.query(Designation).filter(Designation.id == desig_id).first()
    if not desig:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Designation not found.")

    if payload.title is not None:
        desig.title = payload.title.strip()
    if payload.description is not None:
        desig.description = payload.description
    if payload.is_active is not None:
        desig.is_active = payload.is_active
    if payload.department_id is not None:
        desig.department_id = payload.department_id

    db.commit()
    db.refresh(desig)

    log_audit_event(
        db=db,
        user=admin_user,
        action="UPDATE",
        target_table="designations",
        target_id=str(desig.id),
        change_summary=f"Updated designation '{desig.title}'"
    )

    return DesignationResponse(
        id=desig.id,
        department_id=desig.department_id,
        title=desig.title,
        description=desig.description,
        is_active=desig.is_active,
        created_at=desig.created_at
    )

@router.delete("/designations/{desig_id}")
def delete_designation(
    desig_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    desig = db.query(Designation).filter(Designation.id == desig_id).first()
    if not desig:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Designation not found.")

    # Check if employees have this designation
    emp_count = db.query(Employee).filter(Employee.designation_id == desig_id).count()
    if emp_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete designation assigned to {emp_count} employee(s)."
        )

    title = desig.title
    db.delete(desig)
    db.commit()

    log_audit_event(
        db=db,
        user=admin_user,
        action="DELETE",
        target_table="designations",
        target_id=str(desig_id),
        change_summary=f"Deleted designation '{title}'"
    )

    return {"success": True, "message": f"Designation '{title}' deleted."}
