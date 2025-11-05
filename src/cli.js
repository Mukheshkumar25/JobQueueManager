import chalk from "chalk";
import { Command } from "commander";
import { enqueueJob } from "./jobs.js";
import { startWorker } from "./worker.js";
import { showStatus } from "./status.js";
import { listDLQ, retryDLQ } from "./dlq.js";

const program = new Command();

program
  .name("queuectl")
  .description("CLI-based background job queue system")
  .version("1.0.0");

program
  .command("status")
  .description("Show summary of all job states")
  .action(() => showStatus());

program
  .command("enqueue <job>")
  .description("Add a new job to the queue")
  .action((job) => {
    enqueueJob(job);
  });

program
  .command("list")
  .option("--state <state>", "Filter by job state")
  .action((opts) => listJobs(opts.state));

/* program
  .command("worker start")
  .option("--count <n>", "Number of workers", "1")
  .description("Start worker(s)")
  .action(async (opts) => {
    const count = parseInt(opts.count);
    const config = {
      backoffBase: 2,
      pollInterval: 2000, // 2 seconds
    };

    for (let i = 1; i <= count; i++) {
      console.log(`➡️  Launching worker ${i}`);
      await startWorker(i, config);
    }
    console.log("✅ All workers launched.");
  }); */

//  Define "worker" parent command
const worker = program
  .command("worker")
  .description("Manage background workers");

//  Define "start" subcommand
worker
  .command("start")
  .option("--count <n>", "Number of workers", "1")
  .description("Start worker(s)")
  .action(async (opts) => {
    console.log(chalk.blue("🚀 Worker start command triggered..."));
    const count = parseInt(opts.count);
    const config = {
      backoffBase: 2,
      pollInterval: 2000, // 2 seconds
    };

    for (let i = 1; i <= count; i++) {
      console.log(chalk.yellow(`➡️  Launching worker ${i}`));
      await startWorker(i, config);
    }
  });

const dlq = program.command("dlq").description("Manage Dead Letter Queue");

dlq
  .command("list")
  .description("List all jobs in Dead Letter Queue")
  .action(() => listDLQ());

dlq
  .command("retry <id>")
  .description("Retry a specific DLQ job by ID")
  .action((id) => retryDLQ(id));

program.parse(process.argv);
