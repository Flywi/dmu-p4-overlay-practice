import { copyFile, mkdir, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
for (const directory of ['locales', 'guide']) {
  const target = join(root, 'public', directory);
  await mkdir(target, { recursive: true });
  for (const name of await readdir(join(root, directory))) {
    if (!/\.(json|png)$/.test(name)) continue;
    await copyFile(join(root, directory, name), join(target, name));
  }
}
await copyFile(join(root, 'app-icon.svg'), join(root, 'public', 'app-icon.svg'));
