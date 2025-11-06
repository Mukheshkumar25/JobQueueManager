import { initDB } from "./db.js";
import chalk from "chalk";
import crypto from "crypto";
import { loadConfig } from "./config.js";

export function enqueueJob(jobData) {
  const db = initDB();
  const globalConfig = loadConfig();
  let job;

  try {
    job = JSON.parse(jobData);
  } catch (err) {
    console.log(chalk.red("Invalid JSON Format"));
    process.exit(1);
  }

  if (!job.priority) job.priority = 1;

  const now = new Date().toISOString();
  const {
    id = crypto.randomUUID(),
    command,
    state = "pending",
    attempts = 0,
    max_retries = globalConfig.maxRetries,
    priority = 1,
  } = job;

  if (!command) {
    console.error(chalk.red("Missing 'command' field"));
    process.exit(1);
  }

  const stmt = db.prepare(`
    INSERT INTO jobs (id, command, state, attempts, max_retries, priority, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  try {
    stmt.run(id, command, state, attempts, max_retries, priority, now, now);
    console.log(
      chalk.green(`Job Enqueued Successfully: ${id} (Priority: ${priority})`)
    );
  } catch (e) {
    if (e.code === "SQLITE_CONSTRAINT_PRIMARYKEY") {
      console.error(chalk.red("Job already exists!"));
    } else {
      console.error(chalk.red("Failed to enqueue job:"), e.message);
    }
  } finally {
    db.close();
  }
}
