import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Button from "../common/Button";

function NavBar() {
  const { isAuthenticated, role, userName, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  if (!isAuthenticated) return null;

  const links = [
    { to: "/dashboard", label: "Dashboard" },
    ...(role === "evaluator" || role === "reviewer"
      ? [{ to: "/evaluate", label: "Evaluate" }]
      : []),
  ];

  return (
    <nav className="navbar">
      <Link to="/dashboard" className="navbar__brand">
        <div className="navbar__logo">AV</div>
        <div>
          <div className="navbar__title">Digital Exam Evaluation</div>
          <div className="navbar__subtitle">Amrita Vishwa Vidyapeetham</div>
        </div>
      </Link>

      <div className="navbar__links">
        {links.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className={`navbar__link${location.pathname.startsWith(to) ? " navbar__link--active" : ""}`}
          >
            {label}
          </Link>
        ))}

        <div className="navbar__user">
          {userName && <span style={{ fontSize: 13 }}>{userName}</span>}
          {role && <span className="navbar__role">{role}</span>}
          <Button variant="nav" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>
    </nav>
  );
}

export default NavBar;
