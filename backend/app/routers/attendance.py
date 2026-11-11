from datetime import date, datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.app.database import get_db
from backend.app.deps import get_current_user, require_manager_or_admin
from backend.app.models.user import User
from backend.app.models.employee import Employee
from backend.app.models.attendance import Attendance
from backend.app.schemas.attendance import (
    AttendanceCheckInRequest,
    AttendanceCheckOutRequest,
    AttendanceRecordResponse,
    AttendanceMonthlySummary,
)
from backend.app.services.attendance_service import (
    check_in_employee,
    check_out_employee,
    get_monthly_attendance_summary,
)

router = APIRouter(prefix="/attendance", tags=["Attendance Tracking"])

def get_employee_or_raise(user: User) -> Employee:
    if not user.employee:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account has no linked employee profile."
        )
    return user.employee

def map_attendance_record(rec: Attendance) -> AttendanceRecordResponse:
    emp = rec.employee
    emp_name = f"{emp.first_name} {emp.last_name}" if emp else None
    dept_name = emp.department.name if emp and emp.department else None
    return AttendanceRecordResponse(
        id=rec.id,
        employee_id=rec.employee_id,
        employee_name=emp_name,
        employee_code=emp.employee_code if emp else None,
        department_name=dept_name,
        work_date=rec.work_date,
        check_in=rec.check_in,
        check_out=rec.check_out,
        total_hours=rec.total_hours,
        status=rec.status,
        notes=rec.notes,
        created_at=rec.created_at,
    )

@router.post("/check-in", response_model=AttendanceRecordResponse)
def check_in(
    payload: AttendanceCheckInRequest = AttendanceCheckInRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    emp = get_employee_or_raise(current_user)
    rec = check_in_employee(db=db, employee_id=emp.id, notes=payload.notes)
    return map_attendance_record(rec)

@router.post("/check-out", response_model=AttendanceRecordResponse)
def check_out(
    payload: AttendanceCheckOutRequest = AttendanceCheckOutRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    emp = get_employee_or_raise(current_user)
    rec = check_out_employee(db=db, employee_id=emp.id, notes=payload.notes)
    return map_attendance_record(rec)

@router.get("/today", response_model=Optional[AttendanceRecordResponse])
def get_today_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    emp = get_employee_or_raise(current_user)
    today = date.today()
    rec = db.query(Attendance).filter(
        Attendance.employee_id == emp.id,
        Attendance.work_date == today
    ).first()
    if not rec:
        return None
    return map_attendance_record(rec)

@router.get("/monthly", response_model=AttendanceMonthlySummary)
def get_monthly_attendance(
    year: int = Query(default=None),
    month: int = Query(default=None),
    employee_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    now = date.today()
    if year is None:
        year = now.year
    if month is None:
        month = now.month

    target_emp_id = None
    if employee_id is not None:
        # Check permission to view someone else's attendance
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
                detail="Permission denied to view this employee's attendance."
            )
        target_emp_id = employee_id
    else:
        emp = get_employee_or_raise(current_user)
        target_emp_id = emp.id

    summary = get_monthly_attendance_summary(db=db, employee_id=target_emp_id, year=year, month=month)
    return AttendanceMonthlySummary(**summary)

@router.get("/team", response_model=List[AttendanceRecordResponse])
def get_team_attendance(
    target_date: Optional[date] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin)
):
    if target_date is None:
        target_date = date.today()

    query = db.query(Attendance).join(Employee, Attendance.employee_id == Employee.id).filter(
        Attendance.work_date == target_date
    )

    if current_user.role != "admin":
        mgr_emp = get_employee_or_raise(current_user)
        query = query.filter(Employee.reporting_manager_id == mgr_emp.id)

    records = query.order_by(Attendance.check_in.asc()).all()
    return [map_attendance_record(r) for r in records]

