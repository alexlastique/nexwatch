import { defineConfig } from 'vite';

export default defineConfig({
  // Use './' so the build works whether hosted at a root domain
  // (username.github.io) or a sub-path (username.github.io/repo-name/).
  // The hash-based router (#home, #search, …) means no server-side
  // routing is needed — GitHub Pages static hosting works perfectly.
  base: './',
});
