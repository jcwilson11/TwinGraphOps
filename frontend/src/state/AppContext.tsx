import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { adaptGraph } from '../lib/adapters';
import { ApiClientError, getGraph, uploadDocument } from '../lib/api';
import { appConfig } from '../lib/config';
import type { GraphState, UploadState } from '../types/app';

interface AppContextValue {
  upload: UploadState;
  graph: GraphState;
  setDragActive: (active: boolean) => void;
  selectFile: (file: File | null) => boolean;
  clearSelectedFile: () => void;
  beginProcessing: () => Promise<void>;
  loadGraph: (options?: { keepStatus?: boolean }) => Promise<void>;
  resetUploadState: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const initialUploadState: UploadState = {
  phase: 'idle',
  selectedFile: null,
  error: null,
  statusMessage: 'Upload a .md or .txt file to build the graph.',
  ingestion: null,
  startedAt: null,
  completedAt: null,
  retryCount: 0,
};

const initialGraphState: GraphState = {
  status: 'idle',
  data: null,
  error: null,
  lastLoadedAt: null,
};

const supportedExtensions = ['.md', '.txt'];

function getFileExtension(filename: string) {
  const segments = filename.toLowerCase().split('.');
  return segments.length > 1 ? `.${segments.pop()}` : '';
}

function toFriendlyMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected frontend error occurred.';
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [upload, setUpload] = useState<UploadState>(initialUploadState);
  const [graph, setGraph] = useState<GraphState>(initialGraphState);
  const processingPromiseRef = useRef<Promise<void> | null>(null);

  const setDragActive = useCallback((active: boolean) => {
    setUpload((current) => {
      if (active) {
        return { ...current, phase: 'drag-hover', statusMessage: 'Drop the file to queue it for ingestion.' };
      }

      if (current.selectedFile) {
        return { ...current, phase: 'file-selected', statusMessage: `Ready to analyze ${current.selectedFile.name}.` };
      }

      return { ...current, phase: 'idle', statusMessage: initialUploadState.statusMessage };
    });
  }, []);

  const selectFile = useCallback((file: File | null) => {
    if (!file) {
      setUpload(initialUploadState);
      return false;
    }

    const extension = getFileExtension(file.name);
    if (!supportedExtensions.includes(extension)) {
      setUpload({
        ...initialUploadState,
        phase: 'error',
        error: 'Only .md and .txt files are supported.',
        statusMessage: 'Unsupported file type.',
      });
      return false;
    }

    if (file.size > appConfig.maxUploadBytes) {
      setUpload({
        ...initialUploadState,
        phase: 'error',
        error: `File exceeds the ${Math.round(appConfig.maxUploadBytes / 1024 / 1024)} MB upload limit.`,
        statusMessage: 'Selected file is too large.',
      });
      return false;
    }

    setUpload({
      phase: 'file-selected',
      selectedFile: file,
      error: null,
      statusMessage: `Ready to analyze ${file.name}.`,
      ingestion: null,
      startedAt: null,
      completedAt: null,
      retryCount: 0,
    });
    return true;
  }, []);

  const clearSelectedFile = useCallback(() => {
    setUpload(initialUploadState);
  }, []);

  const loadGraph = useCallback(async (options?: { keepStatus?: boolean }) => {
    setGraph((current) => ({
      ...current,
      status: 'loading',
      error: null,
    }));

    try {
      const payload = await getGraph();
      const adaptedGraph = adaptGraph(payload);
      setGraph({
        status: 'ready',
        data: adaptedGraph,
        error: null,
        lastLoadedAt: Date.now(),
      });

      if (!options?.keepStatus) {
        setUpload((current) => {
          if (current.phase === 'success' || current.phase === 'empty-graph') {
            return current;
          }

          return {
            ...current,
            phase: adaptedGraph.nodes.length === 0 ? 'empty-graph' : current.phase,
          };
        });
      }
    } catch (error) {
      const message = toFriendlyMessage(error);
      setGraph({
        status: 'error',
        data: null,
        error: message,
        lastLoadedAt: null,
      });
      throw error;
    }
  }, []);

  const beginProcessing = useCallback(async () => {
    if (!upload.selectedFile) {
      setUpload((current) => ({
        ...current,
        phase: 'error',
        error: 'Choose a .md or .txt file before processing.',
        statusMessage: 'No file selected.',
      }));
      return;
    }

    if (processingPromiseRef.current) {
      return processingPromiseRef.current;
    }

    const selectedFile = upload.selectedFile;

    const task = (async () => {
      let processingPhaseTimer = 0;

      try {
        setUpload((current) => ({
          ...current,
          phase: 'uploading',
          error: null,
          statusMessage: `Uploading ${selectedFile.name}...`,
          startedAt: Date.now(),
          completedAt: null,
        }));

        processingPhaseTimer = window.setTimeout(() => {
          setUpload((current) =>
            current.phase === 'uploading'
              ? {
                  ...current,
                  phase: 'processing',
                  statusMessage: 'Extracting components, relationships, and risk metrics...',
                }
              : current
          );
        }, 900);

        const ingestion = await uploadDocument(selectedFile, true, appConfig.processingTimeoutMs);

        setUpload((current) => ({
          ...current,
          ingestion,
          phase: 'processing',
          statusMessage: 'Loading the generated graph workspace...',
        }));

        const graphPayload = await getGraph();
        const adaptedGraph = adaptGraph(graphPayload);

        setGraph({
          status: 'ready',
          data: adaptedGraph,
          error: null,
          lastLoadedAt: Date.now(),
        });

        setUpload((current) => ({
          ...current,
          ingestion,
          phase: adaptedGraph.nodes.length === 0 ? 'empty-graph' : 'success',
          error: null,
          statusMessage:
            adaptedGraph.nodes.length === 0
              ? 'Processing completed, but the active graph is empty.'
              : 'TwinGraphOps finished processing your document.',
          completedAt: Date.now(),
        }));
      } catch (error) {
        const message = toFriendlyMessage(error);
        setUpload((current) => ({
          ...current,
          phase: 'retry',
          error: message,
          statusMessage: message,
          completedAt: Date.now(),
          retryCount: current.retryCount + 1,
        }));
        throw error;
      } finally {
        window.clearTimeout(processingPhaseTimer);
        processingPromiseRef.current = null;
      }
    })();

    processingPromiseRef.current = task;
    return task;
  }, [upload.selectedFile]);

  const resetUploadState = useCallback(() => {
    setUpload(initialUploadState);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      upload,
      graph,
      setDragActive,
      selectFile,
      clearSelectedFile,
      beginProcessing,
      loadGraph,
      resetUploadState,
    }),
    [upload, graph, setDragActive, selectFile, clearSelectedFile, beginProcessing, loadGraph, resetUploadState]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider.');
  }
  return context;
}
