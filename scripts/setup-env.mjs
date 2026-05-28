import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envDir = resolve(rootDir, 'infra/compose/env');
const exampleFile = resolve(envDir, '.env.example');
const targetFile = resolve(envDir, '.env');
const args = new Set(process.argv.slice(2));
const force = args.has('--force');

if (!existsSync(exampleFile)) {
  throw new Error(`Template de ambiente nao encontrado em ${exampleFile}.`);
}

mkdirSync(envDir, { recursive: true });

if (existsSync(targetFile) && !force) {
  process.stdout.write(`Arquivo de ambiente ja existe em ${targetFile}. Nenhuma alteracao aplicada.\n`);
  process.stdout.write('Use --force para recriar a partir do template unico.\n');
  process.exit(0);
}

copyFileSync(exampleFile, targetFile);
process.stdout.write(
  `${force ? 'Arquivo de ambiente recriado' : 'Arquivo de ambiente criado'} em ${targetFile}.\n`
);