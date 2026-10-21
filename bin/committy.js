#!/usr/bin/env node

import { loadEnv } from "../src/env.js";

// Load the .env before the CLI modules read settings such as COMMITTY_MODEL
loadEnv();
const { run } = await import("../src/cli.js");

run();
