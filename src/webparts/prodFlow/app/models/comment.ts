export interface IComment {
  id: string;
  author: { name: string; email: string };
  text: string;
  ts: string;
  section?: string;
  edited?: boolean;
  editedAt?: string;
}
