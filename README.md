# DevLink Backend

Express + MongoDB + Mongoose + JWT auth minimal backend.

Required env (copy `.env.example` -> `.env`):
- PORT (default 5000)
- MONGO_URI
- JWT_SECRET
- JWT_EXPIRE (e.g. 7d)

Install & run:

```powershell
# from project root
npm install
# dev (auto-restart)
npm run dev
# or production
npm start
```

Endpoints:
- POST /api/auth/register  { email, password, role? }
- POST /api/auth/login     { email, password }
- GET  /api/auth/profile   (bearer token required)

Notes:
- Passwords are hashed with bcrypt.
- JWT returned on login/register; include as `Authorization: Bearer <token>` on protected routes.
