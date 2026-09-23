import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface DbVersionContextValue {
  version: number;
  bump: () => void;
}

const DbVersionContext = createContext<DbVersionContextValue | null>(null);

export function DbVersionProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);
  const value = useMemo(() => ({ version, bump }), [version, bump]);
  return <DbVersionContext.Provider value={value}>{children}</DbVersionContext.Provider>;
}

export function useDbVersion(): DbVersionContextValue {
  const ctx = useContext(DbVersionContext);
  if (!ctx) throw new Error('useDbVersion must be used within DbVersionProvider');
  return ctx;
}

/**
 * Runs a write, then bumps in `finally` — a write that threw may well have landed,
 * and the screen has to show what's actually stored. The error still propagates:
 * the caller is the one who says so where the action happened.
 */
export function useWrite() {
  const { bump } = useDbVersion();
  return useCallback(
    async <T,>(write: () => Promise<T>): Promise<T> => {
      try {
        return await write();
      } finally {
        bump();
      }
    },
    [bump]
  );
}
