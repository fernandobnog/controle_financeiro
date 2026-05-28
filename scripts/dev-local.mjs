import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const composeArgs = ['compose', '-f', 'infra/compose/compose.base.yaml', '-f', 'infra/compose/compose.hybrid.yaml'];
const envDir = resolve(rootDir, 'infra/compose/env');
const envFiles = [resolve(envDir, '.env.example'), resolve(envDir, '.env')];
const initialEnvKeys = new Set(Object.keys(process.env));

const loadEnvFile = (filePath, { allowOverride = false } = {}) => {
  if (!existsSync(filePath)) {
    return;
  }

  const fileContents = readFileSync(filePath, 'utf8');

  for (const rawLine of fileContents.split(/\r?\n/u)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');

    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (allowOverride) {
      if (!initialEnvKeys.has(key)) {
        process.env[key] = value;
      }

      continue;
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
};

loadEnvFile(envFiles[0]);
loadEnvFile(envFiles[1], { allowOverride: true });

const dockerHostAliases = new Map([
  ['postgres', '127.0.0.1'],
  ['file-server', '127.0.0.1']
]);

const resolveHostRuntimeUrl = (value) => {
  try {
    const resolvedUrl = new URL(value);
    const hostAlias = dockerHostAliases.get(resolvedUrl.hostname);

    if (hostAlias) {
      resolvedUrl.hostname = hostAlias;
    }

    return resolvedUrl.toString();
  } catch {
    return value;
  }
};

const databaseUrl =
  resolveHostRuntimeUrl(process.env.DATABASE_URL ?? '') ||
  'postgresql://controle_financeiro:controle_financeiro_dev@localhost:5432/controle_financeiro_dev';
const apiPort = process.env.PORT ?? '3001';
const fileServerPort = process.env.FILE_SERVER_PORT ?? '3002';
const apiBaseUrl = process.env.VITE_API_BASE_URL ?? `http://localhost:${apiPort}/api`;
const fileServerBaseUrl =
  process.env.VITE_FILE_SERVER_BASE_URL ?? `http://localhost:${fileServerPort}/api`;
const fileServerUrl =
  resolveHostRuntimeUrl(process.env.FILE_SERVER_URL ?? '') || `http://localhost:${fileServerPort}/api`;

const args = new Set(process.argv.slice(2));

const windowsExecutables = {
  corepack: 'corepack.cmd',
  docker: 'docker.exe',
  taskkill: 'taskkill.exe'
};

const childProcesses = [];
let shuttingDown = false;

const resolveCommand = (command) => {
  if (process.platform !== 'win32') {
    return command;
  }

  return windowsExecutables[command] ?? command;
};

const quoteWindowsShellArg = (value) => {
  if (!/[\s"]/u.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '\\"')}"`;
};

const createSpawnTarget = (command, commandArgs) => {
  const executable = resolveCommand(command);

  if (process.platform === 'win32' && /\.(cmd|bat)$/i.test(executable)) {
    return {
      command: process.env.ComSpec ?? 'cmd.exe',
      commandArgs: ['/d', '/s', '/c', [executable, ...commandArgs].map(quoteWindowsShellArg).join(' ')]
    };
  }

  return {
    command: executable,
    commandArgs
  };
};

const pipeOutput = (stream, write, prefix) => {
  let buffer = '';

  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      write(`${prefix}${line}\n`);
    }
  });

  stream.on('end', () => {
    if (buffer) {
      write(`${prefix}${buffer}\n`);
    }
  });
};

const runCommand = (command, commandArgs, options = {}) =>
  new Promise((resolveCommandResult, rejectCommandResult) => {
    const spawnTarget = createSpawnTarget(command, commandArgs);
    const child = spawn(spawnTarget.command, spawnTarget.commandArgs, {
      cwd: options.cwd ?? rootDir,
      env: {
        ...process.env,
        ...options.env
      },
      stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit'
    });

    let stdout = '';
    let stderr = '';

    if (options.capture) {
      child.stdout?.setEncoding('utf8');
      child.stderr?.setEncoding('utf8');
      child.stdout?.on('data', (chunk) => {
        stdout += chunk;
      });
      child.stderr?.on('data', (chunk) => {
        stderr += chunk;
      });
    }

    child.on('error', rejectCommandResult);
    child.on('exit', (code) => {
      if (code === 0) {
        resolveCommandResult({ stdout, stderr });
        return;
      }

      const error = new Error(`Command failed with exit code ${code ?? 'unknown'}.`);
      error.stdout = stdout;
      error.stderr = stderr;
      rejectCommandResult(error);
    });
  });

const startProcess = ({ name, command, commandArgs, cwd = rootDir, env = {}, inheritOutput = false }) => {
  const spawnTarget = createSpawnTarget(command, commandArgs);
  const child = spawn(spawnTarget.command, spawnTarget.commandArgs, {
    cwd,
    env: {
      ...process.env,
      ...env
    },
    stdio: inheritOutput ? 'inherit' : ['inherit', 'pipe', 'pipe']
  });

  if (!inheritOutput) {
    pipeOutput(child.stdout, (line) => process.stdout.write(line), `[${name}] `);
    pipeOutput(child.stderr, (line) => process.stderr.write(line), `[${name}] `);
  }

  const entry = {
    name,
    child,
    exitPromise: new Promise((resolveExit) => {
      child.on('error', (error) => {
        process.stderr.write(`[${name}] ${error.message}\n`);
        resolveExit(1);
      });

      child.on('exit', (code) => {
        resolveExit(code ?? 1);
      });
    })
  };

  childProcesses.push(entry);
  return entry;
};

const stopProcess = async (child) => {
  if (child.exitCode !== null || child.killed) {
    return;
  }

  if (process.platform === 'win32') {
    await runCommand('taskkill', ['/pid', String(child.pid), '/t', '/f'], { capture: true }).catch(() => undefined);
    return;
  }

  child.kill('SIGTERM');
};

const shutdown = async (exitCode) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  await Promise.allSettled(childProcesses.map(({ child }) => stopProcess(child)));
  process.exit(exitCode);
};

