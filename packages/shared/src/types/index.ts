import { z } from 'zod';
import * as schemas from '../schemas/index.js';

export * from '../constants/index.js';

// Auth types
export type RegisterInput = z.infer<typeof schemas.registerSchema>;
export type LoginInput = z.infer<typeof schemas.loginSchema>;
export type ForgotPasswordInput = z.infer<typeof schemas.forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof schemas.resetPasswordSchema>;
export type VerifyEmailInput = z.infer<typeof schemas.verifyEmailSchema>;

// Organization types
export type CreateOrganizationInput = z.infer<typeof schemas.createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof schemas.updateOrganizationSchema>;

// Workspace types
export type CreateWorkspaceInput = z.infer<typeof schemas.createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof schemas.updateWorkspaceSchema>;

// Project types
export type CreateProjectInput = z.infer<typeof schemas.createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof schemas.updateProjectSchema>;
export type CreateProjectStatusInput = z.infer<typeof schemas.createProjectStatusSchema>;
export type UpdateProjectStatusInput = z.infer<typeof schemas.updateProjectStatusSchema>;

// Task types
export type CreateTaskInput = z.infer<typeof schemas.createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof schemas.updateTaskSchema>;
export type UpdateTaskStatusInput = z.infer<typeof schemas.updateTaskStatusSchema>;
export type AssignTaskInput = z.infer<typeof schemas.assignTaskSchema>;
export type MoveTaskInput = z.infer<typeof schemas.moveTaskSchema>;

// Comment types
export type CreateCommentInput = z.infer<typeof schemas.createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof schemas.updateCommentSchema>;

// Invitation types
export type CreateInvitationInput = z.infer<typeof schemas.createInvitationSchema>;
export type AcceptInvitationInput = z.infer<typeof schemas.acceptInvitationSchema>;

// API Standard Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  meta?: ApiPaginationMeta;
  error?: ApiErrorPayload;
}

export interface ApiPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiErrorPayload {
  code: string;
  details?: unknown;
}
