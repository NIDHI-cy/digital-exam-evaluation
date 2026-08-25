import Button from "../common/Button";

function MarksEntryPanel({
  questions,
  marks,
  errors,
  total,
  maxTotal,
  isSubmitted,
  saving,
  submitting,
  onMarkChange,
  onSaveDraft,
  onSubmit,
}) {
  return (
    <div className="marks-entry">
      {questions.map((q) => (
        <div key={q.id} className="marks-row">
          <span className="marks-row__label">Q{q.number}</span>
          <span className="marks-row__max">/ {q.maxMarks}</span>
          <input
            type="number"
            min={0}
            max={q.maxMarks}
            step={0.5}
            className={`marks-row__input${errors[q.id] ? " marks-row__input--error" : ""}`}
            value={marks[q.id] ?? ""}
            onChange={(e) => onMarkChange(q.id, e.target.value)}
            disabled={isSubmitted}
            title={errors[q.id] || ""}
          />
        </div>
      ))}

      {Object.values(errors).some(Boolean) && (
        <p className="validation-error">
          Please fix the highlighted marks before submitting.
        </p>
      )}

      <div className="marks-total">
        <span className="marks-total__label">Total</span>
        <span className="marks-total__value">
          {total} / {maxTotal}
        </span>
      </div>

      {!isSubmitted && (
        <div className="marks-actions">
          <Button variant="secondary" onClick={onSaveDraft} disabled={saving || submitting}>
            {saving ? "Saving..." : "Save Draft"}
          </Button>
          <Button variant="success" onClick={onSubmit} disabled={saving || submitting}>
            {submitting ? "Submitting..." : "Submit Evaluation"}
          </Button>
        </div>
      )}

      {isSubmitted && (
        <div className="alert alert--success" style={{ marginTop: 12 }}>
          Evaluation submitted successfully.
        </div>
      )}
    </div>
  );
}

export default MarksEntryPanel;
