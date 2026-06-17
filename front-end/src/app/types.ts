export type TodoStatus = 'todo' | 'in-progress' | 'done';

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Todo {
  id: string;
  title: string;
  description: string;
  dueDate: string | null;
  status: TodoStatus;
  tags: Tag[];
}
