export const MOCK_USERS = [
  {
    email: "faculty@amrita.edu",
    password: "evaluator123",
    role: "evaluator",
    name: "Dr. Priya Nair",
    department: "Computer Science & Engineering",
  },
  {
    email: "admin@amrita.edu",
    password: "admin123",
    role: "admin",
    name: "Prof. Rajesh Kumar",
    department: "Examination Cell",
  },
  {
    email: "reviewer@amrita.edu",
    password: "reviewer123",
    role: "reviewer",
    name: "Dr. Meera Iyer",
    department: "Quality Assurance",
  },
];

export const MOCK_SCRIPTS = [
  {
    id: "script-001",
    serialNumber: "184729",
    examId: "exam-ds-2026",
    examName: "Data Structures — End Semester Examination",
    course: "CSE301",
    subject: "Data Structures and Algorithms",
    semester: "5",
    status: "pending",
    totalMaxMarks: 25,
    pageCount: 8,
    assignedAt: "2026-08-20",
  },
  {
    id: "script-002",
    serialNumber: "184730",
    examId: "exam-ds-2026",
    examName: "Data Structures — End Semester Examination",
    course: "CSE301",
    subject: "Data Structures and Algorithms",
    semester: "5",
    status: "in_progress",
    totalMaxMarks: 25,
    pageCount: 10,
    assignedAt: "2026-08-20",
  },
  {
    id: "script-003",
    serialNumber: "184731",
    examId: "exam-ds-2026",
    examName: "Data Structures — End Semester Examination",
    course: "CSE301",
    subject: "Data Structures and Algorithms",
    semester: "5",
    status: "submitted",
    totalMaxMarks: 25,
    pageCount: 7,
    assignedAt: "2026-08-19",
  },
  {
    id: "script-004",
    serialNumber: "291845",
    examId: "exam-dbms-2026",
    examName: "DBMS — Mid Semester Examination",
    course: "CSE302",
    subject: "Database Management Systems",
    semester: "5",
    status: "pending",
    totalMaxMarks: 30,
    pageCount: 6,
    assignedAt: "2026-08-21",
  },
  {
    id: "script-005",
    serialNumber: "291846",
    examId: "exam-dbms-2026",
    examName: "DBMS — Mid Semester Examination",
    course: "CSE302",
    subject: "Database Management Systems",
    semester: "5",
    status: "pending",
    totalMaxMarks: 30,
    pageCount: 9,
    assignedAt: "2026-08-21",
  },
];

export const MOCK_QUESTIONS = {
  "exam-ds-2026": [
    {
      id: "q1",
      number: 1,
      text: "Explain the concept of B-Trees. Discuss insertion and deletion operations with suitable examples.",
      maxMarks: 5,
      answerKey:
        "B-Tree is a self-balancing search tree. Insertion: find leaf, insert key, split if overflow. Deletion: remove key, merge/borrow if underflow. Minimum keys = ceil(m/2)-1.",
    },
    {
      id: "q2",
      number: 2,
      text: "Implement and analyze the time complexity of Merge Sort. Compare with Quick Sort.",
      maxMarks: 10,
      answerKey:
        "Merge Sort: divide array, recursively sort halves, merge. T(n)=2T(n/2)+O(n) → O(n log n) always. Quick Sort: average O(n log n), worst O(n²). Merge Sort is stable; Quick Sort is in-place.",
    },
    {
      id: "q3",
      number: 3,
      text: "Define Hash Tables. Explain collision resolution using chaining and open addressing.",
      maxMarks: 10,
      answerKey:
        "Hash table maps keys to indices via hash function. Chaining: store collisions in linked lists at each bucket. Open addressing: probe for next empty slot (linear/quadratic probing, double hashing).",
    },
  ],
  "exam-dbms-2026": [
    {
      id: "q1",
      number: 1,
      text: "Explain ACID properties of a transaction with examples.",
      maxMarks: 10,
      answerKey:
        "Atomicity: all or nothing. Consistency: valid state to valid state. Isolation: concurrent transactions don't interfere. Durability: committed changes persist after failure.",
    },
    {
      id: "q2",
      number: 2,
      text: "Write SQL queries for the given relational schema (Employee, Department). Include JOIN, GROUP BY, and subquery examples.",
      maxMarks: 10,
      answerKey:
        "JOIN: SELECT e.name, d.dept_name FROM Employee e JOIN Department d ON e.dept_id = d.id. GROUP BY: SELECT dept_id, COUNT(*) FROM Employee GROUP BY dept_id. Subquery: SELECT name FROM Employee WHERE salary > (SELECT AVG(salary) FROM Employee).",
    },
    {
      id: "q3",
      number: 3,
      text: "Explain normalization up to 3NF with an example.",
      maxMarks: 10,
      answerKey:
        "1NF: atomic values, no repeating groups. 2NF: no partial dependency on composite key. 3NF: no transitive dependency. Example: Student(ID, Name, DeptName, DeptHead) → split into Student(ID, Name, DeptID) and Department(DeptID, DeptName, DeptHead).",
    },
  ],
};

export const MOCK_EVALUATIONS = {
  "script-002": {
    scriptId: "script-002",
    marks: { q1: 3, q2: null, q3: null },
    status: "draft",
    submittedAt: null,
  },
  "script-003": {
    scriptId: "script-003",
    marks: { q1: 4, q2: 8, q3: 7 },
    status: "submitted",
    submittedAt: "2026-08-22T14:30:00Z",
  },
};
