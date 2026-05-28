import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const composeArgs = ['compose', '-f', 'infra/compose/compose.base.yaml', '-f', 'infra/compose/compose.dev.yaml'];

const runCommand = (command, args, options = {}) =>
  new Promise((resolveCommand, rejectCommand) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit'
    });

    let stdout = '';
    let stderr = '';

    if (options.capture) {
      child.stdout?.on('data', (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr?.on('data', (chunk) => {
        stderr += chunk.toString();
      });
    }

    child.on('error', rejectCommand);
    child.on('exit', (code) => {
      if (code === 0) {
        resolveCommand({ stdout, stderr });
        return;
      }

      const error = new Error(`Command failed with exit code ${code ?? 'unknown'}.`);
      error.stdout = stdout;
      error.stderr = stderr;
      rejectCommand(error);
    });
  });

const waitForHttp = async (url, label, timeoutMs = 600000) => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await globalThis.fetch(url);

      if (response.ok) {
        return;
      }
    } catch {
      // Retry until the timeout expires.
    }

    await delay(3000);
  }

  throw new Error(`Timed out waiting for ${label} at ${url}.`);
};

const requestJson = async (url, init = {}) => {
  const response = await globalThis.fetch(url, init);
  const payloadText = await response.text();

  let payload;

  try {
    payload = payloadText ? JSON.parse(payloadText) : null;
  } catch {
    payload = payloadText;
  }

  if (!response.ok) {
    const message = typeof payload === 'string' ? payload : payload?.message ?? response.statusText;

    throw new Error(`${url} returned ${response.status}: ${message}`);
  }

  return payload;
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

try {
  await runCommand('docker', [...composeArgs, 'up', '-d', '--build']);

  await waitForHttp('http://127.0.0.1:3001/api/health', 'API');
  await waitForHttp('http://127.0.0.1:3002/api/health', 'file server');
  await waitForHttp('http://127.0.0.1:3000', 'web');

  const diagnosis = await requestJson('http://127.0.0.1:3001/api/diagnosis/summary');
  assert(diagnosis.householdId === 'household-1', 'The seeded household is not available in the API.');

  const formData = new globalThis.FormData();
  formData.append('household_id', 'household-1');
  formData.append(
    'file',
    new globalThis.Blob(['%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF'], { type: 'application/pdf' }),
    'smoke-upload.pdf'
  );

  const storedFile = await requestJson('http://127.0.0.1:3002/api/documents', {
    method: 'POST',
    body: formData
  });
  assert(storedFile.id, 'The file server did not persist the uploaded file.');

  const document = await requestJson('http://127.0.0.1:3001/api/documents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      householdId: storedFile.householdId,
      fileServerDocumentId: storedFile.id,
      filename: storedFile.filename,
      mimeType: storedFile.mimeType,
      sizeInBytes: storedFile.sizeInBytes,
      signedDownloadUrl: storedFile.signedDownloadUrl
    })
  });
  assert(document.id, 'The API did not register the uploaded document.');

  const reviewDocument = await requestJson(`http://127.0.0.1:3001/api/documents/${document.id}/review`);
  assert(Array.isArray(reviewDocument.ocrEntries) && reviewDocument.ocrEntries.length > 0, 'The OCR review payload was not created.');

  const documents = await requestJson('http://127.0.0.1:3001/api/documents');
  assert(documents.some((item) => item.id === document.id), 'The uploaded document is missing from the documents list.');

  globalThis.console.log('Compose smoke test passed.');
} catch (error) {
  try {
    const logs = await runCommand('docker', [...composeArgs, 'logs', '--tail', '200'], { capture: true });

    if (logs.stdout) {
      globalThis.console.error(logs.stdout);
    }

    if (logs.stderr) {
      globalThis.console.error(logs.stderr);
    }
  } catch {
    // Ignore log collection failures and surface the original error.
  }

  throw error;
} finally {
  await runCommand('docker', [...composeArgs, 'down', '-v']).catch(() => undefined);
}