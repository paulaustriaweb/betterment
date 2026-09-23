import { useCallback } from 'react';

import {
  deleteTransaction,
  insertTransaction,
  listTransactionsForRange,
  updateTransaction,
  type TransactionInput,
} from '@/db/transactions';
import type { Transaction } from '@/lib/types';
import { useWrite } from './DbVersionContext';
import { useDbQuery } from './useDbQuery';

const NONE: Transaction[] = [];

export function useTransactionsForRange(rangeStart: Date, rangeEnd: Date) {
  const write = useWrite();
  const startIso = rangeStart.toISOString();
  const endIso = rangeEnd.toISOString();
  const read = useCallback(() => listTransactionsForRange(startIso, endIso), [startIso, endIso]);
  const { data: transactions, current: ready, loaded } = useDbQuery(`tx:${startIso}:${endIso}`, read, NONE);

  const add = useCallback((input: TransactionInput) => write(() => insertTransaction(input)), [write]);
  const update = useCallback(
    (id: number, input: TransactionInput) => write(() => updateTransaction(id, input)),
    [write]
  );
  const remove = useCallback((id: number) => write(() => deleteTransaction(id)), [write]);

  return { transactions, ready, loaded, add, update, remove };
}
