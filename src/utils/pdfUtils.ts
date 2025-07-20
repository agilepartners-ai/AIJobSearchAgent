import * as pdfjsLib from 'pdfjs-dist';

// Set the worker source to use the CDN version
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

export interface PDFExtractionResult {
    text: string;
    pages: number;
    metadata?: any;
    error?: string;
}

let workerSetup = false;

const setupWorker = (): boolean => {
    try {
        // Try multiple CDN sources for worker
        const workerSources = [
            `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`,
            `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`,
            `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`
        ];

        for (const workerSrc of workerSources) {
            try {
                pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
                console.log('Set PDF.js worker source to:', workerSrc);
                workerSetup = true;
                return true;
            } catch (error) {
                console.warn('Failed to set worker source:', workerSrc);
                continue;
            }
        }

        return false;
    } catch (error) {
        console.error('Failed to setup PDF.js worker:', error);
        return false;
    }
};

// Initialize worker on module load
workerSetup = setupWorker();

export const validatePDFFile = (file: File): { isValid: boolean; error?: string } => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
        'application/pdf',
        'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
        return {
            isValid: false,
            error: 'Only PDF and text files are supported. Please upload a PDF or TXT file.'
        };
    }

    if (file.size > maxSize) {
        return {
            isValid: false,
            error: 'File size must be less than 10MB'
        };
    }

    if (file.size === 0) {
        return {
            isValid: false,
            error: 'File appears to be empty'
        };
    }

    return { isValid: true };
};

