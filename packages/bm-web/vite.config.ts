import { defineConfig, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

// Plugin to write build files during dev mode and serve them
function writeDevOutputPlugin() {
  let isBuilding = false;
  let buildTimeout: NodeJS.Timeout | null = null;

  return {
    name: 'write-dev-output',
    configureServer(server: ViteDevServer) {
      const distPath = join(server.config.root, 'dist');

      // Serve index.js and index.css from dist folder
      server.middlewares.use((req, res, next) => {
        if (!req.url) {
          next();
          return;
        }

        // Parse URL and extract pathname, ignoring search params
        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const pathname = url.pathname;

        if (pathname === '/index.js' || pathname === '/index.css') {
          // Set CORS headers
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

          // Handle preflight OPTIONS request
          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }

          const filePath = join(distPath, pathname);
          if (existsSync(filePath)) {
            const content = readFileSync(filePath, 'utf-8');
            const contentType = pathname === '/index.js' ? 'application/javascript' : 'text/css';
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'no-cache');
            res.end(content);
            return;
          }
        }
        next();
      });

      const build = async () => {
        if (isBuilding) return;
        isBuilding = true;

        try {
          const { build: viteBuild } = await import('vite');
          await viteBuild({
            configFile: server.config.configFile,
            root: server.config.root,
            base: server.config.base,
            mode: server.config.mode,
            build: {
              ...server.config.build,
              watch: null,
              write: true,
              emptyOutDir: false,
            },
            logLevel: 'silent',
          });
        } catch {
          // Silently handle build errors in dev mode
        } finally {
          isBuilding = false;
        }
      };

      // Debounce builds to avoid excessive file writes
      const scheduleBuild = () => {
        if (buildTimeout) {
          clearTimeout(buildTimeout);
        }
        buildTimeout = setTimeout(() => {
          build();
        }, 500);
      };

      // Build once when server is ready
      server.httpServer?.once('listening', () => {
        build();
      });

      // Rebuild on file changes
      server.watcher.on('change', scheduleBuild);
      server.watcher.on('add', scheduleBuild);
      server.watcher.on('unlink', scheduleBuild);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'index.js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
  plugins: [
    react({
      jsxImportSource: '@emotion/react',
    }),
    writeDevOutputPlugin(),
  ],
});
