'use client';

import React, { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FolderKanban,
  Users,
  Settings,
  Shield,
  Loader2,
  Calendar,
  Layers,
  ArrowRight,
  Kanban,
  Clock,
  ArrowLeft,
  Plus,
  CheckCircle2,
  ListTodo,
  Search,
  Tag,
  User as UserIcon,
} from 'lucide-react';
import { useOrganizations } from '@/hooks/use-organization';
import { useOrganizationWorkspaces } from '@/hooks/use-workspace';
import { useWorkspaceProjects, useProject } from '@/hooks/use-project';
import { useProjectTasks } from '@/hooks/use-tasks';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CreateTaskModal } from '@/components/tasks/create-task-modal';
import { TaskDetailModal } from '@/components/tasks/task-detail-modal';
import { KanbanBoard } from '@/components/kanban/kanban-board';
import {
  BoardFilterBar,
  DEFAULT_BOARD_FILTERS,
  BoardFilters,
} from '@/components/kanban/board-filter-bar';
import { TaskPriority } from '@flowspace/shared';

interface PageProps {
  params: Promise<{
    orgSlug: string;
    workspaceSlug: string;
    projectKey: string;
  }>;
}

export default function ProjectOverviewPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const { orgSlug, workspaceSlug, projectKey } = resolvedParams;
  const router = useRouter();

  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [createTaskStatusId, setCreateTaskStatusId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [boardFilters, setBoardFilters] = useState<BoardFilters>(DEFAULT_BOARD_FILTERS);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const { data: organizations = [], isLoading: isOrgsLoading } = useOrganizations();
  const currentOrg = organizations.find((o) => o.slug === orgSlug);

  const { data: workspaces = [], isLoading: isWorkspacesLoading } =
    useOrganizationWorkspaces(currentOrg?.id || null);
  const currentWs = workspaces.find((w) => w.slug === workspaceSlug);

  const { data: projects = [], isLoading: isProjectsLoading } =
    useWorkspaceProjects(currentWs?.id || null, { includeArchived: true });
  const currentProjectSummary = projects.find(
    (p) => p.key.toUpperCase() === projectKey.toUpperCase(),
  );

  const { data: projectDetail, isLoading: isDetailLoading } = useProject(
    currentProjectSummary?.id || null,
  );

  const project = projectDetail || currentProjectSummary;

  const { data: allTasks = [] } = useProjectTasks(project?.id || null);

  const queryTasksOptions = {
    search: boardFilters.search.trim() || undefined,
    priority: boardFilters.priority !== 'ALL' ? boardFilters.priority : undefined,
    assigneeId: boardFilters.assigneeId !== 'ALL' ? boardFilters.assigneeId : undefined,
    labelId: boardFilters.labelId !== 'ALL' ? boardFilters.labelId : undefined,
    dueDateStatus: boardFilters.dueDateStatus !== 'ALL' ? boardFilters.dueDateStatus : undefined,
    statusId: statusFilter !== 'ALL' ? statusFilter : undefined,
  };

  const { data: listTasks = [], isLoading: isTasksLoading } = useProjectTasks(
    project?.id || null,
    queryTasksOptions,
  );

  if (isOrgsLoading || isWorkspacesLoading || isProjectsLoading || isDetailLoading) {
    return (
      <DashboardLayout activeOrgSlug={orgSlug} activeWorkspaceSlug={workspaceSlug}>
        <div className="h-64 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm">Loading project...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!currentOrg || !currentWs || !currentProjectSummary || !project) {
    return (
      <DashboardLayout activeOrgSlug={orgSlug} activeWorkspaceSlug={workspaceSlug}>
        <div className="p-8 text-center max-w-md mx-auto">
          <h2 className="text-lg font-semibold text-foreground">
            Project not found
          </h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            The project &quot;{projectKey}&quot; could not be found in this workspace.
          </p>
          <Button
            onClick={() =>
              router.push(`/${currentOrg?.slug || orgSlug}/${currentWs?.slug || workspaceSlug}`)
            }
          >
            Back to Workspace
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Filter tasks for list view (fetched from backend with exact filters)
  const filteredTasks = listTasks;

  const isAnyFilterActive = Boolean(
    boardFilters.search.trim() ||
      boardFilters.priority !== 'ALL' ||
      boardFilters.assigneeId !== 'ALL' ||
      boardFilters.labelId !== 'ALL' ||
      boardFilters.dueDateStatus !== 'ALL' ||
      statusFilter !== 'ALL',
  );

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'URGENT':
        return <Badge variant="danger" className="text-[10px] px-1.5 py-0">Urgent</Badge>;
      case 'HIGH':
        return <Badge variant="warning" className="text-[10px] px-1.5 py-0">High</Badge>;
      case 'MEDIUM':
        return <Badge variant="info" className="text-[10px] px-1.5 py-0">Medium</Badge>;
      case 'LOW':
      default:
        return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Low</Badge>;
    }
  };

  return (
    <DashboardLayout activeOrgSlug={orgSlug} activeWorkspaceSlug={workspaceSlug}>
      <div className="space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link
            href={`/${orgSlug}/${workspaceSlug}`}
            className="hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{currentWs.name}</span>
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium font-mono">{project.key}</span>
        </div>

        {/* Project Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-xl shrink-0 font-mono">
              {project.key}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-foreground">
                  {project.name}
                </h1>
                <Badge
                  variant="outline"
                  className={`text-xs font-mono uppercase ${
                    project.status === 'ACTIVE'
                      ? 'text-status-success border-status-success/30 bg-status-success/5'
                      : project.status === 'COMPLETED'
                      ? 'text-blue-400 border-blue-400/30 bg-blue-400/5'
                      : 'text-muted-foreground'
                  }`}
                >
                  {project.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                /{orgSlug}/{workspaceSlug}/{project.key}
              </p>
              {project.description && (
                <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
                  {project.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <Button
              onClick={() => {
                setCreateTaskStatusId(null);
                setIsCreateTaskOpen(true);
              }}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Task</span>
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                router.push(`/${orgSlug}/${workspaceSlug}/${project.key}/settings`)
              }
              className="flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              <span>Project Settings</span>
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5 text-xs">
                <ListTodo className="w-4 h-4 text-primary" /> Total Tasks
              </CardDescription>
              <CardTitle className="text-2xl font-bold">
                {allTasks.length}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5 text-xs">
                <Users className="w-4 h-4 text-primary" /> Project Members
              </CardDescription>
              <CardTitle className="text-2xl font-bold">
                {projectDetail?.members?.length || project._count?.members || 1}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5 text-xs">
                <FolderKanban className="w-4 h-4 text-primary" /> Workflow Stages
              </CardDescription>
              <CardTitle className="text-2xl font-bold">
                {project.statuses?.length || 5}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5 text-xs">
                <Calendar className="w-4 h-4 text-primary" /> Due Date
              </CardDescription>
              <CardTitle className="text-sm font-medium pt-1 font-mono">
                {project.dueDate
                  ? new Date(project.dueDate).toLocaleDateString()
                  : 'No deadline set'}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Tasks & Kanban Section */}
        <div className="space-y-4">
          {/* Header Row: Title + View Switcher + Filter Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <span>Tasks</span>
                  <span className="text-xs font-normal text-muted-foreground font-mono">
                    ({allTasks.length})
                  </span>
                </h2>
                <p className="text-xs text-muted-foreground">
                  Manage issues, backlog, and sprint workflow.
                </p>
              </div>

              {/* View Switcher: Board vs List */}
              <div className="flex items-center bg-surface border border-border rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('board')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    viewMode === 'board'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-surface-elevated'
                  }`}
                >
                  <Kanban className="w-3.5 h-3.5" />
                  <span>Board</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-surface-elevated'
                  }`}
                >
                  <ListTodo className="w-3.5 h-3.5" />
                  <span>List</span>
                </button>
              </div>
            </div>

            {/* Filter controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {viewMode === 'list' && (
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-8 rounded-md border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ALL">All Statuses</option>
                  {(project.statuses || []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}

              <BoardFilterBar
                projectId={project.id}
                filters={boardFilters}
                onChange={setBoardFilters}
                onReset={() => {
                  setBoardFilters(DEFAULT_BOARD_FILTERS);
                  setStatusFilter('ALL');
                }}
              />
            </div>
          </div>

          {/* View Content: Kanban Board View OR List View */}
          {viewMode === 'board' ? (
            <KanbanBoard
              projectId={project.id}
              filters={{
                search: boardFilters.search.trim() || undefined,
                priority: boardFilters.priority !== 'ALL' ? boardFilters.priority : undefined,
                assigneeId: boardFilters.assigneeId !== 'ALL' ? boardFilters.assigneeId : undefined,
                labelId: boardFilters.labelId !== 'ALL' ? boardFilters.labelId : undefined,
                dueDateStatus: boardFilters.dueDateStatus !== 'ALL' ? boardFilters.dueDateStatus : undefined,
              }}
              onTaskClick={(id) => setSelectedTaskId(id)}
              onAddTaskClick={(statusId) => {
                setCreateTaskStatusId(statusId);
                setIsCreateTaskOpen(true);
              }}
            />
          ) : isTasksLoading ? (
            <div className="h-48 rounded-xl border border-border bg-surface flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-10 rounded-xl border border-dashed border-border bg-surface text-center">
              <ListTodo className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-foreground">
                {isAnyFilterActive
                  ? 'No matching tasks found'
                  : 'No tasks created yet'}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 mb-4 max-w-sm mx-auto">
                {isAnyFilterActive
                  ? 'Try clearing or modifying your search filters.'
                  : 'Get started by creating your first task in this project.'}
              </p>
              {!isAnyFilterActive && (
                <Button
                  size="sm"
                  onClick={() => {
                    setCreateTaskStatusId(null);
                    setIsCreateTaskOpen(true);
                  }}
                  className="flex items-center gap-1.5 mx-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Task</span>
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-surface divide-y divide-border overflow-hidden shadow-sm">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-elevated/60 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: task.status.color }}
                      title={task.status.name}
                    />
                    <span className="text-xs font-mono font-semibold text-muted-foreground shrink-0 group-hover:text-primary transition-colors">
                      {task.taskKey}
                    </span>
                    <span className="text-sm font-medium text-foreground truncate">
                      {task.title}
                    </span>

                    {/* Labels preview */}
                    {task.labels && task.labels.length > 0 && (
                      <div className="hidden sm:flex items-center gap-1 shrink-0">
                        {task.labels.slice(0, 3).map(({ label }) => (
                          <span
                            key={label.id}
                            className="px-1.5 py-0.2 rounded text-[10px] font-medium border"
                            style={{
                              backgroundColor: `${label.color}15`,
                              borderColor: `${label.color}35`,
                              color: label.color,
                            }}
                          >
                            {label.name}
                          </span>
                        ))}
                        {task.labels.length > 3 && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            +{task.labels.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto text-xs">
                    {/* Subtasks count if any */}
                    {task._count && task._count.subtasks > 0 && (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                        {task._count.subtasks}
                      </span>
                    )}

                    {getPriorityBadge(task.priority)}

                    {/* Status Badge */}
                    <Badge variant="outline" className="text-xs font-mono">
                      {task.status.name}
                    </Badge>

                    {/* Assignee Avatar / Name */}
                    {task.assignee ? (
                      <div
                        className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center text-[10px] font-bold"
                        title={`Assigned to ${task.assignee.name}`}
                      >
                        {task.assignee.name[0].toUpperCase()}
                      </div>
                    ) : (
                      <span title="Unassigned">
                        <UserIcon className="w-4 h-4 text-muted-foreground/40" />
                      </span>
                    )}

                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Workflow Stages Section */}
        <div className="space-y-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Workflow Statuses
              </h2>
              <p className="text-xs text-muted-foreground">
                Configured pipeline stages for tasks in this project.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {(project.statuses || []).map((status) => (
              <div
                key={status.id}
                className="p-3 rounded-lg border border-border bg-surface flex flex-col justify-between"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: status.color }}
                  />
                  <span className="text-sm font-medium text-foreground truncate">
                    {status.name}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                  <span>{status.category}</span>
                  {status.isDefault && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0">
                      Default
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Project Members Section */}
        {projectDetail?.members && (
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Project Members ({projectDetail.members.length})
                </h2>
                <p className="text-xs text-muted-foreground">
                  Team members collaborating on this project.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface divide-y divide-border overflow-hidden">
              {projectDetail.members.map((m) => (
                <div
                  key={m.id}
                  className="p-3.5 flex items-center justify-between hover:bg-surface-elevated transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-xs font-semibold text-foreground">
                      {m.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {m.user.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {m.user.email}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono">
                    <Shield className="w-3 h-3 mr-1 text-primary" />
                    {m.role}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        onClose={() => {
          setIsCreateTaskOpen(false);
          setCreateTaskStatusId(null);
        }}
        projectId={project.id}
        projectKey={project.key}
        statuses={project.statuses || []}
        members={projectDetail?.members || []}
        initialStatusId={createTaskStatusId}
        onSuccess={(taskId) => {
          setSelectedTaskId(taskId);
        }}
      />

      <TaskDetailModal
        isOpen={Boolean(selectedTaskId)}
        onClose={() => setSelectedTaskId(null)}
        taskId={selectedTaskId}
        projectId={project.id}
        statuses={project.statuses || []}
        members={projectDetail?.members || []}
        onSelectTask={(newTaskId) => setSelectedTaskId(newTaskId)}
      />
    </DashboardLayout>
  );
}
