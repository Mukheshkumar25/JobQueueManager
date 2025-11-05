import { initDB } from "./db.js";
import chalk from "chalk";

export function showStatus() {
  const db = initDB();
  const rows = db
    .prepare(`SELECT state,COUNT(*) FROM jobs GROUP BY state`)
    .all();
  if (rows.length === 0) {
    console.log(chalk.gray("No jobs in the queue."));
    db.close();
    return;
  }
  console.log(chalk.bold("\n Queue Status Overview\n"));
  for (const row of rows) {
    let color = chalk.white;
    switch (row.state) {
      case "pending":
        color = chalk.yellow;
        break;
      case "processing":
        color = chalk.cyan;
        break;
      case "completed":
        color = chalk.green;
        break;
      case "dead":
        color = chalk.red;
        break;
    }
    const count = row.count || row["COUNT(*)"];
    console.log(color(`${row.state.padEnd(12)}: ${count}`));
  }

  db.close();
}
