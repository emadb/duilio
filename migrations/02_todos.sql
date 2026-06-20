CREATE TYPE todo_status AS ENUM ('todo', 'in-progress', 'done');

CREATE TABLE todos (
	id  uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	title  text NOT NULL,
	description  text DEFAULT '' NOT NULL,
	due_date  timestamp with time zone,
	status  todo_status DEFAULT 'todo' NOT NULL,
	created_at  timestamp with time zone DEFAULT now() NOT NULL,
	updated_at  timestamp with time zone DEFAULT now() NOT NULL,

	CONSTRAINT todos_status_check CHECK (todos.status in ('todo', 'in-progress', 'done'))
);