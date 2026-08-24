import { BrowserRouter, Routes, Route } from "react-router-dom";
import PageLayout from "./components/layout/PageLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import EvaluationScreen from "./pages/EvaluationScreen";

function App() {
  return (
    <BrowserRouter>
      <PageLayout>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/evaluate" element={<EvaluationScreen />} />
        </Routes>
      </PageLayout>
    </BrowserRouter>
  );
}

export default App;