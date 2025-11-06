# 🧰 **QueueCTL – CLI-Based Background Job Queue System**

> 🚀 A minimal, production-grade job queue manager built with **Node.js** and **SQLite**.
> Supports background job execution, retries with exponential backoff, persistent storage, and a Dead Letter Queue (DLQ).
To Know more about my project go through this Explanation video:https://drive.google.com/file/d/1u-ifk04ajaa0YIWNQgLNW3hAyJp44yoF/view?usp=sharing
---

## 🎯 **Objective**

`queuectl` is a CLI tool that manages background jobs with worker processes.
It allows you to enqueue shell commands, process them asynchronously, retry failed jobs automatically, and view or retry failed (dead) jobs from the Dead Letter Queue.

---

## ⚙️ **Tech Stack**

* **Language:** JavaScript (Node.js)
* **Database:** SQLite (via `better-sqlite3`)
* **CLI Framework:** Commander.js
* **Logging:** Chalk (colored terminal output)
* **Storage:** Persistent database in `data/queue.db`

---

## 📦 **Project Structure**

```
queuectl/
├── bin/
│   └── queuectl                # CLI entrypoint
├── data/
│   └── queue.db                # Persistent job storage (auto-created)
├── src/
│   ├── cli.js                  # CLI command definitions
│   ├── db.js                   # SQLite DB initialization
│   ├── jobs.js                 # Job enqueue/list logic
│   ├── worker.js               # Worker execution & retry logic
│   ├── status.js               # Status summary command
│   └── dlq.js                  # Dead Letter Queue management
├── package.json
├── .gitignore
└── README.md                   # (You are here!)
```

---

## 🧩 **Job Specification**

Each job in the system follows this structure:

```json
{
  "id": "unique-job-id",
  "command": "echo 'Hello World'",
  "state": "pending",
  "attempts": 0,
  "max_retries": 3,
  "created_at": "2025-11-04T10:30:00Z",
  "updated_at": "2025-11-04T10:30:00Z"
}
```

### Job Lifecycle

| **State**    | **Description**                     |
| ------------ | ----------------------------------- |
| `pending`    | Waiting to be picked up by a worker |
| `processing` | Currently being executed            |
| `completed`  | Successfully executed               |
| `failed`     | Failed but retryable                |
| `dead`       | Permanently failed (moved to DLQ)   |

---

## 💻 **Setup Instructions**

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/<your-username>/queuectl.git
cd queuectl
```

### 2️⃣ Install Dependencies

```bash
npm install
```

### 3️⃣ Make CLI Executable (first time only)

```bash
chmod +x bin/queuectl
npm link
```

✅ Now you can use `queuectl` globally in your terminal!

---

## ⚙️ **Usage Examples**

### 🧱 Enqueue a Job

```bash
queuectl enqueue '{"id":"job1","command":"echo Hello from QueueCTL"}'
```

### 🧑‍🏭 Start a Worker

```bash
queuectl worker start
```

Output:

```
🚀 Worker start command triggered...
➡️  Launching worker 1
🧠 startWorker() triggered for worker 1
Worker 1 started...
 Processing job: job1 
✅ Job job1 completed successfully!
```

### 📋 Check Queue Status

```bash
queuectl status
```

Example:

```
📊 Queue Status Overview

pending     : 0
processing  : 0
completed   : 5
dead        : 1
```

### ☠️ View Dead Letter Queue

```bash
queuectl dlq list
```

Output:

```
☠️  Dead Letter Queue Jobs
ID: fail1 | Command: does_not_exist | Attempts: 3
```

### ♻️ Retry a Dead Job

```bash
queuectl dlq retry fail1
```

Output:

```
♻️  Job fail1 moved back to pending queue.
```

Then run:

```bash
queuectl worker start
```

---

## 🔄 **Retry & Backoff Logic**

Failed jobs retry automatically with exponential delay:

```
delay = base ^ attempts  (seconds)
```

Example:

* Base = 2
* Attempt 1 → 2s delay
* Attempt 2 → 4s delay
* Attempt 3 → 8s delay

If a job still fails after `max_retries`, it’s moved to the **DLQ**.

---

## 💾 **Persistence**

All jobs are stored in:

```
data/queue.db
```

This file is auto-created and ensures **jobs persist even after restart**.

> 🔒 `data/` is excluded from Git using `.gitignore`.

---

## 🧱 **Architecture Overview**

```
┌──────────────────────┐
│   queuectl CLI       │
│ (commander.js)       │
└───────┬──────────────┘
        │
        ▼
┌──────────────────────┐
│   Job Storage (DB)   │
│  SQLite (queue.db)   │
└───────┬──────────────┘
        │
        ▼
┌──────────────────────┐
│   Worker(s)          │
│ - Executes commands  │
│ - Handles retries    │
│ - Moves failed → DLQ │
└──────────────────────┘
```

---

## 🧪 **Testing Instructions**

You can quickly verify all features by running:

```bash
# Add jobs
queuectl enqueue '{"id":"jobX","command":"echo Hello"}'
queuectl enqueue '{"id":"fail1","command":"unknown_cmd"}'

# Start worker
queuectl worker start

# View queue
queuectl status

# Check DLQ
queuectl dlq list

# Retry DLQ job
queuectl dlq retry fail1
```

---


## (Future Enhancements)**

* ⏱️ **Job Scheduling** (`run_at` for delayed jobs)
* 🧵 **Priority Queues** (high/low priority jobs)
* 💬 **Job Output Logging**
* 🕹️ **Web Dashboard** for monitoring
* 📈 **Metrics & Worker Health**

---

## 👨‍💻 **Author**

**Mukhesh Kumar Reddy**
*AI-ML Enthusiast,Full Stack Developer | QueueCTL Creator*
📧 mukheshkumarreddy@gmail.com
🔗 https://github.com/Mukheshkumar25

---

