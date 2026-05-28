import { execFileSync, spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import net from 'node:net';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fileServerDir = resolve(rootDir, 'apps/file-server');
const envFilePath = resolve(rootDir, 'infra/compose/env/.env');
const composeArgs = [
  'compose',
  '--env-file',
  envFilePath,
  '-f',
  resolve(rootDir, 'infra/compose/compose.base.yaml'),
  '-f',
  resolve(rootDir, 'infra/compose/compose.hybrid.yaml')
];
const isWindows = process.platform === 'win32';

const run = async (command, args, options = {}) =>
  new Promise((resolveCommand, rejectCommand) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? rootDir,
      env: options.env ?? process.env,
      stdio: 'inherit',
      shell: isWindows
    });

    child.on('error', rejectCommand);
    child.on('exit', (code) => {
      if (code === 0) {
        resolveCommand();
        return;
      }

      rejectCommand(new Error(`Command failed with exit code ${code ?? 'unknown'}.`));
    });
  });

const ensureEnvFile = () => {
  if (existsSync(envFilePath)) {
    return;
  }

  execFileSync(process.execPath, ['./scripts/setup-env.mjs'], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: isWindows
  });
};

const parseEnvFile = () => {
  const raw = readFileSync(envFilePath, 'utf8');

  return raw.split(/\r?\n/).reduce((envMap, line) => {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      return envMap;
    }

    const separatorIndex = trimmedLine.indexOf('=');

    if (separatorIndex <= 0) {
      return envMap;
    }

    envMap[trimmedLine.slice(0, separatorIndex).trim()] = trimmedLine.slice(separatorIndex + 1).trim();
    return envMap;
  }, {});
};

const waitForPort = async (host, port, timeoutMs = 120000) => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const isReady = await new Promise((resolveReady) => {
      const socket = net.createConnection({ host, port });

      socket.once('connect', () => {
        socket.end();
        resolveReady(true);
      });
      socket.once('error', () => {
        socket.destroy();
        resolveReady(false);
      });
    });

    if (isReady) {
      return;
    }

    await delay(1000);
  }

  throw new Error(`Timed out waiting for PostgreSQL at ${host}:${port}.`);
};

ensureEnvFile();

const envFile = parseEnvFile();
const postgresUser = envFile.POSTGRES_USER ?? 'controle_financeiro';
const postgresPassword = envFile.POSTGRES_PASSWORD ?? 'controle_financeiro_dev';
const railsEnv = {
  ...process.env,
  RAILS_ENV: 'test',
  PGHOST: '127.0.0.1',
  PGPORT: '5432',
  PGUSER: postgresUser,
  PGPASSWORD: postgresPassword,
  DATABASE_URL: `postgresql://${encodeURIComponent(postgresUser)}:${encodeURIComponent(postgresPassword)}@127.0.0.1:5432/file_server_test`
};

await run('docker', [...composeArgs, 'up', '-d', 'postgres']);
await waitForPort('127.0.0.1', 5432);
await run('bundle', ['exec', 'rails', 'db:prepare'], { cwd: fileServerDir, env: railsEnv });
await run('bundle', ['exec', 'rails', 'test'], { cwd: fileServerDir, env: railsEnv });