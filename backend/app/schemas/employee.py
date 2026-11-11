from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    document_type: str
    file_name: str
    file_path: str
    file_size: int
    mime_type: str
    uploaded_at: datetime

class ManagerBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_code: str
    first_name: str
    last_name: str

class EmployeeBase(BaseModel):
    first_name: str
    last_name: str
    phone: Optional[str] = None
    department_id: Optional[int] = None
    designation_id: Optional[int] = None
    reporting_manager_id: Optional[int] = None
    joining_date: date
    employment_status: str = "active"  # "active", "probation", "notice", "deactivated"
    probation_end_date: Optional[date] = None

class EmployeeCreate(EmployeeBase):
    email: str
    password: str
    role: str = "employee"  # "admin", "manager", "employee"
    employee_code: Optional[str] = None

class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    department_id: Optional[int] = None
    designation_id: Optional[int] = None
    reporting_manager_id: Optional[int] = None
    joining_date: Optional[date] = None
    employment_status: Optional[str] = None
    probation_end_date: Optional[date] = None
    is_active: Optional[bool] = None
    role: Optional[str] = None

class EmployeeListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    email: str
    employee_code: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    department_id: Optional[int] = None
    department_name: Optional[str] = None
    designation_id: Optional[int] = None
    designation_title: Optional[str] = None
    reporting_manager_id: Optional[int] = None
    reporting_manager_name: Optional[str] = None
    joining_date: date
    employment_status: str
    probation_end_date: Optional[date] = None
    role: str
    is_active: bool

class EmployeeDetailResponse(EmployeeListItem):
    documents: List[DocumentResponse] = []
    direct_reports: List[ManagerBrief] = []
    created_at: datetime
    updated_at: datetime
