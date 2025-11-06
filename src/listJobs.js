// src/listJobs.js
import { initDB } from "./db.js";
import chalk from "chalk";
import Table from "cli-table3";

export function listJobs(state) {
  const db = initDB();

  // Base query
  let query = "SELECT * FROM jobs";
  const params = [];

  if (state) {
    query += " WHERE state = ?";
    params.push(state);
  }

  // Fetch jobs
  const rows = db.prepare(query).all(...params);

  if (rows.length === 0) {
    console.log(
      chalk.yellow(`No jobs found${state ? ` with state '${state}'` : ""}.`)
    );
    db.close();
    return;
  }

  // Create a pretty table
  const table = new Table({
    head: [
      chalk.cyan("Job ID"),
      chalk.cyan("Command"),
      chalk.cyan("State"),
      chalk.cyan("Attempts"),
      chalk.cyan("Max Retries"),
      chalk.cyan("Priority"),
      chalk.cyan("Created At"),
    ],
  });

  rows.forEach((job) => {
    table.push([
      job.id,
      job.command,
      job.state,
      job.attempts,
      job.max_retries,
      job.priority,
      new Date(job.created_at).toLocaleString(),
    ]);
  });

  console.log(chalk.green(`\n Listing ${state || "all"} jobs:\n`));
  console.log(table.toString());

  db.close();
}
