# Chelooms API

Node.js (Express) backend boilerplate. PostgreSQL connection and business logic to be added.

## Setup

1. **Clone** the repo and go into the project folder.
2. **Install dependencies:**  
   `npm install`
3. **Environment:**  
   Copy `.env.example` to `.env` and set values (e.g. `PORT`). Add `DATABASE_URL` when PostgreSQL is configured.
4. **Run:**
   - Dev (with reload): `npm run dev`
   - Production: `npm start`

Server runs at `http://localhost:5000` (or the port in `.env`).  
Health check: `GET /health`  
API base: `GET /api/v1`

## Next steps (for dev)

- Set up PostgreSQL and add database connection (e.g. `pg`, Prisma, or another ORM).
- Add routes, controllers, and models as needed.
