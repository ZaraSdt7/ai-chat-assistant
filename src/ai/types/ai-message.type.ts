export type AIMessageRole = 'system' | 'user' | 'model';

export interface AIMessage {
  role: AIMessageRole;
  content: string;
}
