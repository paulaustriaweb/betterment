import { useCallback, useMemo } from 'react';

import {
  deleteTransaction,
  insertTransaction,
  listTransactionsForRange,
  updateTransaction,
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
      try {
        return insertTransaction(input);
      } finally {
        bump();
      }
    },
    [bump]
  );

  const update = useCallback(
    (id: number, input: TransactionInput) => {
      try {
        updateTransaction(id, input);
      } finally {
        bump();
      }
    },
    [bump]
  );

  const remove = useCallback(
    (id: number) => {
      try {
        deleteTransaction(id);
      } finally {
        bump();
      }
    },
    [bump]
  );

  return { transactions, add, update, remove };
}
