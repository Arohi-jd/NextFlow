Here's the complete technical breakdown of how NextFlow works under the hood:

---

## THE COMPLETE TECHNICAL FLOW

---

## 1. How the App Boots Up

```
User visits nextflow.vercel.app
         ↓
Next.js App Router loads
         ↓
middleware.ts runs FIRST (before any page loads)
         ↓
Clerk checks: does this browser have a valid session token?
         ↓
NO TOKEN = redirect to /sign-in
YES TOKEN = allow through to /workflow
         ↓
/workflow page loads
         ↓
Server Component fetches workflow from PostgreSQL via Prisma
         ↓
React Flow canvas renders with saved nodes and edges
         ↓
Zustand store initializes with that data
         ↓
User sees their canvas
```

---

## 2. How Authentication Works Technically

```
Clerk lives at the edge (middleware layer)
Every single request hits middleware first

middleware.ts checks the request cookie:
__session cookie = Clerk's encrypted JWT token

Inside that JWT:
{
  userId: "user_2abc123",
  email: "user@gmail.com",
  exp: 1234567890
}

This userId is what links everything in your database.

When an API route needs to know who is calling it:
const { userId } = await auth()
This decrypts the JWT and gives you the Clerk userId
That userId maps to your User table in PostgreSQL
```

---

## 3. How the Database Is Structured

```
PostgreSQL on Neon (cloud hosted)
Prisma ORM talks to it from Next.js

4 Tables and how they relate:

USER
id: "usr_abc"
clerkId: "user_2abc123"  ← matches Clerk's userId
email: "john@gmail.com"
     |
     | one user has many workflows
     ↓
WORKFLOW
id: "wfl_xyz"
userId: "usr_abc"        ← foreign key to User
name: "Product Kit"
nodes: JSON              ← entire canvas nodes array
edges: JSON              ← entire canvas edges array
updatedAt: timestamp
     |
     | one workflow has many runs
     ↓
WORKFLOWRUN
id: "run_123"
workflowId: "wfl_xyz"   ← foreign key to Workflow
status: "success"
scope: "full"
startedAt: DateTime
completedAt: DateTime
duration: 4.2            ← seconds
     |
     | one run has many node executions
     ↓
NODEEXECUTION
id: "nex_456"
runId: "run_123"         ← foreign key to WorkflowRun
nodeId: "node-4"         ← matches React Flow node id
nodeType: "LLM"
status: "success"
inputs: JSON             ← what went in
outputs: JSON            ← what came out
executionTime: 2.3       ← seconds
error: null or string
```

---

## 4. How the Canvas Works Technically

```
React Flow (@xyflow/react) manages the canvas

React Flow maintains two arrays internally:
nodes[] = array of node objects
edges[] = array of edge objects

Node object structure:
{
  id: "node-1",
  type: "textNode",        ← maps to your component
  position: { x: 100, y: 200 },
  data: {
    text: "Hello world",
    output: "Hello world"  ← current output value
  }
}

Edge object structure:
{
  id: "edge-1",
  source: "node-1",        ← which node it comes from
  sourceHandle: "output",  ← which handle on that node
  target: "node-2",        ← which node it goes to
  targetHandle: "user_message"  ← which handle on that node
  animated: true,
  style: { stroke: "#8b5cf6" }
}

These two arrays live in Zustand store.
React Flow reads from Zustand.
When user drags a node: React Flow updates Zustand.
When user connects two nodes: React Flow updates Zustand.
Zustand changes trigger auto-save to PostgreSQL.

HOW A NODE COMPONENT RENDERS:
React Flow calls your component with props:
- data: the node's data object
- selected: boolean
- id: the node's id

Your component renders the card UI.
When user types in textarea:
  onChange updates data.text in Zustand
  React Flow re-renders that node
  Character count updates
```

---

## 5. How Node Connections Work Technically

