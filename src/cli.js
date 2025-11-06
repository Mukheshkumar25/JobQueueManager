import chalk from "chalk";
import { fork } from "child_process";
import { Command } from "commander";
import { enqueueJob } from "./jobs.js";
import { startWorker } from "./worker.js";
import { showStatus } from "./status.js";
import { listDLQ, retryDLQ } from "./dlq.js";
import path from "path";
import { listJobs } from "./listJobs.js";
import { fileURLToPath } from "url";
import { setConfig, getConfig, listConfig } from "./config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      console.log(`  Launching worker ${i}`);
      await startWorker(i, config);
    }
    console.log(" All workers launched.");
  }); */

const worker = program
  .command("worker")
  .description("Manage background workers");

worker
  .command("start")
  .option("--count <n>", "Number of workers", "1")
  .description("Start worker(s)")
  .action(async (opts) => {
    console.log(chalk.blue("🚀 Worker start command triggered..."));
    const count = parseInt(opts.count);

    const workerPath = path.join(__dirname, "worker-runner.js");

    for (let i = 1; i <= count; i++) {
      console.log(chalk.yellow(`➡️  Launching worker process ${i}`));
      const child = fork(workerPath, [i], { stdio: "inherit" });

      child.on("exit", (code) => {
        console.log(chalk.magenta(`💀 Worker ${i} exited with code ${code}`));
      });
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

// ⚙️ Config management
const configCmd = program.command("config").description("Manage configuration");

configCmd
  .command("set <key> <value>")
  .description("Set a configuration value")
  .action((key, value) => setConfig(key, value));

configCmd
  .command("get <key>")
  .description("Get a configuration value")
  .action((key) => getConfig(key));

configCmd
  .command("list")
  .description("List all configuration values")
  .action(() => listConfig());

program.parse(process.argv);
