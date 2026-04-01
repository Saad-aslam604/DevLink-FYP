# DEVLINK FRONTEND DOCUMENTATION - PART 2

## PART 4: API INTEGRATION & SERVICES

### 4.1 Main API Service (`api.ts`)

**Purpose:** Central HTTP client for all frontend API calls
**Features:**
- Automatic token attachment (user & admin)
- Error handling with 401 logout
- JSON/FormData support
- Debug logging in dev mode

**Key Functions:**

```typescript
// Get/set tokens
getUserToken() → string | null
getAdminToken() → string | null

// Create auth headers
userHeaders(isJson = true) → Record<string, string>
adminHeaders(isJson = true) → Record<string, string>

// HTTP methods
api.get(path, opts?) → Promise<JSON>
api.post(path, body?, opts?) → Promise<JSON>
api.put(path, body?, opts?) → Promise<JSON>
api.patch(path, body?, opts?) → Promise<JSON>
api.del(path, opts?) → Promise<JSON>
api.request(method, path, opts) → Promise<JSON>
```

**Error Handling:**
- Status 401 → Clear token, emit `auth:unauthorized` event
- Network errors → Throw structured error with status & body
- Response parsing failures → Return `{ success: false, message: ... }`

**Usage Examples:**

```typescript
// GET request
const mentors = await api.get('/profiles/mentors?skill=javascript');

// POST with body
const booking = await api.post('/bookings', {
  mentorId: '123',
  startTime: '2024-01-15T14:00:00Z'
});

// PATCH (partial update)
await api.patch('/profiles/me', { firstName: 'John' });

// DELETE
await api.del('/messages/messageId');

// FormData (file upload)
const formData = new FormData();
formData.append('file', fileBlob);
await api.post('/uploads/upload', formData);
```

**Token Management:**
- User token stored in `localStorage.devlink_token`
- Admin token stored in `localStorage.devlink_admin_token`
- Automatic attachment to Authorization header: `Bearer {token}`
- Fallback to Vite env var `VITE_ADMIN_TOKEN` for dev

---

### 4.2 Authentication Context (`AuthContext.tsx`)

**State:**
```typescript
{
  user: User | null
  token: string | null
  loading: boolean
}
```

**Methods:**

| Method | Signature | Endpoint | Description |
|--------|-----------|----------|-------------|
| `signIn` | `(email, password) → {error?}` | `POST /auth/login` | Email/password login |
| `signUp` | `(payload) → {error?}` | `POST /auth/register` | Create new account |
| `signInWithGoogle` | `(idToken) → {error?}` | `POST /auth/google` | Google OAuth login |
| `signOut` | `() → void` | Clear token | Logout & clear storage |
| `updateProfile` | `(patch) → {error?}` | `PUT /profiles/me` | Update profile fields |
| `forgotPassword` | `(email) → {error?}` | `POST /auth/forgot-password` | Request password reset |
| `resetPassword` | `(token, password) → {error?}` | `POST /auth/reset-password/:token` | Reset password with token |

**User Object Shape:**
```javascript
{
  _id: string
  email: string
  firstName: string
  lastName: string
  avatar: string
  role: 'student' | 'junior' | 'mentor' | 'admin'
  bio: string
  skills: string[]
  hourlyRate: number
  isMentor: boolean
  isMentorVerified: boolean
  userType: 'individual' | 'organization'
  organizationDetails: { name, contactEmail, website, address, ... }
  // ... other fields
}
```

**Usage in Components:**
```typescript
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, token, loading, signIn, signOut } = useAuth();
  
  if (loading) return <Spinner />;
  if (!user) return <Redirect to="/login" />;
  
  return <div>Hello, {user.firstName}!</div>;
}
```

---

### 4.3 Bookings API Service (`bookingsApi.ts`)

**Endpoints:**

