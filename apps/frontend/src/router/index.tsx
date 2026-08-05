import { createBrowserRouter, Navigate } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import Agents from '../pages/Agents';
import Projects from '../pages/Projects';
import ProjectDetail from '../pages/ProjectDetail';
import Tickets from '../pages/Tickets';
import TicketDetail from '../pages/TicketDetail';
import Tools from '../pages/Tools';
import ToolConfig from '../pages/ToolConfig';
import ApiKeys from '../pages/ApiKeys';
import PlatformSettings from '../pages/PlatformSettings';
import SkillPacks from '../pages/SkillPacks';
import Approvals from '../pages/Approvals';
import Workflow from '../pages/Workflow';
import NotFound from '../pages/NotFound';
import MainLayout from '../layouts/MainLayout';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'agents', element: <Agents /> },
      { path: 'projects', element: <Projects /> },
      { path: 'projects/:id', element: <ProjectDetail /> },
      { path: 'tickets', element: <Tickets /> },
      { path: 'tickets/:id', element: <TicketDetail /> },
      { path: 'tools', element: <Tools /> },
      { path: 'tool-config', element: <ToolConfig /> },
      { path: 'api-keys', element: <ApiKeys /> },
      { path: 'platform-settings', element: <PlatformSettings /> },
      { path: 'skill-packs', element: <SkillPacks /> },
      { path: 'approvals', element: <Approvals /> },
      { path: 'workflow', element: <Workflow /> },
      { path: '*', element: <Navigate to="/404" replace /> },
    ],
  },
  { path: '404', element: <NotFound /> },
  { path: '*', element: <NotFound /> },
]);
