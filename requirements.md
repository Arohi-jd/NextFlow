You are helping me build a full-stack web application called "NextFlow". 
Before writing any code, understand this completely:

WHAT IS THIS APP:
NextFlow is a visual AI workflow builder. Think of it like Figma but 
for building AI pipelines. Users drag "nodes" onto a canvas, connect 
them with edges (like wires), and then hit "Run" to execute an AI 
pipeline. It is a pixel-perfect UI clone of krea.ai's workflow builder.

SIMPLE EXAMPLE OF HOW IT WORKS:
1. User drags a "Text Node" onto canvas, types "Describe this product"
2. User drags an "Upload Image Node", uploads a product photo
3. User drags an "LLM Node" (AI node)
4. User connects Text Node output --> LLM Node "user_message" input
5. User connects Image Node output --> LLM Node "images" input
6. User clicks "Run Workflow"
7. The LLM Node calls Google Gemini AI with the text + image
8. Result appears directly on the LLM Node card on the canvas
That's the core idea. Nodes are like lego pieces that connect together.

WHAT A "NODE" IS:
A node is a card on the canvas. It has:
- A colored header with an icon and title
- A body with inputs (text fields, file uploads, dropdowns)
- "Handles" on the left side (inputs) and right side (outputs)
- Handles are the small circles you drag from to create connections
- When connected, the receiving node uses that value as its input

WHAT AN "EDGE" IS:
An edge is the animated purple line connecting two node handles.
It represents data flowing from one node to another.

THE 6 NODE TYPES AND WHAT THEY ACTUALLY DO:
1. TEXT NODE
   - Just a textarea where user types text
   - Output: whatever text the user typed
   - Use case: writing prompts, instructions, product descriptions

2. UPLOAD IMAGE NODE
   - User uploads an image file (jpg/png/webp/gif)
   - File goes to Transloadit (file upload service)
   - Output: a CDN URL pointing to that image
   - Shows a preview of the uploaded image on the node

3. UPLOAD VIDEO NODE
   - Same as above but for video files (mp4/mov/webm/m4v)
   - Shows a video player preview on the node
   - Output: CDN URL of the video

4. RUN LLM NODE (most important node)
   - This is the AI brain of the workflow
   - Takes 3 inputs:
     a) system_prompt: instructions for the AI (from Text Node)
     b) user_message: the actual request (from Text Node)
     c) images: one or more images (from Image/Crop nodes)
   - Calls Google Gemini AI with these inputs
   - Shows the AI response directly on the node card
   - Output: the AI text response (can feed into another LLM Node)
   - IMPORTANT: runs via Trigger.dev task, not directly from browser

5. CROP IMAGE NODE
   - Takes an image URL as input
   - User sets x%, y%, width%, height% to define crop area
   - Runs FFmpeg (video/image processing tool) via Trigger.dev
   - Uploads cropped result to Transloadit
   - Output: URL of the cropped image

6. EXTRACT FRAME FROM VIDEO NODE
   - Takes a video URL as input
   - User sets a timestamp (e.g. "5" for 5 seconds, "50%" for middle)
   - Runs FFmpeg via Trigger.dev to grab that single frame
   - Output: URL of the extracted frame image (jpg/png)

WHY TRIGGER.DEV:
Trigger.dev is a background job service. Any time a node needs to 
"execute" something heavy (calling AI, running FFmpeg), it cannot 
run directly in the browser or a simple API route because it takes 
too long. Instead we create a Trigger.dev "task" which runs in the 
background. The frontend polls for the result and updates the UI 
when done. THIS IS NON-NEGOTIABLE in the spec.

WHY PARALLEL EXECUTION MATTERS:
If I have Node A and Node B with no connection between them, they 
should run AT THE SAME TIME, not one after another. This is called 
parallel execution. The app must detect which nodes are independent 
using a DAG (Directed Acyclic Graph) algorithm and trigger their 
Trigger.dev tasks simultaneously.

Example:
- Upload Image + Upload Video have no dependency on each other
- They both run at the same time (parallel)
- Crop Image waits for Upload Image to finish (dependency)
- Extract Frame waits for Upload Video to finish (dependency)
- Final LLM Node waits for BOTH branches to complete before running

THE DESIGN LANGUAGE:
- Extremely dark UI (#0a0a0a background)
- Everything is dark cards on darker background
- Purple (#8b5cf6) is the primary accent color
- Nodes have colored left border strips matching their type
- Animated purple edges between nodes
- Running nodes have a pulsating purple glow ring animation
- The overall vibe is: professional, dark, sleek, like a dev tool

THE TECH STACK AND WHY:
- Next.js 14 (App Router): main framework
- TypeScript strict mode: type safety everywhere
- React Flow (@xyflow/react): the visual canvas library 
  that handles nodes/edges/connections
- Zustand: simple state management for canvas state
- Clerk: handles user login/signup (we don't build auth ourselves)
- PostgreSQL on Neon: database (cloud postgres, free tier)
- Prisma: ORM to talk to the database with TypeScript
- Trigger.dev: background task runner for node executions
- Transloadit: file upload and media processing CDN
- FFmpeg (via Trigger.dev): image/video processing
- Google Gemini API: the actual AI model being called
- Tailwind CSS: styling
- Zod: API input validation
- Framer Motion: smooth animations

IMPORTANT RULES TO ALWAYS FOLLOW:
1. Every single node execution MUST go through Trigger.dev tasks
2. The UI must match Krea.ai's dark aesthetic exactly
3. All routes except auth pages require Clerk authentication
4. Workflows and history are scoped to the logged-in user only
5. The canvas uses React Flow, not custom canvas drawing
6. Connections are type-safe (image handles cannot connect to 
   text inputs)
7. The LLM response shows inline on the LLM node itself, 
   not in a separate panel
8. All data persists to PostgreSQL via Prisma
9. Parallel branches in the DAG must execute concurrently
10. TypeScript strict mode, no "any" types allowed

THE WORKFLOW HISTORY PANEL:
The right sidebar shows every time the workflow was run. Each run 
entry is clickable and expands to show exactly which nodes ran, 
how long each took, what they output, and whether they succeeded 
or failed. It looks like a tree view with indentation lines.

THE SAMPLE WORKFLOW (must be pre-built in the app):
Called "Product Marketing Kit Generator"
Branch A: Upload Image -> Crop Image -> LLM #1 (with 2 Text nodes 
  providing system prompt and product details)
Branch B: Upload Video -> Extract Frame
Convergence: LLM #2 waits for both branches, takes the product 
  description from LLM #1 + both images, generates a 
  marketing tweet

Now that you understand the full picture, I will give you 
instructions one section at a time. 
Do not start coding yet. 
Reply with "Understood. Ready for Division 1." to confirm you 
have the full context.