#!/usr/bin/env node

import { routes } from "../source/server.ts";

function patternify(pattern: URLPattern) {
  return pattern.pathname;
}

const lines = routes.toSorted((a, b) =>
  patternify(a.pattern).localeCompare(patternify(b.pattern)),
);

const methods = Math.max(...lines.map((l) => l.method.length));

for (const route of lines) {
  console.log(route.method.padEnd(methods), patternify(route.pattern));
}
