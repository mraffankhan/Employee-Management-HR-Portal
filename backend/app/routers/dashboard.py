from datetime import date
from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.database import get_db
from backend.app.deps import get_current_user
from backend.app.models.user import User
from backend.app.models.employee import Employee
from backend.app.models.department import Department
from backend.app.models.attendance import Attendance
from backend.app.models.leave import LeaveRequest, LeaveBalance

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    today = date.today()
    user_role = current_user.role
    emp = current_user.employee

    # 1. Total Headcount (Active)
    if user_role == "admin":
        headcount = db.query(func.count(Employee.id)).join(User, Employee.user_id == User.id).filter(
            User.is_active == True,
            Employee.employment_status != "deactivated"
        ).scalar() or 0
    elif user_role == "manager" and emp:
        headcount = db.query(func.count(Employee.id)).join(User, Employee.user_id == User.id).filter(
            User.is_active == True,
            Employee.employment_status != "deactivated",
            (Employee.reporting_manager_id == emp.id) | (Employee.id == emp.id)
        ).scalar() or 0
    else:
        headcount = db.query(func.count(Employee.id)).join(User, Employee.user_id == User.id).filter(
            User.is_active == True,
            Employee.employment_status != "deactivated"
        ).scalar() or 0

    # 2. Present Today (Checked in today)
    if user_role == "admin":
        present_today = db.query(func.count(Attendance.id)).filter(
            Attendance.work_date == today,
            Attendance.check_in != None
        ).scalar() or 0
    elif user_role == "manager" and emp:
        present_today = db.query(func.count(Attendance.id)).join(Employee, Attendance.employee_id == Employee.id).filter(
            Attendance.work_date == today,
            Attendance.check_in != None,
            (Employee.reporting_manager_id == emp.id) | (Employee.id == emp.id)
        ).scalar() or 0
    else:
        # Check if current employee is checked in today
        my_att = db.query(Attendance).filter(
            Attendance.employee_id == emp.id if emp else -1,
            Attendance.work_date == today,
            Attendance.check_in != None
        ).first()
        present_today = 1 if my_att else 0

    # 3. On Leave Today
    if user_role == "admin":
        on_leave_today = db.query(func.count(LeaveRequest.id)).filter(
            LeaveRequest.status == "approved",
            LeaveRequest.start_date <= today,
            LeaveRequest.end_date >= today
        ).scalar() or 0
    elif user_role == "manager" and emp:
        on_leave_today = db.query(func.count(LeaveRequest.id)).join(Employee, LeaveRequest.employee_id == Employee.id).filter(
            LeaveRequest.status == "approved",
            LeaveRequest.start_date <= today,
            LeaveRequest.end_date >= today,
            (Employee.reporting_manager_id == emp.id) | (Employee.id == emp.id)
        ).scalar() or 0
    else:
        my_leave = db.query(LeaveRequest).filter(
            LeaveRequest.employee_id == emp.id if emp else -1,
            LeaveRequest.status == "approved",
            LeaveRequest.start_date <= today,
            LeaveRequest.end_date >= today
        ).first()
        on_leave_today = 1 if my_leave else 0

    # 4. Pending Approvals
    if user_role == "admin":
        pending_approvals = db.query(func.count(LeaveRequest.id)).filter(
            LeaveRequest.status == "pending"
        ).scalar() or 0
    elif user_role == "manager" and emp:
        pending_approvals = db.query(func.count(LeaveRequest.id)).join(Employee, LeaveRequest.employee_id == Employee.id).filter(
            LeaveRequest.status == "pending",
            Employee.reporting_manager_id == emp.id
        ).scalar() or 0
    else:
        # For employee: show count of their own pending leave requests
        pending_approvals = db.query(func.count(LeaveRequest.id)).filter(
            LeaveRequest.employee_id == emp.id if emp else -1,
            LeaveRequest.status == "pending"
        ).scalar() or 0

    # 5. Department-wise split
    dept_rows = db.query(
        Department.name,
        func.count(Employee.id)
    ).join(Employee, Department.id == Employee.department_id).join(User, Employee.user_id == User.id).filter(
        User.is_active == True,
        Employee.employment_status != "deactivated"
    ).group_by(Department.name).all()

    department_split = [{"department": row[0], "count": row[1]} for row in dept_rows]

    # 6. Status distribution for attendance today (Late, Present, Half-Day)
    att_rows = db.query(Attendance.status, func.count(Attendance.id)).filter(
        Attendance.work_date == today
    ).group_by(Attendance.status).all()
    attendance_status_distribution = {st: count for st, count in att_rows}

    # 7. Recent Leave Applications (last 5)
    recent_leaves_query = db.query(LeaveRequest).order_by(LeaveRequest.created_at.desc())
    if user_role == "manager" and emp:
        recent_leaves_query = recent_leaves_query.join(Employee, LeaveRequest.employee_id == Employee.id).filter(
            Employee.reporting_manager_id == emp.id
        )
    elif user_role == "employee" and emp:
        recent_leaves_query = recent_leaves_query.filter(LeaveRequest.employee_id == emp.id)
    
    recent_leaves = recent_leaves_query.limit(5).all()
    recent_leaves_data = []
    for l in recent_leaves:
        e = l.employee
        recent_leaves_data.append({
            "id": l.id,
            "employee_name": f"{e.first_name} {e.last_name}" if e else "Unknown",
            "leave_type": l.leave_type.name if l.leave_type else "Leave",
            "start_date": l.start_date.isoformat(),
            "end_date": l.end_date.isoformat(),
            "total_days": l.total_days,
            "status": l.status,
            "created_at": l.created_at.isoformat()
        })

    return {
        "headcount": headcount,
        "present_today": present_today,
        "on_leave_today": on_leave_today,
        "pending_approvals": pending_approvals,
        "department_split": department_split,
        "attendance_today": attendance_status_distribution,
        "recent_leaves": recent_leaves_data,
        "user_role": user_role
    }