```typescript
// Get user's bookings
getMyBookings(filters?: {status, role}) → Promise<Booking[]>
// GET /api/bookings/my

// Get single booking
getBookingById(bookingId: string) → Promise<Booking>
// GET /api/bookings/:id

// Create booking
createBooking(data: {mentorId, startTime, endTime, notes, timezone, meetingType}) → Promise<Booking>
// POST /api/bookings

// Update booking status
updateBookingStatus(bookingId: string, status: string) → Promise<Booking>
// PATCH /api/bookings/:id

// Mark booking as read
markBookingAsRead(bookingId: string) → Promise<Booking>
// PUT /api/bookings/:id/read

// Rate session (post-completion)
rateSession(bookingId: string, rating: {score, review}) → Promise<Booking>
// POST /api/bookings/:id/rating
```

**Booking Object Shape:**
```javascript
{
  _id: string
  student: { _id, firstName, lastName, avatar }
  mentor: { _id, firstName, lastName, avatar }
  startTime: ISO string
  endTime: ISO string
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled'
  price: number
  notes: string
  timezone: string
  meetingType: string
  lastMessageAt: ISO string
  unreadCount: { [userId]: number }
  createdAt: ISO string
}
```

---

### 4.4 Messages & Chat API Integration

**HTTP Endpoints:**

```typescript
// Get recent conversations
getRecentMessages() → Promise<{results: Preview[]}>
// GET /api/messages/recent

// Get chat history for booking
getChatHistory(bookingId: string, limit?: number) → Promise<Message[]>
// GET /api/messages/history?bookingId=...&limit=200

// Send message (HTTP fallback)
sendMessage(bookingId: string, content: string) → Promise<Message>
// POST /api/messages/send

// Mark message as read
markMessageAsRead(messageId: string) → Promise<Message>
// PUT /api/messages/:messageId/read

// Mark all messages in booking as read
markAllMessagesAsRead(bookingId: string) → Promise<{count: number}>
// PUT /api/messages/read

// Add reaction to message
addReaction(messageId: string, emoji: string) → Promise<Message>
// POST /api/messages/:messageId/reactions

// Delete message (soft delete)
deleteMessage(messageId: string) → Promise<{success: boolean}>
// DELETE /api/messages/:messageId

// Find or create conversation
findOrCreateConversation(targetUserId: string) → Promise<Booking>
// POST /api/conversations/find-or-create

// Conversation management
muteConversation(bookingId: string) → Promise<{muted: boolean}>
// PUT /api/conversations/:id/mute

archiveConversation(bookingId: string) → Promise<{archived: boolean}>
// PUT /api/conversations/:id/archive

blockUser(bookingId: string) → Promise<{blocked: boolean}>
// PUT /api/conversations/:id/block

reportConversation(bookingId: string, reason: string, details?: string) → Promise<Report>
// POST /api/conversations/:id/report
```

**Socket.IO Events (Real-time):**

```typescript
// Emit (send to server)
socket.emit('join-room', { bookingId }, (ack) => {...});
socket.emit('leave-room', { bookingId });
socket.emit('chat-message', { bookingId, content, meta, attachments });
socket.emit('typingStart', { bookingId });
socket.emit('typingStop', { bookingId });
socket.emit('get-chat-history', { bookingId, limit });

// Listen (receive from server)
socket.on('chat-message', (msg) => {...});
socket.on('typing-start', (user) => {...});
socket.on('typing-stop', (user) => {...});
socket.on('chat-history', (messages) => {...});
socket.on('message-status-update', ({messageId, status}) => {...});
socket.on('conversation-created', ({booking, initialMessage}) => {...});
socket.on('conversation-updated', ({bookingId, lastMessageAt, unreadCount}) => {...});
socket.on('conversation-deleted', ({bookingId}) => {...});
socket.on('user-online', ({userId}) => {...});
socket.on('user-offline', ({userId}) => {...});
```

**Message Object Shape:**
```javascript
{
  _id: string
  booking: string (bookingId)
  content: string
  sender: { _id, firstName, lastName, avatar }
  status: 'sent' | 'delivered' | 'read'
  readBy: [{ userId, readAt }]
  reactions: [{ emoji, users: [userId], count }]
  attachments: [{ _id, originalName, mimeType, size, path }]
  createdAt: ISO string
}
```

