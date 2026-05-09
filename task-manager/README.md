# Team Task Manager

Full-stack web app: FastAPI + SQLite backend, React frontend.

## Stack
- **Backend**: FastAPI, SQLAlchemy (SQLite), Pydantic, PyJWT, bcrypt
- **Frontend**: React 18, Vite (no UI library — pure CSS-in-JS)

---

## Quick Start

### 1. Backend

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run the server (auto-creates taskmanager.db on first run)
uvicorn main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

---

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

App available at: http://localhost:5173

---

## Features

### Authentication & RBAC
- JWT-based login and signup
- Two roles: **Admin** and **Member**
- Tokens expire after 8 hours

### Admin Capabilities
- Create projects
- Create tasks with due dates and assign to Members
- View all tasks across all projects
- Update any task's status

### Member Capabilities
- View only their assigned tasks
- Update the status of their own tasks (Pending → In Progress → Completed)

### Dashboard
- Total task count
- Breakdown by status (Pending / In Progress / Completed)
- Overdue task count (tasks past due date, not yet completed)

---

## Project Structure

```
task-manager/
├── backend/
│   ├── main.py          # All models, schemas, auth, routes in one file
│   └── requirements.txt
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx     # React entry point
        └── App.jsx      # Full app: auth, dashboard, projects, tasks
```

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/signup` | None | Register new user |
| POST | `/auth/login` | None | Login (returns JWT) |
| GET | `/auth/me` | Any | Current user info |
| GET | `/users` | Admin | List all members |
| GET | `/projects` | Any | List all projects |
| POST | `/projects` | Admin | Create a project |
| GET | `/tasks` | Any | List tasks (scoped by role) |
| POST | `/tasks` | Admin | Create a task |
| PATCH | `/tasks/{id}/status` | Any | Update task status |
| GET | `/dashboard` | Any | Stats summary |

---

## Design Choices

- **Single-file backend**: All logic in `main.py` for readability and assessment clarity
- **Single-file frontend**: All components in `App.jsx` — no over-engineering
- **Color palette**: Royal Blue (`#2251CC`) for primary actions, British Emerald (`#1A7A4A`) for success/completed states
- **No external UI library**: Pure inline styles for full control and zero dependencies
