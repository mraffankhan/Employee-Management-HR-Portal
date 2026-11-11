import random
from datetime import date, datetime, time, timedelta
from sqlalchemy.orm import Session
from backend.app.database import Base, engine, SessionLocal
from backend.app.auth import hash_password
from backend.app.models.user import User
from backend.app.models.department import Department, Designation
from backend.app.models.employee import Employee
from backend.app.models.attendance import Attendance
from backend.app.models.leave import LeaveType, LeaveBalance, LeaveRequest
from backend.app.models.document import Document
from backend.app.models.audit import AuditLog

def seed_database(db: Session = None):
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True

    try:
        # Drop all and recreate to ensure clean reset
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)

        print("[Seed] Tables cleared and created.")

        # 1. Leave Types
        casual_lt = LeaveType(code="casual", name="Casual Leave", annual_allowance=12.0, probation_allowed=True)
        sick_lt = LeaveType(code="sick", name="Sick Leave", annual_allowance=10.0, probation_allowed=True)
        earned_lt = LeaveType(code="earned", name="Earned Leave", annual_allowance=18.0, probation_allowed=False)
        db.add_all([casual_lt, sick_lt, earned_lt])
        db.commit()

        # 2. Departments
        dept_eng = Department(name="Engineering", code="ENG", description="Software engineering, QA, and cloud infrastructure")
        dept_prd = Department(name="Product & Design", code="PRD", description="Product management, research, and user experience design")
        dept_hr = Department(name="Human Resources", code="HR", description="People operations, talent acquisition, and employee engagement")
        dept_ops = Department(name="Operations & Finance", code="OPS", description="Financial planning, accounting, and facilities management")
        db.add_all([dept_eng, dept_prd, dept_hr, dept_ops])
        db.commit()

        # 3. Designations
        des_eng_mgr = Designation(department_id=dept_eng.id, title="Engineering Manager")
        des_eng_sr = Designation(department_id=dept_eng.id, title="Senior Software Engineer")
        des_eng_jr = Designation(department_id=dept_eng.id, title="Software Engineer")
        des_eng_qa = Designation(department_id=dept_eng.id, title="QA Automation Engineer")
        des_eng_devops = Designation(department_id=dept_eng.id, title="DevOps Engineer")

        des_prd_mgr = Designation(department_id=dept_prd.id, title="Product Lead")
        des_prd_des = Designation(department_id=dept_prd.id, title="Senior Product Designer")
        des_prd_assoc = Designation(department_id=dept_prd.id, title="Associate Product Manager")

        des_hr_mgr = Designation(department_id=dept_hr.id, title="HR Director")
        des_hr_spec = Designation(department_id=dept_hr.id, title="HR Generalist")
        des_hr_ta = Designation(department_id=dept_hr.id, title="Talent Acquisition Partner")

        des_ops_mgr = Designation(department_id=dept_ops.id, title="Operations Director")
        des_ops_fin = Designation(department_id=dept_ops.id, title="Senior Financial Analyst")
        des_ops_exec = Designation(department_id=dept_ops.id, title="Operations Executive")

        designations_list = [
            des_eng_mgr, des_eng_sr, des_eng_jr, des_eng_qa, des_eng_devops,
            des_prd_mgr, des_prd_des, des_prd_assoc,
            des_hr_mgr, des_hr_spec, des_hr_ta,
            des_ops_mgr, des_ops_fin, des_ops_exec
        ]
        db.add_all(designations_list)
        db.commit()

        # Passwords
        admin_pwd_hash = hash_password("Admin@1234")
        mgr_pwd_hash = hash_password("Manager@1234")
        emp_pwd_hash = hash_password("Employee@1234")

        # 4. Create Admin User & Employee
        admin_user = User(
            email="admin@company.com",
            password_hash=admin_pwd_hash,
            role="admin",
            is_active=True
        )
        db.add(admin_user)
        db.commit()

        admin_emp = Employee(
            user_id=admin_user.id,
            employee_code="EMP001",
            first_name="Aarav",
            last_name="Sharma",
            phone="+91 98200 11223",
            department_id=dept_hr.id,
            designation_id=des_hr_mgr.id,
            joining_date=date(2021, 1, 10),
            employment_status="active"
        )
        db.add(admin_emp)
        db.commit()

        # 5. Create 3 Managers
        # Manager 1: Engineering
        mgr1_user = User(email="rajesh.kumar@company.com", password_hash=mgr_pwd_hash, role="manager", is_active=True)
        # Manager 2: Product & Design
        mgr2_user = User(email="priya.sharma@company.com", password_hash=mgr_pwd_hash, role="manager", is_active=True)
        # Manager 3: Operations & Finance
        mgr3_user = User(email="amit.patel@company.com", password_hash=mgr_pwd_hash, role="manager", is_active=True)

        db.add_all([mgr1_user, mgr2_user, mgr3_user])
        db.commit()

        mgr1_emp = Employee(
            user_id=mgr1_user.id,
            employee_code="EMP002",
            first_name="Rajesh",
            last_name="Kumar",
            phone="+91 98200 22334",
            department_id=dept_eng.id,
            designation_id=des_eng_mgr.id,
            reporting_manager_id=admin_emp.id,
            joining_date=date(2021, 3, 15),
            employment_status="active"
        )
        mgr2_emp = Employee(
            user_id=mgr2_user.id,
            employee_code="EMP003",
            first_name="Priya",
            last_name="Sharma",
            phone="+91 98200 33445",
            department_id=dept_prd.id,
            designation_id=des_prd_mgr.id,
            reporting_manager_id=admin_emp.id,
            joining_date=date(2021, 6, 1),
            employment_status="active"
        )
        mgr3_emp = Employee(
            user_id=mgr3_user.id,
            employee_code="EMP004",
            first_name="Amit",
            last_name="Patel",
            phone="+91 98200 44556",
            department_id=dept_ops.id,
            designation_id=des_ops_mgr.id,
            reporting_manager_id=admin_emp.id,
            joining_date=date(2021, 8, 20),
            employment_status="active"
        )
        db.add_all([mgr1_emp, mgr2_emp, mgr3_emp])
        db.commit()

        # 6. Create 20 Employees
        # Define 20 employees with realistic details
        employee_data = [
            # Engineering (Reports to Rajesh Kumar)
            ("vikram.aditya@company.com", "Vikram", "Aditya", "+91 98111 01001", dept_eng.id, des_eng_sr.id, mgr1_emp.id, date(2022, 1, 15), "active", None),
            ("ananya.iyer@company.com", "Ananya", "Iyer", "+91 98111 01002", dept_eng.id, des_eng_sr.id, mgr1_emp.id, date(2022, 4, 10), "active", None),
            ("rohit.verma@company.com", "Rohit", "Verma", "+91 98111 01003", dept_eng.id, des_eng_jr.id, mgr1_emp.id, date(2026, 9, 1), "probation", date(2027, 3, 1)),
            ("neha.singh@company.com", "Neha", "Singh", "+91 98111 01004", dept_eng.id, des_eng_jr.id, mgr1_emp.id, date(2023, 2, 20), "active", None),
            ("siddharth.rao@company.com", "Siddharth", "Rao", "+91 98111 01005", dept_eng.id, des_eng_qa.id, mgr1_emp.id, date(2023, 5, 12), "active", None),
            ("pooja.nair@company.com", "Pooja", "Nair", "+91 98111 01006", dept_eng.id, des_eng_qa.id, mgr1_emp.id, date(2023, 9, 1), "active", None),
            ("arjun.menon@company.com", "Arjun", "Menon", "+91 98111 01007", dept_eng.id, des_eng_devops.id, mgr1_emp.id, date(2022, 11, 15), "active", None),

            # Product & Design (Reports to Priya Sharma)
            ("kavita.deshmukh@company.com", "Kavita", "Deshmukh", "+91 98222 02001", dept_prd.id, des_prd_des.id, mgr2_emp.id, date(2022, 3, 1), "active", None),
            ("rahul.mehta@company.com", "Rahul", "Mehta", "+91 98222 02002", dept_prd.id, des_prd_des.id, mgr2_emp.id, date(2023, 1, 10), "active", None),
            ("sneha.reddy@company.com", "Sneha", "Reddy", "+91 98222 02003", dept_prd.id, des_prd_assoc.id, mgr2_emp.id, date(2023, 7, 1), "active", None),
            ("tanvi.joshi@company.com", "Tanvi", "Joshi", "+91 98222 02004", dept_prd.id, des_prd_assoc.id, mgr2_emp.id, date(2026, 8, 15), "probation", date(2027, 2, 15)),

            # HR (Reports to Admin / Aarav Sharma)
            ("deepak.gupta@company.com", "Deepak", "Gupta", "+91 98333 03001", dept_hr.id, des_hr_spec.id, admin_emp.id, date(2022, 8, 1), "active", None),
            ("sunita.bose@company.com", "Sunita", "Bose", "+91 98333 03002", dept_hr.id, des_hr_ta.id, admin_emp.id, date(2023, 3, 15), "active", None),
            ("manoj.tiwari@company.com", "Manoj", "Tiwari", "+91 98333 03003", dept_hr.id, des_hr_ta.id, admin_emp.id, date(2024, 1, 5), "active", None),

            # Operations & Finance (Reports to Amit Patel)
            ("alok.nath@company.com", "Alok", "Nath", "+91 98444 04001", dept_ops.id, des_ops_fin.id, mgr3_emp.id, date(2022, 5, 20), "active", None),
            ("divya.chawla@company.com", "Divya", "Chawla", "+91 98444 04002", dept_ops.id, des_ops_fin.id, mgr3_emp.id, date(2023, 2, 1), "active", None),
            ("suresh.raina@company.com", "Suresh", "Raina", "+91 98444 04003", dept_ops.id, des_ops_exec.id, mgr3_emp.id, date(2023, 6, 10), "active", None),
            ("swati.kulkarni@company.com", "Swati", "Kulkarni", "+91 98444 04004", dept_ops.id, des_ops_exec.id, mgr3_emp.id, date(2024, 4, 15), "active", None),
            ("karthik.srinivasan@company.com", "Karthik", "Srinivasan", "+91 98444 04005", dept_ops.id, des_ops_exec.id, mgr3_emp.id, date(2026, 10, 1), "probation", date(2027, 4, 1)),
            ("meera.pillai@company.com", "Meera", "Pillai", "+91 98444 04006", dept_ops.id, des_ops_exec.id, mgr3_emp.id, date(2023, 11, 1), "active", None),
        ]

        all_employees: list[Employee] = [admin_emp, mgr1_emp, mgr2_emp, mgr3_emp]

        for i, item in enumerate(employee_data, start=5):
            email, fn, ln, phone, d_id, des_id, r_mgr_id, j_date, status_val, prob_date = item
            u = User(email=email, password_hash=emp_pwd_hash, role="employee", is_active=True)
            db.add(u)
            db.commit()

            emp = Employee(
                user_id=u.id,
                employee_code=f"EMP{i:03d}",
                first_name=fn,
                last_name=ln,
                phone=phone,
                department_id=d_id,
                designation_id=des_id,
                reporting_manager_id=r_mgr_id,
                joining_date=j_date,
                employment_status=status_val,
                probation_end_date=prob_date
            )
            db.add(emp)
            db.commit()
            all_employees.append(emp)

        print(f"[Seed] Successfully created {len(all_employees)} employees.")

        # 7. Initialize Leave Balances for 2026
        current_year = 2026
        for emp in all_employees:
            # Casual
            db.add(LeaveBalance(
                employee_id=emp.id,
                leave_type_id=casual_lt.id,
                total_allocated=12.0,
                used=random.choice([0.0, 1.0, 2.0, 3.5]),
                remaining=8.5,
                year=current_year
            ))
            # Sick
            db.add(LeaveBalance(
                employee_id=emp.id,
                leave_type_id=sick_lt.id,
                total_allocated=10.0,
                used=random.choice([0.0, 1.0, 2.0]),
                remaining=8.0,
                year=current_year
            ))
            # Earned
            earned_alloc = 0.0 if emp.employment_status == "probation" else 18.0
            db.add(LeaveBalance(
                employee_id=emp.id,
                leave_type_id=earned_lt.id,
                total_allocated=earned_alloc,
                used=0.0 if emp.employment_status == "probation" else random.choice([0.0, 2.0, 4.0]),
                remaining=earned_alloc,
                year=current_year
            ))
        db.commit()

        # Update balance remaining accurately
        balances = db.query(LeaveBalance).all()
        for b in balances:
            b.remaining = max(0.0, b.total_allocated - b.used)
        db.commit()

        # 8. Seed Sample Leaves (Mix of Pending, Approved, Rejected, Half-Day)
        # Pending leave for Rohit (probation) applying for Casual leave
        rohit_emp = [e for e in all_employees if e.first_name == "Rohit"][0]
        db.add(LeaveRequest(
            employee_id=rohit_emp.id,
            leave_type_id=casual_lt.id,
            start_date=date(2026, 11, 20),
            end_date=date(2026, 11, 20),
            is_half_day=True,
            half_day_session="second_half",
            total_days=0.5,
            reason="Personal bank errand in the afternoon",
            status="pending"
        ))

        # Pending leave for Ananya (Engineering)
        ananya_emp = [e for e in all_employees if e.first_name == "Ananya"][0]
        db.add(LeaveRequest(
            employee_id=ananya_emp.id,
            leave_type_id=casual_lt.id,
            start_date=date(2026, 11, 25),
            end_date=date(2026, 11, 26),
            is_half_day=False,
            total_days=2.0,
            reason="Family function in Bengaluru",
            status="pending"
        ))

        # Approved leave for Vikram (Engineering)
        vikram_emp = [e for e in all_employees if e.first_name == "Vikram"][0]
        db.add(LeaveRequest(
            employee_id=vikram_emp.id,
            leave_type_id=earned_lt.id,
            start_date=date(2026, 10, 12),
            end_date=date(2026, 10, 14),
            is_half_day=False,
            total_days=3.0,
            reason="Annual family vacation",
            status="approved",
            approved_by_id=mgr1_emp.id,
            manager_comments="Approved. Make sure PR #402 is merged before heading out.",
            action_at=datetime(2026, 10, 8, 14, 30)
        ))

        # Approved sick leave for Kavita (Design)
        kavita_emp = [e for e in all_employees if e.first_name == "Kavita"][0]
        db.add(LeaveRequest(
            employee_id=kavita_emp.id,
            leave_type_id=sick_lt.id,
            start_date=date(2026, 10, 22),
            end_date=date(2026, 10, 22),
            is_half_day=False,
            total_days=1.0,
            reason="Severe migraine and fever",
            status="approved",
            approved_by_id=mgr2_emp.id,
            manager_comments="Approved. Rest well and recover soon.",
            action_at=datetime(2026, 10, 22, 10, 0)
        ))

        # Rejected leave for Siddharth (Engineering)
        sid_emp = [e for e in all_employees if e.first_name == "Siddharth"][0]
        db.add(LeaveRequest(
            employee_id=sid_emp.id,
            leave_type_id=casual_lt.id,
            start_date=date(2026, 11, 5),
            end_date=date(2026, 11, 6),
            is_half_day=False,
            total_days=2.0,
            reason="Extended weekend travel",
            status="rejected",
            approved_by_id=mgr1_emp.id,
            manager_comments="Critical regression testing scheduled during these days. Please reschedule after release.",
            action_at=datetime(2026, 11, 2, 16, 15)
        ))
        db.commit()

        # 9. Seed 3 Months of Attendance (Aug 15, 2026 to Nov 10, 2026)
        print("[Seed] Generating 3 months of attendance records...")
        start_att_date = date(2026, 8, 15)
        end_att_date = date(2026, 11, 10)
        current_curr_date = start_att_date

        random.seed(42)  # Deterministic seed

        att_records = []
        while current_curr_date <= end_att_date:
            # Skip weekends (Saturday=5, Sunday=6)
            if current_curr_date.weekday() < 5:
                for emp in all_employees:
                    # Skip if employee hadn't joined yet
                    if emp.joining_date > current_curr_date:
                        continue

                    # Random pattern: 88% present, 7% late, 3% half-day, 2% leave/absent
                    dice = random.random()
                    if dice < 0.86:
                        # Present on time: check-in 08:50 - 09:25, check-out 17:45 - 18:30
                        in_minute = random.randint(50, 85)
                        in_hr = 8 if in_minute < 60 else 9
                        in_min = in_minute if in_minute < 60 else (in_minute - 60)
                        
                        out_hr = random.choice([17, 18])
                        out_min = random.randint(30, 55)
                        
                        cin = time(in_hr, in_min)
                        cout = time(out_hr, out_min)
                        total_h = round(((out_hr * 60 + out_min) - (in_hr * 60 + in_min)) / 60.0, 2)
                        
                        att_records.append(Attendance(
                            employee_id=emp.id,
                            work_date=current_curr_date,
                            check_in=cin,
                            check_out=cout,
                            total_hours=total_h,
                            status="present",
                            notes="Regular workday"
                        ))
                    elif dice < 0.94:
                        # Late check-in: 09:35 - 10:15, check-out 18:30 - 19:15
                        cin_hr = 9 if random.random() < 0.7 else 10
                        cin_min = random.randint(32, 55) if cin_hr == 9 else random.randint(2, 20)
                        cin = time(cin_hr, cin_min)
                        
                        out_hr = random.choice([18, 19])
                        out_min = random.randint(15, 45)
                        cout = time(out_hr, out_min)
                        total_h = round(((out_hr * 60 + out_min) - (cin_hr * 60 + cin_min)) / 60.0, 2)
                        
                        att_records.append(Attendance(
                            employee_id=emp.id,
                            work_date=current_curr_date,
                            check_in=cin,
                            check_out=cout,
                            total_hours=total_h,
                            status="late",
                            notes="Traffic delay"
                        ))
                    elif dice < 0.98:
                        # Half-day: < 4.5 hours
                        cin = time(9, random.randint(10, 30))
                        cout = time(13, random.randint(10, 25))
                        total_h = round(((13 * 60 + cout.minute) - (9 * 60 + cin.minute)) / 60.0, 2)
                        
                        att_records.append(Attendance(
                            employee_id=emp.id,
                            work_date=current_curr_date,
                            check_in=cin,
                            check_out=cout,
                            total_hours=total_h,
                            status="half_day",
                            notes="Doctor appointment in afternoon"
                        ))
                    # else absent/on-leave
            current_curr_date += timedelta(days=1)

        db.bulk_save_objects(att_records)
        db.commit()
        print(f"[Seed] Added {len(att_records)} attendance entries.")

        # 10. Audit log entry for initial seed
        db.add(AuditLog(
            user_id=admin_user.id,
            user_email=admin_user.email,
            action="RESET",
            target_table="ALL",
            change_summary="Database seeded with realistic sample data."
        ))
        db.commit()
        print("[Seed] Seeding completed successfully!")

    finally:
        if should_close:
            db.close()

if __name__ == "__main__":
    seed_database()
