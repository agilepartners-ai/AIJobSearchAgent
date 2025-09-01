// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

export interface PDFExtractionResult {
    text: string;
    pages: number;
    metadata?: any;
    error?: string;
    structuredSections?: any[]; // Add structured sections for better DOCX conversion
}

// Use the same worker setup pattern as AiJobSearch-old
const setupPDFWorker = () => {
    if (!isBrowser) {
        return false;
    }

    try {
        // Import pdfjs-dist dynamically to avoid SSR issues
        return import('pdfjs-dist').then((pdfjsLib) => {
            // Use a local worker to avoid CDN issues
            pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdfjs-dist/build/pdf.worker.min.mjs`;
            console.log('PDF.js worker configured successfully, version:', pdfjsLib.version);
            return pdfjsLib;
        });
    } catch (error) {
        console.error('Failed to setup PDF.js worker:', error);
        return null;
    }
};

export const extractTextFromPDF = async (file: File): Promise<PDFExtractionResult> => {
    // Early return if not in browser environment
    if (!isBrowser) {
        return {
            text: '',
            pages: 0,
            error: 'PDF extraction is only available in browser environment'
        };
    }

    try {
        console.log('Starting PDF text extraction...');
        console.log('File info:', { name: file.name, type: file.type, size: file.size });

        // Dynamically import and setup PDF.js
        const pdfjsLibPromise = setupPDFWorker();
        if (!pdfjsLibPromise) {
            throw new Error('Failed to setup PDF.js worker');
        }

        const pdfjsLib = await pdfjsLibPromise;
        console.log('PDF.js loaded, version:', pdfjsLib.version);

        // Convert file to ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        console.log('File converted to ArrayBuffer, size:', arrayBuffer.byteLength);

        // Verify it's actually a PDF
        const firstBytes = new Uint8Array(arrayBuffer.slice(0, 5));
        const pdfHeader = String.fromCharCode.apply(null, Array.from(firstBytes));
        if (!pdfHeader.startsWith('%PDF')) {
            console.warn('File does not appear to be a valid PDF, trying text extraction...');
            return await extractTextWithFileReader(file);
        }

        // Load the PDF document using the same simple options as AiJobSearch-old
        const loadingTask = pdfjsLib.getDocument({
            data: arrayBuffer,
            verbosity: 0
        });

        console.log('Loading PDF document...');
        const pdf = await loadingTask.promise;
        console.log('PDF loaded successfully:', {
            numPages: pdf.numPages,
            fingerprints: pdf.fingerprints
        });

        let fullText = '';
        const totalPages = pdf.numPages;

        // Extract text from each page using the same approach as AiJobSearch-old
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            try {
                console.log(`Processing page ${pageNum}/${totalPages}`);

                const page = await pdf.getPage(pageNum);
                console.log(`Page ${pageNum} loaded`);

                const textContent = await page.getTextContent();
                console.log(`Text content extracted from page ${pageNum}, items:`, textContent.items.length);

                // Extract text with simple concatenation like AiJobSearch-old
                const pageText = textContent.items
                    .map((item: any) => item.str || '')
                    .join(' ');

                if (pageText.trim()) {
                    fullText += pageText + '\n\n';
                    console.log(`Page ${pageNum} text length:`, pageText.length);
                } else {
                    console.warn(`No text found on page ${pageNum}`);
                }

            } catch (pageError) {
                console.error(`Error processing page ${pageNum}:`, pageError);
                continue;
            }
        }

        // Get metadata
        let metadata = null;
        try {
            const metadataResult = await pdf.getMetadata();
            metadata = metadataResult?.info || null;
            console.log('PDF metadata extracted:', metadata);
        } catch (metaError) {
            console.warn('Could not extract PDF metadata:', metaError);
        }

        // Clean up PDF resources
        if (pdf.destroy) {
            await pdf.destroy();
        }

        // Extract structured sections for better DOCX conversion
        const structuredSections = await extractStructuredSections(pdf);

        const finalText = fullText.trim();
        const result = {
            text: finalText,
            pages: totalPages,
            metadata,
            structuredSections
        };

        console.log('PDF text extraction completed:', {
            textLength: result.text.length,
            pages: result.pages,
            wordsExtracted: result.text ? result.text.split(/\s+/).filter(w => w.length > 0).length : 0,
            hasMetadata: !!result.metadata
        });

        // Check if we actually extracted meaningful text
        if (finalText.length < 10) {
            console.warn('Very little text extracted, this might be a scanned PDF');
            return {
                text: finalText,
                pages: totalPages,
                metadata,
                error: 'Very little text was extracted. This might be a scanned PDF or image-based PDF. Please try uploading a text-based PDF or use manual text input.'
            };
        }

        return result;

    } catch (error) {
        console.error('PDF text extraction failed:', error);

        // Enhanced error handling
        let errorMessage = 'Unknown error occurred during PDF processing';

        if (error instanceof Error) {
            const msg = error.message.toLowerCase();
            console.log('Error details:', {
                message: error.message,
                name: error.name,
                stack: error.stack?.substring(0, 200)
            });

            if (msg.includes('failed to fetch') || msg.includes('dynamically imported module')) {
                errorMessage = 'Failed to load PDF processing library. Please check your internet connection and try again.';
            } else if (msg.includes('dommatrix') || msg.includes('not defined')) {
                errorMessage = 'Browser environment required for PDF processing. Please try again in a browser.';
            } else if (msg.includes('invalid pdf') || msg.includes('corrupted') || msg.includes('malformed')) {
                errorMessage = 'The PDF file appears to be corrupted or invalid. Please try a different PDF file.';
            } else if (msg.includes('password') || msg.includes('encrypted')) {
                errorMessage = 'This PDF is password protected. Please use an unprotected PDF file.';
            } else if (msg.includes('worker') || msg.includes('script')) {
                errorMessage = 'PDF processing worker failed. Please use manual text input.';
            } else if (msg.includes('network') || msg.includes('load')) {
                errorMessage = 'Network error while loading PDF processing resources. Please check your internet connection.';
            } else if (msg.includes('timeout')) {
                errorMessage = 'PDF processing timed out. The file might be too complex. Please try a simpler PDF or use manual text input.';
            } else if (msg.includes('memory') || msg.includes('size')) {
                errorMessage = 'The PDF file is too large or complex to process. Please try a smaller file.';
            } else {
                errorMessage = `PDF processing error: ${error.message}`;
            }
        }

        // Try fallback method before giving up
        console.log('Trying fallback text extraction method...');
        try {
            const fallbackResult = await extractTextWithFileReader(file);
            if (fallbackResult.text && fallbackResult.text.length > 0) {
                console.log('Fallback extraction succeeded');
                return fallbackResult;
            }
        } catch (fallbackError) {
            console.error('Fallback extraction also failed:', fallbackError);
        }

        return {
            text: '',
            pages: 0,
            error: errorMessage
        };
    }
};

// Alternative extraction method using File Reader for text files
const extractTextWithFileReader = async (file: File): Promise<PDFExtractionResult> => {
    // This can work on both client and server side
    return new Promise((resolve) => {
        if (!isBrowser) {
            resolve({
                text: '',
                pages: 0,
                error: 'File reading is only available in browser environment'
            });
            return;
        }

        const fileReader = new FileReader();

        fileReader.onload = (event) => {
            const content = event.target?.result as string;

            if (content && content.includes('%PDF')) {
                // It's a binary PDF, can't extract with FileReader
                resolve({
                    text: '',
                    pages: 0,
                    error: 'This is a binary PDF file that requires proper PDF processing. Please use manual text input or try a different PDF.'
                });
            } else if (content && content.trim().length > 0) {
                // Successfully read as text (probably a .txt file or text-based file)
                resolve({
                    text: content.trim(),
                    pages: 1,
                    metadata: { source: 'text_file' }
                });
            } else {
                resolve({
                    text: '',
                    pages: 0,
                    error: 'Unable to extract text from this file. Please use manual text input.'
                });
            }
        };

        fileReader.onerror = () => {
            resolve({
                text: '',
                pages: 0,
                error: 'Failed to read the file. Please try manual text input.'
            });
        };

        // Read as text
        fileReader.readAsText(file, 'UTF-8');
    });
};

export const validatePDFFile = (file: File): { isValid: boolean; error?: string } => {
    // Accept PDF and text files
    const allowedTypes = ['application/pdf', 'text/plain'];
    const allowedExtensions = ['.pdf', '.txt'];

    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
        return {
            isValid: false,
            error: 'Please select a PDF (.pdf) or text (.txt) file'
        };
    }

    // Check file size (15MB limit for PDFs, they can be larger)
    const maxSize = 15 * 1024 * 1024; // 15MB
    if (file.size > maxSize) {
        return {
            isValid: false,
            error: 'File size must be less than 15MB'
        };
    }

    // Check if file is empty
    if (file.size === 0) {
        return {
            isValid: false,
            error: 'File appears to be empty'
        };
    }

    // Check minimum size for PDFs
    if (file.type === 'application/pdf' && file.size < 100) {
        return {
            isValid: false,
            error: 'PDF file is too small to be valid'
        };
    }

    return { isValid: true };
};

export const extractTextFallback = async (file: File): Promise<PDFExtractionResult> => {
    return await extractTextWithFileReader(file);
};

/**
 * Extract structured sections from PDF for better DOCX conversion
 * @param pdf PDF document
 * @returns Array of structured sections
 */
const extractStructuredSections = async (pdf: any): Promise<any[]> => {
    const sections: any[] = [];

    try {
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();

            // Group text items into lines based on Y position
            const textItems = textContent.items.map((item: any) => ({
                text: item.str || '',
                x: item.transform[4] || 0,
                y: item.transform[5] || 0,
                width: item.width || 0,
                height: item.height || 0,
                fontSize: item.transform[0] || 12
            })).filter((item: any) => item.text.trim().length > 0);

            const lines = groupTextItemsIntoLines(textItems);

            // Process each line with enhanced context
            for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
                const line = lines[lineIndex];
                const lineText = line.text.trim();

                if (lineText.length === 0) continue;

                // Enhanced header detection with font size and position
                if (isResumeHeader(lineText, line.fontSize, lineIndex, lines)) {
                    sections.push({ type: 'header', content: lineText });
                }
                // Enhanced bullet point detection
                else if (isBulletPoint(lineText, line.x, lineIndex, lines)) {
                    sections.push({ type: 'bullet', content: cleanBulletText(lineText) });
                }
                // Enhanced subsection detection
                else if (isSubsection(lineText, lineIndex, lines)) {
                    sections.push({ type: 'subsection', content: lineText });
                }
                // Regular text with better paragraph grouping
                else if (lineText.length > 0) {
                    sections.push({ type: 'text', content: lineText });
                }
            }
        }
    } catch (error) {
        console.warn('Failed to extract structured sections:', error);
    }

    return sections;
};

/**
 * Group text items into lines based on Y position and proximity
 */
const groupTextItemsIntoLines = (textItems: any[]): any[] => {
    if (textItems.length === 0) return [];

    // Sort by Y position (top to bottom), then by X position (left to right)
    textItems.sort((a, b) => {
        if (Math.abs(a.y - b.y) < 5) { // Same line if Y difference < 5
            return a.x - b.x;
        }
        return b.y - a.y; // Higher Y first (PDF coordinate system)
    });

    const lines: any[] = [];
    let currentLine = {
        text: textItems[0].text,
        x: textItems[0].x,
        y: textItems[0].y,
        fontSize: textItems[0].fontSize,
        items: [textItems[0]]
    };

    for (let i = 1; i < textItems.length; i++) {
        const item = textItems[i];
        const yDiff = Math.abs(item.y - currentLine.y);

        if (yDiff < 5) { // Same line
            currentLine.text += ' ' + item.text;
            currentLine.items.push(item);
        } else { // New line
            lines.push(currentLine);
            currentLine = {
                text: item.text,
                x: item.x,
                y: item.y,
                fontSize: item.fontSize,
                items: [item]
            };
        }
    }
    lines.push(currentLine);

    return lines;
};

/**
 * Enhanced header detection with context and font size
 */
const isResumeHeader = (text: string, fontSize: number, lineIndex: number, allLines: any[]): boolean => {
    const upperText = text.toUpperCase();

    // Check for common resume headers
    const headers = [
        'PROFESSIONAL SUMMARY', 'TECHNICAL SKILLS', 'CORE COMPETENCIES',
        'PROFESSIONAL EXPERIENCE', 'EDUCATION', 'KEY PROJECTS',
        'CERTIFICATIONS', 'AWARDS', 'RECOGNITION', 'CONTACT INFORMATION',
        'PERSONAL DETAILS', 'OBJECTIVE', 'SUMMARY', 'EXPERIENCE',
        'SKILLS', 'PROJECTS', 'EDUCATION', 'CERTIFICATIONS'
    ];

    if (headers.some(header => upperText.includes(header))) {
        return true;
    }

    // Check for all caps with larger font size
    if (text === upperText && text.length > 3 && fontSize > 12) {
        return true;
    }

    // Check for standalone short lines that look like headers
    if (text.length < 50 && text === upperText && lineIndex < allLines.length - 1) {
        const nextLine = allLines[lineIndex + 1];
        // If next line starts with bullet or is indented, this might be a header
        if (nextLine && (isBulletPoint(nextLine.text, nextLine.x, lineIndex + 1, allLines) || nextLine.x > 100)) {
            return true;
        }
    }

    return false;
};

/**
 * Enhanced bullet point detection
 */
const isBulletPoint = (text: string, x: number, lineIndex: number, allLines: any[]): boolean => {
    // Direct bullet markers
    if (text.startsWith('•') || text.startsWith('●') || text.startsWith('○')) {
        return true;
    }

    // Dash bullets
    if (text.startsWith('- ') || text.startsWith('– ')) {
        return true;
    }

    // Numbered lists
    if (/^\d+[\.\)]\s/.test(text)) {
        return true;
    }

    // Indented text that might be continuation of bullet
    if (x > 50 && lineIndex > 0) {
        const prevLine = allLines[lineIndex - 1];
        if (prevLine && isBulletPoint(prevLine.text, prevLine.x, lineIndex - 1, allLines)) {
            return true;
        }
    }

    return false;
};

/**
 * Clean bullet point text
 */
const cleanBulletText = (text: string): string => {
    return text
        .replace(/^[•●○]\s*/, '')
        .replace(/^[-–]\s*/, '')
        .replace(/^\d+[\.\)]\s*/, '')
        .trim();
};

/**
 * Enhanced subsection detection
 */
const isSubsection = (text: string, lineIndex: number, allLines: any[]): boolean => {
    // Date patterns
    if (/\d{4}\s*-\s*\d{4}|\d{4}\s*-\s*Present|January|February|March|April|May|June|July|August|September|October|November|December/i.test(text)) {
        return true;
    }

    // Company names or job titles (capitalized, moderate length)
    if (text.length > 3 && text.length < 60 && text === text.toUpperCase() && !text.includes(' ')) {
        return true;
    }

    // Location patterns
    if (/\b[A-Z][a-z]+,\s*[A-Z]{2}\b|\b[A-Z][a-z]+,\s*[A-Z][a-z]+\b/.test(text)) {
        return true;
    }

    return false;
};
