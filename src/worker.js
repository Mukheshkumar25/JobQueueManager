import { exec } from "child_process";
import { initDB } from "./db.js";
import chalk from "chalk";
import { loadConfig } from "./config.js";

/**
 * Calculates exponential backoff delay based on the number of attempts.
 * delay = base ^ attempts (in seconds)
 */
function getBackoffDelay(base, attempts) {
  return Math.pow(base, attempts) * 1000; // convert seconds to milliseconds
}

/**
 * Executes a job command and updates its state in the database.
 */
async function processJob(db, job, config) {
  console.log(chalk.cyan(`Processing job: ${job.id}`));

  const now = new Date().toISOString();

  // Mark job as processing
  db.prepare("UPDATE jobs SET state='processing', updated_at=? WHERE id=?").run(
    now,
    job.id
  );

  // Execute the command
  const result = await new Promise((resolve) => {
    exec(job.command, (error, stdout, stderr) => {
      resolve({ error, stdout, stderr });
    });
  });

  // Handle success or failure
  if (result.error) {
    console.log(chalk.red(`Job ${job.id} failed: ${result.error.message}`));

    const attempts = job.attempts + 1;
    const delay = getBackoffDelay(config.backoffBase, attempts);

    if (attempts >= job.max_retries) {
      // Max retries reached → move to Dead Letter Queue
      db.prepare(
        "UPDATE jobs SET state='dead', attempts=?, updated_at=? WHERE id=?"
      ).run(attempts, now, job.id);

      console.log(chalk.yellow(`Job ${job.id} moved to DLQ after max retries`));
    } else {
      // Retry the job later
      db.prepare(
        "UPDATE jobs SET state='pending', attempts=?, updated_at=? WHERE id=?"
      ).run(attempts, now, job.id);

      console.log(
        chalk.yellow(`Job ${job.id} will retry in ${delay / 1000} seconds`)
      );
    }
  } else {
    // Success → mark as completed
    db.prepare(
      "UPDATE jobs SET state='completed', updated_at=? WHERE id=?"
    ).run(now, job.id);

    console.log(chalk.green(`Job ${job.id} completed successfully!`));
  }
}

/**
 * Safely executes a database transaction with retries to prevent "database is locked" errors.
 */
function safeTransaction(db, fn, retries = 5, delay = 200) {
  for (let i = 0; i < retries; i++) {
    try {
      const tx = db.transaction(fn);
      return tx(); // execute the transaction
    } catch (err) {
      if (err.code === "SQLITE_BUSY" || err.code === "SQLITE_BUSY_SNAPSHOT") {
        console.warn(
          `Database busy, retrying in ${delay}ms (attempt ${i + 1}/${retries})`
        );
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delay);
        continue;
      } else {
        throw err;
      }
    }
  }
  throw new Error("Failed after multiple retries due to DB lock.");
}

/**
 * Starts a worker process that continuously polls for pending jobs and executes them.
 */
export async function startWorker(workerId, config) {
  console.log(`startWorker() triggered for worker ${workerId}`);
  const db = initDB();

  // Load global config and merge with CLI-provided config
  const globalConfig = loadConfig();
  const finalConfig = { ...globalConfig, ...config };

  console.log(chalk.blue(`Worker ${workerId} started...`));
  let active = true;

  // Graceful shutdown on SIGINT
  process.on("SIGINT", () => {
    active = false;
  });

  // Main worker loop
  while (active) {
    let job = null;
    const now = new Date().toISOString();

    // Use a transaction to safely claim a job for processing
    safeTransaction(db, () => {
      const candidate = db
        .prepare(
          `SELECT * FROM jobs
           WHERE state='pending'
           ORDER BY priority DESC, created_at ASC
           LIMIT 1`
        )
        .get();

      if (candidate) {
        db.prepare(
          "UPDATE jobs SET state='processing', updated_at=? WHERE id=?"
        ).run(now, candidate.id);

        console.log(
          chalk.cyan(`Worker ${workerId} claimed job: ${candidate.id}`)
        );
        job = candidate;
      }
    });

    // If no jobs are available, wait and poll again
    if (!job) {
      await new Promise((r) => setTimeout(r, finalConfig.pollInterval));
      console.log(
        chalk.gray(`Worker ${workerId}: No pending jobs... polling again.`)
      );
      continue;
    }

    // Execute the job outside the transaction
    await processJob(db, job, finalConfig);
  }

  // Clean shutdown
  db.close();
  console.log(chalk.magenta(`Worker ${workerId} stopped gracefully.`));
}