---

### 4.5 Mentor Applications API (`mentorApplicationsApi.ts`)

**Endpoints:**

```typescript
// Submit mentor application
submitMentorApplication(data: {
  title, bio, skills, expertise, requestedRate,
  yearsOfExperience, currentCompany, githubUrl, linkedinUrl, portfolioUrl
}) → Promise<MentorApplication>
// POST /api/mentor-applications (assumed, if user-facing exists)

// Admin: List applications
listMentorApplications(filters?: {status, page, limit, search}) → Promise<{data, pagination}>
// GET /api/admin/mentor-applications

// Admin: Get application stats
getMentorApplicationStats() → Promise<{total, pending, approved, rejected, ...}>
// GET /api/admin/mentor-applications/stats

// Admin: Get single application
getApplicationById(appId: string) → Promise<MentorApplication>
// GET /api/admin/mentor-applications/:id

// Admin: Approve application
approveApplication(appId: string, approvedRate?: number, adminNotes?: string) → Promise<{app, user}>
// POST /api/admin/mentor-applications/:id/approve

// Admin: Reject application
rejectApplication(appId: string, rejectionReason?: string) → Promise<MentorApplication>
// POST /api/admin/mentor-applications/:id/reject

// Admin: Bulk action
bulkActionApplications(appIds: string[], action: 'approve'|'reject', approvedRate?: number) → Promise<{results}>
// POST /api/admin/mentor-applications/bulk-action
```

**Admin API Service (`adminApi.ts`):**
Uses `adminHeaders()` to attach admin token

---

### 4.6 Organization API Service (`organizationApiService.ts`)

**Endpoints:**

```typescript
// Projects
getOrgProjects() → Promise<Project[]>
// GET /api/organization/projects

createOrgProject(data) → Promise<Project>
// POST /api/organization/projects

// Tasks
getOrgProjectTasks(projectId: string) → Promise<Task[]>
// GET /api/organization/projects/:projectId/tasks

createProjectTask(projectId: string, data) → Promise<Task>
// POST /api/organization/projects/:projectId/tasks

updateTaskProgress(taskId: string, progress: number) → Promise<Task>
// PATCH /api/organization/tasks/:taskId/progress

updateTask(taskId: string, data) → Promise<Task>
// PUT /api/organization/tasks/:taskId

// Team
getOrgTeam() → Promise<Member[]>
// GET /api/organization/team

inviteTeamMember(email: string, role?: string) → Promise<Invitation>
// POST /api/organization/team/invite

removeTeamMember(memberId: string) → Promise<{success}>
// DELETE /api/organization/team/:id

// Invitations
getMyInvitations() → Promise<Invitation[]>
// GET /api/organization/invitations/my

acceptInvitation(invId: string) → Promise<Invitation>
// POST /api/organization/invitations/:id/accept

rejectInvitation(invId: string) → Promise<Invitation>
// POST /api/organization/invitations/:id/reject

resendInvitation(invId: string) → Promise<Invitation>
// POST /api/organization/invitations/:id/resend

// Resources
getOrgResources() → Promise<Resource[]>
// GET /api/organization/resources

uploadResource(data) → Promise<Resource>
// POST /api/organization/resources

deleteResource(resourceId: string) → Promise<{success}>
// DELETE /api/organization/resources/:id
```

---

### 4.7 Profile & User APIs

**Endpoints:**

```typescript
// Get current user profile
getProfile() → Promise<{profile, connections}>
// GET /api/profiles/me

// Update profile
updateProfile(patch) → Promise<{profile}>
// PUT /api/profiles/me

// Upload avatar
uploadAvatar(file: File) → Promise<{profile}>
// POST /api/profiles/me/avatar (multipart)

// Get public profile
getPublicProfile(userId: string) → Promise<User>
// GET /api/users/:id

// Get mentor list
getMentors(filters?: {skill, rating, hourlyRate, page, limit}) → Promise<{mentors, total}>
// GET /api/profiles/mentors

// Search mentors
searchMentors(query: string) → Promise<User[]>
// GET /api/profiles/mentors/search

// Get mentor profile (detailed)
getMentorProfile(userId: string) → Promise<MentorProfile>
// GET /api/profiles/:userId

// Register as organization
registerOrganization(data: {name, contactEmail, website, address, description}) → Promise<{profile}>
// POST /api/users/register-organization
```

