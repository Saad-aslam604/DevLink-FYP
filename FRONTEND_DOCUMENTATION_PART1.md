# DEVLINK FRONTEND - COMPLETE UI & FEATURE DOCUMENTATION

## PART 1: PROJECT STRUCTURE & ARCHITECTURE

### 1.1 Overall Architecture

**Tech Stack:**
- **Framework:** React 18 (Vite)
- **Routing:** React Router v6 with future flags
- **State Management:** React Context (AuthContext) + Local State
- **Styling:** Tailwind CSS + Custom CSS
- **UI Components:** Recharts (data visualization), Lucide React (icons)
- **Real-time:** Socket.IO client
- **Video:** WebRTC with custom signaling
- **Forms:** Native HTML forms with validation
- **HTTP Client:** Custom fetch-based API service
- **Dark Mode:** Supported via Tailwind classes

### 1.2 Project Folder Structure

```
frontend/src/
├── pages/                    # Full page components (routes)
│   ├── AdminDashboard/      # Admin section
│   ├── Dashboard.tsx         # Main user dashboard
│   ├── Messages.tsx          # Chat/messaging page
│   ├── Feed.tsx              # Community feed
│   ├── Mentors.tsx           # Mentor browsing
│   ├── Sessions.tsx          # Booking management
│   ├── Projects/             # Project listing & details
│   ├── Settings.tsx          # User settings
│   ├── BecomeMentor.tsx      # Mentor application
│   ├── RegisterOrganization.tsx  # Organization signup
│   ├── OrganizationDashboard.tsx  # Org management
│   ├── CheckoutPage.tsx      # Payment checkout
│   ├── PaymentSuccess.tsx    # Payment confirmation
│   ├── VideoCallWithPIPPage.tsx   # Video calling
│   ├── LiveCodingRoomPage.tsx     # Live coding
│   └── TestSocket.tsx        # Dev testing
├── components/               # Reusable components
│   ├── Auth/                 # Login, Signup, Password reset
│   ├── Layout/               # MainLayout wrapper
│   ├── Dashboard/            # Dashboard sub-components
│   ├── Mentors/              # Mentor list components
│   ├── Posts/                # Post/comment components
│   ├── Video/                # Video call components
│   ├── UI/                   # Generic UI elements
│   ├── Organization/         # Org management UI
│   └── Profile/              # Profile components
├── services/                 # API service files
│   ├── api.ts               # Main HTTP client
│   ├── adminApi.ts          # Admin endpoints
│   ├── bookingsApi.ts       # Booking endpoints
│   ├── mentorApplicationsApi.ts  # Mentor application endpoints
│   └── organizationApiService.ts # Organization endpoints
├── contexts/                 # React Context
│   └── AuthContext.tsx       # User authentication state
├── hooks/                    # Custom React hooks
│   ├── useSocket.ts         # Socket.IO connection
│   ├── useAuth.ts           # Authentication hook
│   └── ... others
├── utils/                    # Utility functions
│   ├── socket.ts            # Socket.IO initialization
│   ├── validation.ts        # Form validation
│   └── ... helpers
├── features/                 # Feature-specific modules
│   ├── videocall/           # Video call logic
│   └── collaboration/       # Code collaboration
├── styles/                   # Global CSS
│   └── index.css            # Tailwind & custom styles
└── types/                    # TypeScript types
    └── ... type definitions
```

### 1.3 State Management Strategy

**Authentication State (AuthContext):**
- Stores: `user`, `token`, `loading`
- Functions: `signIn`, `signUp`, `signInWithGoogle`, `signOut`, `updateProfile`, `forgotPassword`, `resetPassword`
- Persistence: JWT token stored in `localStorage.devlink_token`

**Local Component State:**
- Messages page: `previews`, `messages`, `activeBookingId`, `typingUsers`
- Dashboard: `profile`, `sessions`, `bookings`, `analytics`
- Video call: `localStream`, `remoteStream`, `isVideoOn`, `isAudioOn`

