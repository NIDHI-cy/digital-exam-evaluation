import {
  MOCK_USERS,
  MOCK_SCRIPTS,
  MOCK_QUESTIONS,
  MOCK_EVALUATIONS,
} from "./mockData";

const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

let evaluations = structuredClone(MOCK_EVALUATIONS);
let scripts = structuredClone(MOCK_SCRIPTS);

export const mockApi = {
  async login(email, password) {
    await delay();
    const user = MOCK_USERS.find(
      (u) => u.email === email && u.password === password
    );
    if (!user) {
      const err = new Error("Invalid credentials");
      err.response = { status: 401 };
      throw err;
    }
    return {
      token: `mock-token-${user.role}-${Date.now()}`,
      role: user.role,
      name: user.name,
      email: user.email,
      department: user.department,
    };
  },

  async getScripts() {
    await delay();
    return scripts;
  },

  async getScript(id) {
    await delay();
    const script = scripts.find((s) => s.id === id);
    if (!script) {
      const err = new Error("Script not found");
      err.response = { status: 404 };
      throw err;
    }
    return script;
  },

  async getQuestions(examId) {
    await delay();
    return MOCK_QUESTIONS[examId] || [];
  },

  async getEvaluation(scriptId) {
    await delay();
    return evaluations[scriptId] || { scriptId, marks: {}, status: "draft", submittedAt: null };
  },

  async saveEvaluation(scriptId, marks) {
    await delay();
    evaluations[scriptId] = {
      scriptId,
      marks,
      status: "draft",
      submittedAt: null,
    };
    const script = scripts.find((s) => s.id === scriptId);
    if (script && script.status === "pending") {
      script.status = "in_progress";
    }
    return evaluations[scriptId];
  },

  async submitEvaluation(scriptId, marks) {
    await delay();
    evaluations[scriptId] = {
      scriptId,
      marks,
      status: "submitted",
      submittedAt: new Date().toISOString(),
    };
    const script = scripts.find((s) => s.id === scriptId);
    if (script) {
      script.status = "submitted";
    }
    return evaluations[scriptId];
  },
};
