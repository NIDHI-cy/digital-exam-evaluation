import { useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";
import { fetchExams } from "../api/examService";
import { fetchStudents } from "../api/studentService";
import { fetchScripts, assignScriptEvaluator } from "../api/scriptService";
import DocumentPreview from "../components/evaluation/DocumentPreview";
import Button from "../components/common/Button";
import Spinner from "../components/common/Spinner";

const BRANCHES = ["CSE", "AIE", "CYS", "CCE", "ECE", "RAI", "AID", "MEC"];
const CLASS_SECTIONS = ["CSE-A", "CSE-B", "AIE-A", "AIE-B", "CYS-A", "CYS-B", "CCE-A", "ECE-A", "RAI-A", "AID-A", "MEC-A"];

function CirPage() {
  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [evaluators, setEvaluators] = useState([]);
  const [papers, setPapers] = useState([]);
  const [scripts, setScripts] = useState([]);
  const [examQuestions, setExamQuestions] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState(() => sessionStorage.getItem("cirExamId") || "");
  const [selectedScriptId, setSelectedScriptId] = useState("");
  const [mappingRows, setMappingRows] = useState([]);
  const [identityMapping, setIdentityMapping] = useState(null);
  const [serialDrafts, setSerialDrafts] = useState({});
  const [anonymityDrafts, setAnonymityDrafts] = useState({});
  const [previewScriptId, setPreviewScriptId] = useState("");
  const [previewPage, setPreviewPage] = useState(1);
  const [paperForm, setPaperForm] = useState({
    academicYear: "2026-27",
    semester: "",
    examination: "",
    branches: [],
    classSections: [],
    file: null,
  });
  const [scriptForm, setScriptForm] = useState({
    studentId: "",
    branch: "",
    classSection: "",
    files: [],
    pageCount: 1,
  });
  const [assignmentDrafts, setAssignmentDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selectedExam = exams.find((exam) => exam.id === selectedExamId);
  const examScripts = scripts.filter((script) => script.examId === selectedExamId);
  const examPapers = papers.filter((paper) => paper.examId === selectedExamId);
  const previewScript = examScripts.find((script) => script.id === previewScriptId);

  async function refreshData() {
    const [examData, studentData, evaluatorResponse, scriptData, paperResponse] = await Promise.all([
      fetchExams(),
      fetchStudents(),
      axiosClient.get("/auth/users", { params: { role: "EVALUATOR" } }),
      fetchScripts(),
      axiosClient.get("/question-papers"),
    ]);
    setExams(examData);
    setStudents(studentData);
    setEvaluators(evaluatorResponse.data);
    setScripts(scriptData);
    setPapers(paperResponse.data);
    if (!selectedExamId && examData[0]) setSelectedExamId(examData[0].id);
  }

  useEffect(() => {
    refreshData().catch(() => setError("Could not load CIR records."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedExam) return;
    setPaperForm((current) => ({
      ...current,
      academicYear: selectedExam.academicYear,
      semester: selectedExam.semester,
      examination: selectedExam.examType,
    }));
  }, [selectedExamId, selectedExam]);

  useEffect(() => {
    if (selectedExamId) sessionStorage.setItem("cirExamId", selectedExamId);
  }, [selectedExamId]);

  useEffect(() => {
    if (!selectedExamId) {
      setExamQuestions([]);
      return;
    }
    axiosClient.get(`/exams/${selectedExamId}`)
      .then((response) => setExamQuestions(response.data.questions || []))
      .catch(() => setError("Could not load exam questions."));
  }, [selectedExamId]);

  useEffect(() => {
    if (!selectedScriptId) {
      setMappingRows([]);
      return;
    }
    async function loadMappings() {
      try {
        const [examDetail, mappingResponse] = await Promise.all([
          axiosClient.get(`/exams/${selectedExamId}`),
          axiosClient.get(`/scripts/${selectedScriptId}/question-pages`),
        ]);
        const existing = new Map(mappingResponse.data.map((mapping) => [mapping.questionId, mapping]));
        setMappingRows((examDetail.data.questions || []).map((question) => ({
          questionId: question.id,
          number: question.number,
          text: question.text,
          maxMarks: question.maxMarks,
          answerKey: question.answerKey,
          paperPage: question.paperPage || "",
          startPage: existing.get(question.id)?.startPage || "",
          endPage: existing.get(question.id)?.endPage || "",
        })));
      } catch {
        setError("Could not load question-to-answer-page mappings.");
      }
    }
    loadMappings();
  }, [selectedScriptId, selectedExamId]);

  function updateAssignment(scriptId, assignedToId) {
    setAssignmentDrafts((current) => ({ ...current, [scriptId]: assignedToId }));
  }

  async function saveAssignment(scriptId) {
    setError("");
    setMessage("");
    try {
      await assignScriptEvaluator(scriptId, assignmentDrafts[scriptId] || null);
      setMessage("Evaluator assignment saved.");
      await refreshData();
    } catch (err) {
      setError(err.response?.data?.error || "Could not save evaluator assignment.");
    }
  }

  async function saveSerial(scriptId) {
    setError("");
    setMessage("");
    try {
      await axiosClient.put(`/scripts/${scriptId}/serial`, { serialNumber: serialDrafts[scriptId] || "" });
      setMessage("Serial corrected. The script can now be assigned for evaluation.");
      await refreshData();
    } catch (err) {
      setError(err.response?.data?.error || "Could not correct the script serial.");
    }
  }

  async function saveAnonymityVerification(scriptId) {
    setError("");
    setMessage("");
    try {
      const verified = Boolean(anonymityDrafts[scriptId]);
      await axiosClient.put(`/scripts/${scriptId}/anonymity`, { verified });
      setMessage(verified ? "Script anonymization verified." : "Anonymity verification revoked.");
      await refreshData();
    } catch (err) {
      setError(err.response?.data?.error || "Could not save the anonymity review.");
    }
  }

  async function handlePaperUpload(event) {
    event.preventDefault();
    if (!selectedExam || !paperForm.file) return;
    setSaving(true);
    setError("");
    setMessage("");
    const formData = new FormData();
    formData.append("file", paperForm.file);
    formData.append("examId", selectedExam.id);
    formData.append("academicYear", paperForm.academicYear);
    formData.append("semester", paperForm.semester);
    formData.append("examination", paperForm.examination);
    formData.append("course", selectedExam.course);
    formData.append("subject", selectedExam.subject);
    formData.append("branches", JSON.stringify(paperForm.branches));
    formData.append("classSections", JSON.stringify(paperForm.classSections));
    try {
      const response = await axiosClient.post("/question-papers", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage(`Question paper uploaded for ${response.data.targets.length} branch/class targets.`);
      setPaperForm((current) => ({ ...current, file: null }));
      await refreshData();
    } catch (err) {
      setError(err.response?.data?.error || "Question-paper upload failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleScriptUpload(event) {
    event.preventDefault();
    if (!selectedExam || !scriptForm.files.length) return;
    setSaving(true);
    setError("");
    setMessage("");
    const formData = new FormData();
    formData.append("examId", selectedExam.id);
    formData.append("branch", scriptForm.branch);
    formData.append("classSection", scriptForm.classSection);
    if (scriptForm.studentId) formData.append("studentId", scriptForm.studentId);
    formData.set("pageCount", String(scriptForm.files.length > 1 ? scriptForm.files.length : scriptForm.pageCount));
    try {
      scriptForm.files.forEach((file) => formData.append("files", file));
      const response = await axiosClient.post("/scripts/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const script = response.data;
      setMessage(`Script uploaded. ${script?.serialNumber || "Review Required"} (OCR: ${script?.ocrStatus}).`);
      setScriptForm((current) => ({ ...current, files: [], studentId: "" }));
      await refreshData();
      if (script?.id) setSelectedScriptId(script.id);
    } catch (err) {
      setError(err.response?.data?.error || "Script upload failed.");
    } finally {
      setSaving(false);
    }
  }

  function addQuestionToExam() {
    const nextNumber = mappingRows.reduce((maximum, question) => Math.max(maximum, question.number), 0) + 1;
    setMappingRows((current) => [...current, {
      questionId: null,
      number: nextNumber,
      text: "",
      maxMarks: 5,
      answerKey: "",
      paperPage: "",
      startPage: "",
      endPage: "",
    }]);
  }

  async function savePageMappings(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const script = examScripts.find((item) => item.id === selectedScriptId);
      const applicablePaper = examPapers.find((paper) => paper.targets.some((target) =>
        target.branch === script?.branch &&
        (!script.classSection || target.classSection === script.classSection)
      ));
      const questionResponse = await axiosClient.post(`/exams/${selectedExamId}/questions`, mappingRows.map((row) => ({
        number: Number(row.number),
        text: row.text,
        maxMarks: Number(row.maxMarks),
        answerKey: row.answerKey,
        ...(applicablePaper ? { questionPaperId: applicablePaper.id } : {}),
        ...(row.paperPage ? { paperPage: Number(row.paperPage) } : {}),
      })));
      const savedQuestions = new Map(questionResponse.data.map((question) => [question.number, question]));
      const mappings = mappingRows
        .filter((row) => row.startPage !== "" && row.endPage !== "")
        .map((row) => ({
          questionId: savedQuestions.get(Number(row.number)).id,
          startPage: Number(row.startPage),
          endPage: Number(row.endPage),
        }));
      await axiosClient.put(`/scripts/${selectedScriptId}/question-pages`, mappings);
      setMappingRows((current) => current.map((row) => ({
        ...row,
        questionId: savedQuestions.get(Number(row.number)).id,
      })));
      setMessage("Question-to-answer-page mappings saved.");
    } catch (err) {
      setError(err.response?.data?.error || "Could not save page mappings.");
    } finally {
      setSaving(false);
    }
  }

  async function showIdentityMapping(scriptId) {
    try {
      const response = await axiosClient.get(`/scripts/${scriptId}/mapping`);
      setIdentityMapping(response.data.student);
    } catch (err) {
      setError(err.response?.data?.error || "Could not load the authorized student mapping.");
    }
  }

  if (loading) return <div className="loading-center"><Spinner /></div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-header__title">CIR Examination Desk</h1>
        <p className="page-header__subtitle">Question papers, anonymous answer scripts, and evaluator assignments</p>
      </div>
      {message && <div className="alert alert--success">{message}</div>}
      {error && <div className="alert alert--error">{error}</div>}

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card__header"><h2 className="card__title">Examination</h2></div>
        <div className="card__body">
          <div className="form-group">
            <label className="form-label">Examination / Course</label>
            <select className="form-input" value={selectedExamId} onChange={(event) => setSelectedExamId(event.target.value)}>
              {exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.academicYear} · Semester {exam.semester} · {exam.examType} · {exam.course} / {exam.subject}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card__header"><h2 className="card__title">Upload Question Paper</h2></div>
        <div className="card__body">
          <form onSubmit={handlePaperUpload}>
            <div className="form-grid">
              <label className="form-group"><span className="form-label">Academic Year</span><input className="form-input" value={paperForm.academicYear} onChange={(event) => setPaperForm({ ...paperForm, academicYear: event.target.value })} required /></label>
              <label className="form-group"><span className="form-label">Semester</span><input className="form-input" value={paperForm.semester} onChange={(event) => setPaperForm({ ...paperForm, semester: event.target.value })} required /></label>
              <label className="form-group"><span className="form-label">Examination</span><input className="form-input" value={paperForm.examination} onChange={(event) => setPaperForm({ ...paperForm, examination: event.target.value })} required /></label>
              <div className="form-group"><span className="form-label">Course / Subject</span><input className="form-input" value={selectedExam ? `${selectedExam.course} / ${selectedExam.subject}` : ""} readOnly /></div>
              <label className="form-group"><span className="form-label">Applicable Branches (multiple)</span><select className="form-input" multiple size={4} value={paperForm.branches} onChange={(event) => setPaperForm({ ...paperForm, branches: Array.from(event.target.selectedOptions, (option) => option.value) })}>{BRANCHES.map((branch) => <option key={branch} value={branch}>{branch}</option>)}</select></label>
              <label className="form-group"><span className="form-label">Applicable Classes / Sections (multiple)</span><select className="form-input" multiple size={4} value={paperForm.classSections} onChange={(event) => setPaperForm({ ...paperForm, classSections: Array.from(event.target.selectedOptions, (option) => option.value) })} required>{CLASS_SECTIONS.map((classSection) => <option key={classSection} value={classSection}>{classSection}</option>)}</select></label>
              <label className="form-group"><span className="form-label">Question paper (PDF, PNG, JPG)</span><input type="file" accept="application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg" onChange={(event) => setPaperForm({ ...paperForm, file: event.target.files?.[0] || null })} required /></label>
            </div>
            <Button type="submit" variant="primary" disabled={saving || !selectedExam}>Upload Question Paper</Button>
          </form>
          {examPapers.length > 0 && <div className="table-wrap"><table className="scripts-table"><thead><tr><th>Paper</th><th>Targets</th><th>Uploaded</th></tr></thead><tbody>{examPapers.map((paper) => <tr key={paper.id}><td>{paper.originalName}</td><td>{paper.targets.map((target) => `${target.branch} / ${target.classSection}`).join(", ")}</td><td>{new Date(paper.uploadedAt).toLocaleString()}</td></tr>)}</tbody></table></div>}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card__header"><h2 className="card__title">Upload / Scan Answer Scripts</h2></div>
        <div className="card__body">
          <form onSubmit={handleScriptUpload}>
            <div className="form-grid">
              <label className="form-group"><span className="form-label">Student mapping (CIR/Admin only)</span><select className="form-input" value={scriptForm.studentId} onChange={(event) => { const student = students.find((row) => row.id === event.target.value); setScriptForm({ ...scriptForm, studentId: event.target.value, branch: student?.branch || scriptForm.branch }); }}><option value="">Unmapped / resolve manually</option>{students.map((student) => <option key={student.id} value={student.id}>{student.name} · {student.rollNumber}</option>)}</select></label>
              <label className="form-group"><span className="form-label">Branch</span><select className="form-input" value={scriptForm.branch} onChange={(event) => setScriptForm({ ...scriptForm, branch: event.target.value })} required><option value="">Select branch</option>{BRANCHES.map((branch) => <option key={branch} value={branch}>{branch}</option>)}</select></label>
              <label className="form-group"><span className="form-label">Class / Section</span><select className="form-input" value={scriptForm.classSection} onChange={(event) => setScriptForm({ ...scriptForm, classSection: event.target.value })} required><option value="">Select class</option>{CLASS_SECTIONS.map((classSection) => <option key={classSection} value={classSection}>{classSection}</option>)}</select></label>
              <label className="form-group"><span className="form-label">Answer-script pages (select multiple image pages or one PDF)</span><input type="file" multiple accept="application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg" onChange={(event) => setScriptForm({ ...scriptForm, files: Array.from(event.target.files || []) })} required /></label>
              <label className="form-group"><span className="form-label">PDF page count</span><input type="number" min={1} className="form-input" value={scriptForm.pageCount} onChange={(event) => setScriptForm({ ...scriptForm, pageCount: event.target.value })} /></label>
            </div>
            <Button type="submit" variant="primary" disabled={saving || !selectedExam}>Upload / Scan Answer Scripts</Button>
          </form>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card__header"><h2 className="card__title">Script Mapping & Evaluator Assignment</h2></div>
        <div className="card__body" style={{ padding: 0 }}>
          <div className="table-wrap"><table className="scripts-table"><thead><tr><th>Anonymous ID</th><th>Serial / OCR</th><th>Scan Review</th><th>Identity Review</th><th>Student Mapping</th><th>Evaluator</th><th>Action</th></tr></thead><tbody>
            {examScripts.map((script) => <tr key={script.id}>
              <td>{script.anonymousScriptId}</td><td>{script.serialNumber || "Review Required"} · {script.ocrStatus}{!script.serialNumber && <div className="cir-serial-correction"><input className="form-input" aria-label={`Correct serial for ${script.anonymousScriptId}`} placeholder="5–8 digit serial" value={serialDrafts[script.id] || ""} onChange={(event) => setSerialDrafts((current) => ({ ...current, [script.id]: event.target.value }))} /><Button variant="secondary" size="sm" onClick={() => saveSerial(script.id)}>Save serial</Button></div>}</td>
              <td><Button variant="secondary" size="sm" onClick={() => { setPreviewScriptId(script.id); setPreviewPage(1); }}>Preview scan</Button></td>
              <td>
                <label className="cir-anonymity-check">
                  <input
                    type="checkbox"
                    aria-label={`Identifiers removed for ${script.anonymousScriptId}`}
                    checked={anonymityDrafts[script.id] ?? script.anonymityVerified}
                    disabled={!script.serialNumber}
                    onChange={(event) => setAnonymityDrafts((current) => ({ ...current, [script.id]: event.target.checked }))}
                  />
                  Names/rolls removed or covered
                </label>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!script.serialNumber || (anonymityDrafts[script.id] ?? script.anonymityVerified) === script.anonymityVerified}
                  onClick={() => saveAnonymityVerification(script.id)}
                >
                  Save review
                </Button>
              </td>
              <td><Button variant="ghost" size="sm" onClick={() => showIdentityMapping(script.id)}>View mapping</Button></td>
              <td><select className="form-input" value={assignmentDrafts[script.id] ?? script.assignedToId ?? ""} disabled={!script.serialNumber || !script.anonymityVerified} onChange={(event) => updateAssignment(script.id, event.target.value)}><option value="">Unassigned</option>{evaluators.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></td>
              <td><Button variant="primary" size="sm" disabled={!script.serialNumber || !script.anonymityVerified} onClick={() => saveAssignment(script.id)}>Save assignment</Button></td>
            </tr>)}
          </tbody></table></div>
        </div>
      </div>

      {previewScript && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card__header">
            <h2 className="card__title">Scan Review · {previewScript.anonymousScriptId}</h2>
            <span>Page {previewPage} of {previewScript.pageCount}</span>
          </div>
          <div className="card__body">
            <DocumentPreview
              fileUrl={`/api/scripts/${previewScript.id}/pages/${previewPage}/file`}
              pageNumber={previewPage}
              altText={`${previewScript.anonymousScriptId}, page ${previewPage}`}
              emptyMessage="No scanned page is available."
            />
            <div className="question-step-controls">
              <Button variant="secondary" disabled={previewPage <= 1} onClick={() => setPreviewPage((current) => current - 1)}>Previous page</Button>
              <Button variant="secondary" disabled={previewPage >= previewScript.pageCount} onClick={() => setPreviewPage((current) => current + 1)}>Next page</Button>
            </div>
          </div>
        </div>
      )}

      {identityMapping && <div className="card" style={{ marginBottom: 24 }}><div className="card__header"><h2 className="card__title">Authorized Student Mapping</h2></div><div className="card__body"><p>{identityMapping.name} · {identityMapping.rollNumber} · {identityMapping.branch}</p></div></div>}

      <div className="card">
        <div className="card__header"><h2 className="card__title">Question-to-Answer-Page Mapping</h2></div>
        <div className="card__body">
          <div className="form-group"><label className="form-label">Answer script</label><select className="form-input" value={selectedScriptId} onChange={(event) => setSelectedScriptId(event.target.value)}><option value="">Select script</option>{examScripts.map((script) => <option key={script.id} value={script.id}>{script.anonymousScriptId} · {script.serialNumber || "Review Required"}</option>)}</select></div>
          {selectedScriptId && (
            <form onSubmit={savePageMappings}>
              <div className="table-wrap">
                <table className="scripts-table">
                  <thead>
                    <tr>
                      <th>Question</th>
                      <th>Prompt</th>
                      <th>Max Marks</th>
                      <th>Reference Answer</th>
                      <th>Paper Page</th>
                      <th>Answer Start</th>
                      <th>Answer End</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappingRows.map((row, index) => (
                      <tr key={row.questionId || `new-${row.number}`}>
                        <td>Q{row.number}</td>
                        <td><input className="form-input" aria-label={`Question ${row.number} prompt`} value={row.text} onChange={(event) => setMappingRows((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, text: event.target.value } : item))} required /></td>
                        <td><input className="form-input" aria-label={`Question ${row.number} max marks`} type="number" min={0.5} step={0.5} value={row.maxMarks} onChange={(event) => setMappingRows((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, maxMarks: event.target.value } : item))} required /></td>
                        <td><textarea className="form-input" aria-label={`Question ${row.number} reference answer`} value={row.answerKey} onChange={(event) => setMappingRows((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, answerKey: event.target.value } : item))} required /></td>
                        <td><input className="form-input" aria-label={`Question ${row.number} paper page`} type="number" min={1} value={row.paperPage} onChange={(event) => setMappingRows((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, paperPage: event.target.value } : item))} /></td>
                        <td><input className="form-input" aria-label={`Question ${row.number} answer start page`} type="number" min={1} max={examScripts.find((script) => script.id === selectedScriptId)?.pageCount} value={row.startPage} onChange={(event) => setMappingRows((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, startPage: event.target.value } : item))} required /></td>
                        <td><input className="form-input" aria-label={`Question ${row.number} answer end page`} type="number" min={1} max={examScripts.find((script) => script.id === selectedScriptId)?.pageCount} value={row.endPage} onChange={(event) => setMappingRows((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, endPage: event.target.value } : item))} required /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="question-step-controls">
                <Button type="button" variant="secondary" onClick={addQuestionToExam}>Add question</Button>
                <Button type="submit" variant="primary" disabled={saving}>Save questions and page mappings</Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default CirPage;