**Socket.IO Real-time State:**
- Managed via event listeners in components
- Syncs messages, typing indicators, online status

**No Redux/Zustand:** Simple architecture with Context API for auth + local state for features

---

## PART 2: ROUTING & PAGES

### 2.1 Complete Route Map

| Route Path | Component | Auth Required | Roles Allowed | Page Purpose |
|-----------|-----------|---------------|---------------|------------|
| `/` | Home (redirects to `/dashboard`) | Yes | All | Root |
| `/dashboard` | Dashboard | Yes | All | Main user dashboard |
| `/login` | Login | No | All | Email/password login |
| `/signup` | Signup | No | All | Create new account |
| `/forgot-password` | ForgotPassword | No | All | Password reset request |
| `/reset-password/:token` | ResetPassword | No | All | Password reset form |
| `/mentors` | Mentors | Yes | student, junior | Browse mentors |
| `/become-mentor` | BecomeMentor | Yes | junior | Apply to become mentor |
| `/register-organization` | RegisterOrganization | Yes | All | Create organization account |
| `/organization-dashboard` | OrganizationDashboard | Yes | organization | Org management |
| `/messages` | Messages | Yes | All | Chat & conversations |
| `/feed` | Feed | Yes | All | Community posts |
| `/projects` | ProjectListingPage | No | All | Browse projects |
| `/projects/new` | CreateProjectPage | Yes | mentor | Create new project |
| `/projects/:id` | ProjectDetailPage | No | All | Project details |
| `/sessions/confirmation` | SessionConfirmation | Yes | All | Booking confirmation |
| `/sessions` | Sessions | Yes | All | My bookings |
| `/settings` | Settings | Yes | All | User preferences |
| `/profile/:userId?` | ProfilePage | Yes | All | User profile |
| `/video/:bookingId` | VideoCallWithPIPPage | Yes | All | Video call (new) |
| `/video-legacy/:bookingId` | VideoCall | Yes | All | Video call (legacy) |
| `/live-coding/:bookingId?` | LiveCodingRoomPage | Yes | All | Code collaboration |
| `/checkout` | CheckoutPage | Yes | All | Payment page |
| `/payment-success` | PaymentSuccess | Yes | All | Payment confirmation |
| `/admin/*` | AdminRoutes | Yes | admin | Admin dashboard |

### 2.2 Detailed Page Specifications

#### **Dashboard Page** (`/dashboard`)
**Path:** `pages/Dashboard.tsx`
**Auth Required:** Yes
**Roles:** All (redirects organization users to `/organization-dashboard`)
**Purpose:** Main user hub showing sessions, messages, analytics, activities

**Key Sections:**
1. **Onboarding Card** - For new users (DashboardOnboarding component)
2. **Quick Stats** - Total sessions, messages, connections
3. **Upcoming Sessions** - Next 7 days of bookings
4. **Recent Messages** - Last 5 conversations
5. **Recent Activities** - Timeline of bookings/messages
6. **Charts** - Recharts for session trends and completion rates
7. **Call-to-Action Buttons** - "Book a mentor", "Browse mentors", "View sessions"

**UI Elements:**
- Session cards with mentor avatar, date/time, status badge
- Message previews with sender, last message text
- Analytics line/bar/pie charts
- "Book Mentor" button → redirects to `/mentors`
- "View Sessions" button → redirects to `/sessions`

**Data Loaded On Mount:**
- `/api/profiles/me` - Current user profile & connections count
- `/api/bookings/my` - User's bookings
- `/api/messages/recent` - Recent message previews
- `/api/activities` - User activity timeline
- `/api/user-analytics` - User statistics

---

#### **Messages Page** (`/messages`)
**Path:** `pages/Messages.tsx`
**Auth Required:** Yes
**Roles:** All
**Purpose:** Chat interface with conversations list and message history

**Key Sections:**
1. **Conversations List** (Left sidebar)
   - Search bar to filter conversations
   - "Archived" tab to show hidden conversations
   - Conversation items with:
     - Sender avatar
     - Name & last message preview
     - Unread message count badge
     - Timestamp (last message time)
     - Mute/Archive/Block icons (hover menu)

