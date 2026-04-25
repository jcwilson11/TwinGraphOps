import { createBrowserRouter } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import ProcessingPage from './pages/ProcessingPage';
import MainApp from './pages/MainApp';
import DocumentProcessingPage from './pages/DocumentProcessingPage';
import DocumentUploadPage from './pages/DocumentUploadPage';
import DocumentWorkspace from './pages/DocumentWorkspace';

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/processing', element: <ProcessingPage /> },
  { path: '/app', element: <MainApp /> },
  { path: '/risk', element: <MainApp /> },
  { path: '/documents', element: <DocumentUploadPage /> },
  { path: '/documents/processing', element: <DocumentProcessingPage /> },
  { path: '/documents/workspace', element: <DocumentWorkspace /> },
]);
