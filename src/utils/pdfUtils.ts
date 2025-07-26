// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

export interface PDFExtractionResult {
    text: string;
    pages: number;
    metadata?: any;
    error?: string;
}

// Use the same worker setup pattern as AiJobSearch-old
const setupPDFWorker = () => {
    if (!isBrowser) {
        return false;
    }

    try {
        // Import pdfjs-dist dynamically to avoid SSR issues
        return import('pdfjs-dist').then((pdfjsLib) => {
            // Use the same CDN approach that works in AiJobSearch-old
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;
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