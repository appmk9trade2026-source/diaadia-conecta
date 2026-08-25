import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { LockKeyhole, Mail } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { signInWithPassword } from './auth.service';
import { FriendlyAuthError } from './auth.types';

function getLoginMessage(error: FriendlyAuthError | null): string | null {
  if (!error) {
    return null;
  }

  if (error.code === 'invalid_credentials') {
    return 'E-mail ou senha invalidos.';
  }

  if (error.code === 'network_error') {
    return 'Nao foi possivel conectar. Verifique sua internet e tente novamente.';
  }

  return 'Nao foi possivel entrar agora. Tente novamente.';
}

export function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<FriendlyAuthError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await signInWithPassword(email.trim(), password);
      await queryClient.invalidateQueries({ queryKey: ['auth'] });
      await navigate({ to: '/app' });
    } catch (caughtError) {
      setError(
        caughtError instanceof FriendlyAuthError
          ? caughtError
          : new FriendlyAuthError('unknown', 'Nao foi possivel entrar agora.'),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-hero" aria-label="Identidade DIA A DIA CONECTA">
        <div className="login-hero-mark">DIA A DIA</div>
        <div>
          <p>MK9 Trade Marketing</p>
          <h1>DIA A DIA CONECTA</h1>
          <span>Sua operação de campo, conectada em um só lugar.</span>
        </div>
      </section>

      <section className="login-panel" aria-label="Login">
        <div className="login-brand">
          <span className="brand-mark">DD</span>
          <div>
            <strong>DIA A DIA</strong>
            <span>CONECTA</span>
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            <span>E-mail</span>
            <div className="input-shell">
              <Mail size={18} aria-hidden="true" />
              <input
                autoComplete="email"
                inputMode="email"
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </div>
          </label>

          <label>
            <span>Senha</span>
            <div className="input-shell">
              <LockKeyhole size={18} aria-hidden="true" />
              <input
                autoComplete="current-password"
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </div>
          </label>

          {getLoginMessage(error) ? <p className="form-error">{getLoginMessage(error)}</p> : null}

          <button className="primary-button" disabled={submitting} type="submit">
            {submitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  );
}
