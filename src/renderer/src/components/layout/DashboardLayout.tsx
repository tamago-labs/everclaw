import { Outlet } from 'react-router';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function DashboardLayout() {
  return (
    <div className="h-screen flex flex-col bg-[var(--color-bg-base)]">
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <TopBar />
          <main className="flex-1 overflow-y-auto"> 
            <Outlet /> 
          </main>
        </div>
      </div>
    </div>
  );
}
