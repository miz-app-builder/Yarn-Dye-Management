import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

function mapSupabaseUser(user: User | null): AuthUser | null {
  if (!user) return null;
  const meta = (user.user_metadata as Record<string, string>) || {};
  const fullName = meta.full_name || meta.name || "";
  const parts = fullName.split(" ");
  const first = parts[0] || "";
  const last = parts.slice(1).join(" ") || "";
  return {
    id: user.id,
    email: user.email ?? null,
    firstName: meta.first_name || first || null,
    lastName: meta.last_name || last || null,
    profileImageUrl: meta.avatar_url || null,
  };
}

export function useAuth() {
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSupabaseUser(session?.user ?? null);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signup = useCallback(async (email: string, password: string) => {
    const base = import.meta.env.BASE_URL ?? "/";
    const apiBase = base.endsWith("/") ? `${base}api` : `${base}/api`;
    const res = await fetch(`${apiBase}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error || "Signup failed");
    }
    await supabase.auth.signInWithPassword({ email, password });
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return {
    user: mapSupabaseUser(supabaseUser),
    isLoading,
    isAuthenticated: !!supabaseUser,
    login,
    signup,
    logout,
  };
}
