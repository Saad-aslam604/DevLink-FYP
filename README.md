# DevLink Platform (FYP)

DevLink is a full-stack mentoring and collaboration platform built for Final Year Project work.
It includes:

- A Node.js + Express backend with MongoDB
- A React + Vite + TypeScript frontend
- Authentication, profiles, sessions, messaging, notifications, posts, ratings, and payments

## Tech Stack

- Backend: Node.js, Express, Mongoose, JWT, Socket.IO
- Frontend: React, Vite, TypeScript, Tailwind CSS
- Database: MongoDB

## Project Structure

- `src/` -> backend source code
- `frontend/` -> frontend application
- `scripts/` -> utility and migration scripts

## Local Setup

### 1. Clone and Install

```powershell
git clone <your-repo-url>
cd DevLink-Platform
npm install
cd frontend
npm install
```

### 2. Environment Variables

At project root:

```powershell
copy .env.example .env
```

Minimum required values in `.env`:

- `PORT=5000`
- `MONGODB_URI=mongodb://localhost:27017/devlink`
- `JWT_SECRET=your-secret`

Optional values are already documented in `.env.example`.

### 3. Run Backend

From project root:

```powershell
npm run dev
```

Backend default URL:

- `http://127.0.0.1:5000`

### 4. Run Frontend

From `frontend/`:

```powershell
npm run dev
```

Frontend default URL:

- `http://127.0.0.1:3000`

## Core Features

- JWT authentication (email/password + Google)
- Mentor/junior/student profiles
- Session booking and session history
- Real-time chat and notifications
- Social feed with posts, likes, and comments
- Ratings and withdrawal workflow
- Admin and analytics modules

## Notes

- The backend writes the active server port to `CURRENT_BACKEND_PORT`.
- If you see 401 responses, log in first so `devlink_token` is available in local storage.
- For production, set strong secrets and tighten CORS settings.