2. **Message History** (Center)
   - Scrollable message list
   - Message bubbles with:
     - Sender avatar
     - Message content
     - Timestamp
     - Read/delivered/sent status indicator
     - Reaction emojis (👍, ❤️, etc.)
   - System messages (booking confirmations, etc.)
   - Loading indicators while fetching

3. **Message Input** (Bottom)
   - Text input field
   - File attachment button
   - Typing indicator ("typing...")
   - Send button
   - Emoji picker (optional)

4. **Modals:**
   - Report conversation (reason + details)
   - Blocked users list (with unblock button)

**UI Actions & Events:**
| Action | Trigger | API/Socket Event | Result |
|--------|---------|------------------|--------|
| Load conversations | Component mount | `GET /api/messages/recent` | List of 10 recent conversations |
| Select conversation | Click conversation item | `GET /api/messages/history?bookingId=...` | Load message history |
| Send message | Click send / Ctrl+Enter | `socket.emit('chat-message', {...})` | Message appears in list, sent to other user |
| Type message | User typing | `socket.emit('typingStart', {bookingId})` → Wait → `typingStop` | "User is typing..." appears on receiver |
| Mark read | Focus on message / Auto | `PUT /api/messages/:messageId/read` | Message status changes to "read" |
| Add reaction | Click emoji | `POST /api/messages/:messageId/reactions` | Emoji added to message |
| Delete message | Click delete icon | `DELETE /api/messages/:messageId` | Message soft-deleted (deleted for you) |
| Mute conversation | Click mute icon | `PUT /api/conversations/:id/mute` | Conversation silenced (no notifications) |
| Archive conversation | Click archive | `PUT /api/conversations/:id/archive` | Conversation hidden from main list |
| Block user | Click block | `PUT /api/conversations/:id/block` | User blocked, conversation closed |
| Report conversation | Click report → Submit modal | `POST /api/conversations/:id/report` | Report submitted to admin |

**Socket.IO Events:**
- **Listen:** `chat-message`, `typing-start`, `typing-stop`, `message-status-update`, `conversation-updated`, `conversation-deleted`, `conversation-muted`, `conversation-archived`, `user-block-updated`

---

#### **Sessions / Bookings Page** (`/sessions`)
**Path:** `pages/Sessions.tsx`
**Auth Required:** Yes
**Roles:** All
**Purpose:** View, manage, and cancel bookings

**Key Sections:**
1. **Filter Tabs**
   - All
   - Upcoming (confirmed)
   - Past (completed, cancelled)
   - By role (Student / Mentor)

2. **Session Cards** displaying:
   - Mentor/Student name & avatar
   - Date & time
   - Status badge (pending, confirmed, completed, cancelled)
   - Duration
   - Price (if applicable)
   - Action buttons

3. **Action Buttons Per Session:**
   - "Confirm" - Accept pending booking (mentor only)
   - "Cancel" - Cancel session
   - "Open Chat" - Start messaging
   - "Join Video Call" - Start video call
   - "Rate" - Leave review (after completed)

**UI Actions & Events:**
| Action | Trigger | API/Socket | Result |
|--------|---------|----------|--------|
| Load bookings | Page mount | `GET /api/bookings/my` | Show filtered list |
| Filter by status | Click tab | Local state filter | Re-sort bookings |
| Confirm booking | Click "Confirm" | `PATCH /api/bookings/:id` | Status → confirmed, start payment flow |
| Cancel booking | Click "Cancel" | `PATCH /api/bookings/:id` | Status → cancelled, show confirmation |
| Open video call | Click "Join" | Navigate to `/video/:bookingId` | Load video call page |
| Open chat | Click "Message" | `setActiveBookingId()` → Navigate to `/messages` | Show conversation in messages |
| Rate session | Click "Rate" (post-complete) | `POST /api/bookings/:id/rating` | Submit rating & review |

---

