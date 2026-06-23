-- disable-migration-transaction
ALTER TYPE todo_status ADD VALUE 'blocked' BEFORE 'done';
ALTER TABLE todos DROP CONSTRAINT todos_status_check;
