import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LayoutProps {
  children: React.ReactNode;
  username?: string;
  onLogout?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, username, onLogout }) => {
  return (
    <main className="min-h-screen flex flex-col items-center bg-surface selection:bg-surface-tint/15">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-6xl px-8 py-6 flex justify-between items-center"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shadow-md">
            <span className="material-symbols-outlined text-white text-[18px]">analytics</span>
          </div>
          <div className="flex flex-col">
            <span className="font-black text-lg tracking-tighter text-black uppercase leading-none">Prosperas</span>
            <span className="text-[9px] font-bold tracking-[0.12em] text-on-surface-variant/60 uppercase">Reports Challenge</span>
          </div>
        </div>

        <AnimatePresence>
          {username && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-3"
            >
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-on-surface leading-none">{username}</p>
                <button
                  onClick={onLogout}
                  className="text-[10px] font-medium text-on-surface-variant hover:text-error transition-colors duration-200 uppercase tracking-wider"
                >
                  Cerrar Sesión
                </button>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-surface-tint to-primary-container flex items-center justify-center text-white text-sm font-bold shadow-md">
                {username.charAt(0).toUpperCase()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Content */}
      <div className="w-full max-w-6xl px-8 pb-12">
        {children}
      </div>
    </main>
  );
};

export default Layout;