#### **Mentors Browse Page** (`/mentors`)
**Path:** `pages/Mentors.tsx`
**Auth Required:** Yes
**Roles:** student, junior
**Purpose:** Search & filter available mentors, book sessions

**Key Sections:**
1. **Search & Filter Panel** (Left sidebar)
   - Search input (name, skills)
   - Skills multi-select dropdown
   - Hourly rate range slider
   - Availability filter
   - Sort options (rating, price, newest)

2. **Mentor Grid/List** (Main area)
   - Mentor cards displaying:
     - Avatar & name
     - Title & bio (truncated)
     - Rating (⭐ 4.8/5)
     - Hourly rate ($40/hr)
     - Skills badges
     - Availability status
   - "View Profile" button
   - "Book Session" button (quick booking)

3. **Booking Modal** (when "Book Session" clicked)
   - Date/Time picker
   - Duration selector
   - Notes textarea
   - "Confirm & Proceed to Payment" button

**UI Actions & Events:**
| Action | Trigger | API/Socket | Result |
|--------|---------|----------|--------|
| Search mentors | Type search query | `GET /api/profiles/mentors?q=...` | Filtered list |
| Filter by skill | Select skill | `GET /api/profiles/mentors?skill=...` | Filtered list |
| Sort mentors | Click sort option | Local state re-sort | List reordered |
| View mentor profile | Click "View Profile" | Navigate to `/profile/:userId` | Show full profile |
| Open booking modal | Click "Book Session" | Show modal | Allow date/time selection |
| Confirm booking | Submit modal | `POST /api/bookings` | Create booking, redirect to checkout |

---

#### **Become Mentor Page** (`/become-mentor`)
**Path:** `pages/BecomeMentor.tsx`
**Auth Required:** Yes
**Roles:** junior only (students must upgrade role)
**Purpose:** Submit mentor application form

**Form Fields:**
- Title (e.g., "Full Stack Developer")
- Bio / Bio (text area, 500 chars)
- Years of experience (number)
- Skills (multi-select: JavaScript, Python, etc.)
- Expertise areas (multi-select)
- Requested hourly rate ($)
- Current company
- GitHub URL
- LinkedIn URL
- Portfolio URL

**Validation Rules:**
- All fields required except company/URLs
- Rate: 10-200 range
- Bio: 50-500 characters
- Skills: min 1, max 10

**UI Actions:**
| Action | Trigger | API | Result |
|--------|---------|-----|--------|
| Submit form | Click "Submit Application" | `POST /api/mentor-applications` | Show success message, redirect to dashboard |
| Validation error | Invalid field | Client-side validation | Show error message in field |

---

#### **Register Organization Page** (`/register-organization`)
**Path:** `pages/RegisterOrganization.tsx`
**Auth Required:** Yes
**Roles:** All (converts user account to organization)
**Purpose:** Convert user account to organization account

**Form Fields:**
- Organization name (required)
- Contact email (required)
- Website URL
- Address
- Contact person name
- Description / About

**UI Actions:**
| Action | Trigger | API | Result |
|--------|---------|-----|--------|
| Submit form | Click "Register" | `POST /api/users/register-organization` | User converted to organization, redirect to `/organization-dashboard` |

---

#### **Organization Dashboard** (`/organization-dashboard`)
**Path:** `pages/OrganizationDashboard.tsx`
**Auth Required:** Yes
**Roles:** organization user type
**Purpose:** Manage organization projects, tasks, team, resources

**Key Sections:**
1. **Projects** - Create, edit, delete projects
2. **Tasks** - Assign tasks to team members
3. **Team** - Invite, manage, remove members
4. **Resources** - Upload shared files/documents
5. **Settings** - Org profile & preferences

**UI Actions:**
| Action | Trigger | API | Result |
|--------|---------|-----|--------|
| Create project | Click "New Project" | `POST /api/organization/projects` | Project created |
| Create task | Click "New Task" in project | `POST /api/organization/projects/:projectId/tasks` | Task created & assigned |
| Invite member | Click "Invite" | `POST /api/organization/team/invite` | Invitation sent |
| Upload resource | Click "Upload" | `POST /api/uploads/upload` | File uploaded |