---

### 4.8 Posts & Comments API

**Endpoints:**

```typescript
// Get posts
getPosts(page?: number, limit?: number) → Promise<Post[]>
// GET /api/posts?page=0&limit=50

// Create post
createPost(data: {content, images}) → Promise<Post>
// POST /api/posts (multipart)

// Like post
togglePostLike(postId: string) → Promise<Post>
// POST /api/posts/:postId/like

// Update post
updatePost(postId: string, content: string) → Promise<Post>
// PATCH /api/posts/:postId

// Delete post
deletePost(postId: string) → Promise<{success}>
// DELETE /api/posts/:postId

// Get comments
getPostComments(postId: string) → Promise<Comment[]>
// GET /api/posts/:postId/comments

// Add comment
createComment(postId: string, content: string) → Promise<Comment>
// POST /api/posts/:postId/comments
```

**Post Object:**
```javascript
{
  _id: string
  author: { _id, firstName, lastName, avatar }
  content: string
  media: string[] (URLs)
  likes: string[] (userIds)
  comments: [Comment]
  likeCount: number
  commentCount: number
  createdAt: ISO string
}
```

---

### 4.9 Projects API

**Endpoints:**

```typescript
// List projects (public)
getProjects(filters?: {status, skill, minBudget, maxBudget, search, page, limit}) → Promise<{items, total}>
// GET /api/projects

// Create project
createProject(data: {title, description, skillsRequired, budget, deadline, status}) → Promise<Project>
// POST /api/projects

// Get project details
getProjectById(projectId: string) → Promise<Project>
// GET /api/projects/:id

// Update project
updateProject(projectId: string, data) → Promise<Project>
// PUT /api/projects/:id

// Delete project
deleteProject(projectId: string) → Promise<{success}>
// DELETE /api/projects/:id

// Apply to project
applyToProject(projectId: string, message?: string) → Promise<Project>
// POST /api/projects/:id/apply

// Get user's projects
getUserProjects(userId: string) → Promise<Project[]>
// GET /api/projects/user/:userId
```

---

### 4.10 Payments API

**Endpoints:**

```typescript
// Create payment intent
createPaymentIntent(bookingId: string) → Promise<{clientSecret, paymentId, stripePaymentIntentId}>
// POST /api/payments/create-intent

// Confirm payment
confirmPayment(paymentIntentId: string) → Promise<{intent, payment}>
// POST /api/payments/confirm

// Get payment history
getPaymentHistory(page?: number, limit?: number) → Promise<{total, page, limit, results}>
// GET /api/payments/my

// Refund payment (admin)
refundPayment(paymentId: string | paymentIntentId: string) → Promise<{refund, payment}>
// POST /api/payments/refund
```

---

### 4.11 WebRTC & Video API

**Endpoints:**

```typescript
// Get ICE servers (STUN/TURN)
getICEServers() → Promise<{iceServers}>
// GET /api/webrtc/turn

// Log WebRTC stats
logWebRTCStats(bookingId: string, snapshot: any) → Promise<{success}>
// POST /api/webrtc/stats
```

**Socket.IO Events:**

```typescript
// WebRTC signaling
socket.emit('join-room', {bookingId});
socket.emit('leave-room', {bookingId});
socket.emit('webrtc-offer', {bookingId, offer});
socket.emit('webrtc-answer', {bookingId, answer});
socket.emit('webrtc-candidate', {bookingId, candidate});

socket.on('webrtc-offer', ({from, offer}) => {...});
socket.on('webrtc-answer', ({from, answer}) => {...});
socket.on('webrtc-candidate', ({from, candidate}) => {...});
socket.on('joined', ({bookingId}) => {...});
socket.on('participant-joined', ({userId, bookingId}) => {...});
socket.on('participant-left', ({userId, bookingId}) => {...});
socket.on('meeting_started', ({bookingId, mentorName, startedAt}) => {...});
```

