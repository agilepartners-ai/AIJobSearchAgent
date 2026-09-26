/**
 * The seam for swapping LaTeX compilers.
 *
 * Only one implementation exists today (Texapi). If you ever need to self-host
 * — see docs/self-hosted-latex-compiler.md — adding a second implementation of
 * this interface plus a branch in ./index.ts is the entire application-side change.
 */

export interface CompileResult {
  pdf: Buffer;
  /**
   * Raw compiler log, when the backend provides one.
   *
   * Texapi never does (its `outputFiles` field is always null despite what the
   * docs claim), so this is always undefined today. A self-hosted CLSI would
   * populate it, which is what would unlock feeding compiler errors back to the
   * model for genuine self-repair.
   */
  log?: string;
}

export class LatexCompileError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly log?: string,
  ) {
    super(message);
    this.name = 'LatexCompileError';
  }
}

export interface LatexCompiler {
  readonly name: string;
  compile(tex: string): Promise<CompileResult>;
}
