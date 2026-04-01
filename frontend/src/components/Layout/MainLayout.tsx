import React, { ReactNode, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { ToastProvider } from '../UX/ToastProvider';
import useShortcuts from '../../hooks/useShortcuts';
import NetworkListener from '../UX/NetworkListener';
import BottomNav from '../UX/BottomNav';

export default function MainLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const isMessagesPage = location.pathname.startsWith('/app/messages');
  useShortcuts();

  return (
    <ToastProvider>
      <NetworkListener />
      {isMessagesPage ? (
        <div className="flex flex-col h-screen min-h-screen w-full bg-white text-gray-900 dark:bg-gray-900 dark:text-white transition-colors duration-200">
          <div className="h-16 flex-shrink-0" />
          <Header mobileOpen={mobileOpen} onMobileToggle={() => setMobileOpen((s) => !s)} />
          <div className="flex-1 overflow-y-auto min-h-0">
            {children}
          </div>
          <BottomNav />
        </div>
      ) : (
        <div className="flex flex-col h-screen min-h-screen w-full bg-white text-gray-900 dark:bg-gray-900 dark:text-white transition-colors duration-200">
          <div className="h-16 flex-shrink-0" />
          <Header mobileOpen={mobileOpen} onMobileToggle={() => setMobileOpen((s) => !s)} />

          <div className="flex flex-1 min-h-0 overflow-hidden h-full">
            <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((s) => !s)} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

            <main className="flex-1 min-h-0 overflow-y-auto bg-white dark:bg-gray-900 transition-colors duration-200 p-4">
              <div className="max-w-7xl mx-auto">
                {children}
              </div>
            </main>
          </div>
          <BottomNav />
        </div>
      )}
    </ToastProvider>
  );
}
