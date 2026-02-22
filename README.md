# InterviewHub

A full-stack mock interview platform with live video calls, collaborative code editing, real-time chat, code execution, admin user management, and feedback tracking.

## Tech Stack

**Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Monaco Editor, Socket.io Client, WebRTC
**Backend:** NestJS, TypeScript, MongoDB/Mongoose, JWT Auth, Socket.io, Judge0 API
**Database:** MongoDB Atlas

---

## Features

- **Three-Role System** — `admin`, `interviewer`, `candidate` with role-based access control at both API and UI levels
- **Admin Dashboard** — Create and delete user accounts, manage interviews, submit feedback
- **Default Admin Seeding** — `admin@ss.com` / `123456` auto-created on first server start
- **Secret Admin Registration** — `POST /api/auth/admin-register` with `x-admin-secret` header (backend only, no public UI)
- **No Public Registration** — Users are created by admins only; no self-signup
- **JWT Authentication** — Login with role-based access, auto-logout on token expiry
- **Interview Management** — Create, schedule, track, and complete interviews
- **Live Video Call** — WebRTC peer-to-peer with STUN/TURN servers, mute/camera toggle, and recording
- **Screen Sharing** — Candidates must share entire screen (window/tab sharing rejected); visible to interviewer
- **Gated Room Admission** — Candidates wait in a lobby; interviewer must admit or decline
- **Collaborative Code Editor** — Monaco Editor (VS Code engine) with real-time sync via Socket.io
- **Code Execution** — Judge0 API integration (JavaScript, Python, Java, C++) with graceful fallback
- **Real-time Chat** — Socket.io-powered chat with message persistence in MongoDB
- **Feedback System** — Score (1-10), strengths, improvements, recommendation (Strong Hire / Hire / No Hire / Strong No Hire)
- **Analytics Dashboard** — Total interviews, completion rate, average score via MongoDB aggregation
- **Dark Mode** — System preference detection + manual toggle, persisted in localStorage
- **Swagger API Docs** — Full OpenAPI documentation at `/api/docs` with JWT auth support
- **Responsive UI** — Tailwind CSS with clean professional design

---

## Prerequisites

