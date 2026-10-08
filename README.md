# Digital Examination Evaluation System

Centralized digital evaluation workflow for **Amrita Vishwa Vidyapeetham** (AVV Chennai).

Faculty evaluate scanned answer scripts with answer-key reference and digital marks entry. OCR extracts **anonymous serial numbers** only — academic evaluation remains with faculty.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React (Vite), React Router, Axios |
| Backend | Node.js, Express, Prisma |
| Database | SQLite (development) |
| Auth | JWT + bcrypt, RBAC |
| Storage | Local `uploads/` (abstracted for future object storage) |

## Quick start

### Backend

```powershell
cd backend
copy .env.example .env
npm install
npm run db:setup
npm run dev
```

API: `http://localhost:5000/api`  
Health: `GET /api/health`

### Frontend

```powershell
cd frontend
npm install
copy .env.example .env
npm run dev
```

App: `http://localhost:5173`

Set `VITE_USE_MOCK_API=true` in `frontend/.env` to run UI without the backend.

## Demo accounts (after seed)

| Role | Email | Password |
|------|-------|----------|
| Evaluator | faculty@amrita.edu | evaluator123 |
| Admin | admin@amrita.edu | admin123 |
| Reviewer | reviewer@amrita.edu | reviewer123 |
| Examiner | examiner@amrita.edu | examiner123 |
| CIR | cir@amrita.edu | cir123 |

## AVV Chennai roll numbers

- **SC** (CSE, AIE, CYS): `CH.SC.U4<BRANCH><YY><NNN>`
- **EN** (CCE, ECE, RAI, AID, MEC): `CH.EN.U4<BRANCH><YY><NNN>`

Examples: `CH.SC.U4AIE24061`, `CH.SC.U4AIE26034`, `CH.EN.U4ECE24061`

Test: `node backend/scripts/test-roll-number.js`

## Project workflow

See [PROJECT_GUIDE.md](PROJECT_GUIDE.md) for the role-based workflow, known limitations, and local setup steps.

## API documentation

See [backend/docs/API.md](backend/docs/API.md).

## University portal

Portal transfer is a **placeholder** (`501`) until an approved institutional API is configured.

## Branch

Active development: `feature/student-roll-number-system`
