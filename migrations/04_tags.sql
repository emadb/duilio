CREATE TABLE tags (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	user_id uuid NOT NULL,
	name text NOT NULL,
	color text NOT NULL,
	created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE todo_tags (
	todo_id uuid NOT NULL,
	tag_id uuid NOT NULL,
	CONSTRAINT todo_tags_todo_id_tag_id_pk PRIMARY KEY(todo_id , tag_id)
);

ALTER TABLE tags ADD CONSTRAINT tags_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE cascade ON UPDATE no action;

ALTER TABLE todo_tags ADD CONSTRAINT todo_tags_todo_id_todos_id_fk FOREIGN KEY (todo_id) REFERENCES public.todos(id) ON DELETE cascade ON UPDATE no action;

ALTER TABLE todo_tags ADD CONSTRAINT todo_tags_tag_id_tags_id_fk FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE cascade ON UPDATE no action;

ALTER TABLE tags ADD CONSTRAINT tags_user_id_name_unique UNIQUE(user_id, name);