---

### 4.12 Analytics & Activity API

**Endpoints:**

```typescript
// Get user analytics
getUserAnalytics() → Promise<{totalSessions, completedSessions, totalHours, ...}>
// GET /api/user-analytics

// Get recent activities
getActivities() → Promise<{activities}>
// GET /api/activities

// Admin dashboard stats
getAdminStats() → Promise<{summary, revenueTrend, userGrowth, platformMetrics, recentActivity}>
// GET /api/admin/stats
```

---

### 4.13 File Uploads API

**Endpoints:**

```typescript
// Upload file
uploadFile(file: File) → Promise<{_id, originalName, mimeType, size, path}>
// POST /api/uploads/upload (multipart)

// Get user's files
getUserFiles(userId: string) → Promise<File[]>
// GET /api/uploads/files/user/:userId

// Get file details
getFileById(fileId: string) → Promise<File>
// GET /api/uploads/files/:fileId

// Delete file
deleteFile(fileId: string) → Promise<{success}>
// DELETE /api/uploads/files/:fileId

// Set profile picture from file
setProfilePicture(fileId: string) → Promise<{profile}>
// POST /api/uploads/set-profile-picture/:fileId
```

---

## PART 5: COMPONENTS & UI ELEMENTS

### 5.1 Core Layout Components

#### **MainLayout**
**Path:** `components/Layout/MainLayout.tsx`
**Purpose:** App shell wrapper for all pages
**Includes:**
- Header/Navigation bar
- Sidebar (collapsible)
- Main content area
- Footer (optional)

**Navigation Items:**
- Dashboard (home icon)
- Messages (chat icon, with unread count badge)
- Mentors (person icon)
- Feed (feed icon)
- Projects (briefcase icon)
- Sessions (calendar icon)
- Settings (gear icon)
- Logout (exit icon)

**Responsive:**
- Sidebar collapses on mobile
- Hamburger menu toggle
- Navigation items stack vertically on mobile

---

#### **ProtectedRoute**
**Path:** `components/Auth/ProtectedRoute.tsx`
**Purpose:** Wrapper that requires authentication
**Behavior:**
- If not authenticated → Redirect to `/login`
- If authenticated → Render component
- Optional role check: `<ProtectedRoute roles={['mentor']}>` only allows mentors

---

### 5.2 Auth Components

#### **Login Component**
**Elements:**
- Email input field
- Password input field
- "Forgot password?" link
- Sign in button
- Google sign-in button
- "Don't have account?" link → `/signup`

#### **Signup Component**
**Elements:**
- Full name input
- Email input
- Password input
- Role dropdown (student/junior)
- Role description text (changes based on selection)
- Create account button
- "Already have account?" link → `/login`

#### **GoogleSignIn**
**Path:** `components/Auth/GoogleSignIn.tsx`
**Purpose:** OAuth sign-in button
**Uses:** Google's `gapi` library
**Flow:**
1. User clicks "Sign in with Google"
2. Google pop-up appears
3. User authenticates
4. idToken returned → POST to `/auth/google`
5. On success → Redirect to `/dashboard`

---

### 5.3 Dashboard Components

#### **SessionBooking**
**Path:** `components/SessionBooking.tsx`
**Purpose:** Modal/form to book a mentor session
**Fields:**
- Mentor selector (dropdown or auto-filled)
- Date picker
- Time picker
- Duration selector (30, 60, 90, 120 mins)
- Notes textarea
- "Confirm & Proceed to Payment" button

**Validation:**
- Date must be today or future
- Time must be in future
- Duration must be > 0

