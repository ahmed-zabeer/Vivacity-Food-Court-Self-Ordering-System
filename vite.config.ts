import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

function getSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return getSourceFiles(path);
    return ['.ts', '.tsx', '.js', '.jsx', '.css', '.html'].includes(extname(entry.name))
      ? [path]
      : [];
  });
}

function copyRuntimePublicAssets() {
  let projectRoot: string;
  let outputDirectory: string;

  return {
    name: 'copy-runtime-public-assets',
    apply: 'build' as const,
    configResolved(config: { root: string; build: { outDir: string } }) {
      projectRoot = config.root;
      outputDirectory = config.build.outDir;
    },
    closeBundle() {
      const publicDirectory = resolve(projectRoot, 'public');
      const outputPath = resolve(projectRoot, outputDirectory);
      const sourceFiles = [
        ...getSourceFiles(resolve(projectRoot, 'src')),
        resolve(projectRoot, 'server/menuData.js'),
        resolve(projectRoot, 'index.html'),
      ];
      const references = new Set(['sw.js']);
      const assetPattern = /\/assets\/[^"'`\s),}\]]+\.(?:png|jpe?g|svg|webp|gif|ico|woff2?|ttf|json|webmanifest)/gi;

      for (const sourceFile of sourceFiles) {
        const source = readFileSync(sourceFile, 'utf8');
        for (const match of source.matchAll(assetPattern)) {
          references.add(decodeURIComponent(match[0].split(/[?#]/, 1)[0].slice(1)));
        }
      }

      for (const reference of references) {
        const sourcePath = resolve(publicDirectory, reference);
        const relativePath = relative(publicDirectory, sourcePath);
        if (relativePath.startsWith(`..${sep}`) || relativePath === '..') {
          throw new Error(`Public asset path escapes the public directory: ${reference}`);
        }
        if (!existsSync(sourcePath)) {
          throw new Error(`Referenced public asset does not exist: ${reference}`);
        }

        const destinationPath = resolve(outputPath, relative(publicDirectory, sourcePath));
        mkdirSync(dirname(destinationPath), { recursive: true });
        copyFileSync(sourcePath, destinationPath);
      }
    },
  };
}

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    ...(command === 'build' ? [copyRuntimePublicAssets()] : []),
  ],
  publicDir: command === 'build' ? false : 'public',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    // html5-qrcode bundles a broken zxing UMD file that Rollup/esbuild cannot parse.
    // Excluding it from pre-bundling allows the app to load it at runtime instead.
    exclude: ['html5-qrcode'],
  },
  build: {
    emptyOutDir: true,
    // Warn at 1000kB; chunks are cleanly split and well under 350kB
    chunkSizeWarningLimit: 1000,
    commonjsOptions: {
      // Prevent Rollup from attempting to transform the broken zxing UMD file.
      ignore: (id) => id.includes('html5-qrcode'),
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Split react ecosystem into its own chunk
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor';
          }
          // Split wouter router into its own chunk
          if (id.includes('node_modules/wouter')) {
            return 'router';
          }
          // Split lucide icons (large) into its own chunk
          if (id.includes('node_modules/lucide-react')) {
            return 'icons';
          }
          // Split accounting components into their own chunk
          if (id.includes('src/components/accounting') || id.includes('src/pages/admin/AccountingPage')) {
            return 'accounting';
          }
          // Split inventory manager into its own chunk
          if (id.includes('src/pages/admin/InventoryManager')) {
            return 'inventory';
          }
          // Split reporting/analytics into its own chunk
          if (id.includes('src/pages/admin/ReportsAnalytics') || id.includes('src/components/accounting/SalesReport') || id.includes('src/components/accounting/ExpenseReport') || id.includes('src/components/accounting/PurchaseReport') || id.includes('src/components/accounting/InventoryReport') || id.includes('src/components/accounting/VoidReport')) {
            return 'reports';
          }
        }
      }
    }
  },
}));
