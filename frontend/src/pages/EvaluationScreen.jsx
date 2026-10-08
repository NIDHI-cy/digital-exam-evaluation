import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { fetchScript, fetchQuestions, fetchQuestionPageMappings, fetchScriptQuestionPaper } from "../api/scriptService";
import { fetchEvaluation, saveEvaluation, submitEvaluation, validateMarks, isComplete } from "../api/evaluationService";
import ScriptViewer from "../components/evaluation/ScriptViewer";
import DocumentPreview from "../components/evaluation/DocumentPreview";
import Spinner from "../components/common/Spinner";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";

function EvaluationScreen() {
  const { scriptId } = useParams();
  const navigate = useNavigate();
  const [script, setScript] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [mappings, setMappings] = useState({});
  const [questionPaper, setQuestionPaper] = useState(null);
  const [marks, setMarks] = useState({});
  const [comments, setComments] = useState({});
  const [dirtyQuestions, setDirtyQuestions] = useState(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState("draft");
  const [serverTotal, setServerTotal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!scriptId) return;
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [scriptData, evaluationData] = await Promise.all([
          fetchScript(scriptId),
          fetchEvaluation(scriptId),
        ]);
        const [questionData, pageData, paperData] = await Promise.all([
          fetchQuestions(scriptData.examId),
          fetchQuestionPageMappings(scriptId),
          fetchScriptQuestionPaper(scriptId),
        ]);
        if (!active) return;
        setScript(scriptData);
        setQuestions(questionData);
        setMappings(Object.fromEntries(pageData.map((mapping) => [mapping.questionId, mapping.pages])));
        setQuestionPaper(paperData);
        setMarks(evaluationData.marks || {});
        setComments(evaluationData.comments || {});
        setStatus(evaluationData.status || "draft");
        setServerTotal(evaluationData.total ?? 0);
        setDirtyQuestions(new Set());
      } catch (loadError) {
        if (active) setError(loadError.response?.data?.error || "Failed to load evaluation data.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [scriptId]);

  const currentQuestion = questions[currentIndex];
  const mappedPages = currentQuestion ? mappings[currentQuestion.id] || [] : [];
  const maxTotal = questions.reduce((sum, question) => sum + question.maxMarks, 0);
  const { total: previewTotal, errors: validationErrors, isValid } = validateMarks(questions, marks);
  const isLocked = status === "submitted" || status === "reviewed";
  const displayedTotal = dirtyQuestions.size ? previewTotal : (serverTotal ?? previewTotal);

  function markQuestionDirty(questionId) {
    setDirtyQuestions((current) => new Set(current).add(questionId));
    setMessage("");
    setError("");
  }

  function handleMarkChange(value) {
    if (!currentQuestion) return;
    setMarks((current) => ({ ...current, [currentQuestion.id]: value === "" ? null : value }));
    markQuestionDirty(currentQuestion.id);
  }

  function handleCommentChange(value) {
    if (!currentQuestion) return;
    setComments((current) => ({ ...current, [currentQuestion.id]: value }));
    markQuestionDirty(currentQuestion.id);
  }

  async function handleSaveDraft() {
    if (!scriptId || isLocked) return false;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const result = await saveEvaluation(scriptId, marks, comments);
      setStatus(result.status || "draft");
      setServerTotal(result.total);
      setDirtyQuestions(new Set());
      setMessage("Draft saved successfully.");
      return true;
    } catch (saveError) {
      setError(saveError.response?.data?.error || "Failed to save draft.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function goToQuestion(nextIndex) {
    if (nextIndex < 0 || nextIndex >= questions.length || nextIndex === currentIndex) return;
    if (dirtyQuestions.size && !(await handleSaveDraft())) return;
    setCurrentIndex(nextIndex);
  }

  async function handleSubmit() {
    const validation = validateMarks(questions, marks);
    if (!isComplete(questions, marks)) {
      setError("Enter marks for every question before submitting.");
      return;
    }
    if (!validation.isValid) {
      setError("Fix the highlighted mark values before submitting.");
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const result = await submitEvaluation(scriptId, marks, comments);
      setStatus(result.status);
      setServerTotal(result.total);
      setDirtyQuestions(new Set());
      setMessage("Evaluation submitted successfully.");
    } catch (submitError) {
      setError(submitError.response?.data?.error || "Failed to submit evaluation.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!scriptId) {
    return <div className="empty-state"><p>Select a script from the Dashboard to begin evaluation.</p><Link to="/dashboard"><Button variant="primary">Go to Dashboard</Button></Link></div>;
  }

  if (loading) return <div className="loading-center"><Spinner /><span>Loading evaluation workspace...</span></div>;
  if (!script) return <div className="app-main"><div className="alert alert--error">{error || "Evaluation data unavailable."}</div><Button variant="secondary" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button></div>;

  return (
    <div className="evaluation-workspace">
      <div className="eval-toolbar">
        <div className="eval-toolbar__info">
          <span className="eval-toolbar__serial">{script.anonymousScriptId}</span>
          <span>{script.examName}</span>
          <span>{script.course} · Sem {script.semester}</span>
          <Badge status={status === "reviewed" ? "submitted" : isLocked ? "submitted" : script.status} />
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
      </div>

      {message && <div className="alert alert--success" role="status">{message}</div>}
      {error && <div className="alert alert--error" role="alert">{error}</div>}

      {questions.length === 0 ? (
        <div className="empty-state"><p>No questions are configured for this examination.</p></div>
      ) : (
        <>
          <nav className="question-navigator" aria-label="Question progress">
            {questions.map((question, index) => {
              const hasMarks = marks[question.id] !== undefined && marks[question.id] !== null && marks[question.id] !== "";
              const isDirty = dirtyQuestions.has(question.id);
              return (
                <button
                  key={question.id}
                  type="button"
                  className={`question-navigator__item${index === currentIndex ? " is-current" : ""}${hasMarks ? " is-marked" : ""}${isDirty ? " is-dirty" : ""}`}
                  aria-current={index === currentIndex ? "step" : undefined}
                  aria-label={`Question ${question.number}${isDirty ? ", unsaved changes" : hasMarks ? ", marks saved" : ", not evaluated"}`}
                  onClick={() => goToQuestion(index)}
                >Q{question.number}</button>
              );
            })}
            <span className="question-navigator__legend">Marked · unsaved</span>
          </nav>

          <div className="eval-layout">
            <section className="eval-panel" aria-label="Question paper">
              <div className="eval-panel__header">
                <h2 className="eval-panel__title">Question Paper</h2>
                <div className="eval-panel__meta">Q{currentQuestion.number} of {questions.length} · Paper page {currentQuestion.paperPage || "not mapped"}</div>
              </div>
              <div className="eval-panel__body question-paper-panel">
                <h3>Question {currentQuestion.number}</h3>
                <p className="question-paper-panel__text">{currentQuestion.text}</p>
                <p className="answer-key-item__marks">Maximum marks: {currentQuestion.maxMarks}</p>
                <h3>Reference Answer</h3>
                <p className="answer-key-item__text">{currentQuestion.answerKey}</p>
                <DocumentPreview
                  fileUrl={questionPaper?.fileUrl}
                  pageNumber={currentQuestion.paperPage || 1}
                  altText={`Question paper page ${currentQuestion.paperPage || 1}`}
                  emptyMessage="No matching question paper is assigned to this exam and class."
                />
              </div>
            </section>

            <section className="eval-panel" aria-label="Student answer sheet">
              <div className="eval-panel__header">
                <h2 className="eval-panel__title">Student Answer Sheet</h2>
                <div className="eval-panel__meta">Script: {script.anonymousScriptId}</div>
              </div>
              <div className="eval-panel__body">
                <ScriptViewer
                  scriptId={script.id}
                  anonymousScriptId={script.anonymousScriptId}
                  question={currentQuestion}
                  mappedPages={mappedPages}
                />
              </div>
            </section>

            <section className="eval-panel" aria-label="Marks entry">
              <div className="eval-panel__header">
                <h2 className="eval-panel__title">Marks</h2>
                <div className="eval-panel__meta">Question-wise marks · server total</div>
              </div>
              <div className="eval-panel__body marks-panel">
                <h3>Question {currentQuestion.number}</h3>
                <p className="answer-key-item__marks">Maximum Marks: {currentQuestion.maxMarks}</p>
                <label className="form-group">
                  <span className="form-label">Marks Awarded</span>
                  <input
                    type="number"
                    min={0}
                    max={currentQuestion.maxMarks}
                    step={0.5}
                    className={`marks-entry__current${validationErrors[currentQuestion.id] ? " marks-row__input--error" : ""}`}
                    value={marks[currentQuestion.id] ?? ""}
                    onChange={(event) => handleMarkChange(event.target.value)}
                    disabled={isLocked}
                    aria-invalid={!!validationErrors[currentQuestion.id]}
                  />
                </label>
                {validationErrors[currentQuestion.id] && <p className="validation-error">{validationErrors[currentQuestion.id]}</p>}
                <label className="form-group">
                  <span className="form-label">Comment (optional)</span>
                  <textarea className="form-input marks-comment" value={comments[currentQuestion.id] || ""} onChange={(event) => handleCommentChange(event.target.value)} disabled={isLocked} />
                </label>
                {!isValid && <p className="validation-error">Correct mark values before submitting.</p>}
                <div className="marks-total">
                  <span className="marks-total__label">Total</span>
                  <span className="marks-total__value">{displayedTotal} / {maxTotal}</span>
                </div>
                {!isLocked && <div className="marks-actions">
                  <Button variant="secondary" onClick={handleSaveDraft} disabled={saving || submitting}>{saving ? "Saving..." : "Save Draft"}</Button>
                  <Button variant="success" onClick={handleSubmit} disabled={saving || submitting}>{submitting ? "Submitting..." : "Submit Evaluation"}</Button>
                </div>}
                <div className="question-step-controls">
                  <Button variant="secondary" onClick={() => goToQuestion(currentIndex - 1)} disabled={currentIndex === 0 || saving || submitting}>Previous</Button>
                  <span>Question {currentIndex + 1} / {questions.length}</span>
                  <Button variant="primary" onClick={() => goToQuestion(currentIndex + 1)} disabled={currentIndex >= questions.length - 1 || saving || submitting}>Next</Button>
                </div>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

export default EvaluationScreen;
