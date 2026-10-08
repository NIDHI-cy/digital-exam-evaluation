import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { generateRollNumber } from "../src/services/rollNumber.service.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const prisma = new PrismaClient();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const passwordHash = await bcrypt.hash("evaluator123", 10);
  const adminHash = await bcrypt.hash("admin123", 10);
  const reviewerHash = await bcrypt.hash("reviewer123", 10);

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: "faculty@amrita.edu" },
      update: {},
      create: {
        name: "Dr. Priya Nair",
        email: "faculty@amrita.edu",
        passwordHash,
        role: "EVALUATOR",
        department: "Computer Science & Engineering",
      },
    }),
    prisma.user.upsert({
      where: { email: "admin@amrita.edu" },
      update: {},
      create: {
        name: "Prof. Rajesh Kumar",
        email: "admin@amrita.edu",
        passwordHash: adminHash,
        role: "ADMIN",
        department: "Examination Cell",
      },
    }),
    prisma.user.upsert({
      where: { email: "reviewer@amrita.edu" },
      update: {},
      create: {
        name: "Dr. Meera Iyer",
        email: "reviewer@amrita.edu",
        passwordHash: reviewerHash,
        role: "REVIEWER",
        department: "Quality Assurance",
      },
    }),
    prisma.user.upsert({
      where: { email: "examiner@amrita.edu" },
      update: {},
      create: {
        name: "Dr. Anil Menon",
        email: "examiner@amrita.edu",
        passwordHash: await bcrypt.hash("examiner123", 10),
        role: "EXAMINER",
        department: "Computer Science & Engineering",
      },
    }),
  ]);

  const evaluator = users[0];

  const studentRolls = [
    generateRollNumber({ branch: "AIE", joiningYear: 2024, rollNumber: 61 }),
    generateRollNumber({ branch: "AIE", joiningYear: 2026, rollNumber: 34 }),
    generateRollNumber({ branch: "ECE", joiningYear: 2024, rollNumber: 61 }),
    generateRollNumber({ branch: "CSE", joiningYear: 2025, rollNumber: 12 }),
  ];

  const students = [];
  for (const [i, roll] of studentRolls.entries()) {
    const branch = roll.match(/U4([A-Z]{3})/)[1];
    const year = 2000 + Number(roll.slice(-5, -3));
    students.push(
      await prisma.student.upsert({
        where: { rollNumber: roll },
        update: {},
        create: {
          name: `Student ${i + 1}`,
          rollNumber: roll,
          branch,
          joiningYear: year,
          program: "UG",
        },
      })
    );
  }

  let exam = await prisma.exam.findFirst({
    where: { course: "CSE301", subject: "Data Structures and Algorithms" },
  });

  if (!exam) {
    exam = await prisma.exam.create({
      data: {
        course: "CSE301",
        subject: "Data Structures and Algorithms",
        semester: "5",
        academicYear: "2025-26",
        examType: "End Semester Examination",
        maxMarks: 25,
        status: "ACTIVE",
        questions: {
          create: [
            {
              number: 1,
              text: "Explain B-Trees with insertion and deletion.",
              maxMarks: 5,
              answerKey: "Self-balancing tree; split/merge on overflow/underflow.",
            },
            {
              number: 2,
              text: "Analyze Merge Sort and compare with Quick Sort.",
              maxMarks: 10,
              answerKey: "O(n log n) stable vs in-place quick sort.",
            },
            {
              number: 3,
              text: "Hash tables and collision resolution.",
              maxMarks: 10,
              answerKey: "Chaining and open addressing.",
            },
          ],
        },
        assignments: {
          create: [{ userId: evaluator.id }],
        },
      },
    });
  }

  await prisma.examAssignment.upsert({
    where: { examId_userId: { examId: exam.id, userId: evaluator.id } },
    update: {},
    create: { examId: exam.id, userId: evaluator.id },
  });

  const uploadsRoot = path.resolve(__dirname, "../../uploads/scripts");
  await fs.promises.mkdir(uploadsRoot, { recursive: true });
  const placeholderPath = "scripts/seed-placeholder.txt";
  const placeholderFull = path.resolve(__dirname, "../../uploads", placeholderPath);
  await fs.promises.writeFile(
    placeholderFull,
    "Placeholder scanned answer script file for development."
  );

  const serials = ["184729", "184730", "184731", "291845", "291846"];
  for (let i = 0; i < serials.length; i++) {
    const serial = serials[i];
    await prisma.answerScript.upsert({
      where: { serialNumber: serial },
      update: { assignedToId: evaluator.id },
      create: {
        examId: exam.id,
        studentId: students[i % students.length]?.id,
        serialNumber: serial,
        filePath: placeholderPath,
        pageCount: 6 + i,
        ocrStatus: i === 0 ? "SUCCESS" : "MANUAL",
        evaluationStatus:
          i === 0 ? "NOT_STARTED" : i === 1 ? "IN_PROGRESS" : i === 2 ? "SUBMITTED" : "NOT_STARTED",
        assignedToId: evaluator.id,
      },
    });
  }

  const questions = await prisma.question.findMany({
    where: { examId: exam.id },
    orderBy: { number: "asc" },
  });
  const submittedMarks = {};
  const sampleScores = [4, 8, 7];
  questions.forEach((q, idx) => {
    if (sampleScores[idx] !== undefined) submittedMarks[q.id] = sampleScores[idx];
  });

  const scriptSubmitted = await prisma.answerScript.findUnique({
    where: { serialNumber: "184731" },
  });
  if (scriptSubmitted && questions.length) {
    await prisma.evaluation.upsert({
      where: { scriptId: scriptSubmitted.id },
      update: {},
      create: {
        scriptId: scriptSubmitted.id,
        evaluatorId: evaluator.id,
        marksJson: JSON.stringify(submittedMarks),
        totalMarks: 19,
        status: "SUBMITTED",
        submittedAt: new Date("2026-08-22T14:30:00Z"),
      },
    });
  }

  const scriptInProgress = await prisma.answerScript.findUnique({
    where: { serialNumber: "184730" },
  });
  if (scriptInProgress) {
    const questions = await prisma.question.findMany({ where: { examId: exam.id } });
    const marks = {};
    if (questions[0]) marks[questions[0].id] = 3;
    await prisma.evaluation.upsert({
      where: { scriptId: scriptInProgress.id },
      update: {},
      create: {
        scriptId: scriptInProgress.id,
        evaluatorId: evaluator.id,
        marksJson: JSON.stringify(marks),
        totalMarks: 3,
        status: "IN_PROGRESS",
      },
    });
  }

  console.log("Seed completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
