from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Date, Float, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.app.database import Base

class LeaveType(Base):
    __tablename__ = "leave_types"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False)  # "casual", "sick", "earned"
    name = Column(String(100), nullable=False)
    annual_allowance = Column(Float, default=12.0, nullable=False)
    probation_allowed = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    leave_balances = relationship("LeaveBalance", back_populates="leave_type", cascade="all, delete-orphan")
    leave_requests = relationship("LeaveRequest", back_populates="leave_type")

class LeaveBalance(Base):
    __tablename__ = "leave_balances"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    leave_type_id = Column(Integer, ForeignKey("leave_types.id", ondelete="CASCADE"), nullable=False)
    total_allocated = Column(Float, default=0.0, nullable=False)
    used = Column(Float, default=0.0, nullable=False)
    remaining = Column(Float, default=0.0, nullable=False)
    year = Column(Integer, nullable=False)

    employee = relationship("Employee", back_populates="leave_balances")
    leave_type = relationship("LeaveType", back_populates="leave_balances")

    __table_args__ = (
        UniqueConstraint("employee_id", "leave_type_id", "year", name="uix_employee_leavetype_year"),
    )

class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    leave_type_id = Column(Integer, ForeignKey("leave_types.id", ondelete="RESTRICT"), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_half_day = Column(Boolean, default=False, nullable=False)
    half_day_session = Column(String(20), nullable=True)  # "first_half", "second_half"
    total_days = Column(Float, default=1.0, nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(String(20), default="pending", nullable=False)  # "pending", "approved", "rejected", "cancelled"
    approved_by_id = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    manager_comments = Column(Text, nullable=True)
    action_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    employee = relationship("Employee", foreign_keys=[employee_id], back_populates="leave_requests")
    leave_type = relationship("LeaveType", back_populates="leave_requests")
    approver = relationship("Employee", foreign_keys=[approved_by_id])

