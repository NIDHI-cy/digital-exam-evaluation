import { useEffect, useState } from "react";
import { fetchExams, createExam, uploadScript } from "../api/examService";
import { fetchStudents } from "../api/studentService";
import Button from "../components/common/Button";
import Spinner from "../components/common/Spinner";
import Badge from "../components/common/Badge";

function ExamsPage() {
  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [examForm, setExamForm] = useState({
    course: "",
    subject: "",
    semester: "5",
    academicYear: "2025-26",
    examType: "End Semester Examination",
    maxMarks: 25,
  });
  const [upload, setUpload] = useState({
    examId: "",
    file: null,
    pageCount: 1,
    serialNumber: "",
  });

  async function load() {
    setLoading(true);
    try {
      const [examData, studentData] = await Promise.all([fetchExams(), fetchStudents()]);
      setExams(examData);
      setStudents(studentData);
      if (examData.length && !upload.examId) {
        setUpload((u) => ({ ...u, examId: examData[0].id }));
      }
    } catch {
      setError("Failed to load exams.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreateExam(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await createExam({
        ...examForm,
        maxMarks: Number(examForm.maxMarks),
        status: "ACTIVE",
        questions: [
          {
            number: 1,
            text: "Question 1 — update via exam details as needed.",
            maxMarks: Math.floor(Number(examForm.maxMarks) / 2),
            answerKey: "Refer to official answer key.",
          },
          {
            number: 2,
            text: "Question 2",
            maxMarks: Number(examForm.maxMarks) - Math.floor(Number(examForm.maxMarks) / 2),
            answerKey: "Refer to official answer key.",
          },
        ],
      });
      setMessage("Exam created.");
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create exam.");
    }
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!upload.file || !upload.examId) return;
    setError("");
    setMessage("");
    const fd = new FormData();
    fd.append("file", upload.file);
    fd.append("examId", upload.examId);
    fd.append("pageCount", String(upload.pageCount));
    if (upload.serialNumber) fd.append("serialNumber", upload.serialNumber);
    try {
      const script = await uploadScript(fd);
      setMessage(`Script uploaded. Serial: ${script.serialNumber} (OCR: ${script.ocrStatus})`);
      setUpload((u) => ({ ...u, file: null, serialNumber: "" }));
    } catch (err) {
      setError(err.response?.data?.error || "Upload failed.");
    }
  }

  if (loading) {
    return (
      <div className="loading-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-header__title">Exam & Script Management</h1>
        <p className="page-header__subtitle">Create exams and upload scanned answer scripts</p>
      </div>

      {message && <div className="alert alert--success">{message}</div>}
      {error && <div className="alert alert--error">{error}</div>}

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card__header">
          <h2 className="card__title">Create Exam</h2>
        </div>
        <div className="card__body">
          <form onSubmit={handleCreateExam}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
              {["course", "subject", "semester", "academicYear", "examType"].map((field) => (
                <div className="form-group" key={field}>
                  <label className="form-label">{field}</label>
                  <input
                    className="form-input"
                    value={examForm[field]}
                    onChange={(e) => setExamForm({ ...examForm, [field]: e.target.value })}
                    required
                  />
                </div>
              ))}
              <div className="form-group">
                <label className="form-label">maxMarks</label>
                <input
                  type="number"
                  className="form-input"
                  value={examForm.maxMarks}
                  onChange={(e) => setExamForm({ ...examForm, maxMarks: e.target.value })}
                  required
                />
              </div>
            </div>
            <Button type="submit" variant="primary">Create Exam</Button>
          </form>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card__header">
          <h2 className="card__title">Upload Answer Script</h2>
        </div>
        <div className="card__body">
          <form onSubmit={handleUpload}>
            <div className="form-group">
              <label className="form-label">Exam</label>
              <select
                className="form-input"
                value={upload.examId}
                onChange={(e) => setUpload({ ...upload, examId: e.target.value })}
              >
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>{ex.course} — {ex.subject}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Scanned file (image/PDF)</label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setUpload({ ...upload, file: e.target.files?.[0] || null })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Page count</label>
              <input
                type="number"
                min={1}
                className="form-input"
                value={upload.pageCount}
                onChange={(e) => setUpload({ ...upload, pageCount: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Serial override (optional)</label>
              <input
                className="form-input"
                placeholder="OCR runs if empty"
                value={upload.serialNumber}
                onChange={(e) => setUpload({ ...upload, serialNumber: e.target.value })}
              />
            </div>
            <Button type="submit" variant="primary">Upload & Process OCR</Button>
          </form>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 12 }}>
            OCR extracts anonymous serial numbers only — not answer evaluation.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card__header">
          <h2 className="card__title">Exams ({students.length} students in registry)</h2>
        </div>
        <div className="card__body" style={{ padding: 0 }}>
          <table className="scripts-table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Subject</th>
                <th>Semester</th>
                <th>Max Marks</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((ex) => (
                <tr key={ex.id}>
                  <td>{ex.course}</td>
                  <td>{ex.subject}</td>
                  <td>{ex.semester}</td>
                  <td>{ex.maxMarks}</td>
                  <td><Badge status={ex.status === "active" ? "in_progress" : "pending"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ExamsPage;
