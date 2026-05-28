/// <reference types="node" />

import http from 'node:http';
import https from 'node:https';
import { execFileSync, spawn } from 'node:child_process';
import process from 'node:process';
import { URL, fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const isWindows = process.platform === 'win32';
const pnpmCommand = isWindows ? 'pnpm.cmd' : 'pnpm';
const webUrl = 'http://127.0.0.1:3000';
const cwd = fileURLToPath(new URL('..', import.meta.url));

/**
 * @param {string} command
 * @param {string[]} args
 * @returns {Promise<void>}
 */
const run = async (command, args) => {
  execFileSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: isWindows
  });
};

/**
 * @param {string} url
 * @returns {Promise<boolean>}
 */
const canReachServer = (url) =>
  new Promise((resolve) => {
    const protocol = new URL(url).protocol;
    const client = protocol === 'https:' ? https : http;
    const request = client.get(url, (response) => {
      response.resume();
      const statusCode = response.statusCode ?? 0;

      resolve(statusCode >= 200 && statusCode < 300);
    });

    request.on('error', () => resolve(false));
    request.setTimeout(5000, () => {
      request.destroy();
      resolve(false);
    });
  });

/**
 * @param {string} url
 * @param {number} [timeoutMs=120000]
 * @returns {Promise<void>}
 */
const waitForServer = async (url, timeoutMs = 120000) => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await canReachServer(url)) {
      return;
    }

    await delay(1000);
  }

  throw new Error(`Timed out waiting for ${url}.`);
};

/**
 * @param {import('node:child_process').ChildProcess} child
 */
const stopServer = (child) => {
  if (child.exitCode !== null) {
    return;
  }

  if (isWindows) {
    execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
      stdio: 'inherit'
    });
    return;
  }

  child.kill('SIGTERM');
};

const devServer = spawn(pnpmCommand, ['exec', 'vite', '--host', '0.0.0.0', '--port', '3000', '--strictPort'], {
  cwd,
  stdio: 'inherit',
  shell: isWindows
});

try {
  await waitForServer(webUrl);
  await run(pnpmCommand, ['exec', 'cypress', 'install']);
  await run(pnpmCommand, ['exec', 'cypress', 'run', '--e2e', '--browser', 'electron']);
} finally {
  stopServer(devServer);
}