---

#### **Feed Page** (`/feed`)
**Path:** `pages/Feed.tsx`
**Auth Required:** Yes
**Roles:** All
**Purpose:** Community posts, discussions, content sharing

**Key Sections:**
1. **Post Creation Card** (top)
   - Text input "What's on your mind?"
   - Image upload button
   - Post button

2. **Feed List** (main)
   - Posts displaying:
     - Author avatar & name
     - Timestamp
     - Post content
     - Images (carousel if multiple)
     - Like count & button
     - Comment count & button
   - Comments section (collapsible)

**UI Actions:**
| Action | Trigger | API | Result |
|--------|---------|-----|--------|
| Create post | Click "Post" | `POST /api/posts` (multipart) | Post appears at top of feed |
| Like post | Click like button | `POST /api/posts/:postId/like` | Like count ±1 |
| Comment on post | Type & submit | `POST /api/posts/:postId/comments` | Comment appears under post |
| Edit post | Click "Edit" | `PATCH /api/posts/:postId` | Post text updated |
| Delete post | Click "Delete" | `DELETE /api/posts/:postId` | Post removed from feed |

---

#### **Settings Page** (`/settings`)
**Path:** `pages/Settings.tsx`
**Auth Required:** Yes
**Roles:** All
**Purpose:** User profile, preferences, privacy settings

**Key Sections:**
1. **Profile Settings**
   - First/Last name
   - Avatar upload
   - Bio
   - Title
   - Location
   - Timezone

2. **Professional Info**
   - Skills (multi-select)
   - Experience level
   - Hourly rate (if mentor)
   - GitHub/LinkedIn/Portfolio URLs

3. **Privacy Settings**
   - Blocked users list
   - Archived conversations
   - Profile visibility

4. **Preferences**
   - Notification settings
   - Dark mode toggle
   - Email preferences

**UI Actions:**
| Action | Trigger | API | Result |
|--------|---------|-----|--------|
| Update profile | Click "Save" | `PUT /api/profiles/me` | Profile updated |
| Upload avatar | Select file | `POST /api/profiles/me/avatar` | Avatar changed |
| Unblock user | Click unblock button | `PUT /api/conversations/unblock/:userId` | User unblocked |
| Change password | Form submit | `POST /api/auth/reset-password` | Password changed |

---

#### **Video Call Page** (`/video/:bookingId`)
**Path:** `pages/VideoCallWithPIPPage.tsx`
**Auth Required:** Yes
**Roles:** All (participants of booking)
**Purpose:** Real-time video/audio communication

**Key Sections:**
1. **Main Video** - Large remote participant feed
2. **PIP (Picture-in-Picture)** - Small local video preview
3. **Controls** (bottom):
   - Mic toggle button (🔊 / 🔇)
   - Camera toggle button (📹 / ❌)
   - Screen share button (if supported)
   - End call button (🔴)
   - Chat toggle button (to show messages)
4. **Chat Sidebar** (optional right panel)
   - Messages during call
   - Participant list

**WebRTC Flow:**
1. Join booking → `socket.emit('join-room', {bookingId})`
2. Listen for `participant-joined` events
3. Create local stream → `navigator.mediaDevices.getUserMedia()`
4. Send offer → `socket.emit('webrtc-offer', {bookingId, offer})`
5. Receive answer → Listen to `webrtc-answer`
6. Exchange ICE candidates → `socket.emit('webrtc-candidate')`
7. Establish peer connection & render streams

**UI Actions:**
| Action | Trigger | UI | Result |
|--------|---------|-----|--------|
| Toggle mic | Click mic button | Button changes color | Audio on/off, sent via stream |
| Toggle camera | Click camera button | Button changes color | Video on/off |
| Share screen | Click screen share | Switch main to screen | Screen shared instead of camera |
| Send chat message | Send during call | Appears in sidebar | Message synced via socket |
| End call | Click "End Call" | Confirmation dialog | Disconnect WebRTC, navigate back |

