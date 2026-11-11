from datetime import date, time, datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class AttendanceCheckInRequest(BaseModel):
    notes: Optional[str] = None

class AttendanceCheckOutRequest(BaseModel):
    notes: Optional[str] = None

class AttendanceRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    department_name: Optional[str] = None
    work_date: date
    check_in: Optional[time] = None
    check_out: Optional[time] = None
    total_hours: float
    status: str  # "present", "late", "half_day", "absent"
    notes: Optional[str] = None
    created_at: datetime

class AttendanceDayStatus(BaseModel):
    date: date
    status: str  # "present", "late", "half_day", "absent", "weekend", "holiday", "on_leave"
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    total_hours: float = 0.0
    notes: Optional[str] = None

class AttendanceMonthlySummary(BaseModel):
    employee_id: int
    year: int
    month: int
    total_days: int
    present_days: int
    late_days: int
    half_days: int
    absent_days: int
    leave_days: int
    days: List[AttendanceDayStatus]
