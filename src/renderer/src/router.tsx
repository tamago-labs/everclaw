import { createHashRouter } from 'react-router';
import DashboardLayout from './components/layout/DashboardLayout';
import OverviewPage from './pages/OverviewPage';
import SettingsPage from './pages/SettingsPage';
import ChatPage from './pages/ChatPage';
import SessionsPage from './pages/SessionsPage';
import UsagePage from './pages/UsagePage';
import CronJobsPage from './pages/CronJobsPage';
import AgentsPage from './pages/AgentsPage';
import SkillsPage from './pages/SkillsPage';
import SetupWalletPage from './pages/SetupWalletPage';

export const router = createHashRouter([
  {
    path: '/',
    element: <DashboardLayout />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'chat', element: <ChatPage /> },
      { path: 'sessions', element: <SessionsPage /> },
      { path: 'usage', element: <UsagePage /> },
      { path: 'cron-jobs', element: <CronJobsPage /> },
      { path: 'agents', element: <AgentsPage /> },
      { path: 'skills', element: <SkillsPage /> },
      { path: 'setup-wallet', element: <SetupWalletPage /> },
    ],
  },
]);
