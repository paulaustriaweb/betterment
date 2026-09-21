import { useCallback, useMemo } from 'react';

import {
  deleteTransaction,
  insertTransaction,
  listTransactionsForRange,
  type TransactionInput,
} from '@/db/transactions';
import { useDbVersion } from './DbVersionContext';

export function useTransactionsForRange(rangeStart: Date, rangeEnd: Date) {
  const { version, bump } = useDbVersion();
  const startIso = rangeStart.toISOString();
  const endIso = rangeEnd.toISOString();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const transactions = useMemo(() => listTransactionsForRange(startIso, endIso), [startIso, endIso, version]);

  const add = useCallback(
    (input: TransactionInput) => {
      const id = insertTransaction(input);
      bump();
      return id;
    },
    [bump]
  );

  const remove = useCallback(
    (id: number) => {
      deleteTransaction(id);
      bump();
    },
    [bump]
  );

  return { transactions, add, remove };
}