#### **DashboardOnboarding**
**Path:** `components/UX/DashboardOnboarding.tsx`
**Purpose:** First-time user guide
**Shows:**
- Welcome message
- Getting started checklist (complete profile, book session, etc.)
- Dismissible cards with "Next steps"

---

### 5.4 Messages Components

#### **ConversationsList**
**Path:** `components/ConversationsList/ConversationsList.tsx`
**Purpose:** Left panel showing conversations
**Features:**
- Search conversations by name
- Unread badge count
- Last message preview + time
- Context menu (mute, archive, block, report)
- "Archived" tab toggle

#### **MessageContainer**
**Path:** `components/MessageContainer/MessageContainer.tsx`
**Purpose:** Chat message history display
**Features:**
- Scrollable message list
- Sender avatar + name
- Message timestamp
- Status badge (sent/delivered/read)
- Emoji reactions
- Message hover menu (delete, react)
- System messages styling

#### **MessageInputWrapper**
**Path:** `components/MessageInputWrapper/MessageInputWrapper.tsx`
**Purpose:** Message input & send
**Features:**
- Text input field
- File attachment button
- Emoji picker (integrated)
- Send button
- Typing indicator display
- Character count (if limited)

---

### 5.5 Mentor Components

#### **MentorList**
**Path:** `components/MentorList.tsx` or `components/Mentors/`
**Purpose:** Display mentor cards with filter options
**Card Content:**
- Avatar (circle)
- Name & title
- Rating (⭐ 4.8/5)
- Hourly rate
- Top 3 skills badges
- Short bio (truncated)
- "View Profile" button
- "Book" button (opens booking modal)

**Filtering UI:**
- Search input (debounced)
- Skills multi-select
- Rate range slider
- Availability dropdown
- Sort options

---

### 5.6 Post Components

#### **Posts/PostCard**
**Path:** `components/Posts/PostCard.tsx`
**Purpose:** Individual post display
**Content:**
- Author avatar + name + timestamp
- Post text
- Image carousel (if multiple images)
- Like button + count
- Comment button + count
- Three-dot menu (edit/delete if owner)

**Interactions:**
- Click avatar → Go to `/profile/:userId`
- Click like → Toggle like
- Click comment count → Expand comments section
- Edit button (owner only) → Inline edit form
- Delete button (owner only) → Confirmation dialog

#### **PostCreation**
**Path:** `components/Posts/PostCreation.tsx`
**Purpose:** Create new post
**Elements:**
- Current user avatar
- Text input "What's on your mind?"
- Image upload button (multi)
- Post button
- Loading state during submit

---

### 5.7 Video Components

#### **VideoCallWithPIP**
**Path:** `components/Video/VideoCallWithPIP.tsx` or features/videocall/
**Purpose:** Video calling interface
**Layout:**
- Main video area (remote user)
- PIP corner (local user preview)
- Bottom control bar

**Controls:**
- Mic toggle (shows icon state: 🔊 / 🔇)
- Camera toggle (📹 / ❌)
- Screen share toggle (desktop only)
- End call button (red)
- Chat toggle (show/hide message sidebar)

**States:**
- Connecting (spinner)
- Connected (streams active)
- Disconnected (show reconnect button)
- Error states (show error message)

**Features:**
- Draggable PIP window
- Resizable PIP
- Full-screen toggle (main video)
- Chat window (right sidebar)
- Participant info display

---

### 5.8 UI Components (Lucide + Tailwind)

**Common UI Elements Used:**

```
Icons: (from lucide-react)
- MessageSquareIcon - Messages
- RefreshCw - Refresh/retry
- Trash2 - Delete
- Loader2 - Loading spinner
- Phone, PhoneOff - Call controls
- Mic, MicOff - Audio controls
- Video, VideoOff - Video controls
- Send - Send button
- Plus - Add/create
- Heart, MessageCircle - Interactions
- Share2 - Share button
- Settings - Settings
- User, Users - Profile/team
- LogOut - Logout
- Menu, X - Mobile menu

Tailwind Classes:
- Buttons: btn-primary, btn-secondary, btn-danger, btn-ghost
- Spacing: p-4, m-4, mb-6, etc.
- Colors: text-indigo-600, bg-red-50, border-gray-200
- Responsive: hidden md:block, lg:flex, etc.
- Dark mode: dark:bg-gray-800, dark:text-gray-100
- Shadows: shadow, shadow-lg
- Borders: border, rounded-lg, border-gray-200
```