```
When user drags from an output handle:
React Flow fires onConnect event with:
{
  source: "node-1",
  sourceHandle: "output",
  target: "node-2", 
  targetHandle: "user_message"
}

Your validation function runs:
function isValidConnection(connection) {
  const sourceType = getHandleType(
    connection.source, 
    connection.sourceHandle
  )
  const targetType = getHandleType(
    connection.target, 
    connection.targetHandle
  )
  return COMPATIBLE_TYPES[sourceType]
    .includes(targetType)
}

COMPATIBLE_TYPES lookup table:
{
  "image_url": ["image_url", "images"],
  "video_url": ["video_url"],
  "text":      ["system_prompt", "user_message", 
                "timestamp", "x_percent", 
                "y_percent", "width_percent",
                "height_percent"],
  "llm_output":["user_message", "system_prompt",
                "timestamp"]
}

If valid: edge added to Zustand, renders purple animated line
If invalid: React Flow rejects it, red flash shown

CYCLE DETECTION:
Uses DFS (Depth First Search) algorithm
Before adding edge A→B, checks:
"Can I reach A by starting from B?"
If yes: adding A→B would create a cycle = BLOCKED
If no: safe to add = ALLOWED
```

---

## 6. How the DAG Execution Engine Works

```
This is the most technically complex part.

DAG = Directed Acyclic Graph
Directed = edges have direction (A→B not B→A)
Acyclic = no loops/cycles
Graph = nodes connected by edges

STEP 1: BUILD ADJACENCY LIST
Takes all nodes and edges and builds:
{
  "text1": [],           ← depends on nothing
  "text2": [],           ← depends on nothing
  "image1": [],          ← depends on nothing
  "video1": [],          ← depends on nothing
  "crop1": ["image1"],   ← depends on image1
  "frame1": ["video1"],  ← depends on video1
  "llm1": ["crop1",      ← depends on crop1,
            "text1",        text1, text2
            "text2"],
  "llm2": ["llm1",       ← depends on llm1
            "frame1"]       and frame1
}

STEP 2: TOPOLOGICAL SORT
Kahn's Algorithm:
1. Find all nodes with 0 dependencies = Group 1
   ["text1", "text2", "image1", "video1"]
2. Remove Group 1 from graph
3. Find new nodes with 0 dependencies = Group 2
   ["crop1", "frame1"]
4. Remove Group 2
5. Find Group 3: ["llm1"]
6. Find Group 4: ["llm2"]

Result: [[text1,text2,image1,video1],[crop1,frame1],[llm1],[llm2]]

STEP 3: EXECUTE WITH PROMISE.ALL

async function executeWorkflow(groups) {
  for (const group of groups) {
    await Promise.all(
      group.map(nodeId => executeNode(nodeId))
    )
  }
}

Promise.all means ALL nodes in a group fire
simultaneously. Group 2 only starts after
ALL of Group 1 finishes.

STEP 4: COLLECT OUTPUTS BETWEEN GROUPS
After each group completes:
Store each node's output in a runtime context map:
{
  "text1": "You are a copywriter...",
  "image1": "https://cdn.transloadit.com/img.jpg",
  "crop1": "https://cdn.transloadit.com/cropped.jpg",
  ...
}

When executing the next group, look up
connected nodes' outputs from this map.
```

---

## 7. How Trigger.dev Works Technically

