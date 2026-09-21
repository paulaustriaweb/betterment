export interface Category {
  id: number;
  name: string;
  color: string;
  isActive: boolean;
}

export interface TimeBlock {
  id: number;
  startTime: string; // ISO 8601, local time
  endTime: string;
  categoryId: number;
  note: string | null;
  createdAt: string;
}

export interface Transaction {
  id: number;
  type: 'expense' | 'income';
  amount: number;
  category: string | null;
  source: string | null;
  note: string | null;
  date: string; // ISO 8601 date
  createdAt: string;
}

export interface Goal {
  id: number;
  title: string;
  deadline: string; // ISO 8601 date
  isComplete: boolean;
  createdAt: string;
}
