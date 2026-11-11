from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.app.database import get_db
from backend.app.deps import get_current_user, require_manager_or_admin
from backend.app.models.user import User
from backend.app.models.employee import Employee
from backend.app.models.leave import LeaveRequest, LeaveBalance, LeaveType
from backend.app.schemas.leave import (
    LeaveTypeResponse,
    LeaveBalanceResponse,
    LeaveApplyRequest,
    LeaveActionRequest,
    LeaveRequestResponse,
)
from backend.app.services.leave_service import apply_leave, process_leave_action

router = APIRouter(prefix="/leaves", tags=["Leave Management"])

def get_employee_or_raise(user: User) -> Employee:
    if not user.employee:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account has no linked employee profile."
        )
    return user.employee

def map_leave_request(req: LeaveRequest) -> LeaveRequestResponse:
    emp = req.employee
    emp_name = f"{emp.first_name} {emp.last_name}" if emp else None
    dept_name = emp.department.name if emp and emp.department else None
    approver_name = f"{req.approver.first_name} {req.approver.last_name}" if req.approver else None

    return LeaveRequestResponse(
        id=req.id,
        employee_id=req.employee_id,
        employee_name=emp_name,
        employee_code=emp.employee_code if emp else None,
        department_name=dept_name,
        leave_type_id=req.leave_type_id,
        leave_type_name=req.leave_type.name if req.leave_type else "Leave",
        leave_type_code=req.leave_type.code if req.leave_type else "leave",
        start_date=req.start_date,
        end_date=req.end_date,
        is_half_day=req.is_half_day,
        half_day_session=req.half_day_session,
        total_days=req.total_days,
        reason=req.reason,
        status=req.status,
        approved_by_id=req.approved_by_id,
        approver_name=approver_name,
        manager_comments=req.manager_comments,
        action_at=req.action_at,
        created_at=req.created_at,
    )

@router.get("/types", response_model=List[LeaveTypeResponse])
def get_leave_types(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    types = db.query(LeaveType).order_by(LeaveType.id.asc()).all()
    return types

@router.get("/balances", response_model=List[LeaveBalanceResponse])
def get_leave_balances(
    year: Optional[int] = Query(default=None),
    employee_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    current_yr = year or date.today().year

    target_emp_id = None
    if employee_id is not None:
        # Check permissions
        is_admin = (current_user.role == "admin")
        is_self = (current_user.employee and current_user.employee.id == employee_id)
        is_mgr = False
        if current_user.employee and current_user.role == "manager":
            target_emp = db.query(Employee).filter(Employee.id == employee_id).first()
            if target_emp and target_emp.reporting_manager_id == current_user.employee.id:
                is_mgr = True

        if not (is_admin or is_self or is_mgr):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied to view leave balances for this employee."
            )
        target_emp_id = employee_id
    else:
        emp = get_employee_or_raise(current_user)
        target_emp_id = emp.id

    balances = db.query(LeaveBalance).filter(
        LeaveBalance.employee_id == target_emp_id,
        LeaveBalance.year == current_yr
    ).all()

    # If no balances exist yet for this year, generate them from leave types
    if not balances:
        emp = db.query(Employee).filter(Employee.id == target_emp_id).first()
        types = db.query(LeaveType).all()
        for lt in types:
            alloc = 0.0 if (emp and emp.employment_status == "probation" and not lt.probation_allowed) else lt.annual_allowance
            b = LeaveBalance(
                employee_id=target_emp_id,
                leave_type_id=lt.id,
                total_allocated=alloc,
                used=0.0,
                remaining=alloc,
                year=current_yr
            )
            db.add(b)
        db.commit()
        balances = db.query(LeaveBalance).filter(
            LeaveBalance.employee_id == target_emp_id,
            LeaveBalance.year == current_yr
        ).all()

    results = []
    for b in balances:
        results.append(LeaveBalanceResponse(
            id=b.id,
            employee_id=b.employee_id,
            leave_type_id=b.leave_type_id,
            leave_type_name=b.leave_type.name if b.leave_type else "",
            leave_type_code=b.leave_type.code if b.leave_type else "",
            total_allocated=b.total_allocated,
            used=b.used,
            remaining=b.remaining,
            year=b.year,
        ))
    return results

@router.post("/apply", response_model=LeaveRequestResponse, status_code=status.HTTP_201_CREATED)
def apply_for_leave(
    payload: LeaveApplyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    emp = get_employee_or_raise(current_user)
    req = apply_leave(
        db=db,
        employee_id=emp.id,
        leave_type_id=payload.leave_type_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        is_half_day=payload.is_half_day,
        half_day_session=payload.half_day_session,
        reason=payload.reason
    )
    return map_leave_request(req)

@router.get("/my", response_model=List[LeaveRequestResponse])
def get_my_leaves(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    emp = get_employee_or_raise(current_user)
    leaves = db.query(LeaveRequest).filter(
        LeaveRequest.employee_id == emp.id
    ).order_by(LeaveRequest.created_at.desc()).all()
    return [map_leave_request(l) for l in leaves]

@router.get("/pending", response_model=List[LeaveRequestResponse])
def get_pending_leaves(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin)
):
    query = db.query(LeaveRequest).join(Employee, LeaveRequest.employee_id == Employee.id).filter(
        LeaveRequest.status == "pending"
    )

    if current_user.role != "admin":
        mgr_emp = get_employee_or_raise(current_user)
        query = query.filter(Employee.reporting_manager_id == mgr_emp.id)

    leaves = query.order_by(LeaveRequest.created_at.asc()).all()
    return [map_leave_request(l) for l in leaves]

@router.get("/all", response_model=List[LeaveRequestResponse])
def get_all_leaves(
    status_filter: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin)
):
    query = db.query(LeaveRequest).join(Employee, LeaveRequest.employee_id == Employee.id)

    if current_user.role != "admin":
        mgr_emp = get_employee_or_raise(current_user)
        query = query.filter(Employee.reporting_manager_id == mgr_emp.id)

    if status_filter:
        query = query.filter(LeaveRequest.status == status_filter)

    leaves = query.order_by(LeaveRequest.created_at.desc()).all()
    return [map_leave_request(l) for l in leaves]

@router.post("/{leave_id}/action", response_model=LeaveRequestResponse)
def act_on_leave(
    leave_id: int,
    payload: LeaveActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin)
):
    req = process_leave_action(
        db=db,
        leave_id=leave_id,
        action=payload.status.lower(),
        manager_user=current_user,
        comments=payload.manager_comments
    )
    return map_leave_request(req)

