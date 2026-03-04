/** Shared Note domain types — single source of truth. */

export interface NoteTag {
  label: string;
  color: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  date: string;
  timestamp: number;
  category: string;
  cardColor: string;
  tags: NoteTag[];
  todos?: ChecklistItem[];
  images?: string[];
  fontFamily?: string;
}
