export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface NoteSnapshot {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  categoryId?: string; // Optional category
  updatedAt: string;
  pinned: boolean;
  locked: boolean;
  archived: boolean;
  deleted: boolean;
  hidden?: boolean; // Hide from active list (exclusive to locked folder)
  customIndex?: number; // Sorting index for custom reordering
  type?: 'note' | 'document' | 'sheet' | 'tracker' | 'expense'; // Type of note layout
  image?: string; // Optional base64 image
  checklist?: ChecklistItem[]; // Optional checklist items
  drawing?: string; // Optional drawing base64 data URL
  passcode?: string; // Optional 4-digit passcode
  history?: NoteSnapshot[]; // Optional snapshot history
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  isDefault: boolean;
}

export type SortOption = 'updated-desc' | 'updated-asc' | 'title-asc' | 'title-desc' | 'custom';

