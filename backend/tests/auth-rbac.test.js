import test from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../src/app.js';

async function withServer(testFn) {
  const app = createApp();
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });

  const { port } = server.address();
  try {
    await testFn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test('valid login returns a JWT-backed user payload', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'faculty@amrita.edu', password: 'evaluator123' }),
    });

    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.role, 'evaluator');
    assert.equal(data.email, 'faculty@amrita.edu');
    assert.ok(data.token);
  });
});

test('invalid login is rejected with 401', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bad@example.com', password: 'wrongpass' }),
    });

    assert.equal(response.status, 401);
  });
});

test('protected routes reject unauthenticated requests', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/scripts`);
    assert.equal(response.status, 401);
  });
});

test('evaluator role is forbidden from admin-only audit route', async () => {
  await withServer(async (baseUrl) => {
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'faculty@amrita.edu', password: 'evaluator123' }),
    });
    const { token } = await loginResponse.json();

    const response = await fetch(`${baseUrl}/api/audit`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(response.status, 403);
  });
});
