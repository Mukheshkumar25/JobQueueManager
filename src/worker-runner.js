import { startWorker } from "./worker.js";
const workerId = process.argv[2] || 1;
const config = {
  backoffBase: 2,
  pollInterval: 2000,
};

(async () => {
  await startWorker(workerId, config);
})();
