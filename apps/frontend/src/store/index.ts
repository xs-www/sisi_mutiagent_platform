import { create } from 'zustand';
import type { Project } from '../types';

interface GlobalState {
  currentProject: Project | null;
  setCurrentProject: (project: Project | null) => void;

  currentAgentId: string | null;
  setCurrentAgentId: (id: string | null) => void;

  pendingApprovalCount: number;
  setPendingApprovalCount: (n: number) => void;
}

export const useGlobalStore = create<GlobalState>((set) => ({
  currentProject: null,
  setCurrentProject: (project) => set({ currentProject: project }),

  currentAgentId: null,
  setCurrentAgentId: (id) => set({ currentAgentId: id }),

  pendingApprovalCount: 0,
  setPendingApprovalCount: (n) => set({ pendingApprovalCount: n }),
}));
