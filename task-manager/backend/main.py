"""
Team Task Manager - FastAPI Backend
Single-file implementation for clarity and simplicity.
"""

from datetime import datetime, timedelta, date
from typing import Optional, List
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy import create_engine, Column, Integer, String, Date, ForeignKey, Enum as SAEnum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from pydantic import BaseModel
import enum
import jwt
import bcrypt

# ── Config ────────────────────────────────────────────────────────────────────
SECRET_KEY = "change-me-in-production"
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 8

DATABASE_URL = "sqlite:///./taskmanager.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

app = FastAPI(title="Team Task Manager")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ── Enums ─────────────────────────────────────────────────────────────────────
class Role(str, enum.Enum):
    admin = "admin"
    member = "member"

class TaskStatus(str, enum.Enum):
    pending = "Pending"
    in_progress = "In Progress"
    completed = "Completed"


# ── SQLAlchemy Models ─────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(SAEnum(Role), default=Role.member, nullable=False)
    tasks = relationship("Task", back_populates="assignee")

class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, default="")
    tasks = relationship("Task", back_populates="project")

class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, default="")
    status = Column(SAEnum(TaskStatus), default=TaskStatus.pending, nullable=False)
    due_date = Column(Date, nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    assignee_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    project = relationship("Project", back_populates="tasks")
    assignee = relationship("User", back_populates="tasks")

Base.metadata.create_all(bind=engine)


# ── Pydantic Schemas ──────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    username: str
    password: str
    role: Role = Role.member

class UserOut(BaseModel):
    id: int
    username: str
    role: Role
    class Config: from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut

class ProjectCreate(BaseModel):
    name: str
    description: str = ""

class ProjectOut(BaseModel):
    id: int
    name: str
    description: str
    class Config: from_attributes = True

class TaskCreate(BaseModel):
    title: str
    description: str = ""
    due_date: date
    project_id: int
    assignee_id: Optional[int] = None

class TaskStatusUpdate(BaseModel):
    status: TaskStatus

class TaskOut(BaseModel):
    id: int
    title: str
    description: str
    status: TaskStatus
    due_date: date
    project_id: int
    assignee_id: Optional[int]
    assignee: Optional[UserOut]
    project: Optional[ProjectOut]
    class Config: from_attributes = True


# ── Helpers ───────────────────────────────────────────────────────────────────
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: int) -> str:
    payload = {"sub": str(user_id), "exp": datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS)}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user = db.query(User).get(int(payload["sub"]))
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    # Only admins can perform privileged actions like creating projects/tasks
    if current_user.role != Role.admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# ── Auth Routes ───────────────────────────────────────────────────────────────
@app.post("/auth/signup", response_model=Token)
def signup(data: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    user = User(username=data.username, hashed_password=hash_password(data.password), role=data.role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return Token(access_token=create_token(user.id), token_type="bearer", user=UserOut.from_orm(user))

@app.post("/auth/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return Token(access_token=create_token(user.id), token_type="bearer", user=UserOut.from_orm(user))

@app.get("/auth/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


# ── User Routes ───────────────────────────────────────────────────────────────
@app.get("/users", response_model=List[UserOut])
def list_users(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    # Admins need the member list to assign tasks
    return db.query(User).filter(User.role == Role.member).all()


# ── Project Routes ────────────────────────────────────────────────────────────
@app.get("/projects", response_model=List[ProjectOut])
def list_projects(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Project).all()

@app.post("/projects", response_model=ProjectOut)
def create_project(data: ProjectCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    project = Project(**data.dict())
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


# ── Task Routes ───────────────────────────────────────────────────────────────
@app.get("/tasks", response_model=List[TaskOut])
def list_tasks(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Members only see their assigned tasks; admins see everything
    if current_user.role == Role.admin:
        return db.query(Task).all()
    return db.query(Task).filter(Task.assignee_id == current_user.id).all()

@app.post("/tasks", response_model=TaskOut)
def create_task(data: TaskCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    task = Task(**data.dict())
    db.add(task)
    db.commit()
    db.refresh(task)
    return db.query(Task).get(task.id)

@app.patch("/tasks/{task_id}/status", response_model=TaskOut)
def update_task_status(task_id: int, data: TaskStatusUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(Task).get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    # Members can only update tasks assigned to them
    if current_user.role == Role.member and task.assignee_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only update your own tasks")
    task.status = data.status
    db.commit()
    db.refresh(task)
    return db.query(Task).get(task.id)


# ── Dashboard Route ───────────────────────────────────────────────────────────
@app.get("/dashboard")
def dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    today = date.today()
    # Scope tasks based on role
    base = db.query(Task) if current_user.role == Role.admin else db.query(Task).filter(Task.assignee_id == current_user.id)
    all_tasks = base.all()
    return {
        "total": len(all_tasks),
        "pending": sum(1 for t in all_tasks if t.status == TaskStatus.pending),
        "in_progress": sum(1 for t in all_tasks if t.status == TaskStatus.in_progress),
        "completed": sum(1 for t in all_tasks if t.status == TaskStatus.completed),
        "overdue": sum(1 for t in all_tasks if t.due_date < today and t.status != TaskStatus.completed),
    }
