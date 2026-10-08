import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validateMarksAgainstQuestions,
  canTransition,
} from '../src/services/evaluationValidation.service.js';
import { generateRollNumber } from '../src/services/rollNumber.service.js';

test('generateRollNumber creates valid Chennai roll numbers', () => {
  assert.equal(generateRollNumber({ branch: 'AIE', joiningYear: 2024, rollNumber: 61 }), 'CH.SC.U4AIE24061');
  assert.equal(generateRollNumber({ branch: 'AIE', joiningYear: 2026, rollNumber: 34 }), 'CH.SC.U4AIE26034');
  assert.equal(generateRollNumber({ branch: 'ECE', joiningYear: 2024, rollNumber: 61 }), 'CH.EN.U4ECE24061');
});

test('validateMarksAgainstQuestions accepts valid marks and calculates total', () => {
  const questions = [
    { id: 'q1', maxMarks: 10 },
    { id: 'q2', maxMarks: 5 },
    { id: 'q3', maxMarks: 10 },
  ];

  const result = validateMarksAgainstQuestions(questions, { q1: 8, q2: 5, q3: 10 });

  assert.equal(result.isValid, true);
  assert.equal(result.isComplete, true);
  assert.equal(result.total, 23);
  assert.deepEqual(result.errors, {});
});

test('validateMarksAgainstQuestions rejects negative, missing and over-limit marks', () => {
  const questions = [
    { id: 'q1', maxMarks: 10 },
    { id: 'q2', maxMarks: 5 },
  ];

  const result = validateMarksAgainstQuestions(questions, { q1: -1, q3: 2 });

  assert.equal(result.isValid, false);
  assert.equal(result.hasMissing, true);
  assert.equal(result.errors.q1, 'Marks cannot be negative');
  assert.equal(result.errors.q3, 'Unknown question');
});

test('validateMarksAgainstQuestions rejects non-numeric values', () => {
  const questions = [{ id: 'q1', maxMarks: 10 }];

  const result = validateMarksAgainstQuestions(questions, { q1: 'abc' });

  assert.equal(result.isValid, false);
  assert.equal(result.errors.q1, 'Enter a valid number');
});

test('status transitions prevent invalid flows', () => {
  assert.equal(canTransition('SUBMITTED', 'IN_PROGRESS'), false);
  assert.equal(canTransition('NOT_STARTED', 'IN_PROGRESS'), true);
  assert.equal(canTransition('IN_PROGRESS', 'SUBMITTED'), true);
});
