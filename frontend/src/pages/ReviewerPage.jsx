import { useEffect, useMemo, useState } from "react";
import axiosClient from "../api/axiosClient";
import { fetchEvaluation } from "../api/evaluationService";
import { fetchQuestions, fetchScript } from "../api/scriptService";
import { fetchAuditLogs } from "../api/auditService";
import Spinner from "../components/common/Spinner";
import Button from "../components/common/Button";

function ReviewerPage() {
  const [queue, setQueue] = useState([]);
  const [selectedScriptId, setSelectedScriptId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [marks, setMarks] = useState({});
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState("");

  const loadQueue = async () => {
    try {
      const data = await axiosClient.get("/evaluations");
      const submitted = (data.data || []).filter(
        (item) => item.status === "submitted" || item.backendStatus === "SUBMITTED"
      );
      setQueue(submitted);
      if (!selectedScriptId && submitted[0]) {
        setSelectedScriptId(submitted[0].scriptId);
      }
    } catch {
      setError("Failed to load submitted evaluations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  useEffect(() => {
    if (!selectedScriptId) return;

    async function loadSelected() {
      try {
        const [scriptData, evalData, logs] = await Promise.all([
          fetchScript(selectedScriptId),
          fetchEvaluation(selectedScriptId),
          fetchAuditLogs(200),
        ]);

        const questionData = await fetchQuestions(scriptData.examId);
        setSelected({ ...scriptData, evaluation: evalData });
        setQuestions(questionData);
        setMarks(evalData.marks || {});
        setAuditLogs((logs || []).filter((log) => log.entityType === "Evaluation" || log.entityType === "AnswerScript" || log.entityType === "Student"));

      } catch {
        setError("Failed to load evaluation review details.");
      }
    }

    loadSelected();
  }, [selectedScriptId]);

  const total = useMemo(
    () => questions.reduce((sum, q) => sum + (Number(marks[q.id]) || 0), 0),
    [questions, marks]
  );

  async function handleReview() {
    if (!selectedScriptId) return;
    setReviewing(true);
    setError("");
    try {
      const response = await axiosClient.post(`/evaluations/${selectedScriptId}/review`);
      await loadQueue();
      setSelected((prev) => (prev ? { ...prev, evaluation: { ...prev.evaluation, status: response.data.status } } : prev));
    } catch (err) {
      setError(err.response?.data?.error || "Review action failed.");
    } finally {
      setReviewing(false);
    }
  }

  if (loading) {
    return (
      <div className="loading-center">
        <Spinner />
        <span>Loading submitted evaluations...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-header__title">Reviewer Queue</h1>
        <p className="page-header__subtitle">Submitted evaluations awaiting review</p>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card__body" style={{ padding: 0 }}>
          {queue.length === 0 ? (
            <div className="empty-state">
              <p>No submitted evaluations are waiting for review.</p>
            </div>
          ) : (
            <table className="scripts-table">
              <thead>
                <tr>
                  <th>Script</th>
                  <th>Course</th>
                  <th>Student</th>
                  <th>Evaluator</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((item) => (
                  <tr key={item.scriptId || item.script?.id}>
                    <td>{item.script?.anonymousScriptId || item.scriptId}</td>
                    <td>{item.script?.examName || item.examName || "—"}</td>
                    <td>{item.studentName || "—"}</td>
                    <td>{item.evaluator?.name || "—"}</td>
                    <td>{item.total}</td>
                    <td>{item.status}</td>
                    <td>
                      <Button variant="secondary" size="sm" onClick={() => setSelectedScriptId(item.scriptId || item.script?.id)}>
                        Open
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selected && (
        <div className="card">
          <div className="card__header">
            <h2 className="card__title">Review: {selected.anonymousScriptId}</h2>
            <Button variant="primary" size="sm" onClick={handleReview} disabled={reviewing || selected.evaluation?.status === "reviewed"}>
              {reviewing ? "Reviewing..." : selected.evaluation?.status === "reviewed" ? "Reviewed" : "Approve / Mark Reviewed"}
            </Button>
          </div>

          <div className="card__body">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              <div>
                <p><strong>Anonymous Script:</strong> {selected.anonymousScriptId}</p>
                <p><strong>Course:</strong> {selected.course}</p>
                <p><strong>Subject:</strong> {selected.subject}</p>
                <p><strong>Exam:</strong> {selected.examName}</p>
              </div>
              <div>
                <p><strong>Evaluator:</strong> {selected.evaluation?.evaluator?.name || "—"}</p>
                <p><strong>Status:</strong> {selected.evaluation?.status || selected.status || "draft"}</p>
                <p><strong>Total:</strong> {total}</p>
                <p><strong>Serial:</strong> {selected.serialNumber}</p>
                <p><strong>OCR:</strong> {selected.ocrStatus}</p>
              </div>
            </div>

            <div style={{ marginTop: 24 }}>
              <h3>Questions and Marks</h3>
              {questions.map((question, index) => (
                <div key={question.id} style={{ border: "1px solid #dfe3ea", borderRadius: 10, padding: 12, marginBottom: 12 }}>
                  <p><strong>Q{question.number}.</strong> {question.text}</p>
                  <p><strong>Max marks:</strong> {question.maxMarks}</p>
                  <p><strong>Answer key:</strong> {question.answerKey}</p>
                  <p><strong>Evaluator marks:</strong> {marks[question.id] ?? "—"}</p>
                </div>
              ))}
            </div>

            {auditLogs.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <h3>Audit History</h3>
                <table className="scripts-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Action</th>
                      <th>Entity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.slice(0, 10).map((log) => (
                      <tr key={log.id}>
                        <td>{new Date(log.createdAt).toLocaleString()}</td>
                        <td>{log.action}</td>
                        <td>{log.entityType}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ReviewerPage;
