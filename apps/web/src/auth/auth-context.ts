import { createContext, useContext } from "react";
import type { AuthUser } from "../lib/models";

export interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  localMode: boolean;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<string>;
  signOut(): Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  return value;
}
