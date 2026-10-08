# Digital Exam Evaluation API

Base URL: `http://localhost:5000/api`

Authentication: `Authorization: Bearer <token>` unless noted.

## Auth

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST | `/auth/login` | No | `{ email, password }` | `{ token, role, name, email, department }` |
| POST | `/auth/logout` | Yes | — | `{ message }` |
| GET | `/auth/me` | Yes | — | User object |

Errors: `401` invalid credentials

## Students (Admin, Examiner, Reviewer read)

| Method | Path | Roles | Notes |
|--------|------|-------|-------|
| GET | `/students?q=&branch=&joiningYear=` | Admin, Examiner, Reviewer | List/search |
| GET | `/students/:id` | Admin, Examiner, Reviewer | Details |
| POST | `/students` | Admin, Examiner | Create; generates AVV roll number |
| PUT | `/students/:id` | Admin, Examiner | Update |
| DELETE | `/students/:id` | Admin | Deactivate |
| POST | `/students/generate-roll` | Admin, Examiner | `{ branch, joiningYear, rollNumber }` |
| POST | `/students/validate-roll` | Admin, Examiner | `{ rollNumber }` |

Roll format: `CH.SC.U4<BRANCH><YY><NNN>` or `CH.EN.U4...`

## Exams

| Method | Path | Roles |
|--------|------|-------|
| GET | `/exams` | Authenticated |
| GET | `/exams/:id` | Authenticated |
| GET | `/exams/:id/questions` | Authenticated |
| POST | `/exams` | Admin, Examiner |
| PUT | `/exams/:id` | Admin, Examiner |
| POST | `/exams/:id/questions` | Admin, Examiner |

## Scripts

| Method | Path | Roles |
|--------|------|-------|
| GET | `/scripts` | Evaluator sees assigned only |
| GET | `/scripts/:id` | Assigned evaluator / admin roles |
| GET | `/scripts/:id/file` | Download scanned file |
| POST | `/scripts/upload` | Admin, Examiner (multipart) |
| PUT | `/scripts/:id/serial` | Admin, Examiner |
| POST | `/scripts/:id/reprocess-ocr` | Admin, Examiner |

Upload fields: `file`, `examId`, optional `studentId`, `pageCount`, `assignedToId`, `serialNumber`

## Evaluations

| Method | Path | Roles |
|--------|------|-------|
| GET | `/evaluations` | Admin, Reviewer, Examiner |
| GET | `/evaluations/:scriptId` | Evaluator (assigned) |
| PUT | `/evaluations/:scriptId` | Evaluator — save draft |
| POST | `/evaluations/:scriptId/submit` | Evaluator — submit |
| POST | `/evaluations/:scriptId/review` | Reviewer, Admin |
| GET | `/evaluations/:scriptId/status` | Evaluator |

Body for save/submit: `{ marks: { "<questionId>": number } }`

Validation: `0 <= marks <= question.maxMarks`, all required on submit.

## Audit

| GET | `/audit?limit=50` | Admin, Reviewer |

## Portal (placeholder)

| POST | `/portal/transfer-marks/:evaluationId` | Admin, Examiner — returns `501` until configured |
