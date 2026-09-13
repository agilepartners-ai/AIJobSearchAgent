import { TexapiCompiler } from './texapi';
import type { LatexCompiler } from './types';

export { LatexCompileError } from './types';
export type { LatexCompiler, CompileResult } from './types';

let instance: LatexCompiler | null = null;

/**
 * Returns the configured compiler.
 *
 * Texapi is the only backend today. To add a self-hosted one, implement
 * LatexCompiler and branch here on an env var — see
 * docs/self-hosted-latex-compiler.md.
 */
export function getCompiler(): LatexCompiler {
  if (!instance) {
    instance = new TexapiCompiler(process.env.TEXAPI_KEY ?? '');
  }
  return instance;
}

/** Test seam. */
export function __setCompiler(compiler: LatexCompiler | null): void {
  instance = compiler;
}
