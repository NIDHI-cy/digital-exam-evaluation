import { useEffect, useState } from "react";
import { fetchAuditLogs } from "../api/auditService";
import Spinner from "../components/common/Spinner";

function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAuditLogs(100)
      .then(setLogs)
      .catch(() => setError("Failed to load audit logs."))
      .finally(() => setLoading(false));
  }, []);

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
        <h1 className="page-header__title">Audit Trail</h1>
        <p className="page-header__subtitle">Accountability log for evaluation workflow</p>
      </div>
      {error && <div className="alert alert--error">{error}</div>}
      <div className="card">
        <div className="card__body" style={{ padding: 0 }}>
          <table className="scripts-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Action</th>
                <th>Entity</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.createdAt).toLocaleString()}</td>
                  <td>{log.user?.name || "—"}</td>
                  <td>{log.action}</td>
                  <td>{log.entityType} {log.entityId ? `(${log.entityId.slice(0, 8)}…)` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AuditPage;
