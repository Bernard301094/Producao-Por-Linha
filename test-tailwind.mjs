import { compile } from '@tailwindcss/node';
import fs from 'fs';

const css = `
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));
.test {
  @apply dark:bg-zinc-950;
}
`;

async function run() {
  const result = await compile(css, { base: process.cwd() });
  console.log(result.build(['test', 'dark:bg-zinc-950']));
}
run();
