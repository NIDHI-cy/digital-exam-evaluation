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
| GET | `/scripts/:id/mapping` | Admin, CIR | Student identity mapping; never available to evaluators |
| PUT | `/scripts/:id/anonymity` | Admin, CIR | Persist scan review (`{ verified: true }`) before assignment |
| PUT | `/scripts/:id/serial` | Admin, CIR, Examiner | Correct a failed OCR serial (5–8 digits) |
| GET | `/scripts/:id/question-pages` | Assigned evaluator / authenticated staff | Question-to-answer-page ranges |
| PUT | `/scripts/:id/question-pages` | Admin, CIR, Examiner | Save question answer-page ranges |
| GET | `/scripts/:id/pages/:pageNumber/file` | Assigned evaluator / authenticated staff | Read a stored answer page |
| GET | `/scripts/:id/question-paper` | Assigned evaluator / authenticated staff | Find applicable paper by branch/class target |

Upload fields: `file`, `examId`, optional `studentId`, `pageCount`, `assignedToId`, `serialNumber`

Multiple image pages may be posted as repeated `files` fields. Uploads are limited to 15 MB per file, at most 20 files, and validated by extension, MIME type, and file signature. Failed serial OCR persists `serialNumber: null` with `ocrStatus: FAILED`; the script must be manually corrected before evaluator assignment.

Evaluator script responses use an opaque `anonymousScriptId` and omit student IDs, evaluator assignment IDs, OCR text, and filesystem paths. Student mappings are available only to Admin and CIR.
Evaluator list/detail/file/page/paper/evaluation access is rejected until CIR/Admin has verified that identifying marks have been removed or covered. This is a human scan review gate; the system does not claim automatic image redaction.

## Question Papers

| Method | Path | Roles | Notes |
|--------|------|-------|-------|
| GET | `/question-papers?examId=` | Admin, CIR, Examiner | Metadata and branch/class targets |
| POST | `/question-papers` | Admin, CIR | Multipart `file`, exam metadata, `branches` JSON array, `classSections` JSON array |
| GET | `/question-papers/:id/file` | Admin, CIR, Examiner, evaluator with matching assigned script | Secure document stream |

One uploaded paper can target multiple branches and classes; targets are stored as related rows and do not require duplicate paper uploads. PDF, PNG, and JPG/JPEG uploads are limited to 15 MB and checked against their declared file type and file signature.

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
