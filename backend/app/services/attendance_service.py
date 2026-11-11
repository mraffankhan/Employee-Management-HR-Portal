import calendar
from datetime import date, time, datetime, timedelta
from typing import Optional, Dict, Any, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from backend.app.models.attendance import Attendance
from backend.app.models.employee import Employee
from backend.app.models.leave import LeaveRequest

LATE_THRESHOLD_TIME = time(9, 30)  # 09:30 AM
HALF_DAY_MIN_HOURS = 4.5

def check_in_employee(
    db: Session,
    employee_id: int,
    notes: Optional[str] = None
) -> Attendance:
    today = date.today()
    existing = db.query(Attendance).filter(
        Attendance.employee_id == employee_id,
        Attendance.work_date == today
    ).first()
    
    if existing and existing.check_in is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Already checked in today at {existing.check_in.strftime('%H:%M:%S')}."
        )
    
    now_time = datetime.now().time()
    
    # Late marking rule: check-in after 09:30 AM
    status_label = "late" if now_time > LATE_THRESHOLD_TIME else "present"
    
    if not existing:
        record = Attendance(
            employee_id=employee_id,
            work_date=today,
            check_in=now_time,
            status=status_label,
            notes=notes,
            total_hours=0.0
        )
        db.add(record)
    else:
        existing.check_in = now_time
        existing.status = status_label
        if notes:
            existing.notes = (existing.notes or "") + " " + notes
        record = existing
    
    db.commit()
    db.refresh(record)
    return record

def check_out_employee(
    db: Session,
    employee_id: int,
    notes: Optional[str] = None
) -> Attendance:
    today = date.today()
    record = db.query(Attendance).filter(
        Attendance.employee_id == employee_id,
        Attendance.work_date == today
    ).first()
    
    if not record or not record.check_in:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot check out without checking in first today."
        )
    
    now_time = datetime.now().time()
    record.check_out = now_time
    
    # Calculate total hours worked
    in_dt = datetime.combine(today, record.check_in)
    out_dt = datetime.combine(today, now_time)
    duration_secs = (out_dt - in_dt).total_seconds()
    if duration_secs < 0:
        duration_secs = 0
    total_hours = round(duration_secs / 3600.0, 2)
    record.total_hours = total_hours
    
    # Half-day rule: if total hours < 4.5 hours -> marked as half_day
    if total_hours < HALF_DAY_MIN_HOURS:
        record.status = "half_day"
    else:
        # Keep late if check_in was late, else present
        if record.check_in > LATE_THRESHOLD_TIME:
            record.status = "late"
        else:
            record.status = "present"
            
    if notes:
        record.notes = ((record.notes + " | ") if record.notes else "") + notes
        
    db.commit()
    db.refresh(record)
    return record

def get_monthly_attendance_summary(
    db: Session,
    employee_id: int,
    year: int,
    month: int
) -> Dict[str, Any]:
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")
    
    _, num_days = calendar.monthrange(year, month)
    start_date = date(year, month, 1)
    end_date = date(year, month, num_days)
    today = date.today()
    
    # Query attendance records for this month
    records = db.query(Attendance).filter(
        Attendance.employee_id == employee_id,
        Attendance.work_date >= start_date,
        Attendance.work_date <= end_date
    ).all()
    record_map = {r.work_date: r for r in records}
    
    # Query approved leaves for this month
    leaves = db.query(LeaveRequest).filter(
        LeaveRequest.employee_id == employee_id,
        LeaveRequest.status == "approved",
        LeaveRequest.start_date <= end_date,
        LeaveRequest.end_date >= start_date
    ).all()
    
    leave_dates = set()
    for l in leaves:
        curr = max(l.start_date, start_date)
        while curr <= min(l.end_date, end_date):
            leave_dates.add(curr)
            curr += timedelta(days=1)
            
    days_list = []
    present_cnt = 0
    late_cnt = 0
    half_day_cnt = 0
    absent_cnt = 0
    leave_cnt = 0
    
    for day_num in range(1, num_days + 1):
        d = date(year, month, day_num)
        is_weekend = d.weekday() in (5, 6)  # Saturday / Sunday
        
        if d in record_map:
            rec = record_map[d]
            st = rec.status
            if st == "present":
                present_cnt += 1
            elif st == "late":
                late_cnt += 1
            elif st == "half_day":
                half_day_cnt += 1
            elif st == "absent":
                absent_cnt += 1
                
            days_list.append({
                "date": d,
                "status": st,
                "check_in": rec.check_in.strftime("%H:%M") if rec.check_in else None,
                "check_out": rec.check_out.strftime("%H:%M") if rec.check_out else None,
                "total_hours": rec.total_hours,
                "notes": rec.notes
            })
        elif d in leave_dates:
            leave_cnt += 1
            days_list.append({
                "date": d,
                "status": "on_leave",
                "check_in": None,
                "check_out": None,
                "total_hours": 0.0,
                "notes": "Approved Leave"
            })
        elif is_weekend:
            days_list.append({
                "date": d,
                "status": "weekend",
                "check_in": None,
                "check_out": None,
                "total_hours": 0.0,
                "notes": "Weekend"
            })
        elif d < today:
            # Past working day with no attendance or leave record
            absent_cnt += 1
            days_list.append({
                "date": d,
                "status": "absent",
                "check_in": None,
                "check_out": None,
                "total_hours": 0.0,
                "notes": "Unexcused Absence"
            })
        else:
            # Future date
            days_list.append({
                "date": d,
                "status": "upcoming",
                "check_in": None,
                "check_out": None,
                "total_hours": 0.0,
                "notes": None
            })
            
    return {
        "employee_id": employee_id,
        "year": year,
        "month": month,
        "total_days": num_days,
        "present_days": present_cnt,
        "late_days": late_cnt,
        "half_days": half_day_cnt,
        "absent_days": absent_cnt,
        "leave_days": leave_cnt,
        "days": days_list
    }

