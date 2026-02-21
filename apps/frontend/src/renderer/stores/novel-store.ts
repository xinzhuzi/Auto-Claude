import { create } from 'zustand';
import type {
  NovelProject,
  NovelGenerationStatus,
  NovelGenerateRequest
} from '../../shared/types';

interface NovelState {
  novel: NovelProject | null;
  generationStatus: NovelGenerationStatus;
  currentProjectId: string | null;

  setNovel: (novel: NovelProject | null) => void;
  setGenerationStatus: (status: NovelGenerationStatus) => void;
  setCurrentProjectId: (projectId: string | null) => void;
}

const initialGenerationStatus: NovelGenerationStatus = {
  phase: 'idle',
  progress: 0,
  message: ''
};

export const useNovelStore = create<NovelState>((set) => ({
  novel: null,
  generationStatus: initialGenerationStatus,
  currentProjectId: null,

  setNovel: (novel) => set({ novel }),
  setGenerationStatus: (status) => set({ generationStatus: status }),
  setCurrentProjectId: (projectId) => set({ currentProjectId: projectId })
}));

export async function loadNovel(projectId: string): Promise<void> {
  const store = useNovelStore.getState();
  store.setCurrentProjectId(projectId);

  const result = await window.electronAPI.getNovel(projectId);
  if (result.success) {
    store.setNovel(result.data || null);
  } else {
    store.setNovel(null);
  }
}

export async function saveNovel(projectId: string, novel: NovelProject): Promise<void> {
  await window.electronAPI.saveNovel(projectId, novel);
}

export function generateNovel(projectId: string, request: NovelGenerateRequest): void {
  useNovelStore.getState().setGenerationStatus({
    phase: 'running',
    progress: 0,
    message: 'Starting generation...'
  });
  window.electronAPI.generateNovel(projectId, request);
}

export async function stopNovel(projectId: string): Promise<void> {
  await window.electronAPI.stopNovel(projectId);
}

export function setupNovelListeners(): () => void {
  const getState = () => useNovelStore.getState();

  const onProgress = window.electronAPI.onNovelProgress((projectId, status) => {
    const { currentProjectId, setGenerationStatus } = getState();
    if (currentProjectId && currentProjectId !== projectId) return;
    setGenerationStatus(status);
  });

  const onComplete = window.electronAPI.onNovelComplete((projectId, novel) => {
    const { currentProjectId, setNovel, setGenerationStatus } = getState();
    if (currentProjectId && currentProjectId !== projectId) return;
    setNovel(novel);
    setGenerationStatus({
      phase: 'complete',
      progress: 100,
      message: 'Generation complete'
    });
  });

  const onError = window.electronAPI.onNovelError((projectId, error) => {
    const { currentProjectId, setGenerationStatus } = getState();
    if (currentProjectId && currentProjectId !== projectId) return;
    setGenerationStatus({
      phase: 'error',
      progress: 0,
      message: error
    });
  });

  const onStopped = window.electronAPI.onNovelStopped((projectId) => {
    const { currentProjectId, setGenerationStatus } = getState();
    if (currentProjectId && currentProjectId !== projectId) return;
    setGenerationStatus({
      phase: 'idle',
      progress: 0,
      message: ''
    });
  });

  return () => {
    onProgress();
    onComplete();
    onError();
    onStopped();
  };
}