- Node.js 18+
- npm 9+
- MongoDB Atlas account (free tier) — [https://www.mongodb.com/atlas](https://www.mongodb.com/atlas)
- (Optional) Judge0 RapidAPI key for code execution — [https://rapidapi.com/judge0-official/api/judge0-ce](https://rapidapi.com/judge0-official/api/judge0-ce)

---

## Quick Start

### 1. Clone and install

```bash
cd interviewhub
npm install
npm run install:all
```

### 2. Configure environment variables

**Server** (`server/.env`):

```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/interviewhub?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
PORT=4000
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=your-judge0-rapidapi-key
CLIENT_URL=http://localhost:5173
ADMIN_SECRET=your-admin-secret-key
```

**Client** (`client/.env`):

```env
VITE_API_URL=http://localhost:4000/api
VITE_SOCKET_URL=http://localhost:4000
```

### 3. Start development servers

```bash
# From root — starts both servers concurrently
npm run dev

# Or start separately:
npm run dev:server   # Backend on http://localhost:4000
npm run dev:client   # Frontend on http://localhost:5173
```

### 4. Open the app

Go to [http://localhost:5173](http://localhost:5173)

On first start, a default admin account is seeded automatically:
- **Email:** `admin@ss.com`
- **Password:** `123456`

---

## Roles & Permissions

| Action | Admin | Interviewer | Candidate |
|--------|:-----:|:-----------:|:---------:|
| Login | Yes | Yes | Yes |
| View Dashboard & Analytics | Yes | Yes | Yes |
| Create Interview | Yes | Yes | No |
| Delete Interview | Yes | Yes | No |
| Submit Feedback | Yes | Yes | No |
| Join Interview Room | Yes | Yes | Yes |
| Manage Users (create/delete) | Yes | No | No |
| Access Admin Panel (`/admin/users`) | Yes | No | No |

---

## Setup Walkthrough

1. **Start the server** — the default admin `admin@ss.com` / `123456` is seeded automatically
2. **Login** as admin at [http://localhost:5173/login](http://localhost:5173/login)
3. **Create users** — go to **Manage Users** in the navbar, create interviewer and candidate accounts
4. **Create Interview** from the dashboard — select candidate, interviewer, tech stack, and schedule
5. **Join Interview** — both interviewer and candidate login and open the interview room
6. **Video Call** connects via WebRTC peer-to-peer; candidate must share entire screen
7. **Code Editor** syncs in real-time via Socket.io (supports JS, Python, Java, C++)
8. **Run Code** executes via Judge0 API (or shows fallback message if not configured)
9. **Chat** in real-time during the interview
10. **Submit Feedback** as the interviewer/admin — score, strengths, improvements, recommendation

---

## API Endpoints

### Auth
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login | No |
| POST | `/api/auth/admin-register` | Register admin account | `x-admin-secret` header |

### Users
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/users` | List all users (password excluded) | JWT |
| GET | `/api/users?role=candidate` | Filter users by role | JWT |
| GET | `/api/users/:id` | Get user by ID | JWT |
| POST | `/api/users` | Create user (interviewer/candidate) | JWT + Admin |
| DELETE | `/api/users/:id` | Delete user | JWT + Admin |

### Interviews
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/interviews` | Create interview | JWT + Interviewer/Admin |
| GET | `/api/interviews` | List all interviews | JWT |
| GET | `/api/interviews/my` | List current user's interviews | JWT |
| GET | `/api/interviews/analytics` | Get analytics | JWT |
| GET | `/api/interviews/:id` | Get interview details | JWT |
| PATCH | `/api/interviews/:id` | Update interview | JWT |
| DELETE | `/api/interviews/:id` | Delete interview | JWT + Interviewer/Admin |

### Code Submissions
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/submissions` | Submit & execute code | JWT |
| GET | `/api/submissions/interview/:id` | Get submissions for interview | JWT |

### Chat
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/chat/:interviewId` | Get chat history | JWT |

### Socket.io Events
| Event | Direction | Description |
|-------|-----------|-------------|
| `join-room` | Client -> Server | Join interview room |
| `leave-room` | Client -> Server | Leave interview room |
| `request-join` | Client -> Server | Candidate requests room admission |
| `approve-join` | Client -> Server | Interviewer admits candidate |
| `reject-join` | Client -> Server | Interviewer declines candidate |
| `chat-message` | Bidirectional | Send/receive chat messages |
| `code-change` | Bidirectional | Sync code editor changes |
| `webrtc-offer` | Bidirectional | WebRTC offer exchange |
| `webrtc-answer` | Bidirectional | WebRTC answer exchange |
| `webrtc-ice-candidate` | Bidirectional | ICE candidate exchange |
| `webrtc-ready` | Bidirectional | Signal media readiness |
| `screen-offer` | Bidirectional | Screen share WebRTC offer |
| `screen-answer` | Bidirectional | Screen share WebRTC answer |
| `screen-ice-candidate` | Bidirectional | Screen share ICE candidate |

---

## Testing API with curl

```bash
# Login as admin
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ss.com","password":"123456"}'

# Create a user (admin only — use token from login response)
curl -X POST http://localhost:4000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{"name":"John","email":"john@test.com","password":"123456","role":"interviewer"}'

# Create admin via secret route (no JWT needed)
curl -X POST http://localhost:4000/api/auth/admin-register \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: your-admin-secret-key" \
  -d '{"name":"Admin2","email":"admin2@test.com","password":"123456","role":"admin"}'

# Get interviews
curl http://localhost:4000/api/interviews \
  -H "Authorization: Bearer <your-token>"

# Delete a user (admin only)
curl -X DELETE http://localhost:4000/api/users/<user-id> \
  -H "Authorization: Bearer <your-token>"
```

---

## Database Schema

| Collection | Key Fields |
|---|---|
| `users` | `name`, `email` (unique), `password` (bcrypt hashed), `role` (admin/interviewer/candidate), timestamps |
| `interviews` | `candidateId` (ref: User), `interviewerId` (ref: User), `techStack[]`, `scheduledAt`, `status` (scheduled/ongoing/completed), `score` (1-10), `feedback{}`, timestamps |
| `codesubmissions` | `interviewId` (ref: Interview), `language`, `code`, `output`, timestamps |
| `messages` | `interviewId` (ref: Interview), `senderId` (ref: User), `message`, `timestamp` |

---

## Project Structure

```
interviewhub/
├── client/                    # React Frontend
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   │   ├── Navbar.tsx          # Nav with dark mode toggle, role badge, admin link
│   │   │   ├── ProtectedRoute.tsx  # Auth + role-based route guard
│   │   │   ├── VideoCall.tsx       # WebRTC peer-to-peer + screen share + recording
│   │   │   ├── CodeEditor.tsx      # Monaco Editor + real-time sync + execution
│   │   │   └── ChatPanel.tsx       # Real-time chat with history
│   │   ├── pages/             # Route pages
│   │   │   ├── Login.tsx           # Email/password login
│   │   │   ├── Register.tsx        # (Unused — no public registration)
│   │   │   ├── Dashboard.tsx       # Analytics + interview list + create form
│   │   │   ├── InterviewRoom.tsx   # Video + code + chat + admission flow
│   │   │   ├── Feedback.tsx        # Score slider + feedback form
│   │   │   └── AdminUsers.tsx      # Admin user management table
│   │   ├── context/           # React context providers
│   │   │   ├── AuthContext.tsx      # Auth state + localStorage persistence
│   │   │   └── ThemeContext.tsx     # Dark/light mode + OS preference
│   │   ├── services/          # API and socket services
│   │   │   ├── api.ts              # Axios instance + all API functions
│   │   │   └── socket.ts           # Socket.io singleton
│   │   ├── types/             # TypeScript interfaces
│   │   │   └── index.ts
│   │   ├── App.tsx            # Route definitions
│   │   ├── main.tsx           # App entry point
│   │   └── index.css          # Global styles + Tailwind
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── package.json
│
├── server/                    # NestJS Backend
│   ├── src/
│   │   ├── auth/              # Authentication module
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.service.ts      # Register, login, JWT generation
│   │   │   ├── auth.controller.ts   # /register, /login, /admin-register
│   │   │   ├── dto/                 # RegisterDto, LoginDto
│   │   │   ├── guards/              # JwtAuthGuard
│   │   │   └── strategies/          # JWT strategy (passport)
│   │   ├── users/             # Users module
│   │   │   ├── users.module.ts
│   │   │   ├── users.service.ts     # CRUD + findByEmail/Role
│   │   │   ├── users.controller.ts  # List, create (admin), delete (admin)
│   │   │   ├── user.schema.ts       # Mongoose schema
│   │   │   └── dto/                 # CreateUserDto
│   │   ├── interviews/        # Interviews module
│   │   │   ├── interviews.module.ts
│   │   │   ├── interviews.service.ts
│   │   │   ├── interviews.controller.ts
│   │   │   ├── interview.schema.ts
│   │   │   └── dto/                 # CreateInterviewDto, UpdateInterviewDto
│   │   ├── submissions/       # Code submissions module
│   │   │   ├── submissions.module.ts
│   │   │   ├── submissions.service.ts  # Judge0 API integration
│   │   │   ├── submissions.controller.ts
│   │   │   ├── submission.schema.ts
│   │   │   └── dto/
│   │   ├── chat/              # Chat + WebRTC signaling
│   │   │   ├── chat.module.ts
│   │   │   ├── chat.service.ts
│   │   │   ├── chat.gateway.ts      # Socket.io gateway (all real-time events)
│   │   │   ├── chat.controller.ts
│   │   │   └── message.schema.ts
│   │   ├── common/            # Shared guards & decorators
│   │   │   ├── guards/roles.guard.ts
│   │   │   └── decorators/roles.decorator.ts
│   │   ├── app.module.ts
│   │   └── main.ts            # Bootstrap + admin seeding
│   ├── nest-cli.json
│   ├── tsconfig.json
│   └── package.json
│
├── package.json               # Root workspace (concurrently)
├── deploy-all.sh              # One-command deployment script
├── setup-atlas.md             # MongoDB Atlas setup guide
├── .gitignore
└── README.md
```

---

## Client Routes

| Route | Page | Access |
|-------|------|--------|
| `/login` | Login | Public (redirects to dashboard if authenticated) |
| `/dashboard` | Dashboard | Any authenticated user |
| `/interview/:id` | Interview Room | Any authenticated user |
| `/feedback/:id` | Feedback Form | Interviewer, Admin |
| `/admin/users` | User Management | Admin only |

---

## Environment Variables Reference

### Server (`server/.env`)

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `MONGODB_URI` | MongoDB Atlas connection string | Yes | — |
| `JWT_SECRET` | Secret key for signing JWTs | Yes | — |
| `JWT_EXPIRES_IN` | Token expiry duration | No | `7d` |
| `PORT` | Server port | No | `4000` |
| `JUDGE0_API_URL` | Judge0 CE API URL | No | — |
| `JUDGE0_API_KEY` | RapidAPI key for Judge0 | No | — |
| `CLIENT_URL` | Frontend origin for CORS | No | `http://localhost:5173` |
| `ADMIN_SECRET` | Secret for `/api/auth/admin-register` | Yes | — |

### Client (`client/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `/api` |
| `VITE_SOCKET_URL` | Backend Socket.io URL | `http://localhost:4000` |

---

## Deployment (Free Tier)

**Architecture:** GCP Cloud Run (backend) + Cloudflare Pages (frontend) + MongoDB Atlas (database)

### One-Command Deploy

```bash
# 1. Set required env vars
export MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/interviewhub"
export JWT_SECRET="your-production-secret-key"
export ADMIN_SECRET="your-admin-secret-key"

# 2. Optional: Judge0 for code execution
export JUDGE0_API_URL="https://judge0-ce.p.rapidapi.com"
export JUDGE0_API_KEY="your-rapidapi-key"

# 3. Deploy everything
chmod +x deploy-all.sh
./deploy-all.sh
```

### Manual Deploy: Backend -> GCP Cloud Run

**Prerequisites:**
```bash
# Install gcloud CLI: https://cloud.google.com/sdk/docs/install
gcloud auth login
gcloud projects create interviewhub-prod --name="InterviewHub"
gcloud config set project interviewhub-prod
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

**Deploy:**
```bash
cd server

# Build and push container
gcloud builds submit --tag gcr.io/interviewhub-prod/interviewhub-api

# Deploy to Cloud Run
gcloud run deploy interviewhub-api \
  --image gcr.io/interviewhub-prod/interviewhub-api \
  --platform managed \
  --region us-central1 \
  --port 4000 \
  --allow-unauthenticated \
  --set-env-vars "MONGODB_URI=your-atlas-uri,JWT_SECRET=your-secret,ADMIN_SECRET=your-admin-secret,CLIENT_URL=https://interviewhub.pages.dev" \
  --memory 512Mi \
  --min-instances 0 \
  --max-instances 3
```

**Free tier:** 2M requests/month, 180K vCPU-sec, 360K GB-sec memory. No expiry.

### Manual Deploy: Frontend -> Cloudflare Pages

**Prerequisites:**
```bash
npm install -g wrangler
wrangler login
```

**Deploy:**
```bash
cd client

# Create production env
echo 'VITE_API_URL=https://interviewhub-api-xxxxx-uc.a.run.app/api' > .env.production
echo 'VITE_SOCKET_URL=https://interviewhub-api-xxxxx-uc.a.run.app' >> .env.production

# Build and deploy
npm ci && npm run build
wrangler pages deploy dist --project-name=interviewhub
```

**Free tier:** Unlimited bandwidth, 500 builds/month, global CDN. No expiry.

### Database -> MongoDB Atlas (Free M0)

See [setup-atlas.md](./setup-atlas.md) for step-by-step instructions.

**Free tier:** 512MB storage, shared cluster, no expiry.

### Post-Deployment Checklist

- [ ] MongoDB Atlas cluster created with network access `0.0.0.0/0`
- [ ] Backend deployed and returning `200` on health check
- [ ] Frontend deployed and loading in browser
- [ ] Backend `CLIENT_URL` env var set to Cloudflare Pages URL
- [ ] Backend `ADMIN_SECRET` env var set
- [ ] Frontend `VITE_API_URL` pointing to Cloud Run URL
- [ ] Login as `admin@ss.com` working end-to-end
- [ ] Admin can create users and interviews
- [ ] (Optional) Custom domain configured on Cloudflare Pages

---

## Judge0 Setup (Code Execution)

1. Sign up at [RapidAPI](https://rapidapi.com)
2. Subscribe to [Judge0 CE](https://rapidapi.com/judge0-official/api/judge0-ce) (free tier: 50 requests/day)
3. Set `JUDGE0_API_URL` and `JUDGE0_API_KEY` as env vars on Cloud Run:
   ```bash
   gcloud run services update interviewhub-api --region us-central1 \
     --set-env-vars "JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com,JUDGE0_API_KEY=your-key"
   ```
4. The app works without Judge0 — it shows a fallback message instead

**Supported Languages:** JavaScript, Python, Java, C++

---

## Cost Breakdown

| Service | Free Tier | Limit |
|---------|-----------|-------|
| GCP Cloud Run | Forever free | 2M requests/month |
| Cloudflare Pages | Forever free | Unlimited bandwidth |
| MongoDB Atlas M0 | Forever free | 512MB storage |
| Judge0 RapidAPI | Forever free | 50 requests/day |
| **Total** | **$0/month** | |
