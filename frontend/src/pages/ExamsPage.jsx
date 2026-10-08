import { useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";
import { fetchExams, fetchExam, createExam, updateExam, addExamQuestions, uploadScript } from "../api/examService";
import { fetchStudents } from "../api/studentService";
import { fetchScripts, assignScriptEvaluator } from "../api/scriptService";
import Button from "../components/common/Button";
import Spinner from "../components/common/Spinner";
import Badge from "../components/common/Badge";

const makeQuestion = (number, override = {}) => ({
  number,
  text: "",
  maxMarks: 10,
  answerKey: "",
  ...override,
});

function ExamsPage() {
  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [evaluators, setEvaluators] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [examEditForm, setExamEditForm] = useState(null);
  const [examQuestions, setExamQuestions] = useState([]);
  const [examScripts, setExamScripts] = useState([]);
  const [assignmentDrafts, setAssignmentDrafts] = useState({});
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
  const [questionRows, setQuestionRows] = useState([
    makeQuestion(1),
    makeQuestion(2),
  ]);
  const [upload, setUpload] = useState({
    examId: "",
    file: null,
    pageCount: 1,
    serialNumber: "",
  });

  async function load() {
    setLoading(true);
    try {
      const [examData, studentData, evaluatorData] = await Promise.all([
        fetchExams(),
        fetchStudents(),
        axiosClient.get("/auth/users", { params: { role: "EVALUATOR" } }).then((res) => res.data),
      ]);
      setExams(examData);
      setStudents(studentData);
      setEvaluators(evaluatorData);
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

  useEffect(() => {
    if (!selectedExam) return;

    async function loadExamAssignmentData() {
      try {
        const scripts = await fetchScripts();
        const examScriptsForSelected = scripts.filter((script) => script.examId === selectedExam.id);
        setExamScripts(examScriptsForSelected);

        const nextDrafts = {};
        examScriptsForSelected.forEach((script) => {
          nextDrafts[script.id] = script.assignedToId || "";
        });
        setAssignmentDrafts(nextDrafts);
      } catch {
        setError("Failed to load assignment details.");
      }
    }

    loadExamAssignmentData();
  }, [selectedExam]);

  function addQuestionRow() {
    setQuestionRows((prev) => [...prev, makeQuestion(prev.length + 1)]);
  }

  async function handleCreateExam(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const cleaned = questionRows
        .filter((q) => q.text.trim() || q.answerKey.trim())
        .map((q, index) => ({
          number: Number(q.number || index + 1),
          text: q.text,
          maxMarks: Number(q.maxMarks),
          answerKey: q.answerKey,
        }));

      if (!cleaned.length) {
        throw new Error("Add at least one question before saving the exam.");
      }

      await createExam({
        ...examForm,
        maxMarks: Number(examForm.maxMarks),
        status: "ACTIVE",
        questions: cleaned,
      });
      setMessage("Exam created successfully.");
      setQuestionRows([makeQuestion(1), makeQuestion(2)]);
      setExamForm({
        course: "",
        subject: "",
        semester: "5",
        academicYear: "2025-26",
        examType: "End Semester Examination",
        maxMarks: 25,
      });
      await load();
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to create exam.");
    }
  }

  async function handleSaveExam(e) {
    e.preventDefault();
    if (!selectedExam || !examEditForm) return;
    setError("");
    setMessage("");
    try {
      await updateExam(selectedExam.id, {
        ...examEditForm,
        maxMarks: Number(examEditForm.maxMarks),
        status: examEditForm.status,
      });
      const cleaned = examQuestions
        .filter((q) => q.text && q.answerKey)
        .map((q, index) => ({
          number: Number(q.number || index + 1),
          text: q.text,
          maxMarks: Number(q.maxMarks),
          answerKey: q.answerKey,
        }));
      if (cleaned.length) {
        await addExamQuestions(selectedExam.id, cleaned);
      }
      const refreshed = await fetchExam(selectedExam.id);
      setSelectedExam(refreshed);
      setExamEditForm({
        course: refreshed.course,
        subject: refreshed.subject,
        semester: refreshed.semester,
        academicYear: refreshed.academicYear,
        examType: refreshed.examType,
        maxMarks: refreshed.maxMarks,
        status: refreshed.status,
      });
      setExamQuestions(refreshed.questions || []);
      setMessage("Exam updated successfully.");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update exam.");
    }
  }

  async function openExam(examId) {
    try {
      const detail = await fetchExam(examId);
      setSelectedExam(detail);
      setExamEditForm({
        course: detail.course,
        subject: detail.subject,
        semester: detail.semester,
        academicYear: detail.academicYear,
        examType: detail.examType,
        maxMarks: detail.maxMarks,
        status: detail.status,
      });
      setExamQuestions(detail.questions || []);
    } catch {
      setError("Failed to load exam details.");
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
      setMessage(`Script uploaded. Serial: ${script.serialNumber || "Review required"} (OCR: ${script.ocrStatus})`);
      setUpload((u) => ({ ...u, file: null, serialNumber: "" }));
    } catch (err) {
      setError(err.response?.data?.error || "Upload failed.");
    }
  }

  async function saveAssignment(scriptId) {
    try {
      await assignScriptEvaluator(scriptId, assignmentDrafts[scriptId] || null);
      setMessage("Evaluator assignment saved.");
      const refreshed = await fetchScripts();
      const examScriptsForSelected = refreshed.filter((script) => script.examId === selectedExam.id);
      setExamScripts(examScriptsForSelected);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to assign evaluator.");
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

            <div style={{ marginTop: 16 }}>
              <h3>Questions</h3>
              {questionRows.map((question, index) => (
                <div key={`${question.number || index}-${index}`} style={{ display: "grid", gridTemplateColumns: "60px 1.5fr 100px 1.5fr", gap: 8, marginBottom: 12 }}>
                  <input
                    className="form-input"
                    value={question.number}
                    onChange={(e) => {
                      const updated = [...questionRows];
                      updated[index].number = Number(e.target.value) || 1;
                      setQuestionRows(updated);
                    }}
                    type="number"
                    min={1}
                  />
                  <input
                    className="form-input"
                    value={question.text}
                    placeholder="Question text"
                    onChange={(e) => {
                      const updated = [...questionRows];
                      updated[index].text = e.target.value;
                      setQuestionRows(updated);
                    }}
                  />
                  <input
                    className="form-input"
                    value={question.maxMarks}
                    type="number"
                    min={1}
                    placeholder="Marks"
                    onChange={(e) => {
                      const updated = [...questionRows];
                      updated[index].maxMarks = Number(e.target.value) || 0;
                      setQuestionRows(updated);
                    }}
                  />
                  <input
                    className="form-input"
                    value={question.answerKey}
                    placeholder="Answer key"
                    onChange={(e) => {
                      const updated = [...questionRows];
                      updated[index].answerKey = e.target.value;
                      setQuestionRows(updated);
                    }}
                  />
                </div>
              ))}
              <Button type="button" variant="secondary" onClick={addQuestionRow}>Add Question</Button>
            </div>

            <div style={{ marginTop: 16 }}>
              <Button type="submit" variant="primary">Create Exam</Button>
            </div>
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
                <th>Action</th>
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
                  <td>
                    <Button variant="secondary" size="sm" onClick={() => openExam(ex.id)}>
                      Open
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedExam && examEditForm && (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card__header">
            <h2 className="card__title">Exam Details</h2>
          </div>
          <div className="card__body">
            <form onSubmit={handleSaveExam}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                {[
                  ["course", "Course"],
                  ["subject", "Subject"],
                  ["semester", "Semester"],
                  ["academicYear", "Academic Year"],
                  ["examType", "Exam Type"],
                  ["maxMarks", "Max Marks"],
                ].map(([field, label]) => (
                  <div className="form-group" key={field}>
                    <label className="form-label">{label}</label>
                    <input
                      className="form-input"
                      type={field === "maxMarks" ? "number" : "text"}
                      value={examEditForm[field]}
                      onChange={(e) => setExamEditForm({ ...examEditForm, [field]: e.target.value })}
                      required
                    />
                  </div>
                ))}
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-input"
                    value={examEditForm.status || "draft"}
                    onChange={(e) => setExamEditForm({ ...examEditForm, status: e.target.value })}
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 20 }}>
                <h3>Questions</h3>
                {examQuestions.map((question, index) => (
                  <div key={question.id || `${selectedExam.id}-${index}`} style={{ display: "grid", gridTemplateColumns: "60px 1.5fr 100px 1.5fr", gap: 8, marginBottom: 12 }}>
                    <input
                      className="form-input"
                      type="number"
                      min={1}
                      value={question.number}
                      onChange={(e) => {
                        const updated = [...examQuestions];
                        updated[index].number = Number(e.target.value) || 1;
                        setExamQuestions(updated);
                      }}
                    />
                    <input
                      className="form-input"
                      value={question.text}
                      onChange={(e) => {
                        const updated = [...examQuestions];
                        updated[index].text = e.target.value;
                        setExamQuestions(updated);
                      }}
                    />
                    <input
                      className="form-input"
                      type="number"
                      min={1}
                      value={question.maxMarks}
                      onChange={(e) => {
                        const updated = [...examQuestions];
                        updated[index].maxMarks = Number(e.target.value) || 0;
                        setExamQuestions(updated);
                      }}
                    />
                    <input
                      className="form-input"
                      value={question.answerKey}
                      onChange={(e) => {
                        const updated = [...examQuestions];
                        updated[index].answerKey = e.target.value;
                        setExamQuestions(updated);
                      }}
                    />
                  </div>
                ))}
                <Button type="button" variant="secondary" onClick={() => setExamQuestions((prev) => [...prev, makeQuestion(prev.length + 1)])}>Add Question</Button>
              </div>

              <div style={{ marginTop: 20 }}>
                <Button type="submit" variant="primary">Save Exam Changes</Button>
              </div>
            </form>

            <div style={{ marginTop: 24 }}>
              <h3>Evaluator Assignment</h3>
              {examScripts.length === 0 ? (
                <p>No scripts uploaded for this exam yet.</p>
              ) : (
                <table className="scripts-table">
                  <thead>
                    <tr>
                      <th>Script</th>
                      <th>Assigned Evaluator</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examScripts.map((script) => (
                      <tr key={script.id}>
                        <td>{script.serialNumber}</td>
                        <td>
                          <select
                            className="form-input"
                            value={assignmentDrafts[script.id] || ""}
                            onChange={(e) => setAssignmentDrafts((prev) => ({ ...prev, [script.id]: e.target.value }))}
                          >
                            <option value="">Unassigned</option>
                            {evaluators.map((user) => (
                              <option key={user.id} value={user.id}>{user.name}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <Button variant="primary" size="sm" onClick={() => saveAssignment(script.id)}>
                            Save Assignment
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExamsPage;
