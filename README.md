# NextFlow

[![Watch Demo](https://img.shields.io/badge/Watch-Demo-red?style=for-the-badge&logo=google-drive)]([GOOGLE_DRIVE_LINK_HERE](https://drive.google.com/file/d/1x3SdyPXyMhBUt4M_G08qL4yZK9EKINn2/view?usp=sharing))

> Connect text, images, and video into powerful LLM pipelines. Watch your AI think in real time.

## What is NextFlow

NextFlow is a visual drag-and-drop canvas for building AI pipelines. You connect nodes together and each node is a step: write text, upload an image, upload a video, crop an image, extract a frame from video, or run a Gemini AI prompt. When you click Run, the app figures out the dependency order, executes independent nodes in parallel, and streams results back onto the canvas in real time. All execution happens as background jobs via Trigger.dev so nothing ever times out.

## Node Types

| Node | Color | What it does |
| --- | --- | --- |
| Text Node | Blue | Holds text/prompts that flow to other nodes |
| Upload Image | Purple | Uploads image to CDN, outputs URL |
| Upload Video | Pink | Uploads video to CDN, outputs URL |
| Run LLM | Green | Calls Google Gemini AI with text and images |
| Crop Image | Amber | Crops image using FFmpeg via Trigger.dev |
| Extract Frame | Cyan | Pulls a single frame from video via FFmpeg |

## How It Works

### The Canvas

React Flow handles the visual canvas. Every node and every edge is stored as JSON in PostgreSQL. The canvas auto-saves whenever anything changes, with a 1-second debounce so saves do not fire on every keystroke.

### Parallel Execution Engine

The app treats your workflow as a DAG (Directed Acyclic Graph). When you click Run Workflow:

- The app builds a dependency graph from all nodes and edges
- It groups nodes that have no dependency on each other into parallel batches
- Each batch executes with `Promise.all` so they run simultaneously
- A node only starts after every node it depends on has finished

Example execution order:

```text
Group 1 (parallel): Text nodes, Upload Image, Upload Video
Group 2 (parallel): Crop Image + Extract Frame
Group 3: LLM Node 1 (waits for Group 2)
Group 4: LLM Node 2 (waits for Group 3)
```

### Why Trigger.dev

Next.js API routes have a maximum timeout of 10 to 30 seconds. Gemini API calls can take 30+ seconds for large prompts. FFmpeg video processing can take several minutes. Instead of calling these directly from an API route and timing out, every node execution is dispatched as a Trigger.dev background task. The API route returns immediately with a run ID, and the frontend polls every 2 seconds until the task finishes and updates the node with its result.

### Type-Safe Connections

Every handle on every node has a type. Image outputs cannot connect to text inputs. Video outputs cannot connect to image inputs. Invalid connections are blocked before they are created. Circular connections are also blocked via cycle detection before any execution starts.

## Tech Stack

| Technology | Purpose | Why |
| --- | --- | --- |
| Next.js 14 | Framework | App Router, server components |
| TypeScript | Language | Strict type safety throughout |
| React Flow | Canvas | Visual node graph library |
| Zustand | State | Canvas and execution state management |
| Clerk | Auth | User authentication and sessions |
| PostgreSQL (Neon) | Database | Workflow and history storage |
| Prisma | ORM | Type-safe database access |
| Trigger.dev | Tasks | Background job execution |
| Transloadit | Uploads | File upload and CDN delivery |
| FFmpeg | Processing | Image crop and video frame extraction |
| Google Gemini | AI | LLM calls with vision support |
| Tailwind CSS | Styling | Dark theme styling |
| Zod | Validation | API input validation |

## How Each Service Is Used

### Transloadit

**Where it is used:** Upload Image Node and Upload Video Node.

**What it does in this app:** When a user drags an image or video file onto an Upload node and clicks upload, the file goes directly from the browser to Transloadit servers. It never passes through our Next.js server at all. Transloadit stores the file on their CDN and returns a permanent public URL like `https://cdn.transloadit.com/abc123/photo.jpg`.

That URL is what gets stored in the node data and what flows to connected nodes downstream.

When the Crop Image node runs, it sends that URL to FFmpeg. When the LLM node runs, it downloads that URL and sends the image to Gemini.

Why Transloadit and not S3 or Cloudinary: Transloadit has a free tier, handles large video files without memory issues, and gives permanent CDN URLs that work forever in our database.

### Trigger.dev

**Where it is used:** LLM Node, Crop Image Node, Extract Frame Node. Every single node execution goes through Trigger.dev.

**What it does in this app:** Next.js API routes have a maximum timeout of 10 to 30 seconds depending on the plan. Gemini API calls can take 30+ seconds for large prompts with multiple images. FFmpeg video processing can take several minutes.

If we called these directly from an API route the request would time out and the user would see an error even though the task was still running.

Instead, when a node needs to execute:

1. Our API route creates a Trigger.dev task
2. The task runs on Trigger.dev servers with no timeout
3. Our API route returns immediately with a runId
4. The frontend polls every 2 seconds for status
5. When the task completes, the result appears on the node

The three Trigger.dev tasks in this app are:

**`llm-execute` task (`trigger/tasks/llmTask.ts`):**
Called by the LLM Node. Takes model name, system prompt, user message, and an array of image URLs. Downloads each image and converts to base64. Calls Google Gemini API with all inputs. Saves the text response to NodeExecution in the database. Returns the AI response text.

**`crop-image` task (`trigger/tasks/cropImageTask.ts`):**
Called by the Crop Image Node. Takes an image URL and crop parameters (x%, y%, width%, height%). Downloads the image from Transloadit CDN. Runs FFmpeg with the crop filter applied. Uploads the cropped result back to Transloadit. Returns the new cropped image URL.

**`extract-frame` task (`trigger/tasks/extractFrameTask.ts`):**
Called by the Extract Frame Node. Takes a video URL and a timestamp. If the timestamp is a percentage like `50%` it first gets the video duration using FFprobe then calculates the actual second value. Runs FFmpeg to extract that single frame as a JPG. Uploads the frame image to Transloadit. Returns the frame image URL.

### Google Gemini API

**Where it is used:** Only inside the `llm-execute` Trigger.dev task. Never called directly from the browser or API routes.

**What it does in this app:** Gemini is the AI behind the LLM node. It receives whatever the user connected to the LLM node and generates a text response.

The LLM node supports 3 input types:

- `system_prompt`: instructions for how Gemini should behave
- `user_message`: the actual request or question
- `images`: one or more image URLs (multimodal)

When images are connected, Gemini can see them. The AI analyzes both the text prompt and the visual content of images together to generate its response.

Models available in this app:

- `gemini-1.5-flash`: faster, good for simple tasks
- `gemini-1.5-pro`: smarter, better for complex reasoning
- `gemini-2.0-flash`: newest, best balance of speed and quality

The API key comes from Google AI Studio (free tier). It is stored in `GOOGLE_GENERATIVE_AI_API_KEY` env var. It is only used inside the Trigger.dev task. Never exposed to the browser. Never in client code.

### Clerk

**Where it is used:** `middleware.ts`, `layout.tsx`, all API routes, the sign-in page, sign-up page, and the navbar.

**What it does in this app:** Clerk handles everything related to who the user is.

In `middleware.ts`: Every request to `/workflow` or `/api` routes is intercepted. If the user has no valid session token they are redirected to `/sign-in` automatically. Public routes (`/`, `/sign-in`, `/sign-up`) are allowed through.

In `layout.tsx`: `ClerkProvider` wraps the entire app. This gives every component access to the current user session.

In API routes: Every API route calls `auth()` from `@clerk/nextjs/server` to get the current `userId`. This `userId` is then used to look up the user in our PostgreSQL database. This ensures users can only access their own workflows.

In the navbar: The `UserButton` component shows the user avatar. Clicking it shows a dropdown with a sign out option. After signing out, the user is redirected to `/`.

Why Clerk and not NextAuth: Clerk handles the entire auth UI (sign in, sign up pages) so we did not have to build those screens. It also handles Google OAuth, email verification, and session management out of the box.

### Neon PostgreSQL

**Where it is used:** Everywhere that data needs to persist. Via Prisma ORM throughout the codebase.

**What it does in this app:** Neon is our cloud PostgreSQL database. It stores 4 types of data:

**Users table:** One row per user. Stores their Clerk user ID and email. Created automatically on first login.

**Workflows table:** One row per workflow. Stores the entire canvas as two JSON fields: nodes array and edges array. Every time the user makes a change on the canvas, the updated JSON is saved here automatically after a 1-second debounce. This is how the canvas persists across sessions.

**WorkflowRuns table:** One row per execution. Stores when it ran, how long it took, whether it succeeded or failed, and what scope it ran with (full, single, selected). This powers the history panel in the right sidebar.

**NodeExecutions table:** One row per node per run. Stores what inputs the node received, what output it produced, how long it took, and any error that occurred. This powers the expandable node-level details in the history panel.

### Prisma

**Where it is used:** Every database query in the entire app. Never raw SQL anywhere.

**What it does in this app:** Prisma is the layer between our TypeScript code and the PostgreSQL database.

It gives us:

- **Type-safe queries:** if we query the wrong field, TypeScript catches it at compile time not runtime.
- **Auto-generated types:** the `Workflow` type, `User` type, `WorkflowRun` type are all generated from `schema.prisma` so they always match the actual database structure.
- **Migrations:** when we change the schema, Prisma generates the SQL migration automatically. `npx prisma migrate dev` creates and applies it.

The Prisma client is a singleton in `lib/prisma.ts` to prevent too many database connections during Next.js development hot reloads.

### FFmpeg

**Where it is used:** Inside the `crop-image` and `extract-frame` Trigger.dev tasks only. Never in API routes. Never in the browser.

**What it does in this app:** FFmpeg is a command-line tool for processing images and videos. It runs on Trigger.dev servers.

In the Crop Image task: FFmpeg receives an image and four percentage values. It calculates the pixel coordinates from percentages, runs the crop filter, and outputs a new image file. Example:

```bash
ffmpeg -i input.jpg -vf crop=iw*0.8:ih*0.8:iw*0.1:ih*0.1 output.jpg
```

In the Extract Frame task: FFmpeg receives a video URL and a timestamp. If the timestamp is a percentage it first runs FFprobe to get the total video duration, then calculates `duration * percentage / 100`, then seeks to that position and grabs one frame. Example:

```bash
ffmpeg -ss 15.5 -i video.mp4 -vframes 1 frame.jpg
```

The output file from FFmpeg is then uploaded to Transloadit and the resulting CDN URL is returned as the node output.

## Sample Workflow: Product Marketing Kit Generator

The pre-built sample workflow shows what the app can do. The user uploads a product photo and a product video. Two branches run simultaneously:

**Branch A:** Upload Image → Crop Image → LLM Node 1
LLM Node 1 receives the cropped photo plus two text nodes (system prompt + product details) and generates a product description.

**Branch B:** Upload Video → Extract Frame
Pulls a frame from the middle of the video.

**Convergence:** LLM Node 2 waits for both branches. It receives the product description from LLM 1 plus both images (cropped photo + video frame) and generates a ready-to-post marketing tweet.

| Phase | Branch A | Branch B | Convergence |
| --- | --- | --- | --- |
| 1 | Upload Image + Texts | Upload Video | - |
| 2 | Crop Image | Extract Frame | - |
| 3 | LLM Node 1 | (complete) | - |
| 4 | (complete) | (complete) | LLM Node 2 |

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Accounts at: [Neon](https://neon.tech), [Clerk](https://clerk.com), [Google AI Studio](https://aistudio.google.com), [Trigger.dev](https://trigger.dev), [Transloadit](https://transloadit.com)

### Installation

```bash
git clone [repo-url]
cd nextflow
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```bash
# Database (neon.tech)
DATABASE_URL=

# Clerk (clerk.com > API Keys)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/workflow
NEXT_PUBLIC_CLERK_AFTER_SIGN_OUT_URL=/

# Google Gemini (aistudio.google.com)
GOOGLE_GENERATIVE_AI_API_KEY=

# Trigger.dev (trigger.dev > API Keys)
TRIGGER_API_KEY=
TRIGGER_API_URL=https://api.trigger.dev
NEXT_PUBLIC_TRIGGER_PROJECT_ID=

# Transloadit (transloadit.com > Account)
TRANSLOADIT_AUTH_KEY=
TRANSLOADIT_AUTH_SECRET=
```

### Run Locally

```bash
npx prisma migrate dev
npx prisma generate
npm run dev
```

In a separate terminal:

```bash
npx trigger.dev@latest dev
```

### Deploy

Vercel for the Next.js app:

```bash
npx vercel --prod
```

Trigger.dev tasks:

```bash
npx trigger.dev@latest deploy
```

## Project Structure

```text
NextFlow/
├── app/
│   ├── (auth)/
│   │   ├── sign-in/[[...rest]]/page.tsx
│   │   └── sign-up/[[...rest]]/page.tsx
│   ├── (dashboard)/
│   │   └── workflow/
│   │       ├── [id]/
│   │       │   ├── layout.tsx        # Navbar, left palette, right history
│   │       │   └── page.tsx          # React Flow canvas host
│   │       ├── new/page.tsx
│   │       └── page.tsx              # Redirect to latest or new workflow
│   ├── api/
│   │   ├── execute/route.ts          # Graph execution orchestration
│   │   ├── logout/route.ts
│   │   ├── runs/[runId]/route.ts     # Poll Trigger.dev run status
│   │   ├── uploads/transloadit/route.ts
│   │   └── workflows/
│   │       ├── [id]/
│   │       │   ├── duplicate/route.ts
│   │       │   └── route.ts
│   │       └── route.ts
│   ├── globals.css
│   ├── layout.tsx                    # ClerkProvider root
│   └── page.tsx                      # Landing page
├── components/
│   ├── canvas/WorkflowCanvas.tsx     # Canvas controls, drag/drop, import/export
│   ├── nodes/
│   │   ├── BaseNode.tsx
│   │   ├── CropImageNode.tsx
│   │   ├── ExtractFrameNode.tsx
│   │   ├── LLMNode.tsx
│   │   ├── TextNode.tsx
│   │   ├── UploadImageNode.tsx
│   │   ├── UploadVideoNode.tsx
│   │   └── nodeTypes.ts
│   ├── sidebar/
│   │   ├── LeftSidebar.tsx           # Node palette
│   │   └── RightSidebar.tsx          # Workflow history
│   └── workflow/
│       ├── SaveIndicator.tsx
│       └── WorkflowHistoryList.tsx
├── lib/
│   ├── actions/auth.ts
│   ├── auth.ts
│   ├── env.ts
│   ├── helpers/getOrCreateUser.ts
│   ├── hooks/useKeyboardShortcuts.ts
│   ├── prisma.ts                     # Prisma singleton client
│   ├── store/workflowStore.ts        # Zustand store, undo/redo, autosave
│   ├── transloadit.ts
│   ├── types/index.ts
│   └── utils/
│       ├── connectionValidation.ts   # Handle type checking
│       ├── dagExecutor.ts            # DAG build, grouping, execution
│       ├── persistence.ts
│       └── sampleWorkflow.ts
├── prisma/
│   └── schema.prisma
├── trigger/
│   ├── index.ts
│   └── tasks/
│       ├── cropImageTask.ts          # FFmpeg crop + Transloadit upload
│       ├── extractFrameTask.ts       # FFmpeg frame extract + Transloadit upload
│       └── llmTask.ts               # Gemini API call
├── middleware.ts                     # Clerk auth protection
├── trigger.config.ts
└── next.config.mjs
```

## Features

- 6 node types covering text, image, video, and AI
- Real parallel execution using DAG algorithm
- Type-safe connections between nodes
- Google Gemini AI with vision (multimodal) support
- Background task execution via Trigger.dev
- File uploads via Transloadit CDN
- Complete workflow run history with node-level details
- Auto-save to PostgreSQL on every canvas change
- Workflow persists across sessions and devices
- Export and import workflows as JSON
- Undo and redo support
- Selective execution: run all, run selected, run one
- Pulsating glow on actively running nodes
- Pre-built sample workflow demonstrating all features

---

Built for the NextFlow engineering challenge.
Demonstrates: type-safe APIs, parallel DAG execution, real-time UI updates, and seamless full-stack integration.
