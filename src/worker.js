import { exec } from "child_process";
import { initDB } from "./db.js";
import chalk from "chalk";

function getBackoffDelay(base, attempts) {
  return Math.pow(base, attempts) * 1000; // seconds -> milliseconds
}

async function processJob(db, job, config) {
  console.log(chalk.cyan(` Processing job: ${job.id} `));

  const now = new Date().toISOString();

  db.prepare("UPDATE jobs SET state='processing', updated_at=? WHERE id=?").run(
    now,
    job.id
  );

  const result = await new Promise((resolve) => {
    exec(job.command, (error, stdout, stderr) => {
      resolve({ error, stdout, stderr });
    });
  });

  if (result.error) {
    // Cannot Execute
    console.log(chalk.red(`Job ${job.id} failed: ${result.error.message}`));

    const attempts = job.attempts + 1;
    const delay = getBackoffDelay(config.backoffBase, attempts);
    const nextRun = new Date(Date.now() + delay).toISOString();

    if (attempts >= job.max_retries) {
      // attempts exceeded -> move to DLQ
      db.prepare(
        "UPDATE jobs SET state='dead', attempts=?, updated_at=? WHERE id=?"
      ).run(attempts, now, job.id);

      console.log(
        chalk.yellow(` Job ${job.id} moved to DLQ after max retries`)
      );
    } else {
      db.prepare(
        "UPDATE jobs SET state='pending', attempts=?, updated_at=? WHERE id=?"
      ).run(attempts, now, job.id);

      console.log(
        chalk.yellow(`Job ${job.id} will retry in ${delay / 1000} seconds`)
      );
    }
  } else {
    // Execution Successful
    db.prepare(
      "UPDATE jobs SET state='completed', updated_at=? WHERE id=?"
    ).run(now, job.id);

    console.log(chalk.green(`Job ${job.id} completed successfully!`));
  }
}

export async function startWorker(workerId, config) {
  console.log(`🧠 startWorker() triggered for worker ${workerId}`);
  const db = initDB();
  console.log(chalk.blue(`Worker ${workerId} started...`));
  let active = true;

  process.on("SIGINT", () => {
    active = false;
  });

  while (active) {
    const job = db
      .prepare(
        "SELECT * FROM jobs WHERE state='pending' ORDER BY created_at LIMIT 1"
      )
      .get();
    if (!job) {
      await new Promise((r) => setTimeout(r, config.pollInterval));
      console.log(chalk.gray("No pending jobs... polling again."));
      continue;
    }
    await processJob(db, job, config);
  }
  db.close();
  console.log(chalk.magenta(`Worker ${workerId} stopped gracefully.`));
}