---

### 5.9 Form Components

#### **Custom Input Components:**
```typescript
- TextInput - Email, password, text fields with validation
- TextAreaInput - Multi-line text input
- SelectInput - Dropdown/select with options
- MultiSelectInput - Multiple select (skills, etc.)
- FileInput - File upload
- DateInput - Date picker
- TimeInput - Time picker
- RadioInput - Radio button group
```

**Validation Display:**
- Red border on invalid field
- Error message below field (red text)
- Success check icon (green) on valid
- Inline validation as user types

---

### 5.10 Modal/Dialog Components

**Usage Pattern:**
```typescript
const [isOpen, setIsOpen] = useState(false);

return (
  <>
    <button onClick={() => setIsOpen(true)}>Open</button>
    {isOpen && (
      <Modal onClose={() => setIsOpen(false)}>
        <h2>Modal Title</h2>
        <p>Content...</p>
        <div className="mt-4 flex gap-2">
          <button onClick={() => setIsOpen(false)}>Cancel</button>
          <button onClick={handleConfirm}>Confirm</button>
        </div>
      </Modal>
    )}
  </>
);
```

**Modal Types Used:**
- Booking confirmation modal
- Payment confirmation modal
- Delete confirmation dialog
- Report reason modal
- Emoji picker modal
- Image preview modal

---

## PART 6: REAL-TIME FEATURES (SOCKET.IO)

### 6.1 Socket.IO Setup

**File:** `utils/socket.ts`

```typescript
let socket: Socket | null = null;

export function initSocket(token: string): Socket {
  if (socket) return socket;
  
  socket = io(API_BASE, {
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5
  });
  
  socket.on('connect', () => console.log('Connected'));
  socket.on('disconnect', (reason) => console.log('Disconnected:', reason));
  socket.on('error', (err) => console.error('Socket error:', err));
  
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
```

### 6.2 Socket Events Handled in Frontend

**Connection Events:**
```typescript
socket.on('connect', () => {...}); // Connected to server
socket.on('disconnect', (reason) => {...}); // Lost connection
socket.on('error', (err) => {...}); // Connection error
socket.on('user-online', ({userId}) => {...}); // User came online
socket.on('user-offline', ({userId}) => {...}); // User went offline
```

**Chat Events:**
```typescript
socket.on('chat-message', (msg) => {
  // New message in conversation
  setMessages(prev => [...prev, msg]);
  // Update preview (last message)
  setPreviews(prev => prev.map(p => 
    p.bookingId === msg.booking 
      ? {...p, text: msg.content, time: msg.createdAt}
      : p
  ));
  // Scroll to bottom
  scrollRef.current?.scrollIntoView();
});

socket.on('typing-start', ({bookingId, user}) => {
  setTypingUsers(prev => ({...prev, [user._id]: user}));
});

socket.on('typing-stop', ({bookingId, user}) => {
  setTypingUsers(prev => {
    const copy = {...prev};
    delete copy[user._id];
    return copy;
  });
});

socket.on('message-status-update', ({messageId, status}) => {
  setMessages(prev => prev.map(m =>
    m.id === messageId ? {...m, status} : m
  ));
});
```

