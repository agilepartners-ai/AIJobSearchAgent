#!/usr/bin/env node
const path = require('path');
const fs = require('fs');

const pkgPath = path.resolve(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const deps = Object.keys(pkg.dependencies || {});
const devDeps = Object.keys(pkg.devDependencies || {});
const modules = Array.from(new Set([...deps, ...devDeps]));

modules.forEach(m => console.log(m));