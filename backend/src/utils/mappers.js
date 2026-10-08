function roleToFrontend(role) {
  return role.toLowerCase();
}

function scriptStatusToFrontend(status) {
  const map = {
    NOT_STARTED: "pending",
    IN_PROGRESS: "in_progress",
    COMPLETED: "in_progress",
    SUBMITTED: "submitted",
    REVIEWED: "submitted",
  };
  return map[status] || "pending";
}

function evalStatusToFrontend(status) {
  if (status === "SUBMITTED" || status === "REVIEWED") return "submitted";
  if (status === "NOT_STARTED") return "draft";
  return "draft";
}

export function mapUserResponse(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: roleToFrontend(user.role),
    department: user.department,
    status: user.status,
  };
}

export function mapLoginResponse(user, token) {
  return {
    token,
    role: roleToFrontend(user.role),
    name: user.name,
    email: user.email,
    department: user.department,
  };
}

export function mapStudent(student) {
  return {
    id: student.id,
    name: student.name,
    rollNumber: student.rollNumber,
    branch: student.branch,
    joiningYear: student.joiningYear,
    program: student.program,
    status: student.status.toLowerCase(),
    createdAt: student.createdAt,
    updatedAt: student.updatedAt,
  };
}

export function mapExam(exam, extra = {}) {
  return {
    id: exam.id,
    course: exam.course,
    subject: exam.subject,
    semester: exam.semester,
    academicYear: exam.academicYear,
    examType: exam.examType,
    maxMarks: exam.maxMarks,
    status: exam.status.toLowerCase(),
    createdAt: exam.createdAt,
    updatedAt: exam.updatedAt,
    ...extra,
  };
}

export function mapQuestion(q) {
  return {
    id: q.id,
    number: q.number,
    text: q.text,
    maxMarks: q.maxMarks,
    answerKey: q.answerKey,
  };
}

export function mapScript(script, exam) {
  const examName = exam
    ? `${exam.subject} — ${exam.examType}`
    : script.exam?.subject
      ? `${script.exam.subject} — ${script.exam.examType}`
      : "Examination";

  const ex = exam || script.exam;
  return {
    id: script.id,
    serialNumber: script.serialNumber,
    examId: script.examId,
    examName,
    course: ex?.course,
    subject: ex?.subject,
    semester: ex?.semester,
    status: scriptStatusToFrontend(script.evaluationStatus),
    totalMaxMarks: ex?.maxMarks,
    pageCount: script.pageCount,
    assignedAt: script.uploadedAt,
    ocrStatus: script.ocrStatus.toLowerCase(),
    evaluationStatus: script.evaluationStatus,
    filePath: script.filePath,
    studentId: script.studentId,
  };
}

export function mapEvaluation(evaluation, scriptId) {
  const marks = JSON.parse(evaluation.marksJson || "{}");
  return {
    scriptId: scriptId || evaluation.scriptId,
    marks,
    status: evalStatusToFrontend(evaluation.status),
    backendStatus: evaluation.status,
    total: evaluation.totalMarks,
    submittedAt: evaluation.submittedAt,
  };
}
