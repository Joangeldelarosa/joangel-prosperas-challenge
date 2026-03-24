import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoginFormProps {
  onLogin: (username: string, password: string) => Promise<void>;
  onRegister: (username: string, password: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin, onRegister, loading, error }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegister) {
      await onRegister(username, password).catch(() => {});
    } else {
      await onLogin(username, password).catch(() => {});
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-container shadow-lg mb-4">
            <span className="material-symbols-outlined text-white text-2xl">analytics</span>
          </div>
          <h1 className="font-black text-3xl tracking-tighter text-black uppercase">Prosperas</h1>
          <p className="text-[10px] font-bold tracking-[0.12em] text-on-surface-variant/60 uppercase mt-1">Reports Challenge</p>
        </motion.div>

        {/* Card */}
        <motion.div
          layout
          className="bg-surface-container-lowest rounded-2xl p-10 shadow-[0_8px_40px_rgba(0,0,0,0.06)] border border-outline-variant/10"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={isRegister ? 'register' : 'login'}
              initial={{ opacity: 0, x: isRegister ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRegister ? -20 : 20 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-xl font-black tracking-tight text-primary mb-1">
                {isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}
              </h2>
              <p className="text-sm text-on-surface-variant mb-8">
                {isRegister ? 'Regístrate para comenzar a generar reportes' : 'Accede a tu panel de reportes'}
              </p>
            </motion.div>
          </AnimatePresence>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 rounded-xl bg-error-container/80 text-error text-xs font-bold flex items-center gap-2 overflow-hidden"
              >
                <span className="material-symbols-outlined text-sm">error</span>
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black tracking-[0.1em] text-on-surface-variant uppercase">Usuario</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-surface-container-low border border-transparent rounded-xl py-3.5 px-4 text-sm font-medium focus:ring-2 focus:ring-surface-tint/30 focus:border-surface-tint transition-all duration-200 outline-none placeholder:text-on-surface-variant/40"
                placeholder="Ingresa tu usuario"
                required
                minLength={3}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black tracking-[0.1em] text-on-surface-variant uppercase">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface-container-low border border-transparent rounded-xl py-3.5 px-4 text-sm font-medium focus:ring-2 focus:ring-surface-tint/30 focus:border-surface-tint transition-all duration-200 outline-none placeholder:text-on-surface-variant/40"
                placeholder="Ingresa tu contraseña"
                required
                minLength={6}
              />
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full mt-3 bg-gradient-to-br from-primary to-primary-container text-white py-4 rounded-xl font-bold text-xs uppercase tracking-[0.2em] shadow-lg hover:shadow-xl transition-shadow duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
            >
              {loading && (
                <motion.div
                  className="absolute inset-0 bg-white/10"
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                />
              )}
              <span className="relative z-10">
                {loading ? 'Espera...' : isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}
              </span>
            </motion.button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-xs font-bold text-surface-tint hover:underline underline-offset-4 transition-colors"
            >
              {isRegister ? '¿Ya tienes cuenta? Iniciar Sesión' : '¿No tienes cuenta? Regístrate'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LoginForm;
