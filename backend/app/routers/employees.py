import os
import uuid
from pathlib import Path
from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.app.config import settings, UPLOAD_DIR
from backend.app.database import get_db
from backend.app.deps import get_current_user, require_admin, require_manager_or_admin
from backend.app.auth import hash_password
from backend.app.models.user import User
from backend.app.models.employee import Employee
from backend.app.models.department import Department, Designation
from backend.app.models.document import Document
from backend.app.models.leave import LeaveType, LeaveBalance
from backend.app.schemas.employee import (
    EmployeeCreate,
    EmployeeUpdate,
    EmployeeListItem,
    EmployeeDetailResponse,
    DocumentResponse,
    ManagerBrief,
)
from backend.app.services.audit_service import log_audit_event

router = APIRouter(prefix="/employees", tags=["Employee Directory"])

def map_employee_to_item(emp: Employee) -> EmployeeListItem:
    mgr_name = None
    if emp.reporting_manager:
        mgr_name = f"{emp.reporting_manager.first_name} {emp.reporting_manager.last_name}"
    
    return EmployeeListItem(
        id=emp.id,
        user_id=emp.user_id,
        email=emp.user.email if emp.user else "",
        employee_code=emp.employee_code,
        first_name=emp.first_name,
        last_name=emp.last_name,
        phone=emp.phone,
        avatar_url=emp.avatar_url,
        department_id=emp.department_id,
        department_name=emp.department.name if emp.department else None,
        designation_id=emp.designation_id,
        designation_title=emp.designation.title if emp.designation else None,
        reporting_manager_id=emp.reporting_manager_id,
        reporting_manager_name=mgr_name,
        joining_date=emp.joining_date,
        employment_status=emp.employment_status,
        probation_end_date=emp.probation_end_date,
        role=emp.user.role if emp.user else "employee",
        is_active=emp.user.is_active if emp.user else False,
    )

@router.get("", response_model=List[EmployeeListItem])
def list_employees(
    department_id: Optional[int] = None,
    employment_status: Optional[str] = None,
    role: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Employee).join(User, Employee.user_id == User.id)

    # Manager role: if manager requests /employees?team_only=true or general listing
    if department_id:
        query = query.filter(Employee.department_id == department_id)
    if employment_status:
        query = query.filter(Employee.employment_status == employment_status)
    if role:
        query = query.filter(User.role == role)
    if search:
        search_filter = or_(
            Employee.first_name.ilike(f"%{search}%"),
            Employee.last_name.ilike(f"%{search}%"),
            Employee.employee_code.ilike(f"%{search}%"),
            User.email.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)

    employees = query.order_by(Employee.id.asc()).all()
    return [map_employee_to_item(emp) for emp in employees]

