import { create } from 'zustand';

interface WorkspaceStore {
  activeOrganizationId: string | null;
  activeOrganizationSlug: string | null;
  activeWorkspaceId: string | null;
  activeWorkspaceSlug: string | null;
  sidebarCollapsed: boolean;

  setActiveOrganization: (id: string | null, slug?: string | null) => void;
  setActiveWorkspace: (id: string | null, slug?: string | null) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  activeOrganizationId: null,
  activeOrganizationSlug: null,
  activeWorkspaceId: null,
  activeWorkspaceSlug: null,
  sidebarCollapsed: false,

  setActiveOrganization: (id, slug = null) =>
    set({
      activeOrganizationId: id,
      activeOrganizationSlug: slug,
    }),

  setActiveWorkspace: (id, slug = null) =>
    set({
      activeWorkspaceId: id,
      activeWorkspaceSlug: slug,
    }),

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
}));
