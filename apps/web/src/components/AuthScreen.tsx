import { useState, type FormEvent } from "react";
import { useAuth } from "../auth/auth-context";

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent, mode: "signin" | "signup") {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (mode === "signin") await signIn(email, password);
      else setMessage(await signUp(email, password));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível autenticar.");
    } finally {
      setBusy(false);
    }
  }

  async function createAccount() {
    setBusy(true);
    setMessage("");
    try {
      setMessage(await signUp(email, password));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível criar a conta.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-shell">
    <section className="auth-card">
      <div className="brand-mark" aria-hidden="true">PS</div>
      <p className="eyebrow">Engenharia estrutural rastreável</p>
      <h1>Entre no POOLSTRUCT</h1>
      <p className="muted">Seus projetos, revisões e memórias de cálculo ficam vinculados à sua conta.</p>
      <form onSubmit={(event) => void submit(event, "signin")}>
        <label>E-mail<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label>Senha<input type="password" autoComplete="current-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        <button className="primary" disabled={busy}>{busy ? "Aguarde…" : "Entrar"}</button>
        <button className="secondary" type="button" disabled={busy || !email || password.length < 8} onClick={() => void createAccount()}>Criar conta</button>
      </form>
      {message && <p className="form-message" role="status">{message}</p>}
    </section>
  </main>;
}
