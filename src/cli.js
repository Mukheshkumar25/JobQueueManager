import { Command } from "commander";
import chalk from "chalk";
import { enqueueJob } from "./jobs.js";
const program = new Command();

program
  .name("queuectl")
  .description("CLI-based background job queue system")
  .version("1.0.0");

program
  .command("enqueue <job>")
  .description("Add a new job to the queue")
  .action((job) => {
    enqueueJob(job);
  });

program
  .command("status")
  .description("Show system status")
  .action(() => {
    console.log(chalk.blue("System status:All Good"));
  });
program.parse(process.argv);
