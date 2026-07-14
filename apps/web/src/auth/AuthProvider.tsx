import { useEffect, useMemo, useState, type PropsWithChildren } from "react";
import type { AuthUser } from "../lib/models";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { AuthContext } from "./auth-context";

const LOCAL_USER: AuthUser = { id: "local-demo-user", email: "modo.local@poolstruct" };

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(isSupabaseConfigured ? null : LOCAL_USER);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => {
      const sessionUser = data.session?.user;
      setUser(sessionUser ? { id: sessionUser.id, email: sessionUser.email ?? "Sem e-mail" } : null);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user;
      setUser(sessionUser ? { id: sessionUser.id, email: sessionUser.email ?? "Sem e-mail" } : null);
      setLoading(false);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    localMode: !isSupabaseConfigured,
    async signIn(email: string, password: string) {
      if (!supabase) return;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    async signUp(email: string, password: string) {
      if (!supabase) return "Modo local ativo.";
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      return data.session ? "Conta criada e autenticada." : "Conta criada. Confirme o e-mail para entrar.";
    },
    async signOut() {
      if (!supabase) return;
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }
  }), [loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
