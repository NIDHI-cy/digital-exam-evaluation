import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAssignedScripts } from "../api/scriptService";
import { useAuth } from "../context/AuthContext";
import Badge from "../components/common/Badge";
import Button from "../components/common/Button";
import Spinner from "../components/common/Spinner";

function Dashboard() {
  const { userName, role } = useAuth();
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAssignedScripts()
      .then(setScripts)
      .catch(() => setError("Failed to load assigned scripts."))
      .finally(() => setLoading(false));
  }, []);

  const pending = scripts.filter((s) => s.status === "pending").length;
  const inProgress = scripts.filter((s) => s.status === "in_progress").length;
  const submitted = scripts.filter((s) => s.status === "submitted").length;

  if (loading) {
    return (
      <div className="loading-center">
        <Spinner />
        <span>Loading assigned scripts...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-header__title">
          Welcome{userName ? `, ${userName.split(" ").slice(-1)[0]}` : ""}
        </h1>
        <p className="page-header__subtitle">
          {role === "admin"
            ? "Examination administration overview"
            : "Your assigned answer scripts for evaluation"}
        </p>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__value">{scripts.length}</div>
          <div className="stat-card__label">Total Assigned</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__value">{pending}</div>
          <div className="stat-card__label">Pending</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__value">{inProgress}</div>
          <div className="stat-card__label">In Progress</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__value">{submitted}</div>
          <div className="stat-card__label">Submitted</div>
        </div>
      </div>

      <div className="card">
        <div className="card__header">
          <h2 className="card__title">Assigned Answer Scripts</h2>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Anonymous serial numbers only
          </span>
        </div>
        <div className="card__body" style={{ padding: 0 }}>
          {scripts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">📋</div>
              <p>No scripts assigned yet.</p>
            </div>
          ) : (
            <table className="scripts-table">
              <thead>
                <tr>
                  <th>Serial No.</th>
                  <th>Examination</th>
                  <th>Course</th>
                  <th>Pages</th>
                  <th>Max Marks</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {scripts.map((script) => (
                  <tr key={script.id}>
                    <td className="scripts-table__serial">{script.serialNumber}</td>
                    <td>{script.examName}</td>
                    <td>{script.course}</td>
                    <td>{script.pageCount}</td>
                    <td>{script.totalMaxMarks}</td>
                    <td>
                      <Badge status={script.status} />
                    </td>
                    <td>
                      {script.status === "submitted" ? (
                        <Button variant="ghost" size="sm" disabled>
                          Submitted
                        </Button>
                      ) : (
                        <Link to={`/evaluate/${script.id}`}>
                          <Button variant="primary" size="sm">
                            {script.status === "in_progress" ? "Continue" : "Evaluate"}
                          </Button>
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
