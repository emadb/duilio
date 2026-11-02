ALTER TABLE todos ADD COLUMN status_changed_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE todos ADD COLUMN waiting_on text;
ALTER TABLE todos ADD COLUMN waiting_since timestamp with time zone;
ALTER TABLE todos ADD COLUMN paused_until date;
ALTER TABLE todos ADD COLUMN completed_at timestamp with time zone;
ALTER TABLE todos ADD COLUMN rollover_count integer DEFAULT 0 NOT NULL;

ALTER TABLE users ADD COLUMN timezone text DEFAULT 'Europe/Rome' NOT NULL;

CREATE TABLE weeks (
	user_id uuid NOT NULL,
	week_start date NOT NULL,
	reviewed_at timestamp with time zone,
	note text DEFAULT '' NOT NULL,
	created_at timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT weeks_user_id_week_start_pk PRIMARY KEY(user_id, week_start)
);

ALTER TABLE weeks ADD CONSTRAINT weeks_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE cascade ON UPDATE no action;

UPDATE todos SET status_changed_at = updated_at;
UPDATE todos SET completed_at = updated_at WHERE status = 'done';
UPDATE todos SET waiting_since = updated_at WHERE status = 'blocked';
