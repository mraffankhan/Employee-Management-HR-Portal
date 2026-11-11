from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.auth import (
    verify_password,
    hash_password,
    create_access_token,
    set_auth_cookie,
    clear_auth_cookie,
)
from backend.app.deps import get_current_user
from backend.app.models.user import User
from backend.app.models.employee import Employee
from backend.app.schemas.auth import (
    LoginRequest,
    ChangePasswordRequest,
    UserResponse,
    MessageResponse,
    EmployeeBrief,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

def build_user_response(user: User) -> UserResponse:
    emp_brief = None
    if user.employee:
        emp = user.employee
        emp_brief = EmployeeBrief(
            id=emp.id,
            employee_code=emp.employee_code,
            first_name=emp.first_name,
            last_name=emp.last_name,
            avatar_url=emp.avatar_url,
            department_name=emp.department.name if emp.department else None,
            designation_title=emp.designation.title if emp.designation else None,
        )
    return UserResponse(
        id=user.id,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        employee=emp_brief,
    )

@router.post("/login", response_model=UserResponse)
def login(
    payload: LoginRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == payload.email.strip().lower()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact HR."
        )
    
    # Generate token and set httpOnly cookie
    token = create_access_token({"sub": str(user.id), "role": user.role, "email": user.email})
    set_auth_cookie(response, token)
    
    return build_user_response(user)

@router.post("/logout", response_model=MessageResponse)
def logout(response: Response):
    clear_auth_cookie(response)
    return MessageResponse(message="Signed out successfully.")

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return build_user_response(current_user)

@router.post("/change-password", response_model=MessageResponse)
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password verification failed."
        )
    
    if len(payload.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long."
        )
    
    current_user.password_hash = hash_password(payload.new_password)
    db.commit()
    
    return MessageResponse(message="Password updated successfully.")

