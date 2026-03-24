import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LayoutProps {
  children: React.ReactNode;
  username?: string;
  onLogout?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, username, onLogout }) => {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close mobile menu on outside click
  useEffect(() => {
    if (!showMobileMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMobileMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMobileMenu]);

  return (
    <main className="min-h-screen flex flex-col items-center bg-surface selection:bg-surface-tint/15">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex justify-between items-center"
      >
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shadow-md">
            <span className="material-symbols-outlined text-white text-[16px] sm:text-[18px]">analytics</span>
          </div>
          <div className="flex flex-col">
            <span className="font-black text-base sm:text-lg tracking-tighter text-black uppercase leading-none">Prosperas</span>
            <span className="text-[8px] sm:text-[9px] font-bold tracking-[0.12em] text-on-surface-variant/60 uppercase">Reports Challenge</span>
          </div>
        </div>

        <AnimatePresence>
          {username && (
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-2 sm:gap-3 relative"
            >
              {/* Desktop: inline username + logout */}
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-on-surface leading-none">{username}</p>
                <button
                  onClick={onLogout}
                  className="text-[10px] font-medium text-on-surface-variant hover:text-error transition-colors duration-200 uppercase tracking-wider"
                >
                  Cerrar Sesión
                </button>
              </div>

              {/* Avatar — tappable on mobile */}
              <button
                onClick={() => setShowMobileMenu((v) => !v)}
                className="sm:pointer-events-none w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-surface-tint to-primary-container flex items-center justify-center text-white text-xs sm:text-sm font-bold shadow-md focus:outline-none"
              >
                {username.charAt(0).toUpperCase()}
              </button>

              {/* Mobile dropdown menu */}
              <AnimatePresence>
                {showMobileMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-11 z-50 sm:hidden bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-3 shadow-xl min-w-[160px]"
                  >
                    <p className="text-xs font-bold text-on-surface px-2 pb-2 border-b border-outline-variant/10">{username}</p>
                    <button
                      onClick={() => { setShowMobileMenu(false); onLogout?.(); }}
                      className="mt-2 w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-medium text-error hover:bg-error-container/50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">logout</span>
                      Cerrar Sesión
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Content */}
      <div className="w-full max-w-6xl px-4 sm:px-6 lg:px-8 pb-6 sm:pb-12">
        {children}
      </div>
    </main>
  );
};

export default Layout;
