import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkspaceStore } from './workspace-store';

describe('useWorkspaceStore', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      activeOrganizationId: null,
      activeOrganizationSlug: null,
      activeWorkspaceId: null,
      activeWorkspaceSlug: null,
      sidebarCollapsed: false,
    });
  });

  it('should initialize with default empty values', () => {
    const state = useWorkspaceStore.getState();
    expect(state.activeOrganizationId).toBeNull();
    expect(state.activeWorkspaceId).toBeNull();
    expect(state.sidebarCollapsed).toBe(false);
  });

  it('should set active organization', () => {
    useWorkspaceStore.getState().setActiveOrganization('org-123', 'acme-corp');

    const state = useWorkspaceStore.getState();
    expect(state.activeOrganizationId).toBe('org-123');
    expect(state.activeOrganizationSlug).toBe('acme-corp');
  });

  it('should set active workspace', () => {
    useWorkspaceStore.getState().setActiveWorkspace('ws-123', 'frontend-team');

    const state = useWorkspaceStore.getState();
    expect(state.activeWorkspaceId).toBe('ws-123');
    expect(state.activeWorkspaceSlug).toBe('frontend-team');
  });

  it('should toggle sidebar', () => {
    expect(useWorkspaceStore.getState().sidebarCollapsed).toBe(false);

    useWorkspaceStore.getState().toggleSidebar();
    expect(useWorkspaceStore.getState().sidebarCollapsed).toBe(true);

    useWorkspaceStore.getState().toggleSidebar();
    expect(useWorkspaceStore.getState().sidebarCollapsed).toBe(false);
  });
});