---

#### **Checkout Page** (`/checkout`)
**Path:** `pages/CheckoutPage.tsx`
**Auth Required:** Yes
**Roles:** All (booking student)
**Purpose:** Payment processing for booking

**Sections:**
1. **Order Summary**
   - Mentor name & avatar
   - Session date/time
   - Duration
   - Hourly rate
   - Total price
   - Platform fee breakdown

2. **Payment Form** (Stripe or mock)
   - Card number
   - Expiry date
   - CVC
   - Billing zip code
   - "Pay Now" button

**UI Actions:**
| Action | Trigger | API | Result |
|--------|---------|-----|--------|
| Load checkout | Page mount | `POST /api/payments/create-intent` | Stripe intent created, clientSecret returned |
| Submit payment | Click "Pay Now" | Stripe.confirmPayment() | Process charge, redirect to success/error |

---

### 2.3 Authentication Pages

#### **Login Page** (`/login`)
**Form Fields:** Email, Password
**Actions:**
- Sign in button → `POST /api/auth/login`
- Google sign in button → OAuth flow
- "Forgot password?" link → `/forgot-password`
- "Sign up" link → `/signup`

#### **Signup Page** (`/signup`)
**Form Fields:** Name, Email, Password, Role (student/junior)
**Actions:**
- Create account button → `POST /api/auth/register`
- "Already have account?" link → `/login`

#### **Forgot Password** (`/forgot-password`)
**Form Fields:** Email
**Actions:**
- Send reset email button → `POST /api/auth/forgot-password`
- Shows: "Check your email for reset link"

#### **Reset Password** (`/reset-password/:token`)
**Form Fields:** New password, Confirm password
**Actions:**
- Reset button → `POST /api/auth/reset-password/:token`
- Success → Redirect to `/login`

---

## PART 3: FORMS & VALIDATIONS

### 3.1 Login Form
**Endpoint:** `POST /api/auth/login`
**Fields:**
| Field | Type | Validation | Error Message |
|-------|------|-----------|----------------|
| Email | text | Required, valid email format | "Please provide a valid email" |
| Password | password | Required, min 1 char | "Password is required" |

**Submit Action:**
- Call `useAuth().signIn(email, password)`
- On success: Store token in localStorage, redirect to `/dashboard`
- On error: Display error message in red banner

**Error Scenarios:**
- Invalid credentials → "Invalid email or password"
- Account locked → "Account locked due to multiple failed login attempts. Try again later."
- Network error → "Unable to sign in. Please try again."

---

### 3.2 Signup Form
**Endpoint:** `POST /api/auth/register`
**Fields:**
| Field | Type | Validation | Error Message |
|-------|------|-----------|----------------|
| Full name | text | Required | "Name is required" |
| Email | text | Required, valid email | "Please provide a valid email" |
| Password | password | Required, min 6 chars | "Password must be at least 6 characters" |
| Role | dropdown | Required (student/junior) | "Please select a role" |

**Submit Action:**
- Call `useAuth().signUp({name, email, password, role})`
- On success: Store token, redirect to `/dashboard`
- On error (email exists): "User already exists with this email"

---

### 3.3 Forgot Password Form
**Endpoint:** `POST /api/auth/forgot-password`
**Fields:**
| Field | Type | Validation |
|-------|------|-----------|
| Email | text | Required, valid email |

**Submit Action:**
- Call `useAuth().forgotPassword(email)`
- Success message: "If email exists, reset instructions sent"
- Does not reveal whether email exists (security)

---

### 3.4 Reset Password Form
**Endpoint:** `POST /api/auth/reset-password/:token`
**Fields:**
| Field | Type | Validation | Error |
|-------|------|-----------|-------|
| Password | password | Required, min 6 chars | "Password must be at least 6 characters" |
| Confirm Password | password | Must match Password field | "Passwords do not match" |

**Submit Action:**
- Call `useAuth().resetPassword(token, password)`
- On success: Redirect to `/login`, show "Password reset successfully"
- On error: "Invalid or expired reset token"

