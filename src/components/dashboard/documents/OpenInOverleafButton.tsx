import React, { useRef } from 'react';
import { ExternalLink } from 'lucide-react';
import { zipSync, strToU8 } from 'fflate';

/**
 * "Open in Overleaf" — https://www.overleaf.com/devs
 *
 * Overleaf's /docs endpoint is an *import* endpoint, not a compile API: it
 * creates a project in the user's Overleaf account from the snippet we post
 * and opens it in a new tab, where Overleaf compiles it. Nothing comes back to
 * us, which is why the app compiles its own PDFs separately.
 *
 * We POST rather than link because a GET URL would have to carry the whole
 * document in the query string — fine for a 5 KB resume, not for a longer one,
 * and browsers/proxies cap URL length well below what a two-page CV needs.
 */

const OVERLEAF_ENDPOINT = 'https://www.overleaf.com/docs';

interface SingleDocumentProps {
  tex: string;
  filename: string;
  label?: string;
  className?: string;
}

/** Opens one .tex file as a new Overleaf project. */
export const OpenInOverleafButton: React.FC<SingleDocumentProps> = ({
  tex,
  filename,
  label = 'Open in Overleaf',
  className,
}) => {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => formRef.current?.submit()}
        disabled={!tex}
        className={
          className ??
          'inline-flex items-center justify-center gap-2 rounded-lg bg-[#138A07] px-4 py-2.5 font-medium text-white transition-colors hover:bg-[#0f6d05] disabled:cursor-not-allowed disabled:bg-gray-400'
        }
      >
        <ExternalLink size={18} />
        {label}
      </button>

      <form
        ref={formRef}
        action={OVERLEAF_ENDPOINT}
        method="post"
        target="_blank"
        rel="noopener"
        className="hidden"
      >
        {/* encoded_snip avoids newline mangling that bites the raw `snip` field. */}
        <input type="hidden" name="encoded_snip" value={encodeURIComponent(tex)} readOnly />
        <input type="hidden" name="snip_name" value={filename} readOnly />
        <input type="hidden" name="main_document" value={filename} readOnly />
        <input type="hidden" name="engine" value="pdflatex" readOnly />
      </form>
    </>
  );
};

interface ProjectProps {
  files: { name: string; content: string }[];
  mainDocument: string;
  label?: string;
  className?: string;
}

/**
 * Opens several .tex files as one Overleaf project.
 *
 * Overleaf accepts a zip archive through `snip_uri` as a base64 data URL, so
 * the resume and cover letter land in a single project instead of two.
 */
export const OpenProjectInOverleafButton: React.FC<ProjectProps> = ({
  files,
  mainDocument,
  label = 'Open both in Overleaf',
  className,
}) => {
  const formRef = useRef<HTMLFormElement>(null);
  const uriRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    const archive = zipSync(
      Object.fromEntries(files.map((f) => [f.name, strToU8(f.content)])),
      { level: 6 },
    );

    // btoa needs a binary string; build it in chunks so a large archive does
    // not blow the argument limit on String.fromCharCode.
    let binary = '';
    for (let i = 0; i < archive.length; i += 0x8000) {
      binary += String.fromCharCode.apply(
        null,
        Array.from(archive.subarray(i, i + 0x8000)),
      );
    }

    if (uriRef.current) {
      uriRef.current.value = `data:application/zip;base64,${btoa(binary)}`;
      formRef.current?.submit();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={files.length === 0}
        className={
          className ??
          'inline-flex items-center justify-center gap-2 rounded-lg border border-[#138A07] px-4 py-2.5 font-medium text-[#138A07] transition-colors hover:bg-[#138A07]/10 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400'
        }
      >
        <ExternalLink size={18} />
        {label}
      </button>

      <form
        ref={formRef}
        action={OVERLEAF_ENDPOINT}
        method="post"
        target="_blank"
        rel="noopener"
        className="hidden"
      >
        <input ref={uriRef} type="hidden" name="snip_uri" readOnly />
        <input type="hidden" name="main_document" value={mainDocument} readOnly />
        <input type="hidden" name="engine" value="pdflatex" readOnly />
      </form>
    </>
  );
};

export default OpenInOverleafButton;