```
WHY TRIGGER.DEV:
Next.js API routes have a 10-30 second timeout limit.
Gemini API calls can take 30+ seconds.
FFmpeg video processing can take minutes.
So we cannot run these in a normal API route.

Trigger.dev runs tasks on their servers.
No timeout limit. Runs as long as needed.

THE FLOW:

BROWSER                API ROUTE           TRIGGER.DEV
   |                       |                    |
   |-- POST /api/execute -->|                    |
   |                       |-- trigger task ---->|
   |                       |<-- { taskRunId } ---|
   |<-- { runId } ---------|                    |
   |                       |              task runs here
   |                       |              calls Gemini/FFmpeg
   |                       |                    |
   |-- GET /api/runs/123 ->|                    |
   |<-- { status: running}-|                    |
   |                       |              task completes
   |                       |<-- webhook ---------|
   |                       |  updates database   |
   |-- GET /api/runs/123 ->|                    |
   |<-- { status: done } --|                    |
   |                       |                    |

POLLING:
Frontend polls /api/runs/[runId] every 2 seconds
When status changes from "running" to "success":
  Update UI
  Stop polling
  Show result on node

THE LLM TASK CODE FLOW:
export const llmTask = task({
  id: "llm-execute",
  run: async (payload) => {
    
    // 1. Update DB: this node is now running
    await prisma.nodeExecution.update({
      where: { id: payload.nodeExecutionId },
      data: { status: "running" }
    })
    
    // 2. Initialize Gemini
    const genAI = new GoogleGenerativeAI(
      process.env.GOOGLE_GENERATIVE_AI_API_KEY
    )
    const model = genAI.getGenerativeModel({ 
      model: payload.model 
    })
    
    // 3. Build content array
    const parts = []
    if (payload.systemPrompt) {
      parts.push({ text: payload.systemPrompt })
    }
    parts.push({ text: payload.userMessage })
    
    // 4. Add images if any
    for (const imageUrl of payload.images) {
      const response = await fetch(imageUrl)
      const buffer = await response.arrayBuffer()
      const base64 = Buffer.from(buffer)
        .toString('base64')
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: base64
        }
      })
    }
    
    // 5. Call Gemini
    const result = await model.generateContent({
      contents: [{ role: "user", parts }]
    })
    const output = result.response.text()
    
    // 6. Update DB: done, save output
    await prisma.nodeExecution.update({
      where: { id: payload.nodeExecutionId },
      data: {
        status: "success",
        outputs: { output },
        executionTime: calculateDuration(),
        completedAt: new Date()
      }
    })
    
    return { output }
  }
})
```

---

## 8. How File Upload Works Technically

```
Transloadit is a file processing CDN.

UPLOAD FLOW:
1. User selects file in browser
2. Browser sends file DIRECTLY to Transloadit
   (not through your Next.js server)
   This is important: your server never touches the file
3. Transloadit stores it on their CDN
4. Transloadit returns a URL:
   "https://cdn.transloadit.com/abc123/photo.jpg"
5. Your app stores that URL
6. That URL is what flows between nodes

WHY THIS APPROACH:
Your Next.js server has memory limits
Large video files would crash it
Transloadit handles the heavy lifting
Your server just deals with the URL string

TRANSLOADIT AUTHENTICATION:
Each upload request must be signed:
const signature = createHmac('sha384', authSecret)
  .update(JSON.stringify(params))
  .digest('hex')

This proves the upload request came from your app
Prevents unauthorized uploads to your account
```

---

## 9. How Auto-Save Works Technically

```
Every canvas change triggers a Zustand action.
Zustand has a subscriber that watches for changes.

DEBOUNCED AUTO-SAVE:
let saveTimer = null

function onCanvasChange() {
  // Cancel previous pending save
  clearTimeout(saveTimer)
  
  // Show "Saving..." in navbar
  setStatus("saving")
  
  // Schedule save after 1 second of no changes
  saveTimer = setTimeout(async () => {
    await fetch('/api/workflows/' + workflowId, {
      method: 'PATCH',
      body: JSON.stringify({
        nodes: store.nodes,
        edges: store.edges,
        name: store.workflowName
      })
    })
    // Show "Saved ✓" in navbar
    setStatus("saved")
  }, 1000)
}

WHY DEBOUNCE:
User types in a textarea.
Without debounce: saves on every single keystroke.
That's 10 API calls per second = database hammering.
With debounce: waits until user stops typing for 1 second.
Much more efficient.

WHAT GETS SAVED:
The entire nodes array as JSON blob.
The entire edges array as JSON blob.
Stored in the Workflow table.
When page loads: fetch this JSON, restore canvas.
```

