import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { clearReadCooldown } from '@/db/safeRead';

interface DbVersionContextValue {
  version: number;
  bump: () => void;
}

const DbVersionContext = createContext<DbVersionContextValue | null>(null);

export function DbVersionProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => {
    clearReadCooldown();
    setVersion((v) => v + 1);
  }, []);
  const value = useMemo(() => ({ version, bump }), [version, bump]);
  return <DbVersionContext.Provider value={value}>{children}</DbVersionContext.Provider>;
}

export function useDbVersion(): DbVersionContextValue {
  const ctx = useContext(DbVersionContext);
  if (!ctx) throw new Error('useDbVersion must be used within DbVersionProvider');
  return ctx;
}
