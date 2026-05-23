import fs from 'node:fs';
import esbuild from 'esbuild';

const pkg = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

// We want to bundle our @aprovamind/* workspace modules, but keep external libraries external
const externalDependencies = Object.keys(pkg.dependencies || {}).filter(
  dep => !dep.startsWith('@aprovamind/')
);

const entryPoints = [
  'api-src/backend.ts',
  'api-src/health.ts',
  'api-src/root.ts',
  'api-src/ai/pdf.ts',
  'api-src/ai/text.ts'
];

try {
  console.log('[API Build] Bundling Vercel serverless functions...');
  await esbuild.build({
    entryPoints,
    outdir: 'api',
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    sourcemap: false,
    minify: false,
    external: [
      ...externalDependencies,
      'node:*',
      'node:http',
      'node:crypto',
      'node:path',
      'node:fs',
      'node:os',
      'node:stream',
      'node:util',
      'node:url',
      'canvas',
      'jsdom'
    ],
    outExtension: { '.js': '.js' }
  });
  console.log('[API Build] Bundled successfully!');
} catch (error) {
  console.error('[API Build] Build failed:', error);
  process.exit(1);
}