export const extractTextFromPDF = async (file: File): Promise<PDFExtractionResult> => {
    try {
        console.log('Starting PDF text extraction with pdfjs-dist...');
        console.log('File info:', { name: file.name, type: file.type, size: file.size });
        console.log('PDF.js version:', pdfjsLib.version);
        console.log('Worker source:', pdfjsLib.GlobalWorkerOptions.workerSrc);

        // Handle text files directly
        if (file.type === 'text/plain') {
            return await extractTextWithFileReader(file);
        }

        // Retry worker setup if it failed initially
        if (!workerSetup) {
            console.warn('Worker setup failed initially, retrying...');
            workerSetup = setupWorker();
            if (!workerSetup) {
                console.error('Worker setup failed, but continuing with fallback...');
            }
        }

        // Convert file to ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        console.log('File converted to ArrayBuffer, size:', arrayBuffer.byteLength);

        // Verify it's actually a PDF
        const firstBytes = new Uint8Array(arrayBuffer.slice(0, 5));
        const pdfHeader = String.fromCharCode(...firstBytes);
        if (!pdfHeader.startsWith('%PDF')) {
            console.warn('File does not appear to be a valid PDF, trying text extraction...');
            return await extractTextWithFileReader(file);
        }

        // Load the PDF document with simplified options
        const loadingTask = pdfjsLib.getDocument({
            data: arrayBuffer,
            verbosity: 0,
            // Simplified options for better compatibility
            disableFontFace: true,
            disableRange: true,
            disableStream: true,
            useSystemFonts: false,
            standardFontDataUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/web/`
        });

        console.log('Loading PDF document...');
        const pdf = await loadingTask.promise;
        console.log('PDF loaded successfully:', {
            numPages: pdf.numPages,
            fingerprints: pdf.fingerprints
        });

        let fullText = '';
        const totalPages = pdf.numPages;

        // Extract text from each page with timeout
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            try {
                console.log(`Processing page ${pageNum}/${totalPages}`);

                // Add timeout for page loading
                const pagePromise = pdf.getPage(pageNum);
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Page load timeout')), 10000)
                );

                const page = await Promise.race([pagePromise, timeoutPromise]) as any;
                console.log(`Page ${pageNum} loaded`);

                // Add timeout for text extraction
                const textPromise = page.getTextContent();
                const textTimeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Text extraction timeout')), 10000)
                );

                const textContent = await Promise.race([textPromise, textTimeoutPromise]) as any;
                console.log(`Text content extracted from page ${pageNum}, items:`, textContent.items.length);

                // Extract text with better spacing and line breaks
                let pageText = '';
                for (let i = 0; i < textContent.items.length; i++) {
                    const item = textContent.items[i];
                    let text = '';

                    if (typeof item === 'string') {
                        text = item;
                    } else if (item && typeof item.str === 'string') {
                        text = item.str;
                    } else if (item && item.str !== undefined) {
                        text = String(item.str);
                    }

                    if (text.trim()) {
                        // Add spacing based on position if available
                        if (i > 0 && item.transform && textContent.items[i - 1].transform) {
                            const prevItem = textContent.items[i - 1];
                            const yDiff = Math.abs(item.transform[5] - prevItem.transform[5]);
                            const xDiff = item.transform[4] - (prevItem.transform[4] + prevItem.width);

                            // Add line break if significant vertical difference
                            if (yDiff > 5) {
                                pageText += '\n';
                            }
                            // Add space if horizontal gap
                            else if (xDiff > 2) {
                                pageText += ' ';
                            }
                        }

                        pageText += text;
                    }
                }

                if (pageText.trim()) {
                    fullText += pageText + '\n\n';
                    console.log(`Page ${pageNum} text length:`, pageText.length);
                } else {
                    console.warn(`No text found on page ${pageNum}`);
                }

                // Clean up page resources
                if (page.cleanup) {
                    page.cleanup();
                }

            } catch (pageError) {
                console.error(`Error processing page ${pageNum}:`, pageError);
                // Don't add error text to fullText, just log and continue
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

        const finalText = fullText.trim();
        const result = {
            text: finalText,
            pages: totalPages,
            metadata
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

            if (msg.includes('invalid pdf') || msg.includes('corrupted') || msg.includes('malformed')) {
                errorMessage = 'The PDF file appears to be corrupted or invalid. Please try a different PDF file.';
            } else if (msg.includes('password') || msg.includes('encrypted')) {
                errorMessage = 'This PDF is password protected. Please use an unprotected PDF file.';
            } else if (msg.includes('worker') || msg.includes('script')) {
                errorMessage = 'PDF processing worker failed. Trying alternative method...';
            } else if (msg.includes('network') || msg.includes('fetch') || msg.includes('load')) {
                errorMessage = 'Network error loading PDF.js resources. Please check your internet connection.';
            } else if (msg.includes('timeout')) {
                errorMessage = 'PDF processing timed out. The file might be too large or complex.';
            } else if (msg.includes('memory') || msg.includes('size')) {
                errorMessage = 'PDF file is too large or complex to process. Please try a smaller file.';
            } else {
                errorMessage = `PDF processing failed: ${error.message}`;
            }
        }

        // Try fallback method before giving up
        console.log('Trying fallback text extraction method...');
        try {
            return await extractTextFallback(file);
        } catch (fallbackError) {
            console.error('Fallback extraction also failed:', fallbackError);
            return {
                text: '',
                pages: 0,
                error: errorMessage
            };
        }
    }
};

export const extractTextFallback = async (file: File): Promise<PDFExtractionResult> => {
    try {
        console.log('Using fallback text extraction method...');

        if (file.type === 'text/plain') {
            return await extractTextWithFileReader(file);
        }

        // For PDF files, try a simpler approach
        const text = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function (event) {
                try {
                    const text = event.target?.result as string;
                    if (typeof text === 'string' && text.trim().length > 0) {
                        resolve(text);
                    } else {
                        reject(new Error("No readable text found in file"));
                    }
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = function () {
                reject(new Error("File reading failed"));
            };
            reader.readAsText(file);
        });

        return {
            text: text.trim(),
            pages: 1,
            metadata: { source: 'fallback_text_reader' }
        };
    } catch (error) {
        console.error('Fallback extraction failed:', error);
        return {
            text: '',
            pages: 0,
            error: 'All text extraction methods failed. Please convert your PDF to text format or copy-paste the content manually.'
        };
    }
};

export const extractTextWithFileReader = async (file: File): Promise<PDFExtractionResult> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                if (typeof reader.result === 'string') {
                    const text = reader.result.trim();
                    resolve({
                        text,
                        pages: 1,
                        metadata: { source: 'file_reader' }
                    });
                } else {
                    reject(new Error('FileReader did not return a string'));
                }
            } catch (error) {
                reject(new Error(`FileReader extraction failed: ${error}`));
            }
        };
        reader.onerror = () => reject(new Error('FileReader error'));
        reader.readAsText(file);
    });
};

export const setupPDFWorkerAlternative = (): boolean => {
    return setupWorker();
};

export const testPDFJSAvailability = (): boolean => {
    try {
        return !!(pdfjsLib && pdfjsLib.getDocument);
    } catch (error) {
        console.error('PDF.js not available:', error);
        return false;
    }
};

export const createManualTextInput = (): string => {
    return 'MANUAL_INPUT_REQUIRED';
};