---

### 3.5 Profile Update Form
**Endpoint:** `PUT /api/profiles/me`
**Fields:**
| Field | Type | Validation | Constraints |
|-------|------|-----------|------------|
| First Name | text | Optional | Max 100 chars |
| Last Name | text | Optional | Max 100 chars |
| Bio | textarea | Optional | Max 2000 chars |
| Title | text | Optional | - |
| Company | text | Optional | - |
| Location | text | Optional | - |
| Timezone | dropdown | Optional | Valid timezone |
| Skills | multi-select | Optional | Array of strings |
| Hourly Rate | number | Optional, if mentor | Min 0, max 999 |
| GitHub URL | url | Optional | Valid URL |
| LinkedIn URL | url | Optional | Valid URL |
| Portfolio URL | url | Optional | Valid URL |
| Experience Level | dropdown | Optional | junior/mid/senior |

**Submit Action:**
- Call `useAuth().updateProfile(patch)` or `PUT /api/profiles/me`
- On success: Show toast "Profile updated"
- Blob URLs detected and ignored (prevents invalid avatars)

---

### 3.6 Mentor Application Form
**Endpoint:** `POST /api/mentor-applications` (or create via admin approval flow)
**Fields:**
| Field | Type | Validation | Constraints |
|-------|------|-----------|------------|
| Title | text | Required | Max 100 chars |
| Bio | textarea | Required | 50-500 chars |
| Years of Experience | number | Required | Min 0, max 70 |
| Skills | multi-select | Required | Min 1 skill |
| Expertise Areas | multi-select | Optional | Array |
| Requested Rate | number | Required | 10-200 range |
| Current Company | text | Optional | - |
| GitHub URL | url | Optional | Valid URL |
| LinkedIn URL | url | Optional | Valid URL |
| Portfolio URL | url | Optional | Valid URL |

**Validation Rules (Client-side):**
```javascript
const rules = {
  title: (v) => v && v.length >= 5 ? null : "Minimum 5 characters",
  bio: (v) => v && v.length >= 50 && v.length <= 500 ? null : "50-500 characters required",
  yearsOfExperience: (v) => v >= 0 && v <= 70 ? null : "Must be 0-70",
  skills: (v) => v && v.length >= 1 && v.length <= 10 ? null : "Select 1-10 skills",
  requestedRate: (v) => v >= 10 && v <= 200 ? null : "Rate must be $10-200/hour"
}
```

**Submit Action:**
- Validate all fields
- `POST /api/mentor-applications` with form data
- On success: Show "Application submitted. Our team will review it."
- On error: Show error message

---

### 3.7 Booking Form (Book a Mentor)
**Endpoint:** `POST /api/bookings`
**Fields:**
| Field | Type | Validation |
|-------|------|-----------|
| Mentor | dropdown | Required (auto-filled) |
| Date | date picker | Required, today or future |
| Start Time | time picker | Required |
| Duration | number | Required (30, 60, 90, 120 mins) |
| Notes | textarea | Optional, max 1000 chars |
| Meeting Type | dropdown | Optional (video-call, live-coding) |

**Submit Action:**
- Validate: date not past, time not past, duration valid
- `POST /api/bookings` with calculated startTime/endTime
- On success: Redirect to `/checkout`
- On error: "Mentor not available at this time" or "Time conflict with another booking"

---

### 3.8 Payment Checkout Form
**Endpoint:** Stripe API (via `POST /api/payments/create-intent`)
**Fields:**
| Field | Type | Validation |
|-------|------|-----------|
| Card Number | text | 16 digits, valid Luhn |
| Expiry | text | MM/YY format, not expired |
| CVC | text | 3-4 digits |
| Billing Zip | text | Valid zip code |

**Submit Action:**
- Create payment intent: `POST /api/payments/create-intent`
- Stripe.confirmPayment() with clientSecret
- On success: `POST /api/payments/confirm` → redirect to `/payment-success`
- On error: Show Stripe error message

