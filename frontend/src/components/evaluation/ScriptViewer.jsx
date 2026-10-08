import { useEffect, useState } from "react";
import DocumentPreview from "./DocumentPreview";
import Button from "../common/Button";

function ScriptViewer({ scriptId, anonymousScriptId, question, mappedPages = [] }) {
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    setPageIndex(0);
  }, [scriptId, question?.id, mappedPages.join(",")]);

  const pageNumber = mappedPages[pageIndex];
  const fileUrl = pageNumber
    ? `/api/scripts/${scriptId}/pages/${pageNumber}/file`
    : "";

  return (
    <div className="script-viewer">
      <div className="script-viewer__identity">Script: {anonymousScriptId}</div>
      {mappedPages.length > 0 ? (
        <>
          <DocumentPreview
            fileUrl={fileUrl}
            pageNumber={pageNumber}
            altText={`${anonymousScriptId}, answer page ${pageNumber}`}
            emptyMessage="No answer page is mapped to this question."
          />
          <div className="script-viewer__controls">
            <Button
              variant="secondary"
              size="sm"
              disabled={pageIndex === 0}
              onClick={() => setPageIndex((current) => current - 1)}
            >
              Previous page
            </Button>
            <span>Page {pageNumber} · {pageIndex + 1} of {mappedPages.length}</span>
            <Button
              variant="secondary"
              size="sm"
              disabled={pageIndex >= mappedPages.length - 1}
              onClick={() => setPageIndex((current) => current + 1)}
            >
              Next page
            </Button>
          </div>
        </>
      ) : (
        <div className="script-viewer__unmapped">
          No answer pages are mapped to Q{question?.number}. CIR must map the relevant page range before evaluation.
        </div>
      )}
    </div>
  );
}

export default ScriptViewer;
