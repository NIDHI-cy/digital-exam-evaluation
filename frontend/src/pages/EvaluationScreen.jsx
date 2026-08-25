import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { fetchScript, fetchQuestions } from "../api/scriptService";
import {
  fetchEvaluation,
  saveEvaluation,
  submitEvaluation,
  validateMarks,
  isComplete,
} from "../api/evaluationService";
import ScriptViewer from "../components/evaluation/ScriptViewer";
import AnswerKeyPanel from "../components/evaluation/AnswerKeyPanel";
import MarksEntryPanel from "../components/evaluation/MarksEntryPanel";
import Spinner from "../components/common/Spinner";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";

function EvaluationScreen() {
  const { scriptId } = useParams();
  const navigate = useNavigate();

  const [script, setScript] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [marks, setMarks] = useState({});
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("draft");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!scriptId) return;

    async function load() {
      try {
        const [scriptData, evalData] = await Promise.all([
          fetchScript(scriptId),
          fetchEvaluation(scriptId),
        ]);
        const questionData = await fetchQuestions(scriptData.examId);

        setScript(scriptData);
        setQuestions(questionData);
        setMarks(evalData.marks || {});
        setStatus(evalData.status || "draft");
      } catch {
        setError("Failed to load evaluation data.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [scriptId]);

  const maxTotal = questions.reduce((sum, q) => sum + q.maxMarks, 0);
  const { total, errors: validationErrors } = validateMarks(questions, marks);

  const handleMarkChange = useCallback((questionId, value) => {
    setMarks((prev) => ({ ...prev, [questionId]: value === "" ? null : value }));
    setErrors((prev) => ({ ...prev, [questionId]: null }));
    setMessage("");
  }, []);

  async function handleSaveDraft() {
    setSaving(true);
    setMessage("");
    try {
      await saveEvaluation(scriptId, marks);
      setMessage("Draft saved successfully.");
    } catch {
      setError("Failed to save draft.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    const { errors: errs, isValid } = validateMarks(questions, marks);

    if (!isComplete(questions, marks)) {
      setError("Please enter marks for all questions before submitting.");
      setErrors(errs);
      return;
    }

    if (!isValid) {
      setErrors(errs);
      setError("Please fix validation errors before submitting.");
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const result = await submitEvaluation(scriptId, marks);
      setStatus(result.status);
      setMessage("Evaluation submitted successfully. Marks will be transferred through the university workflow.");
    } catch {
      setError("Failed to submit evaluation. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!scriptId) {
    return (
      <div className="app-main">
        <div className="empty-state">
          <p>Select a script from the Dashboard to begin evaluation.</p>
          <Link to="/dashboard">
            <Button variant="primary">Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-center">
        <Spinner />
        <span>Loading evaluation workspace...</span>
      </div>
    );
  }

  if (error && !script) {
    return (
      <div className="app-main">
        <div className="alert alert--error">{error}</div>
        <Button variant="secondary" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const isSubmitted = status === "submitted";
  const mergedErrors = { ...validationErrors, ...errors };

  return (
    <div>
      <div className="eval-toolbar">
        <div className="eval-toolbar__info">
          <span className="eval-toolbar__serial">#{script.serialNumber}</span>
          <span>{script.examName}</span>
          <span>{script.course} · Sem {script.semester}</span>
          <Badge status={isSubmitted ? "submitted" : script.status} />
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
          ← Back to Dashboard
        </Button>
      </div>

      {message && <div className="alert alert--success" style={{ margin: "12px 16px 0" }}>{message}</div>}
      {error && script && <div className="alert alert--error" style={{ margin: "12px 16px 0" }}>{error}</div>}

      <div className="eval-layout">
        <div className="eval-panel">
          <div className="eval-panel__header">
            <h3 className="eval-panel__title">Answer Script</h3>
            <div className="eval-panel__meta">Anonymous · Serial {script.serialNumber}</div>
          </div>
          <div className="eval-panel__body">
            <ScriptViewer serialNumber={script.serialNumber} pageCount={script.pageCount} />
          </div>
        </div>

        <div className="eval-panel">
          <div className="eval-panel__header">
            <h3 className="eval-panel__title">Answer Key</h3>
            <div className="eval-panel__meta">{questions.length} questions · {maxTotal} marks total</div>
          </div>
          <div className="eval-panel__body">
            <AnswerKeyPanel questions={questions} />
          </div>
        </div>

        <div className="eval-panel">
          <div className="eval-panel__header">
            <h3 className="eval-panel__title">Marks Entry</h3>
            <div className="eval-panel__meta">Auto-calculated total</div>
          </div>
          <div className="eval-panel__body">
            <MarksEntryPanel
              questions={questions}
              marks={marks}
              errors={mergedErrors}
              total={total}
              maxTotal={maxTotal}
              isSubmitted={isSubmitted}
              saving={saving}
              submitting={submitting}
              onMarkChange={handleMarkChange}
              onSaveDraft={handleSaveDraft}
              onSubmit={handleSubmit}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default EvaluationScreen;
