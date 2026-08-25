import { useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { login as loginApi } from "../api/authService";
import Button from "../components/common/Button";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/dashboard";

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await loginApi(email, password);
      login(data);
      navigate(from, { replace: true });
    } catch {
      setError("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-card__header">
          <div className="login-card__logo">AV</div>
          <h1 className="login-card__title">Digital Exam Evaluation</h1>
          <p className="login-card__subtitle">Amrita Vishwa Vidyapeetham</p>
        </div>

        <div className="login-card__body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                Faculty Email
              </label>
              <input
                id="email"
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="faculty@amrita.edu"
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
            </div>

            {error && <p className="form-error">{error}</p>}

            <Button type="submit" variant="primary" size="lg" disabled={loading} style={{ width: "100%" }}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {import.meta.env.VITE_USE_MOCK_API === "true" && (
            <div className="login-card__hint">
              <strong>Demo accounts (mock mode):</strong>
              <br />
              Evaluator: <code>faculty@amrita.edu</code> / <code>evaluator123</code>
              <br />
              Admin: <code>admin@amrita.edu</code> / <code>admin123</code>
              <br />
              Reviewer: <code>reviewer@amrita.edu</code> / <code>reviewer123</code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;
