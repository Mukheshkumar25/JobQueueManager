// src/config.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";

// Setup file paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_PATH = path.join(__dirname, "../data/config.json");

// Default configuration values
const DEFAULT_CONFIG = {
  maxRetries: 3,
  backoffBase: 2,
  pollInterval: 2000, // in ms
};

// 🧩 Ensure the config file exists
function ensureConfigFile() {
  if (!fs.existsSync(CONFIG_PATH)) {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
  }
}

// 📖 Read the config file
export function loadConfig() {
  ensureConfigFile();
  const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
  return JSON.parse(raw);
}

// 💾 Write changes to config
function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

// 🧠 Set a configuration key
export function setConfig(key, value) {
  const config = loadConfig();
  if (!(key in config)) {
    console.log(chalk.red(`❌ Unknown config key: '${key}'`));
    console.log(chalk.yellow(`Valid keys: ${Object.keys(config).join(", ")}`));
    process.exit(1);
  }
  config[key] = isNaN(value) ? value : Number(value);
  saveConfig(config);
  console.log(chalk.green(`✅ Updated '${key}' to '${value}'`));
}

//  Get a single key
export function getConfig(key) {
  const config = loadConfig();
  if (!(key in config)) {
    console.log(chalk.red(`❌ Unknown config key: '${key}'`));
    process.exit(1);
  }
  console.log(chalk.green(`${key} = ${config[key]}`));
}

//  List all configuration
export function listConfig() {
  const config = loadConfig();
  console.log(chalk.blue("\n  Current Configuration:\n"));
  for (const [key, value] of Object.entries(config)) {
    console.log(chalk.cyan(`${key}:`), chalk.green(value));
  }
}
