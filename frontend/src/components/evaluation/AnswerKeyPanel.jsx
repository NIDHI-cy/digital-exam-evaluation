function AnswerKeyPanel({ questions }) {
  if (!questions.length) {
    return <p style={{ color: "var(--text-muted)", fontSize: 14 }}>No questions loaded.</p>;
  }

  return (
    <div>
      {questions.map((q) => (
        <div key={q.id} className="answer-key-item">
          <div className="answer-key-item__q">Q{q.number}. {q.text}</div>
          <div className="answer-key-item__marks">Max Marks: {q.maxMarks}</div>
          <div className="answer-key-item__text">{q.answerKey}</div>
        </div>
      ))}
    </div>
  );
}

export default AnswerKeyPanel;
