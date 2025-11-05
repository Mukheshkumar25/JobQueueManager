import { initDB } from "./db.js";
import chalk from "chalk";

export function listDLQ() {
  const db = initDB();
  const jobs = db.prepare("SELECT * FROM JOBS WHERE state = 'dead'").all();
  if (jobs.length === 0) {
    console.log(chalk.gray("No jobs in DLQ."));
  } else {
    console.log(chalk.bold("\n Dead Letter Queue Jobs\n"));
    for (const job of jobs) {
      console.log(
        chalk.red(
          `ID: ${job.id} | Command: ${job.command} | Attempts: ${job.attempts}`
        )
      );
    }
  }
  db.close();
}

export function retryDLQ(jobId) {
  const db = initDB();
  const job = db
    .prepare("SELECT * FROM jobs where id=? AND state = 'dead'")
    .get(jobId);
  if (!job) {
    console.log("\n No Job found with id :${jobId}");
    db.close();
    return;
  }
  db.prepare(
    "UPDATE jobs SET state='pending', attempts=0, updated_at=? WHERE id=?"
  ).run(new Date().toISOString(), jobId);
  console.log(chalk.green(`Job ${jobId} moved back to pending queue.`));
  db.close();
}
