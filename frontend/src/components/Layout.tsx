import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  username?: string;
  onLogout?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, username, onLogout }) => {
  return (
    <main className="min-h-screen flex flex-col items-center bg-surface">
      {/* Header */}
      <header className="w-full max-w-6xl px-8 py-8 flex justify-between items-center">
        <div className="flex flex-col">
          <span className="font-black text-xl tracking-tighter text-black uppercase">Prosperas</span>
          <span className="text-[10px] font-bold tracking-[0.1em] text-slate-400 uppercase">Editorial Analytics</span>
        </div>
        {username && (
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-xs font-bold text-slate-900 leading-none">{username}</p>
              <button
                onClick={onLogout}
                className="text-[10px] font-medium text-slate-500 uppercase tracking-wider hover:text-error transition-colors"
              >
                Sign Out
              </button>
            </div>
            <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center text-white text-sm font-bold">
              {username.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
      </header>

      {/* Content */}
      <div className="w-full max-w-6xl px-8 pb-12">
        {children}
      </div>
    </main>
  );
};

export default Layout;
