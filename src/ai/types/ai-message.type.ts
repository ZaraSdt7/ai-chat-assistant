export type AIMessageRole = 'user' | 'model';

export interface AIMessage {
  role: AIMessageRole;
  content: string;
}
