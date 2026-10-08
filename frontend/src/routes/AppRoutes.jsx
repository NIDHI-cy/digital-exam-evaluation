import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "../components/common/ProtectedRoute";
import PageLayout from "../components/layout/PageLayout";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import EvaluationScreen from "../pages/EvaluationScreen";
import StudentsPage from "../pages/StudentsPage";
import ExamsPage from "../pages/ExamsPage";
import AuditPage from "../pages/AuditPage";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <PageLayout>
              <Dashboard />
            </PageLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/students"
        element={
          <ProtectedRoute allowedRoles={["admin", "examiner"]}>
            <PageLayout>
              <StudentsPage />
            </PageLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/exams"
        element={
          <ProtectedRoute allowedRoles={["admin", "examiner"]}>
            <PageLayout>
              <ExamsPage />
            </PageLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/audit"
        element={
          <ProtectedRoute allowedRoles={["admin", "reviewer"]}>
            <PageLayout>
              <AuditPage />
            </PageLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/evaluate/:scriptId"
        element={
          <ProtectedRoute allowedRoles={["evaluator", "reviewer", "admin", "examiner"]}>
            <PageLayout fullWidth>
              <EvaluationScreen />
            </PageLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/evaluate"
        element={
          <ProtectedRoute allowedRoles={["evaluator", "reviewer", "admin", "examiner"]}>
            <PageLayout>
              <EvaluationScreen />
            </PageLayout>
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default AppRoutes;
