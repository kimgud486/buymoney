import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

/**
 * Preserve a real fractional quote on the legacy main dashboard.
 *
 * The dashboard currently rounds non-US prices with Math.round() inside its
 * local formatPrice helper. Because the dashboard is a very large legacy
 * single-file component, this pre-transform keeps the change isolated and
 * prevents a partial-file rewrite from damaging unrelated trading UI code.
 *
 * Integer prices stay integer-looking (12,345), while a fractional quote is
 * rendered to one decimal place (12,345.6). The underlying realtime quote is
 * never changed, only its main-screen presentation.
 */
function preserveMainDashboardPriceDecimal() {
  const target = '/src/components/trading/MasterAiAutoTradingDashboard.tsx';
  const roundedPriceExpression = 'Math.round(p).toLocaleString()';
  const decimalAwarePriceExpression =
    '(p ?? 0).toLocaleString(undefined, { minimumFractionDigits: Number.isInteger(p ?? 0) ? 0 : 1, maximumFractionDigits: 1 })';

  return {
    name: 'preserve-main-dashboard-price-decimal',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      const normalizedId = id.replace(/\\/g, '/').split('?')[0];
      if (!normalizedId.endsWith(target)) return null;

      const occurrences = code.split(roundedPriceExpression).length - 1;
      if (occurrences !== 2) {
        this.warn(
          `[main-price-decimal] Expected 2 legacy rounded price expressions, found ${occurrences}. ` +
          'Dashboard source changed; review the formatter before relying on this compatibility transform.'
        );
        return null;
      }

      return {
        code: code.replaceAll(roundedPriceExpression, decimalAwarePriceExpression),
        map: null,
      };
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [preserveMainDashboardPriceDecimal(), react(), tailwindcss()],
    // Browser bundles must never depend on Node's global `process` object.
    // Libraries that only read process.env receive an inert build-time object.
    define: {
      'process.env': JSON.stringify({}),
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('firebase')) {
                return 'firebase-vendor';
              }
              if (id.includes('recharts') || id.includes('d3')) {
                return 'charts-vendor';
              }
              if (id.includes('lucide-react')) {
                return 'icons-vendor';
              }
              if (id.includes('motion') || id.includes('framer-motion')) {
                return 'motion-vendor';
              }
            }
          }
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify-file watching is disabled to prevent flickering during agent edits.
      hmr: false,
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
