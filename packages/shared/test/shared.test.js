const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_PROJECT_STATUSES,
  TASK_PRIORITIES,
  loginSchema,
  registerSchema,
  createTaskSchema,
} = require('../dist/index.js');

describe('FlowSpace Shared Constants', () => {
  test('DEFAULT_PROJECT_STATUSES should contain 5 initial statuses', () => {
    assert.equal(DEFAULT_PROJECT_STATUSES.length, 5);
    const names = DEFAULT_PROJECT_STATUSES.map((s) => s.name);
    assert.deepEqual(names, ['Backlog', 'Todo', 'In Progress', 'In Review', 'Done']);
    const defaultStatus = DEFAULT_PROJECT_STATUSES.find((s) => s.isDefault);
    assert.equal(defaultStatus?.name, 'Todo');
  });

  test('TASK_PRIORITIES should match spec', () => {
    assert.deepEqual(TASK_PRIORITIES, ['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
  });
});

describe('FlowSpace Zod Schemas', () => {
  test('loginSchema should validate valid input', () => {
    const valid = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
    });
    assert.equal(valid.success, true);
  });

  test('loginSchema should reject invalid email', () => {
    const invalid = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'password123',
    });
    assert.equal(invalid.success, false);
  });

  test('createTaskSchema should validate valid task', () => {
    const valid = createTaskSchema.safeParse({
      title: 'Setup Monorepo',
      priority: 'HIGH',
      statusId: '123e4567-e89b-12d3-a456-426614174000',
    });
    assert.equal(valid.success, true);
  });
});