const waitForPostgres = async () => {
  const deadline = Date.now() + 120_000;

  while (Date.now() < deadline) {
    try {
      await runCommand(
        'docker',
        [...composeArgs, 'exec', '-T', 'postgres', 'pg_isready', '-U', 'controle_financeiro', '-d', 'controle_financeiro_dev'],
        { capture: true }
      );
      return;
    } catch {
      await delay(2_000);
    }
  }

  throw new Error('Timed out waiting for Postgres to become healthy.');
};

const waitForHttp = async (url, label, timeoutMs = 180_000) => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return;
      }
    } catch {
      // Retry until the timeout expires.
    }

    await delay(2_000);
  }

  throw new Error(`Timed out waiting for ${label} at ${url}.`);
};

const runPnpmCommand = (commandArgs, options = {}) => runCommand('corepack', ['pnpm', ...commandArgs], options);

const startPnpmProcess = ({ name, commandArgs, cwd = rootDir, env = {} }) =>
  startProcess({
    name,
    command: 'corepack',
    commandArgs: ['pnpm', ...commandArgs],
    cwd,
    env
  });

const printHelp = () => {
  process.stdout.write(`Usage: npm run dev\n\n`);
  process.stdout.write(`Starts Postgres and file-server in Docker, and runs web and api on the host.\n`);
  process.stdout.write(`Use npm run dev:infra:down to stop the Docker database when you are done.\n`);
};

