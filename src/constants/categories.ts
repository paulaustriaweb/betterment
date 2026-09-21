import { categoryColors } from '@/lib/colors';

// categories.color stores the `dot` hex — the category's identity color.
// Agenda block fills and card tints come from tintFor() at render time.
export const CATEGORY_SEED = [
  { name: 'Work / Freelance', color: categoryColors.work.dot },
  { name: 'Study / School', color: categoryColors.study.dot },
  { name: 'Reading', color: categoryColors.reading.dot },
  { name: 'Sleep', color: categoryColors.sleep.dot },
  { name: 'Gaming', color: categoryColors.gaming.dot },
  { name: 'Scrolling', color: categoryColors.scrolling.dot },
  { name: 'Watching', color: categoryColors.watching.dot },
  { name: 'Other', color: categoryColors.other.dot },
] as const;
