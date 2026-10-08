import { useEffect, useState } from "react";
import axiosClient from "../../api/axiosClient";
import Button from "../common/Button";

function DocumentPreview({ fileUrl, pageNumber = 1, altText, emptyMessage }) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [mimeType, setMimeType] = useState("");
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!fileUrl) {
      setPreviewUrl("");
      return undefined;
    }

    let objectUrl;
    let active = true;
    axiosClient.get(fileUrl.replace(/^\/api/, ""), { responseType: "blob" })
      .then(async (response) => {
        if (!active) return;
        const bytes = new Uint8Array(await response.data.slice(0, 8).arrayBuffer());
        const isPng = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
          .every((byte, index) => bytes[index] === byte);
        const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
        const isPdf = response.data.slice(0, 5).type === "application/pdf" ||
          new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
        const type = isPng ? "image/png" : isJpeg ? "image/jpeg" : isPdf ? "application/pdf" :
          (response.headers["content-type"] || response.data.type || "");
        if (!type.startsWith("image/") && type !== "application/pdf") {
          setError("This document format cannot be previewed.");
          return;
        }
        objectUrl = URL.createObjectURL(response.data);
        setPreviewUrl(objectUrl);
        setMimeType(type);
        setError("");
      })
      .catch(() => {
        if (active) setError("Could not load this document.");
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileUrl]);

  if (!fileUrl) return <div className="document-preview__empty">{emptyMessage}</div>;
  if (error) return <div className="document-preview__empty">{error}</div>;
  if (!previewUrl) return <div className="document-preview__empty">Loading document...</div>;

  return (
    <div className="document-preview">
      <div className="document-preview__controls">
        <Button variant="secondary" size="sm" onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))} aria-label="Zoom out">−</Button>
        <span>{Math.round(zoom * 100)}%</span>
        <Button variant="secondary" size="sm" onClick={() => setZoom((value) => Math.min(2.5, value + 0.25))} aria-label="Zoom in">+</Button>
      </div>
      {mimeType === "application/pdf" ? (
        <iframe
          key={`${previewUrl}-${pageNumber}`}
          title={altText}
          src={`${previewUrl}#page=${pageNumber}&toolbar=0&navpanes=0`}
          style={{ transform: `scale(${zoom})`, transformOrigin: "top left", width: `${100 / zoom}%`, height: `${100 / zoom}%` }}
        />
      ) : (
        <div className="document-preview__scroll">
          <img src={previewUrl} alt={altText} style={{ transform: `scale(${zoom})` }} />
        </div>
      )}
    </div>
  );
}

export default DocumentPreview;
