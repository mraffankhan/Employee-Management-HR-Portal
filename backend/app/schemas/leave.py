from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

class LeaveTypeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
    annual_allowance: float
    probation_allowed: bool

class LeaveBalanceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    leave_type_id: int
    leave_type_name: str
    leave_type_code: str
    total_allocated: float
    used: float
    remaining: float
    year: int

class LeaveApplyRequest(BaseModel):
    leave_type_id: int
    start_date: date
    end_date: date
    is_half_day: bool = False
    half_day_session: Optional[str] = None  # "first_half", "second_half"
    reason: str = Field(..., min_length=3, max_length=500)

class LeaveActionRequest(BaseModel):
    status: str  # "approved" or "rejected"
    manager_comments: Optional[str] = None

class LeaveRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    department_name: Optional[str] = None
    leave_type_id: int
    leave_type_name: str
    leave_type_code: str
    start_date: date
    end_date: date
    is_half_day: bool
    half_day_session: Optional[str] = None
    total_days: float
    reason: str
    status: str
    approved_by_id: Optional[int] = None
    approver_name: Optional[str] = None
    manager_comments: Optional[str] = None
    action_at: Optional[datetime] = None
    created_at: datetime
