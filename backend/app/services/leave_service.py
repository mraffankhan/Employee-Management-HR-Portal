from datetime import date, datetime
from typing import Optional, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from backend.app.models.leave import LeaveRequest, LeaveBalance, LeaveType
from backend.app.models.employee import Employee
from backend.app.models.user import User

def calculate_requested_days(
    start_date: date,
    end_date: date,
    is_half_day: bool
) -> float:
    if start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start date cannot be after end date."
        )
    
    if is_half_day:
        if start_date != end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Half-day leaves can only be applied for a single calendar day."
            )
        return 0.5
    
    # Calculate days inclusive
    delta = (end_date - start_date).days + 1
    return float(delta)

def apply_leave(
    db: Session,
    employee_id: int,
    leave_type_id: int,
    start_date: date,
    end_date: date,
    is_half_day: bool,
    half_day_session: Optional[str],
    reason: str
) -> LeaveRequest:
    # 1. Verify employee exists and status
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")
    
    if employee.employment_status == "deactivated":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Deactivated employees cannot apply for leave.")
    
    # 2. Verify leave type
    leave_type = db.query(LeaveType).filter(LeaveType.id == leave_type_id).first()
    if not leave_type:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid leave type.")
    
    # 3. Probation period policy rule
    is_on_probation = (employee.employment_status == "probation")
    if not is_on_probation and employee.probation_end_date:
        if date.today() <= employee.probation_end_date:
            is_on_probation = True
    
    if is_on_probation and not leave_type.probation_allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{leave_type.name} is not permitted during probation period. Only probation-eligible leave types (such as Casual and Sick Leave) are allowed."
        )

    # 4. Calculate total days
    total_days = calculate_requested_days(start_date, end_date, is_half_day)
    
    # 5. Overlap validation
    # Check for any existing non-rejected, non-cancelled leaves overlapping [start_date, end_date]
    overlapping = db.query(LeaveRequest).filter(
        LeaveRequest.employee_id == employee_id,
        LeaveRequest.status.in_(["pending", "approved"]),
        or_(
            and_(LeaveRequest.start_date <= start_date, LeaveRequest.end_date >= start_date),
            and_(LeaveRequest.start_date <= end_date, LeaveRequest.end_date >= end_date),
            and_(LeaveRequest.start_date >= start_date, LeaveRequest.end_date <= end_date),
        )
    ).first()
    
    if overlapping:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Overlapping leave request already exists ({overlapping.start_date} to {overlapping.end_date}, status: {overlapping.status})."
        )
    
    # 6. Negative-balance validation
    # Check current year balance
    current_year = start_date.year
    balance = db.query(LeaveBalance).filter(
        LeaveBalance.employee_id == employee_id,
        LeaveBalance.leave_type_id == leave_type_id,
        LeaveBalance.year == current_year
    ).first()
    
    if not balance:
        # Create zero balance row if not yet initialized
        balance = LeaveBalance(
            employee_id=employee_id,
            leave_type_id=leave_type_id,
            total_allocated=leave_type.annual_allowance,
            used=0.0,
            remaining=leave_type.annual_allowance,
            year=current_year
        )
        db.add(balance)
        db.commit()
        db.refresh(balance)
    
    # Calculate pending days already requested in this year for this leave type
    pending_leaves = db.query(LeaveRequest).filter(
        LeaveRequest.employee_id == employee_id,
        LeaveRequest.leave_type_id == leave_type_id,
        LeaveRequest.status == "pending"
    ).all()
    pending_days = sum(l.total_days for l in pending_leaves)
    
    effective_available = balance.remaining - pending_days
    if effective_available < total_days:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient leave balance for {leave_type.name}. Available remaining: {balance.remaining:.1f} days ({pending_days:.1f} days pending approval). You requested: {total_days:.1f} days."
        )
    
    # Create the leave request
    leave_req = LeaveRequest(
        employee_id=employee_id,
        leave_type_id=leave_type_id,
        start_date=start_date,
        end_date=end_date,
        is_half_day=is_half_day,
        half_day_session=half_day_session if is_half_day else None,
        total_days=total_days,
        reason=reason,
        status="pending",
    )
    db.add(leave_req)
    db.commit()
    db.refresh(leave_req)
    return leave_req

def process_leave_action(
    db: Session,
    leave_id: int,
    action: str,  # "approved" or "rejected"
    manager_user: User,
    comments: Optional[str] = None
) -> LeaveRequest:
    leave_req = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not leave_req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave request not found.")
    
    if leave_req.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Leave request is already {leave_req.status} and cannot be modified."
        )
    
    # Check permissions: Admin can act on any, Manager can only act on direct reports
    approver_employee = db.query(Employee).filter(Employee.user_id == manager_user.id).first()
    
    if manager_user.role != "admin":
        if not approver_employee:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Manager profile not linked.")
        
        # Check if the employee reports to this manager
        applicant = db.query(Employee).filter(Employee.id == leave_req.employee_id).first()
        if not applicant or applicant.reporting_manager_id != approver_employee.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only approve or reject leave requests for your direct reports."
            )
    
    approver_id = approver_employee.id if approver_employee else None
    
    if action == "approved":
        # Deduct balance automatically
        balance = db.query(LeaveBalance).filter(
            LeaveBalance.employee_id == leave_req.employee_id,
            LeaveBalance.leave_type_id == leave_req.leave_type_id,
            LeaveBalance.year == leave_req.start_date.year
        ).first()
        
        if not balance:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Leave balance record missing for this employee."
            )
        
        if balance.remaining < leave_req.total_days:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot approve: remaining balance ({balance.remaining:.1f}) is less than requested days ({leave_req.total_days:.1f})."
            )
        
        balance.used += leave_req.total_days
        balance.remaining -= leave_req.total_days
        leave_req.status = "approved"
    elif action == "rejected":
        leave_req.status = "rejected"
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid action. Use 'approved' or 'rejected'.")
    
    leave_req.approved_by_id = approver_id
    leave_req.manager_comments = comments
    leave_req.action_at = datetime.utcnow()
    
    db.commit()
    db.refresh(leave_req)
    return leave_req

