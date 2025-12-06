import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, supabaseUrl } from '../services/supabase';

interface AuthContextType {
  user: any | null;
  session: any | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if Supabase is configured with real keys
    const isConfigured = !supabaseUrl.includes('placeholder-project.supabase.co');

    if (!isConfigured) {
        console.warn('Supabase not configured. Authentication disabled.');
        setLoading(false);
        return;
    }

    // Check active session
    (supabase.auth as any).getSession().then(({ data: { session } }: any) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch((err: any) => {
      console.error("Auth initialization error:", err);
      setLoading(false);
    });

    // Listen for changes
    const {
      data: { subscription },
    } = (supabase.auth as any).onAuthStateChange((_event: string, session: any) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await (supabase.auth as any).signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};