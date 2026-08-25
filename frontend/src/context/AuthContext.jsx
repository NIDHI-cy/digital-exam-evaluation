import { createContext, useContext, useState, useCallback } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [role, setRole] = useState(localStorage.getItem("role"));
  const [userName, setUserName] = useState(localStorage.getItem("userName"));
  const [userEmail, setUserEmail] = useState(localStorage.getItem("userEmail"));
  const [userDepartment, setUserDepartment] = useState(localStorage.getItem("userDepartment"));

  const login = useCallback(({ token: newToken, role: newRole, name, email, department }) => {
    localStorage.setItem("token", newToken);
    localStorage.setItem("role", newRole);
    if (name) localStorage.setItem("userName", name);
    if (email) localStorage.setItem("userEmail", email);
    if (department) localStorage.setItem("userDepartment", department);
    setToken(newToken);
    setRole(newRole);
    setUserName(name || null);
    setUserEmail(email || null);
    setUserDepartment(department || null);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userDepartment");
    setToken(null);
    setRole(null);
    setUserName(null);
    setUserEmail(null);
    setUserDepartment(null);
  }, []);

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider
      value={{ token, role, userName, userEmail, userDepartment, login, logout, isAuthenticated }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
