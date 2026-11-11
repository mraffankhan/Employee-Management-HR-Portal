from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class DesignationBase(BaseModel):
    title: str
    description: Optional[str] = None
    is_active: bool = True

class DesignationCreate(DesignationBase):
    department_id: int

class DesignationUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    department_id: Optional[int] = None

class DesignationResponse(DesignationBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    department_id: int
    created_at: datetime

class DepartmentBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    is_active: bool = True

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class DepartmentResponse(DepartmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    employee_count: int = 0
    designations: List[DesignationResponse] = []
