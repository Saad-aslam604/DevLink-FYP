DevLink Authentication - Testing Guide

This document contains manual and automated tests for the DevLink authentication API (Express + MongoDB + JWT).

Base URL
- Default: http://localhost:5000
- Set in `.env` as PORT and CLIENT_URL

Endpoints
- POST /api/auth/register
- POST /api/auth/login
- GET  /api/auth/me (protected)

Quick summary of expected response shape
- Successful responses generally use:
  {
    "success": true,
    "message": "...",
    "data": { ... }
  }
- Errors use:
  {
    "success": false,
    "message": "...",
    "error": { ... } // validation info for 422
  }

1) Full manual test sequence (step-by-step)

A. Server health
1. GET / -> expect 200 and JSON { success: true, message: "DevLink API" }

B. Register (happy path)
1. POST /api/auth/register
   Body (JSON): { "email": "tester+manual@example.com", "password": "Password123", "role": "junior" }
2. Expect 201
3. Response.data.token should contain a JWT
4. Response.data.user should contain id, email, role

C. Register (validation errors)
1. POST /api/auth/register with invalid email or weak password
   - e.g. { "email": "bad", "password": "123" }
2. Expect 422 with validation details in `error.details` and `error.fieldErrors`

D. Register (duplicate email)
1. POST /api/auth/register using same email as in B
2. Expect 409 and message about existing user

E. Login (happy path)
1. POST /api/auth/login with { "email": "tester+manual@example.com", "password": "Password123" }
2. Expect 200 and token in response.data.token

F. Login (wrong password)
1. POST /api/auth/login with correct email but wrong password
2. Expect 401 with message "Invalid email or password"

G. Protected route
1. GET /api/auth/me with header Authorization: Bearer <token>
2. Expect 200 and user object (no password)

H. Protected route without token
1. GET /api/auth/me without Authorization header
2. Expect 401 and message about missing token

2) Automated PowerShell test script
- A fully automated script is provided at `scripts/test-auth.ps1`.
- It runs the above sequence using unique emails (timestamped) to avoid duplicate collisions.
- Script exits with code 0 on all tests passing, non-zero on failures.

3) Postman collection
- `postman_collection.json` is included. Import it into Postman.
- It contains requests and test scripts to validate responses and extract the JWT into a collection variable called `token`.

4) Success criteria
- All happy-path tests (register, login, profile) succeed and return the expected status codes and response structures.
- All error tests return the correct error codes (422, 401, 409) and include meaningful messages.
- JWTs validate (structure) and allow access to protected endpoints.

5) Common troubleshooting
- Server not running: run `npm run dev` and check console logs for startup and MongoDB connection messages.
- MongoDB connection errors: make sure `MONGODB_URI` is correct and mongod is running.
- Port conflicts: use the automatic port-fallback or change `PORT` in `.env`.
- Token errors: ensure `JWT_SECRET` in `.env` is set and consistent between runs.

6) Where to find the files
- `scripts/test-auth.ps1` — PowerShell automation
- `postman_collection.json` — Postman collection
- `README_TESTING.md` — this file

If you want, I can also:
- Run the PowerShell script here and paste the run output (requires permission to start/stop processes), or
- Provide a bash/curl automated script for non-Windows environments.



