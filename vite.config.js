import { defineConfig } from 'vite';

export default defineConfig({
  base: '/project-arcana/',
  server: { watch: { ignored: ['**/test-output/**'] } },
});
