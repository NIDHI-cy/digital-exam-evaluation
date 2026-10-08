import { useEffect, useState } from "react";
import {
  fetchStudents,
  fetchStudent,
  createStudent,
  updateStudent,
  generateRollNumber,
  deactivateStudent,
} from "../api/studentService";
import Button from "../components/common/Button";
import Spinner from "../components/common/Spinner";

const BRANCHES = ["CSE", "AIE", "CYS", "CCE", "ECE", "RAI", "AID", "MEC"];

function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [form, setForm] = useState({
    name: "",
    branch: "AIE",
    joiningYear: new Date().getFullYear(),
    rollNumber: 1,
  });
  const [previewRoll, setPreviewRoll] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await fetchStudents({
        q: search || undefined,
        branch: branchFilter || undefined,
      });
      setStudents(data);
    } catch {
      setError("Failed to load students.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handlePreviewRoll() {
    try {
      const result = await generateRollNumber({
        branch: form.branch,
        joiningYear: Number(form.joiningYear),
        rollNumber: Number(form.rollNumber),
      });
      setPreviewRoll(result.rollNumber);
    } catch {
      setPreviewRoll("");
      setError("Could not generate roll number. Check branch and values.");
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await createStudent({
        name: form.name,
        branch: form.branch,
        joiningYear: Number(form.joiningYear),
        rollNumber: Number(form.rollNumber),
      });
      setForm({ name: "", branch: "AIE", joiningYear: new Date().getFullYear(), rollNumber: 1 });
      setPreviewRoll("");
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create student.");
    } finally {
      setSaving(false);
    }
  }

  async function openStudent(student) {
    try {
      const details = await fetchStudent(student.id);
      setSelectedStudent(details);
      setEditForm({
        name: details.name,
        branch: details.branch,
        joiningYear: details.joiningYear,
        rollNumber: String(details.rollNumber.slice(-3)),
        program: details.program,
        status: details.status,
      });
    } catch {
      setError("Failed to load student details.");
    }
  }

  async function handleSaveStudent(e) {
    e.preventDefault();
    if (!selectedStudent || !editForm) return;
    setError("");
    try {
      const updated = await updateStudent(selectedStudent.id, {
        name: editForm.name,
        branch: editForm.branch,
        joiningYear: Number(editForm.joiningYear),
        rollNumber: Number(editForm.rollNumber),
        program: editForm.program,
        status: editForm.status,
      });
      setSelectedStudent(updated);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update student.");
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-header__title">Student Management</h1>
        <p className="page-header__subtitle">AVV Chennai roll numbers (CH.SC / CH.EN)</p>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card__header">
          <h2 className="card__title">Add Student</h2>
        </div>
        <div className="card__body">
          <form onSubmit={handleCreate}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input
                  className="form-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Branch</label>
                <select
                  className="form-input"
                  value={form.branch}
                  onChange={(e) => setForm({ ...form, branch: e.target.value })}
                >
                  {BRANCHES.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Joining Year</label>
                <input
                  type="number"
                  className="form-input"
                  value={form.joiningYear}
                  onChange={(e) => setForm({ ...form, joiningYear: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Roll Sequence (1–999)</label>
                <input
                  type="number"
                  min={1}
                  max={999}
                  className="form-input"
                  value={form.rollNumber}
                  onChange={(e) => setForm({ ...form, rollNumber: e.target.value })}
                  required
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <Button type="button" variant="secondary" onClick={handlePreviewRoll}>
                Preview Roll Number
              </Button>
              {previewRoll && <code style={{ fontSize: 14 }}>{previewRoll}</code>}
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? "Creating..." : "Create Student"}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card__header">
          <h2 className="card__title">Students</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="form-input"
              placeholder="Search name or roll"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 200 }}
            />
            <select
              className="form-input"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              style={{ width: 120 }}
            >
              <option value="">All branches</option>
              {BRANCHES.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <Button variant="secondary" onClick={load}>Search</Button>
          </div>
        </div>
        <div className="card__body" style={{ padding: 0 }}>
          {loading ? (
            <div className="loading-center"><Spinner /></div>
          ) : (
            <table className="scripts-table">
              <thead>
                <tr>
                  <th>Roll Number</th>
                  <th>Name</th>
                  <th>Branch</th>
                  <th>Year</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id}>
                    <td className="scripts-table__serial">{s.rollNumber}</td>
                    <td>{s.name}</td>
                    <td>{s.branch}</td>
                    <td>{s.joiningYear}</td>
                    <td>{s.status}</td>
                    <td style={{ display: "flex", gap: 8 }}>
                      <Button variant="secondary" size="sm" onClick={() => openStudent(s)}>
                        View
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openStudent(s)}>
                        Edit
                      </Button>
                      {s.status === "active" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            await deactivateStudent(s.id);
                            await load();
                          }}
                        >
                          Deactivate
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedStudent && editForm && (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card__header">
            <h2 className="card__title">Student Details</h2>
          </div>
          <div className="card__body">
            <form onSubmit={handleSaveStudent}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Roll Number</label>
                  <input
                    className="form-input"
                    value={selectedStudent.rollNumber}
                    readOnly
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input
                    className="form-input"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Branch</label>
                  <select
                    className="form-input"
                    value={editForm.branch}
                    onChange={(e) => setEditForm({ ...editForm, branch: e.target.value })}
                  >
                    {BRANCHES.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Joining Year</label>
                  <input
                    type="number"
                    className="form-input"
                    value={editForm.joiningYear}
                    onChange={(e) => setEditForm({ ...editForm, joiningYear: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Roll Sequence</label>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    className="form-input"
                    value={editForm.rollNumber}
                    onChange={(e) => setEditForm({ ...editForm, rollNumber: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Program</label>
                  <input
                    className="form-input"
                    value={editForm.program}
                    onChange={(e) => setEditForm({ ...editForm, program: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-input"
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 12 }}>
                <Button type="button" variant="secondary" onClick={handlePreviewRoll}>
                  Preview Updated Roll
                </Button>
                {previewRoll && <code style={{ fontSize: 14 }}>{previewRoll}</code>}
                <Button type="submit" variant="primary">Save Student</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentsPage;
