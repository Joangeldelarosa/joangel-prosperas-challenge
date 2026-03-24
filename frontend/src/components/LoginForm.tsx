import React, { useState } from 'react';

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
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="font-black text-3xl tracking-tighter text-black uppercase">Prosperas</h1>
          <p className="text-[10px] font-bold tracking-[0.1em] text-slate-400 uppercase mt-1">Reports Challenge</p>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-10 shadow-[0px_12px_32px_rgba(25,28,30,0.04)] border border-outline-variant/10">
          <h2 className="text-xl font-black tracking-tight text-primary mb-2">
            {isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}
          </h2>
          <p className="text-sm text-on-surface-variant mb-8">
            {isRegister ? 'Regístrate para comenzar a generar reportes' : 'Accede a tu panel de reportes'}
          </p>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-error-container text-error text-xs font-bold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black tracking-[0.1em] text-on-surface-variant uppercase">Usuario</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-surface-container-low border-none rounded-lg py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-primary transition-all outline-none"
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
                className="w-full bg-surface-container-low border-none rounded-lg py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-primary transition-all outline-none"
                placeholder="Ingresa tu contraseña"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-br from-primary to-primary-container text-white py-4 rounded-lg font-bold text-xs uppercase tracking-[0.2em] shadow-lg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? 'Espera...' : isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-xs font-bold text-surface-tint hover:underline"
            >
              {isRegister ? '¿Ya tienes cuenta? Iniciar Sesión' : '¿No tienes cuenta? Regístrate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
