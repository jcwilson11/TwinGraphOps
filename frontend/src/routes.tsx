import { createBrowserRouter } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import ProcessingPage from './pages/ProcessingPage';
import MainApp from './pages/MainApp';

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/processing', element: <ProcessingPage /> },
  { path: '/app', element: <MainApp /> },
]);
