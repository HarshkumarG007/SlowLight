export type ActorRole = 'author' | 'recipient' | 'anon';

export interface AppError {
  code: string;
  message: string;
}
