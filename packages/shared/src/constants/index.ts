export const ORGANIZATION_ROLES = ['OWNER', 'ADMIN', 'MEMBER'] as const;
export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

export const WORKSPACE_ROLES = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export const PROJECT_ROLES = ['MANAGER', 'MEMBER', 'VIEWER'] as const;
export type ProjectRole = (typeof PROJECT_ROLES)[number];

export const PROJECT_STATUS_CATEGORIES = ['TODO', 'IN_PROGRESS', 'DONE'] as const;
export type ProjectStatusCategory = (typeof PROJECT_STATUS_CATEGORIES)[number];

export const PROJECT_LIFECYCLE_STATUSES = [
  'PLANNING',
  'ACTIVE',
  'ON_HOLD',
  'COMPLETED',
  'CANCELLED',
] as const;
export type ProjectLifecycleStatus = (typeof PROJECT_LIFECYCLE_STATUSES)[number];

export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const DUE_DATE_STATUSES = [
  'OVERDUE',
  'TODAY',
  'THIS_WEEK',
  'NO_DUE_DATE',
] as const;
export type DueDateStatus = (typeof DUE_DATE_STATUSES)[number];

export const INVITATION_STATUSES = [
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED',
  'REVOKED',
] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

export interface DefaultProjectStatusDefinition {
  name: string;
  category: ProjectStatusCategory;
  color: string;
  position: number;
  isDefault: boolean;
}

export const DEFAULT_PROJECT_STATUSES: DefaultProjectStatusDefinition[] = [
  { name: 'Backlog', category: 'TODO', color: '#64748B', position: 0, isDefault: false },
  { name: 'Todo', category: 'TODO', color: '#94A3B8', position: 1, isDefault: true },
  { name: 'In Progress', category: 'IN_PROGRESS', color: '#3B82F6', position: 2, isDefault: false },
  { name: 'In Review', category: 'IN_PROGRESS', color: '#F59E0B', position: 3, isDefault: false },
  { name: 'Done', category: 'DONE', color: '#22C55E', position: 4, isDefault: false },
];

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
} as const;
