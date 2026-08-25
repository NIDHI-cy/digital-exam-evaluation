import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "../components/common/ProtectedRoute";
import PageLayout from "../components/layout/PageLayout";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import EvaluationScreen from "../pages/EvaluationScreen";

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
        path="/evaluate/:scriptId"
        element={
          <ProtectedRoute allowedRoles={["evaluator", "reviewer", "admin"]}>
            <PageLayout fullWidth>
              <EvaluationScreen />
            </PageLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/evaluate"
        element={
          <ProtectedRoute allowedRoles={["evaluator", "reviewer", "admin"]}>
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
