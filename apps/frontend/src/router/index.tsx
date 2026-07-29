import { createBrowserRouter, Navigate } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import Agents from '../pages/Agents';
import Projects from '../pages/Projects';
import Tickets from '../pages/Tickets';
import TicketDetail from '../pages/TicketDetail';
import Tools from '../pages/Tools';
import Approvals from '../pages/Approvals';
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
      { path: 'tickets', element: <Tickets /> },
      { path: 'tickets/:id', element: <TicketDetail /> },
      { path: 'tools', element: <Tools /> },
      { path: 'approvals', element: <Approvals /> },
      { path: '*', element: <Navigate to="/404" replace /> },
    ],
  },
  { path: '404', element: <NotFound /> },
  { path: '*', element: <NotFound /> },
]);
