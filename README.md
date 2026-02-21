# InterviewHub

A full-stack mock interview platform with live video calls, collaborative code editing, real-time chat, code execution, and feedback tracking.

## Tech Stack

**Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Monaco Editor, Socket.io Client, WebRTC
**Backend:** NestJS, TypeScript, MongoDB/Mongoose, JWT Auth, Socket.io, Judge0 API
**Database:** MongoDB Atlas

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

---

## Setup Walkthrough

1. **Register** two accounts — one as `interviewer`, one as `candidate`
2. **Login** as the interviewer
3. **Create Interview** from the dashboard — select candidate, tech stack, and schedule
4. **Join Interview** — both users open the interview room
5. **Video Call** connects via WebRTC peer-to-peer
6. **Code Editor** syncs in real-time via Socket.io
7. **Run Code** executes via Judge0 API (or shows fallback message)
8. **Chat** in real-time below the video
9. **Submit Feedback** as the interviewer — score, strengths, improvements, recommendation

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all users (auth required) |
| GET | `/api/users?role=candidate` | List by role |

### Interviews
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/interviews` | Create interview (interviewer only) |
| GET | `/api/interviews` | List all interviews |
| GET | `/api/interviews/my` | List current user's interviews |
| GET | `/api/interviews/analytics` | Get analytics |
| GET | `/api/interviews/:id` | Get interview details |
| PATCH | `/api/interviews/:id` | Update interview |
| DELETE | `/api/interviews/:id` | Delete interview (interviewer only) |

### Code Submissions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/submissions` | Submit & execute code |
| GET | `/api/submissions/interview/:id` | Get submissions for interview |

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chat/:interviewId` | Get chat history |

### Socket.io Events
| Event | Direction | Description |
|-------|-----------|-------------|
| `join-room` | Client → Server | Join interview room |
| `leave-room` | Client → Server | Leave interview room |
| `chat-message` | Bidirectional | Send/receive chat messages |
| `code-change` | Bidirectional | Sync code editor changes |
| `webrtc-offer` | Bidirectional | WebRTC offer exchange |
| `webrtc-answer` | Bidirectional | WebRTC answer exchange |
| `webrtc-ice-candidate` | Bidirectional | ICE candidate exchange |

---

## Testing API with curl

```bash
# Register
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@test.com","password":"123456","role":"interviewer"}'

# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@test.com","password":"123456"}'

# Get interviews (use token from login response)
curl http://localhost:4000/api/interviews \
  -H "Authorization: Bearer <your-token>"
```

---

## Project Structure

```
interviewhub/
├── client/                    # React Frontend
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   │   ├── Navbar.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── VideoCall.tsx
│   │   │   ├── CodeEditor.tsx
│   │   │   └── ChatPanel.tsx
│   │   ├── pages/             # Route pages
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── InterviewRoom.tsx
│   │   │   └── Feedback.tsx
│   │   ├── context/           # React context providers
│   │   │   ├── AuthContext.tsx
│   │   │   └── ThemeContext.tsx
│   │   ├── services/          # API and socket services
│   │   │   ├── api.ts
│   │   │   └── socket.ts
│   │   ├── types/             # TypeScript types
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── package.json
│
├── server/                    # NestJS Backend
│   ├── src/
│   │   ├── auth/              # Authentication module
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── dto/
│   │   │   ├── guards/
│   │   │   └── strategies/
│   │   ├── users/             # Users module
│   │   │   ├── users.module.ts
│   │   │   ├── users.service.ts
│   │   │   ├── users.controller.ts
│   │   │   └── user.schema.ts
│   │   ├── interviews/        # Interviews module
│   │   │   ├── interviews.module.ts
│   │   │   ├── interviews.service.ts
│   │   │   ├── interviews.controller.ts
│   │   │   ├── interview.schema.ts
│   │   │   └── dto/
│   │   ├── submissions/       # Code submissions module
│   │   │   ├── submissions.module.ts
│   │   │   ├── submissions.service.ts
│   │   │   ├── submissions.controller.ts
│   │   │   ├── submission.schema.ts
│   │   │   └── dto/
│   │   ├── chat/              # Chat + WebRTC signaling
│   │   │   ├── chat.module.ts
│   │   │   ├── chat.service.ts
│   │   │   ├── chat.gateway.ts
│   │   │   ├── chat.controller.ts
│   │   │   └── message.schema.ts
│   │   ├── common/            # Shared guards & decorators
│   │   │   ├── guards/
│   │   │   └── decorators/
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── nest-cli.json
│   ├── tsconfig.json
│   └── package.json
│
├── package.json               # Root workspace
├── .gitignore
└── README.md
```

---

## Features

- **JWT Authentication** — Register/login with role-based access (interviewer/candidate)
- **Interview Management** — Create, schedule, track, and complete interviews
- **Live Video Call** — WebRTC peer-to-peer with mute/camera toggle and recording
- **Collaborative Code Editor** — Monaco Editor with real-time sync via Socket.io
- **Code Execution** — Judge0 API integration (JS, Python, Java, C++)
- **Real-time Chat** — Socket.io-powered chat with message persistence
- **Feedback System** — Score (1-10), strengths, improvements, recommendation
- **Analytics Dashboard** — Total interviews, completion rate, average score
- **Dark Mode** — System preference detection + manual toggle
- **Responsive UI** — Tailwind CSS with clean professional design

---

## Deployment (Free Tier)

**Architecture:** GCP Cloud Run (backend) + Cloudflare Pages (frontend) + MongoDB Atlas (database)

### One-Command Deploy

```bash
# 1. Set required env vars
export MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/interviewhub"
export JWT_SECRET="your-production-secret-key"

# 2. Optional: Judge0 for code execution
export JUDGE0_API_URL="https://judge0-ce.p.rapidapi.com"
export JUDGE0_API_KEY="your-rapidapi-key"

# 3. Deploy everything
chmod +x deploy-all.sh
./deploy-all.sh
```

### Manual Deploy: Backend → GCP Cloud Run

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
  --set-env-vars "MONGODB_URI=your-atlas-uri,JWT_SECRET=your-secret,CLIENT_URL=https://interviewhub.pages.dev" \
  --memory 512Mi \
  --min-instances 0 \
  --max-instances 3
```

**Free tier:** 2M requests/month, 180K vCPU-sec, 360K GB-sec memory. No expiry.

### Manual Deploy: Frontend → Cloudflare Pages

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

### Database → MongoDB Atlas (Free M0)

See [setup-atlas.md](./setup-atlas.md) for step-by-step instructions.

**Free tier:** 512MB storage, shared cluster, no expiry.

### Post-Deployment Checklist

- [ ] MongoDB Atlas cluster created with network access `0.0.0.0/0`
- [ ] Backend deployed and returning `200` on health check
- [ ] Frontend deployed and loading in browser
- [ ] Backend `CLIENT_URL` env var set to Cloudflare Pages URL
- [ ] Frontend `VITE_API_URL` pointing to Cloud Run URL
- [ ] Login/Register working end-to-end
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

---

## Cost Breakdown

| Service | Free Tier | Limit |
|---------|-----------|-------|
| GCP Cloud Run | Forever free | 2M requests/month |
| Cloudflare Pages | Forever free | Unlimited bandwidth |
| MongoDB Atlas M0 | Forever free | 512MB storage |
| Judge0 RapidAPI | Forever free | 50 requests/day |
| **Total** | **$0/month** | |
