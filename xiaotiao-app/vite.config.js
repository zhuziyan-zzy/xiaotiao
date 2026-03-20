import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      // Proxy all API calls to the backend server
      '/vocab': 'http://localhost:8000',
      '/topic': 'http://localhost:8000',
      '/article': 'http://localhost:8000',
      '/translation': 'http://localhost:8000',
      '/research': 'http://localhost:8000',
      '/notes': 'http://localhost:8000',
      '/auth': 'http://localhost:8000',
      '/admin': 'http://localhost:8000',
      '/topics': 'http://localhost:8000',
      '/papers': 'http://localhost:8000',
      '/users': 'http://localhost:8000',
    },
  },
});