const main = async () => {
  if (args.has('--help')) {
    printHelp();
    return;
  }

  process.on('SIGINT', () => {
    void shutdown(0);
  });
  process.on('SIGTERM', () => {
    void shutdown(0);
  });

  process.stdout.write('Starting Postgres and file-server in Docker...\n');
  await runCommand('docker', [...composeArgs, 'up', '-d', 'postgres', 'file-server']);
  await waitForPostgres();

  process.stdout.write('Preparing API database...\n');
  await runPnpmCommand(['--filter', '@controle-financeiro/api', 'db:setup'], {
    env: {
      AUTO_SEED_DB: 'true',
      DATABASE_URL: databaseUrl,
      HOST: '0.0.0.0',
      MOCK_EXTERNAL_SERVICES: process.env.MOCK_EXTERNAL_SERVICES ?? 'true',
      NODE_ENV: 'development',
      PORT: apiPort
    }
  });

  process.stdout.write('Starting local services...\n');
  const processes = [
    startPnpmProcess({
      name: 'api',
      commandArgs: ['--filter', '@controle-financeiro/api', 'dev'],
      env: {
        AUTO_SEED_DB: 'true',
        DATABASE_URL: databaseUrl,
        FILE_SERVER_URL: fileServerUrl,
        HOST: '0.0.0.0',
        MOCK_EXTERNAL_SERVICES: process.env.MOCK_EXTERNAL_SERVICES ?? 'true',
        NODE_ENV: 'development',
        PORT: apiPort,
        OPENROUTER_BASE_URL: process.env.OPENROUTER_BASE_URL ?? '',
        OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ?? '',
        OPENROUTER_MODEL_DEFAULT: process.env.OPENROUTER_MODEL_DEFAULT ?? 'openai/gpt-4.1-mini',
        OPENROUTER_HTTP_REFERER: process.env.OPENROUTER_HTTP_REFERER ?? '',
        OPENROUTER_APP_TITLE: process.env.OPENROUTER_APP_TITLE ?? 'controle-financeiro',
        LLAMAPARSE_BASE_URL: process.env.LLAMAPARSE_BASE_URL ?? '',
        LLAMAPARSE_API_KEY: process.env.LLAMAPARSE_API_KEY ?? '',
        LLAMAPARSE_RESULT_TYPE: process.env.LLAMAPARSE_RESULT_TYPE ?? 'markdown',
        LLAMAPARSE_TIMEOUT_MS: process.env.LLAMAPARSE_TIMEOUT_MS ?? '120000',
        LLAMAPARSE_POLL_INTERVAL_MS: process.env.LLAMAPARSE_POLL_INTERVAL_MS ?? '2000',
        COGNEE_BASE_URL: process.env.COGNEE_BASE_URL ?? '',
        COGNEE_API_KEY: process.env.COGNEE_API_KEY ?? '',
        COGNEE_PROJECT_ID: process.env.COGNEE_PROJECT_ID ?? '',
        COGNEE_TIMEOUT_MS: process.env.COGNEE_TIMEOUT_MS ?? '30000'
      }
    }),
    startPnpmProcess({
      name: 'web',
      commandArgs: ['--filter', '@controle-financeiro/web', 'dev'],
      env: {
        VITE_API_BASE_URL: apiBaseUrl,
        VITE_FILE_SERVER_BASE_URL: fileServerBaseUrl
      }
    })
  ];

  process.stdout.write('Waiting for local services to become healthy...\n');
  await Promise.all([
    waitForHttp(`http://127.0.0.1:${apiPort}/api/health`, 'API'),
    waitForHttp(`http://127.0.0.1:${fileServerPort}/api/health`, 'file server'),
    waitForHttp('http://127.0.0.1:3000', 'web')
  ]);

  process.stdout.write('Local development environment is ready.\n');
  process.stdout.write(`Web: http://localhost:3000\n`);
  process.stdout.write(`API: http://localhost:${apiPort}/api/health\n`);
  process.stdout.write(`File server: http://localhost:${fileServerPort}/api/health\n`);

  const { code, name } = await Promise.race(
    processes.map(({ exitPromise, name: processName }) =>
      exitPromise.then((processCode) => ({
        code: processCode,
        name: processName
      }))
    )
  );

  if (!shuttingDown) {
    process.stderr.write(`${name} exited with code ${code}. Shutting down remaining processes.\n`);
    await shutdown(code);
  }
};

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});