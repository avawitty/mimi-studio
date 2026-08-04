import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        hmr: false,
        headers: {
          'Connection': 'keep-alive',
          'Keep-Alive': 'timeout=600, max=1000',
        },
      },
      preview: {
        port: 3000,
        host: '0.0.0.0',
        headers: {
          'Connection': 'keep-alive',
          'Keep-Alive': 'timeout=600, max=1000',
        },
      },
      plugins: [react()],
      define: {
        'process.env.FIREBASE_API_KEY': JSON.stringify(env.FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || ''),
        'process.env.FIREBASE_AUTH_DOMAIN': JSON.stringify(env.FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || ''),
        'process.env.FIREBASE_PROJECT_ID': JSON.stringify(env.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || ''),
        'process.env.FIREBASE_STORAGE_BUCKET': JSON.stringify(env.FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || ''),
        'process.env.FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID || ''),
        'process.env.FIREBASE_APP_ID': JSON.stringify(env.FIREBASE_APP_ID || process.env.FIREBASE_APP_ID || ''),
        'process.env.FIREBASE_MEASUREMENT_ID': JSON.stringify(env.FIREBASE_MEASUREMENT_ID || process.env.FIREBASE_MEASUREMENT_ID || ''),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          // astronomy-engine package exports point import→ESM, but some
          // resolvers still hit the CJS build; pin the ESM entry for the client.
          'astronomy-engine': path.resolve(
            __dirname,
            'node_modules/astronomy-engine/esm/astronomy.js',
          ),
        }
      },
      build: {
        outDir: 'dist',
        sourcemap: false,
        minify: 'esbuild',
        target: 'esnext',
        reportCompressedSize: false,
        rollupOptions: {
          output: {
            manualChunks: {
              // three has no dependency on react, so isolating it here is safe.
              // @react-three/fiber and @react-three/drei are intentionally left
              // out of manualChunks: both depend on react/react-dom, and forcing
              // them into a named chunk drags react itself into that chunk too
              // (Rollup then has to statically import react from it for the
              // entry, which defeats the dynamic-import code-splitting below and
              // makes the browser modulepreload the whole three/fiber/drei
              // stack on every page load). Rollup's automatic chunking already
              // isolates them correctly as a lazy-loaded-only chunk.
              'three-core': ['three'],
            },
          },
        },
      },
      test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/test-setup.ts'],
        include: ['__tests__/**/*.{test,spec}.{ts,tsx}'],
      },
    };
});