---

## 10. How the History Panel Updates in Real Time

```
POLLING MECHANISM:
When execution starts:
  setInterval starts running every 2 seconds
  Calls GET /api/runs/[runId]
  API returns current run status + all node executions

The response looks like:
{
  run: {
    id: "run_123",
    status: "running",
    duration: null
  },
  executions: [
    {
      nodeId: "node-1",
      nodeType: "TEXT",
      status: "success",
      outputs: { output: "Hello world" },
      executionTime: 0.1
    },
    {
      nodeId: "node-4",
      nodeType: "LLM",
      status: "running",
      outputs: null,
      executionTime: null
    }
  ]
}

Frontend reads this and:
1. Updates runningNodes Set in Zustand
   (which controls which nodes show glow animation)
2. Updates history panel in real time
3. When run.status changes to "success" or "failed":
   clearInterval (stop polling)
   Final update to history panel
   Show completion toast

WHY POLLING NOT WEBSOCKETS:
Simpler to implement
Trigger.dev handles the actual task
2 second delay is acceptable for this use case
Websockets would need a separate server
```

---

## 11. How Data Flows Through a Full Run (End to End)

```
Let's trace one complete execution:
"User runs the sample workflow"

T=0ms: User clicks "Run Workflow"

T=1ms: Frontend validates all nodes
        All valid, proceed

T=5ms: POST /api/execute
        Body: { workflowId, nodes, edges, scope:"full" }

T=10ms: API builds DAG
         Groups: 
         [[text1,text2,text3,image1,video1],
          [crop1,frame1],[llm1],[llm2]]

T=15ms: Creates WorkflowRun { status:"running" }
         Creates 8 NodeExecution { status:"pending" }
         Returns { runId: "run_123" }

T=20ms: Executes Group 1 with Promise.all:
         text1,text2,text3 = instant (just read values)
         image1 = already has URL from previous upload
         video1 = already has URL from previous upload
         All 5 complete in ~5ms

T=25ms: Executes Group 2 with Promise.all:
         SIMULTANEOUSLY:
         Trigger.dev task "crop-image" fires
         Trigger.dev task "extract-frame" fires
         Both nodes start glowing on canvas
         Frontend starts polling every 2 seconds

T=2000ms: Poll #1 - both still running

T=4000ms: Poll #2 - crop-image done (2.3s)
           NodeExecution updated in DB
           Canvas: crop node stops glowing, green flash

T=6000ms: Poll #3 - extract-frame done (4.1s)
           Group 2 complete

T=6005ms: Executes Group 3:
           Trigger.dev task "llm-execute" fires
           LLM node 1 starts glowing
           Inputs gathered from context map:
           systemPrompt = text1 output
           userMessage = text2 output
           images = [crop1 output URL]

T=10000ms: Gemini responds (4.2s)
            LLM node 1 output saved to DB
            Result appears on node with fade-in
            LLM node 1 stops glowing

T=10005ms: Executes Group 4:
            Trigger.dev task "llm-execute" fires
            LLM node 2 starts glowing
            Inputs:
            systemPrompt = text3 output
            userMessage = llm1 output (product description)
            images = [crop1 URL, frame1 URL]

T=13500ms: Gemini responds (3.5s)
            Marketing tweet appears on LLM node 2
            LLM node 2 stops glowing

T=13505ms: WorkflowRun updated:
            status: "success"
            duration: 13.5
            completedAt: now

T=13510ms: Frontend poll detects status:"success"
            Stops polling
            History panel shows green "Success" badge
            Toast: "Workflow completed in 13.5s"
            All nodes back to normal state

TOTAL TIME: 13.5 seconds
WITHOUT PARALLEL EXECUTION: would have taken ~20+ seconds
```

---

That is the complete technical picture of how every piece of NextFlow works. Every user action, every API call, every database write, every Trigger.dev task, and every UI update is covered above. When something breaks during development, this is your map to figure out exactly which layer the problem is in.