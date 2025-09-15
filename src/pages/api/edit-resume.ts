import type { NextApiRequest, NextApiResponse } from 'next';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFModificationService, ChangeOperation } from '../../services/pdfModificationService';
import { robustJsonParse } from '../../utils/jsonUtils';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';
}

const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || process.env.NEXT_PUBLIC_GEMINI_MODEL || 'models/chat-bison-001';

export const runtime = 'nodejs';

type EditRequestBody = {
  base64Pdf: string;           // PDF uploaded by client (base64 data URL or raw base64)
  instructions?: string;       // Optional user instruction describing desired changes
  model?: string;              // Optional model override
};

/**
 * /api/edit-resume
 *
 * Accepts a base64-encoded PDF and optional instructions. Steps:
 * 1) Parse PDF into structured JSON (pages + textBlocks) using pdfjs.
 * 2) Send the full structured JSON + instructions to the LLM asking for a JSON array
 *    of change operations (replace/insert/delete) with coordinates that match the
 *    textBlocks coordinate system.
 * 3) Validate the returned ops and apply them incrementally using PDFModificationService.
 * 4) Return the applied ops and an array of base64 PDF snapshots (one per op) so the
 *    frontend can render incremental updates.
 *
 * Uses Google Gemini (Generative API) instead of OpenAI.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  if (!GEMINI_KEY) {
    console.log('[edit-resume] GEMINI key missing');
    return res.status(500).json({ error: 'LLM client not configured (GEMINI_API_KEY missing)' });
  }

  try {
    const { base64Pdf, instructions, model } = req.body as EditRequestBody;

    if (!base64Pdf) return res.status(400).json({ error: 'Missing base64Pdf in request body' });

    // Helper: convert base64 (possibly data URL) to ArrayBuffer
    const toArrayBuffer = (b64: string): ArrayBuffer => {
      const base64Data = b64.replace(/^data:application\/pdf;base64,/, '');
      return Uint8Array.from(Buffer.from(base64Data, 'base64')).buffer;
    };

    const arrayBuffer = toArrayBuffer(base64Pdf);

    // Parse PDF with pdfjs to structured JSON
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf: any = await loadingTask.promise;

    const pages: any[] = [];
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page: any = await pdf.getPage(pageNum);
      const viewport: any = page.getViewport({ scale: 1.0 });

      const textContent: any = await page.getTextContent();
      const items = (textContent?.items || []).map((item: any, idx: number) => {
        const transform = item.transform || [1, 0, 0, 1, 0, 0];
        const fontSize = Math.sqrt((transform[0] || 1) ** 2 + (transform[1] || 0) ** 2);
        const x = transform[4] || 0;
        const y = (viewport.height || 0) - (transform[5] || 0) - fontSize;
        const width = String(item.str).length * (fontSize || 10) * 0.6;
        const height = (fontSize || 10) * 1.2;

        return {
          id: `text_${pageNum}_${idx}`,
          text: String(item.str),
          x,
          y,
          width,
          height,
          fontSize,
          pageNumber: pageNum,
          transform: item.transform,
          fontName: item?.fontName || null
        };
      });

      pages.push({
        pageNumber: pageNum,
        width: viewport.width,
        height: viewport.height,
        textBlocks: items,
        imageBlocks: []
      });
    }

    const structure = {
      totalPages: pdf.numPages,
      pages
    };

    // Build precise LLM prompt asking for JSON-only change ops
    const systemPrompt = `You are a PDF-editing assistant. You will receive a JSON object named "document" that describes every page and textBlock (id,x,y,width,height,text,fontSize,pageNumber).
Return a JSON array (no surrounding text) of change operations the client should apply. Each operation must match this schema:
{
  "id": "<optional op id>",
  "type": "replace" | "insert" | "delete",
  "pageNumber": <1-based page number>,
  "x": <number, top-left X coordinate>,
  "y": <number, top-left Y coordinate>,
  "width": <optional width>,
  "height": <optional height>,
  "oldText": <optional original text to match or verify>,
  "newText": <text to insert or replace with>,
  "fontSize": <optional>,
  "fontName": <optional: 'Helvetica' | 'TimesRoman' | 'Courier'>,
  "color": { "r":0-1, "g":0-1, "b":0-1 } // optional
}

Rules:
- Use coordinates that match the provided textBlocks.
- Only include operations that are absolutely necessary to satisfy the user's instructions.
- Do not return a complete regenerated document. Return a minimal set of replace/insert/delete ops.
- The response MUST be valid JSON only (a top-level array).`;

    const userPrompt = `Document JSON:\n${JSON.stringify(structure)}\n\nUser instructions: ${instructions || 'Apply resume improvements where appropriate.'}\n\nReturn the JSON array of change operations now.`;

    // Call Gemini (Generative API)
    const modelId = model || DEFAULT_GEMINI_MODEL;
    const endpoint = `https://generative.googleapis.com/v1/models/${encodeURIComponent(modelId)}:generateMessage`;

    console.log('[edit-resume] Calling Gemini model:', modelId);

    const payload = {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.0,
      maxOutputTokens: 2000
    };

    const apiResp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GEMINI_KEY}`
      },
      body: JSON.stringify(payload)
    });

    if (!apiResp.ok) {
      const txt = await apiResp.text().catch(() => '');
      console.error('[edit-resume] Gemini API error:', apiResp.status, txt);
      return res.status(502).json({ error: 'LLM API error', details: txt });
    }

    const apiJson = await apiResp.json();
    const assistantText =
      apiJson?.candidates?.[0]?.content?.[0]?.text ||
      apiJson?.output?.[0]?.content?.[0]?.text ||
      apiJson?.message?.content?.[0]?.text ||
      apiJson?.reply?.content?.[0]?.text ||
      apiJson?.candidates?.[0]?.message?.content?.[0]?.text;

    if (!assistantText) {
      console.log('[edit-resume] LLM returned empty response.', { raw: apiJson });
      return res.status(502).json({ error: 'LLM returned empty response', raw: apiJson });
    }

    // Parse JSON from LLM (be defensive)
    let ops: ChangeOperation[] = [];
    try {
      // Some models wrap code blocks - strip Markdown fences
      const cleaned = String(assistantText).replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
      const parsed = robustJsonParse(cleaned);
      if (!Array.isArray(parsed)) throw new Error('Parsed value is not an array');
      ops = parsed as ChangeOperation[];
    } catch (err) {
      console.error('[edit-resume] Failed to parse LLM JSON:', err, 'raw:', assistantText);
      return res.status(500).json({ error: 'Failed to parse LLM JSON response', raw: assistantText });
    }

    // Validate and apply operations incrementally
    try {
      PDFModificationService.validateOperations(ops);
    } catch (err: any) {
      return res.status(400).json({ error: `Invalid operations: ${err.message}` });
    }

    // Convert original buffer to Node Buffer for pdf-lib
    const originalBuffer = Buffer.from(arrayBuffer);

    // Apply ops incrementally and collect snapshots as base64
    const snapshots: string[] = [];
    try {
      const intermediateBuffers = await PDFModificationService.applyOperationsIncrementally(originalBuffer, ops);
      for (const buf of intermediateBuffers) {
        snapshots.push('data:application/pdf;base64,' + Buffer.from(buf).toString('base64'));
      }
    } catch (err) {
      console.error('[edit-resume] Error applying operations:', err);
      return res.status(500).json({ error: 'Failed to apply operations', detail: String(err) });
    }

    return res.status(200).json({
      message: 'Edit operations applied',
      operations: ops,
      snapshots // array of base64 PDFs after each op
    });
  } catch (error: any) {
    console.error('[edit-resume] Unexpected error:', error);
    return res.status(500).json({ error: error?.message || String(error) });
  }
}