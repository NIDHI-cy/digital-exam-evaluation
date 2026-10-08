import { useEffect, useState } from "react";
import axiosClient from "../../api/axiosClient";
import Button from "../common/Button";

function ScriptViewer({ scriptId, serialNumber, pageCount = 1 }) {
  const [page, setPage] = useState(1);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!scriptId || import.meta.env.VITE_USE_MOCK_API === "true") return;

    let objectUrl;
    async function loadFile() {
      try {
        const response = await axiosClient.get(`/scripts/${scriptId}/file`, {
          responseType: "blob",
        });
        objectUrl = URL.createObjectURL(response.data);
        setPreviewUrl(objectUrl);
        setLoadError("");
      } catch {
        setLoadError("Could not load scanned file.");
      }
    }
    loadFile();
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [scriptId]);

  return (
    <div className="script-viewer">
      <div className="script-viewer__page">
        {previewUrl ? (
          <>
            <img
              src={previewUrl}
              alt={`Answer script ${serialNumber}`}
              style={{ maxWidth: "100%", maxHeight: 360, objectFit: "contain" }}
              onError={() => setLoadError("Preview not available for this file type.")}
            />
            {!previewUrl.match && loadError && <p>{loadError}</p>}
          </>
        ) : (
          <>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
            <strong>Scanned Answer Script</strong>
            <p style={{ margin: "8px 0 0" }}>
              Serial: <code>{serialNumber}</code>
            </p>
            {loadError && <p style={{ fontSize: 12, color: "var(--danger)" }}>{loadError}</p>}
            {!scriptId && (
              <p style={{ margin: "12px 0 0", fontSize: 11, color: "#aaa" }}>
                Select a script to load the scanned file.
              </p>
            )}
          </>
        )}
        <p style={{ margin: "4px 0 0", fontSize: 12 }}>
          Page {page} of {pageCount}
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