**Conversation Events:**
```typescript
socket.on('conversation-created', ({booking, initialMessage}) => {
  // New conversation started (e.g., someone booked you)
  setPreviews(prev => [createPreview(booking, initialMessage), ...prev]);
});

socket.on('conversation-updated', ({bookingId, lastMessageAt, unreadCount}) => {
  setPreviews(prev => prev.map(p =>
    p.bookingId === bookingId
      ? {...p, time: lastMessageAt, unreadCount: unreadCount[myId] || 0}
      : p
  ));
});

socket.on('conversation-deleted', ({bookingId}) => {
  setPreviews(prev => prev.filter(p => p.bookingId !== bookingId));
  if (activeBookingId === bookingId) setActiveBookingId(null);
});

socket.on('conversation-muted', ({bookingId, muted}) => {
  setMutedConvs(prev => {
    const nm = new Set(prev);
    if (muted) nm.add(bookingId);
    else nm.delete(bookingId);
    return nm;
  });
});

socket.on('conversation-archived', ({bookingId, archived}) => {
  if (archived) {
    setPreviews(prev => prev.filter(p => p.bookingId !== bookingId));
  }
});

socket.on('user-block-updated', ({blockedUserId, blocked}) => {
  // User blocked/unblocked this participant
  setBlockedUsers(prev => 
    blocked ? [...prev, blockedUserId] : prev.filter(u => u.id !== blockedUserId)
  );
});
```

**Video Events:**
```typescript
socket.on('joined', ({bookingId}) => {
  // Successfully joined booking room
  setConnectionStatus('connected');
});

socket.on('participant-joined', ({userId, bookingId}) => {
  // Another participant joined
  setParticipants(prev => [...prev, userId]);
  // Trigger WebRTC offer if local user
  initiateWebRTCOffer();
});

socket.on('participant-left', ({userId, bookingId}) => {
  // Participant left
  setParticipants(prev => prev.filter(id => id !== userId));
  closePeerConnection(userId);
});

socket.on('webrtc-offer', ({from, bookingId, offer}) => {
  // Received offer from remote peer
  remotePeerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  // Create and send answer
  const answer = await remotePeerConnection.createAnswer();
  await remotePeerConnection.setLocalDescription(answer);
  socket.emit('webrtc-answer', {bookingId, answer});
});

socket.on('webrtc-answer', ({from, answer}) => {
  // Received answer to our offer
  remotePeerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on('webrtc-candidate', ({from, bookingId, candidate}) => {
  // Received ICE candidate
  remotePeerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});

socket.on('meeting_started', ({bookingId, mentorName, startedAt}) => {
  // Mentor started the meeting
  setMeetingStarted(true);
  showNotification(`${mentorName} started the meeting`);
});
```

---

## PART 7: ERROR HANDLING & LOADING STATES

### 7.1 API Error Handling Pattern

```typescript
const handleAction = async () => {
  setError(null);
  setLoading(true);
  try {
    const result = await api.post('/endpoint', {data});
    if (!result.success) {
      setError(result.message || 'An error occurred');
      return;
    }
    // Handle success
    setState(result.data);
    showSuccessToast('Action completed');
  } catch (err: any) {
    const message = err.body?.message || err.message || 'An error occurred';
    setError(message);
    console.error('Action failed:', err);
  } finally {
    setLoading(false);
  }
};
```

### 7.2 Loading States

**Spinner/Loading Component:**
```tsx
{isLoading && <Loader2 className="animate-spin" />}
```

**Skeleton Loading:**
```tsx
{isLoading ? (
  <div className="space-y-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="h-20 bg-gray-200 rounded animate-pulse" />
    ))}
  </div>
) : (
  <div>{content}</div>
)}
```

### 7.3 Error Message Display

**Banner Style:**
```tsx
{error && (
  <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
    {error}
    <button onClick={() => setError(null)} className="ml-2">✕</button>
  </div>
)}
```

**Toast/Notification Style:**
```tsx
showErrorToast('Something went wrong');
showSuccessToast('Action completed');
showInfoToast('Please note...');
```

### 7.4  401 Unauthorized Handling

**Setup:**
```typescript
window.addEventListener('auth:unauthorized', (e) => {
  // Clear auth state
  localStorage.removeItem('devlink_token');
  // Redirect to login
  navigate('/login');
  // Show message
  showErrorToast('Your session expired. Please log in again.');
});
```

---

(End of PART 2 - Continues with admin features and additional details if needed)
