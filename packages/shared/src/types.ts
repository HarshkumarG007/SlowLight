export type ActorRole = 'author' | 'recipient' | 'anon';

export interface AppError {
  code: string;
  message: string;
}

export interface SealContext {
  table: string;
  column: string;
  rowId: string;
}
