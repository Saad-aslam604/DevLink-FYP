# Frontend localStorage keys

The DevLink frontend persists a couple of small values in localStorage to make the messaging UI and optimistic flows smoother. These values are not secret (the auth token is stored in `devlink_token`) and are used only for UI rendering and sender detection.

- `devlink_user_id` — the authenticated user's id (from server; commonly `_id` or `id`). Used to determine which messages are sent by the current user.
- `devlink_user_initial` — a single uppercase letter derived from the user's `firstName` or `name`. Used to render optimistic message avatars immediately while the full Auth context loads.

When they are set

- Written on: sign-in, sign-up, sign-in-with-google, and successful `/auth/me` fetch.
- Removed on: sign-out.

Why

Storing these makes the messages view render your outgoing messages with the correct avatar initial immediately (no flicker) and helps the UI decide left/right alignment for optimistic messages before the auth context finishes loading.

Security note

Do not store passwords or other sensitive tokens in localStorage. The frontend already stores the authentication token under `devlink_token`; these two keys are simple UI helpers only.
