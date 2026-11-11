from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class LoginRequest(BaseModel):
    email: str
    password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class EmployeeBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_code: str
    first_name: str
    last_name: str
    avatar_url: Optional[str] = None
    department_name: Optional[str] = None
    designation_title: Optional[str] = None

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    role: str
    is_active: bool
    created_at: datetime
    employee: Optional[EmployeeBrief] = None

class MessageResponse(BaseModel):
    message: str
    success: bool = True
