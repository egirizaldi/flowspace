import { z } from 'zod';
import {
  ORGANIZATION_ROLES,
  PROJECT_ROLES,
  PROJECT_STATUS_CATEGORIES,
  PROJECT_LIFECYCLE_STATUSES,
  TASK_PRIORITIES,
  WORKSPACE_ROLES,
} from '../constants/index';

// ==========================================
// Authentication Schemas
// ==========================================

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(120),
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

// ==========================================
// Organization Schemas
// ==========================================

export const createOrganizationSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters').max(150),
  slug: z
    .string()
    .min(2)
    .max(180)
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  description: z.string().max(500).optional(),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  description: z.string().max(500).optional(),
  logoUrl: z.string().url().optional().nullable(),
});

// ==========================================
// Workspace Schemas
// ==========================================

export const createWorkspaceSchema = z.object({
  name: z.string().min(2, 'Workspace name must be at least 2 characters').max(150),
  description: z.string().max(500).optional(),
  slug: z
    .string()
    .min(2)
    .max(180)
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
    .optional(),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  description: z.string().max(500).optional().nullable(),
});

// ==========================================
// Project Schemas
// ==========================================

export const createProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters').max(180),
  key: z
    .string()
    .min(2, 'Project key must be at least 2 characters')
    .max(10, 'Project key max 10 characters')
    .regex(/^[A-Z0-9]+$/, 'Project key must be uppercase alphanumeric'),
  description: z.string().max(1000).optional(),
  startDate: z.string().date().optional().nullable(),
  dueDate: z.string().date().optional().nullable(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(2).max(180).optional(),
  description: z.string().max(1000).optional().nullable(),
  status: z.enum(PROJECT_LIFECYCLE_STATUSES).optional(),
  startDate: z.string().date().optional().nullable(),
  dueDate: z.string().date().optional().nullable(),
});

// ==========================================
// Project Status Schemas
// ==========================================

export const createProjectStatusSchema = z.object({
  name: z.string().min(1).max(80),
  category: z.enum(PROJECT_STATUS_CATEGORIES),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid HEX color code'),
  position: z.number().int().min(0).optional(),
});

export const updateProjectStatusSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  category: z.enum(PROJECT_STATUS_CATEGORIES).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  position: z.number().int().min(0).optional(),
});

// ==========================================
// Task Schemas
// ==========================================

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(255),
  description: z.string().optional(),
  statusId: z.string().uuid().optional(),
  priority: z.enum(TASK_PRIORITIES).default('MEDIUM'),
  assigneeId: z.string().uuid().optional().nullable(),
  parentTaskId: z.string().uuid().optional().nullable(),
  startDate: z.string().date().optional().nullable(),
  dueDate: z.string().date().optional().nullable(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  dueDate: z.string().date().optional().nullable(),
  startDate: z.string().date().optional().nullable(),
  version: z.number().int().min(1),
});

export const updateTaskStatusSchema = z.object({
  statusId: z.string().uuid(),
  version: z.number().int().min(1),
});

export const assignTaskSchema = z.object({
  assigneeId: z.string().uuid().nullable(),
  version: z.number().int().min(1),
});

export const moveTaskSchema = z.object({
  statusId: z.string().uuid(),
  position: z.string().or(z.number()),
  version: z.number().int().min(1),
});

// ==========================================
// Comment Schemas
// ==========================================

export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(5000),
});

export const updateCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(5000),
});

// ==========================================
// Invitation Schemas
// ==========================================

export const createInvitationSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  role: z.string().min(1),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'Invitation token is required'),
});
