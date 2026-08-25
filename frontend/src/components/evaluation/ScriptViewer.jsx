import { useState } from "react";
import Button from "../common/Button";

function ScriptViewer({ serialNumber, pageCount = 1 }) {
  const [page, setPage] = useState(1);

  return (
    <div className="script-viewer">
      <div className="script-viewer__page">
        <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
        <strong>Scanned Answer Script</strong>
        <p style={{ margin: "8px 0 0" }}>
          Serial: <code>{serialNumber}</code>
        </p>
        <p style={{ margin: "4px 0 0", fontSize: 12 }}>
          Page {page} of {pageCount}
        </p>
        <p style={{ margin: "12px 0 0", fontSize: 11, color: "#aaa" }}>
          Scanned script preview will appear here once backend storage is connected.
        </p>
      </div>

      <div className="script-viewer__controls">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          ← Prev
        </Button>
        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
          {page} / {pageCount}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => setPage((p) => p + 1)}
        >
          Next →
        </Button>
      </div>
    </div>
  );
}

export default ScriptViewer;