**Mock Stripe (Dev Mode):**
- Does not charge credit card
- Always succeeds
- Used for testing

---

### 3.9 Post Creation Form
**Endpoint:** `POST /api/posts` (multipart/form-data)
**Fields:**
| Field | Type | Validation | Constraints |
|-------|------|-----------|------------|
| Content | textarea | Required | Min 1, max 5000 chars |
| Images | file upload | Optional | Up to 6 images, 5MB each |

**Submit Action:**
- Validate content not empty
- Create FormData with content + images
- `POST /api/posts` with multipart
- On success: Post appears at top of feed
- On error: Show error message

---

### 3.10 Comment Form
**Endpoint:** `POST /api/posts/:postId/comments`
**Fields:**
| Field | Type | Validation |
|-------|------|-----------|
| Comment | textarea | Required, min 1 char, max 500 chars |

**Submit Action:**
- `POST /api/posts/:postId/comments`
- On success: Comment appears under post
- On error: Show error

---

### 3.11 Report Conversation Form
**Endpoint:** `POST /api/conversations/:id/report`
**Fields:**
| Field | Type | Validation |
|-------|------|-----------|
| Reason | dropdown | Required (abuse, spam, harassment, etc.) |
| Details | textarea | Optional, max 1000 chars |

**Submit Action:**
- `POST /api/conversations/:id/report` with reason & details
- On success: "Report submitted. Our team will review it."
- On error: Show error

---

### 3.12 Organization Registration Form
**Endpoint:** `POST /api/users/register-organization`
**Fields:**
| Field | Type | Validation | Constraints |
|-------|------|-----------|------------|
| Organization Name | text | Required | Max 200 chars |
| Contact Email | email | Required | Valid email |
| Website | url | Optional | Valid URL |
| Address | text | Optional | Max 500 chars |
| Contact Person | text | Optional | Max 100 chars |
| Description | textarea | Optional | Max 2000 chars |

**Submit Action:**
- Validate required fields
- `POST /api/users/register-organization`
- On success: User converted to organization, redirect to `/organization-dashboard`
- On error: Show error message

---

### 3.13 Invite Team Member Form
**Endpoint:** `POST /api/organization/team/invite`
**Fields:**
| Field | Type | Validation |
|-------|------|-----------|
| Email | email | Required, valid email |
| Role | dropdown | Optional (member, lead, admin) |

**Submit Action:**
- `POST /api/organization/team/invite` with email & role
- On success: "Invitation sent to {email}"
- On error: "Unable to send invitation"

---

### 3.14 Create Project Form
**Endpoint:** `POST /api/projects` or `/api/organization/projects`
**Fields:**
| Field | Type | Validation | Constraints |
|-------|------|-----------|------------|
| Title | text | Required | Min 5, max 200 chars |
| Description | textarea | Required | Min 20, max 5000 chars |
| Skills Required | multi-select | Optional | Array of strings |
| Budget | number | Optional | Min 0 |
| Currency | dropdown | Optional | USD, EUR, etc. |
| Deadline | date picker | Optional | Future date |
| Status | dropdown | Optional | draft, open, in-progress, completed |
| Attachments | file upload | Optional | Multiple files |

**Submit Action:**
- Validate title, description not empty
- `POST /api/projects` with form data
- On success: Redirect to `/projects/:projectId`
- On error: Show error

---

### 3.15 Create Task Form
**Endpoint:** `POST /api/organization/projects/:projectId/tasks`
**Fields:**
| Field | Type | Validation |
|-------|------|-----------|
| Title | text | Required, max 200 chars |
| Description | textarea | Optional, max 5000 chars |
| Assign To | multi-select | Optional (team members) |
| Priority | dropdown | Optional (low, medium, high, urgent) |
| Deadline | date picker | Optional, future date |
| Estimated Hours | number | Optional, min 0 |

**Submit Action:**
- `POST /api/organization/projects/:projectId/tasks`
- On success: Task appears in project task list
- On error: Show error

---

(Continue to PART 4 in next file)
