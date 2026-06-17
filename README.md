# Duilio

Single-user, full-stack todo app: React (Vite) front-end, Fastify + Drizzle ORM
back-end in TypeScript, PostgreSQL storage.

```
front-end/   React UI (Vite + Tailwind + shadcn-style components)
back-end/    Fastify API + serves the built front-end
docs/        Design docs
```

## Run

```sh
# 1. Start PostgreSQL (host port 5433)
docker compose up -d

# 2. Apply database migrations
cd back-end && npm install && npm run migrate

# 3. Build the front-end
cd ../front-end && npm install && npm run build

# 4. Start the server
cd ../back-end && npm run dev      # http://localhost:3000
```

The backend serves both the API and the built front-end at `http://localhost:3000`.

### Front-end dev loop

For hot reload while developing the UI, keep the backend running and start Vite:

```sh
cd front-end && npm run dev        # proxies /api to localhost:3000
```

## API

| Method | Path                    | Purpose                     |
|--------|-------------------------|-----------------------------|
| GET    | /api/todos              | list all todos              |
| POST   | /api/todos              | create (title required)     |
| PATCH  | /api/todos/:id          | update title/description/dueDate/status |
| PATCH  | /api/todos/:id/status   | change state (`todo`, `in-progress`, `done`) |
| DELETE | /api/todos/:id          | delete                      |

Configuration via env vars: `DATABASE_URL` (default
`postgres://todo:todo@localhost:5433/todo`), `PORT` (default `3000`).