@router.get("/{emp_id}", response_model=EmployeeDetailResponse)
def get_employee(
    emp_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")

    # Access control:
    # Admin has full view
    # Manager can view anyone or direct reports
    # Employee can view self or peers (restricted documents)
    docs = []
    if current_user.role == "admin" or (current_user.employee and current_user.employee.id == emp.id) or (emp.reporting_manager and current_user.employee and emp.reporting_manager_id == current_user.employee.id):
        docs = [
            DocumentResponse(
                id=d.id,
                employee_id=d.employee_id,
                document_type=d.document_type,
                file_name=d.file_name,
                file_path=d.file_path,
                file_size=d.file_size,
                mime_type=d.mime_type,
                uploaded_at=d.uploaded_at
            ) for d in emp.documents
        ]

    mgr_name = None
    if emp.reporting_manager:
        mgr_name = f"{emp.reporting_manager.first_name} {emp.reporting_manager.last_name}"

    direct_reps = [
        ManagerBrief(
            id=rep.id,
            employee_code=rep.employee_code,
            first_name=rep.first_name,
            last_name=rep.last_name
        ) for rep in emp.direct_reports
    ]

    return EmployeeDetailResponse(
        id=emp.id,
        user_id=emp.user_id,
        email=emp.user.email if emp.user else "",
        employee_code=emp.employee_code,
        first_name=emp.first_name,
        last_name=emp.last_name,
        phone=emp.phone,
        avatar_url=emp.avatar_url,
        department_id=emp.department_id,
        department_name=emp.department.name if emp.department else None,
        designation_id=emp.designation_id,
        designation_title=emp.designation.title if emp.designation else None,
        reporting_manager_id=emp.reporting_manager_id,
        reporting_manager_name=mgr_name,
        joining_date=emp.joining_date,
        employment_status=emp.employment_status,
        probation_end_date=emp.probation_end_date,
        role=emp.user.role if emp.user else "employee",
        is_active=emp.user.is_active if emp.user else False,
        documents=docs,
        direct_reports=direct_reps,
        created_at=emp.created_at,
        updated_at=emp.updated_at
    )

@router.post("", response_model=EmployeeDetailResponse, status_code=status.HTTP_201_CREATED)
def create_employee(
    payload: EmployeeCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    # Verify email uniqueness
    existing_user = db.query(User).filter(User.email == payload.email.strip().lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user account with this email address already exists."
        )

    # Generate employee code if omitted
    emp_code = payload.employee_code
    if not emp_code:
        max_id = db.query(Employee.id).order_by(Employee.id.desc()).first()
        next_num = (max_id[0] + 1) if max_id else 1
        emp_code = f"EMP{next_num:03d}"

    # Verify code uniqueness
    if db.query(Employee).filter(Employee.employee_code == emp_code).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Employee code {emp_code} is already in use.")

    # Create User
    new_user = User(
        email=payload.email.strip().lower(),
        password_hash=hash_password(payload.password),
        role=payload.role,
        is_active=True
    )
    db.add(new_user)
    db.commit()

    # Create Employee
    new_emp = Employee(
        user_id=new_user.id,
        employee_code=emp_code,
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        phone=payload.phone.strip() if payload.phone else None,
        department_id=payload.department_id,
        designation_id=payload.designation_id,
        reporting_manager_id=payload.reporting_manager_id,
        joining_date=payload.joining_date,
        employment_status=payload.employment_status,
        probation_end_date=payload.probation_end_date
    )
    db.add(new_emp)
    db.commit()
    db.refresh(new_emp)

    # Initialize leave balances for current year
    current_year = payload.joining_date.year
    leave_types = db.query(LeaveType).all()
    for lt in leave_types:
        alloc = 0.0 if (payload.employment_status == "probation" and not lt.probation_allowed) else lt.annual_allowance
        db.add(LeaveBalance(
            employee_id=new_emp.id,
            leave_type_id=lt.id,
            total_allocated=alloc,
            used=0.0,
            remaining=alloc,
            year=current_year
        ))
    db.commit()

    log_audit_event(
        db=db,
        user=admin_user,
        action="CREATE",
        target_table="employees",
        target_id=str(new_emp.id),
        change_summary=f"Created employee {new_emp.first_name} {new_emp.last_name} ({emp_code})"
    )

    return get_employee(new_emp.id, db, admin_user)

@router.put("/{emp_id}", response_model=EmployeeDetailResponse)
def update_employee(
    emp_id: int,
    payload: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")

    # Permissions:
    # Admin can change everything
    # Employee can only change own phone
    is_admin = (current_user.role == "admin")
    is_self = (current_user.employee and current_user.employee.id == emp.id)

    if not is_admin and not is_self:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied to update this profile.")

    if is_self and not is_admin:
        if payload.phone is not None:
            emp.phone = payload.phone.strip()
    else:
        # Admin can update full profile
        if payload.first_name is not None:
            emp.first_name = payload.first_name.strip()
        if payload.last_name is not None:
            emp.last_name = payload.last_name.strip()
        if payload.phone is not None:
            emp.phone = payload.phone.strip()
        if payload.department_id is not None:
            emp.department_id = payload.department_id
        if payload.designation_id is not None:
            emp.designation_id = payload.designation_id
        if payload.reporting_manager_id is not None:
            if payload.reporting_manager_id == emp.id:
                raise HTTPException(status_code=400, detail="An employee cannot be their own reporting manager.")
            emp.reporting_manager_id = payload.reporting_manager_id
        if payload.joining_date is not None:
            emp.joining_date = payload.joining_date
        if payload.employment_status is not None:
            emp.employment_status = payload.employment_status
        if payload.probation_end_date is not None:
            emp.probation_end_date = payload.probation_end_date
        if payload.is_active is not None and emp.user:
            emp.user.is_active = payload.is_active
        if payload.role is not None and emp.user:
            emp.user.role = payload.role

    db.commit()
    db.refresh(emp)

    log_audit_event(
        db=db,
        user=current_user,
        action="UPDATE",
        target_table="employees",
        target_id=str(emp.id),
        change_summary=f"Updated employee {emp.first_name} {emp.last_name}"
    )

    return get_employee(emp.id, db, current_user)

@router.delete("/{emp_id}")
def deactivate_employee(
    emp_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")

    # Soft deactivate
    emp.employment_status = "deactivated"
    if emp.user:
        emp.user.is_active = False
    db.commit()

    log_audit_event(
        db=db,
        user=admin_user,
        action="DEACTIVATE",
        target_table="employees",
        target_id=str(emp.id),
        change_summary=f"Deactivated employee {emp.first_name} {emp.last_name}"
    )

    return {"success": True, "message": f"Employee {emp.first_name} {emp.last_name} deactivated."}

@router.post("/{emp_id}/avatar")
async def upload_avatar(
    emp_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")

    # Check permission
    is_admin = (current_user.role == "admin")
    is_self = (current_user.employee and current_user.employee.id == emp.id)
    if not is_admin and not is_self:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied.")

    ext = Path(file.filename or "").suffix.lower()
    allowed = {".png", ".jpg", ".jpeg", ".webp"}
    if ext not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image format. Allowed: {', '.join(allowed)}"
        )

    # Read and check size (<= 5MB)
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File size exceeds 5MB limit.")

    unique_name = f"avatar_{emp.id}_{uuid.uuid4().hex[:8]}{ext}"
    dest_path = UPLOAD_DIR / unique_name
    with open(dest_path, "wb") as f:
        f.write(contents)

    avatar_rel_url = f"/api/uploads/{unique_name}"
    emp.avatar_url = avatar_rel_url
    db.commit()

    return {"success": True, "avatar_url": avatar_rel_url}

@router.post("/{emp_id}/documents", response_model=DocumentResponse)
async def upload_document(
    emp_id: int,
    document_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")

    # Check permission
    is_admin = (current_user.role == "admin")
    is_self = (current_user.employee and current_user.employee.id == emp.id)
    if not is_admin and not is_self:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied.")

    ext = Path(file.filename or "").suffix.lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type {ext}. Allowed: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )

    contents = await file.read()
    file_size = len(contents)
    if file_size > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum size of {settings.MAX_UPLOAD_SIZE_MB}MB."
        )

    unique_name = f"doc_{emp.id}_{uuid.uuid4().hex[:8]}{ext}"
    dest_path = UPLOAD_DIR / unique_name
    with open(dest_path, "wb") as f:
        f.write(contents)

    doc = Document(
        employee_id=emp.id,
        document_type=document_type,
        file_name=file.filename or unique_name,
        file_path=str(dest_path),
        file_size=file_size,
        mime_type=file.content_type or "application/octet-stream"
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    log_audit_event(
        db=db,
        user=current_user,
        action="UPLOAD",
        target_table="documents",
        target_id=str(doc.id),
        change_summary=f"Uploaded document '{doc.file_name}' for employee {emp.employee_code}"
    )

    return DocumentResponse(
        id=doc.id,
        employee_id=doc.employee_id,
        document_type=doc.document_type,
        file_name=doc.file_name,
        file_path=doc.file_path,
        file_size=doc.file_size,
        mime_type=doc.mime_type,
        uploaded_at=doc.uploaded_at
    )

@router.get("/documents/{doc_id}/download")
def download_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    emp = doc.employee
    is_admin = (current_user.role == "admin")
    is_self = (current_user.employee and current_user.employee.id == emp.id)
    is_mgr = (emp.reporting_manager and current_user.employee and emp.reporting_manager_id == current_user.employee.id)

    if not (is_admin or is_self or is_mgr):
        raise HTTPException(status_code=403, detail="Unauthorized to download this document.")

    file_path = Path(doc.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File missing from storage.")

    return FileResponse(
        path=str(file_path),
        filename=doc.file_name,
        media_type=doc.mime_type
    )

@router.delete("/documents/{doc_id}")
def delete_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    emp = doc.employee
    is_admin = (current_user.role == "admin")
    is_self = (current_user.employee and current_user.employee.id == emp.id)

    if not (is_admin or is_self):
        raise HTTPException(status_code=403, detail="Unauthorized to delete this document.")

    file_path = Path(doc.file_path)
    if file_path.exists():
        try:
            file_path.unlink()
        except Exception:
            pass

    file_name = doc.file_name
    db.delete(doc)
    db.commit()

    log_audit_event(
        db=db,
        user=current_user,
        action="DELETE",
        target_table="documents",
        target_id=str(doc_id),
        change_summary=f"Deleted document '{file_name}' for employee {emp.employee_code}"
    )

    return {"success": True, "message": f"Document '{file_name}' deleted."}

