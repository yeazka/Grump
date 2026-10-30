'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const { forbidden } = require('./audit-package.cjs');

const root = path.resolve(__dirname, '..');
cp.execFileSync(process.execPath,[path.join(__dirname,'audit-git.cjs'),'--history'],{cwd:root,stdio:'inherit'});
const files = cp.execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
  cwd: root, encoding: 'utf8'
}).split('\0').filter(Boolean);
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const target = path.join(root, 'dist', `github-source-${stamp}`);
fs.mkdirSync(target, { recursive: true });
let count = 0;
for (const name of files) {
  const source = path.join(root, name);
  if (!fs.existsSync(source) || !fs.statSync(source).isFile()) continue;
  if (forbidden.test(name.replace(/\\/g, '/'))) throw Error(`Forbidden source file: ${name}`);
  const output = path.join(target, name);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.copyFileSync(source, output);
  count++;
}
console.log(`Clean GitHub source: ${target} (${count} files, no Git history)`);
