import { exec } from "child_process";
import { initDB } from "./db.js";
import chalk from "chalk";
import { loadConfig } from "./config.js";
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

function safeTransaction(db, fn, retries = 5, delay = 200) {
  for (let i = 0; i < retries; i++) {
    try {
      const tx = db.transaction(fn);
      return tx(); // run the transaction safely
    } catch (err) {
      if (err.code === "SQLITE_BUSY" || err.code === "SQLITE_BUSY_SNAPSHOT") {
        console.warn(
          `  DB busy, retrying in ${delay}ms (attempt ${i + 1}/${retries})`
        );
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delay); // small pause
        continue;
      } else {
        throw err;
      }
    }
  }
  throw new Error(" Failed after multiple retries due to DB lock.");
}

export async function startWorker(workerId, config) {
  console.log(` startWorker() triggered for worker ${workerId}`);
  const db = initDB();
  const config = loadConfig(); // instead of hardcoded values
  console.log(chalk.blue(`Worker ${workerId} started...`));
  let active = true;

  process.on("SIGINT", () => {
    active = false;
  });

  while (active) {
    let job = null;
    const now = new Date().toISOString();

    // ✅ CHANGE: use safeTransaction to avoid "database is locked"
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

    // No available job → wait before polling again
    if (!job) {
      await new Promise((r) => setTimeout(r, config.pollInterval));
      console.log(
        chalk.gray(`Worker ${workerId}: No pending jobs... polling again.`)
      );
      continue;
    }

    // Process the job outside of the transaction
    await processJob(db, job, config);
  }

  db.close();
  console.log(chalk.magenta(`Worker ${workerId} stopped gracefully.`));
}
