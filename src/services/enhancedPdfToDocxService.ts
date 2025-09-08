import { PDFToDocxService, PDFToDocxOptions, ConversionResult } from './pdfToDocxService';

export interface EnhancedPDFToDocxOptions extends PDFToDocxOptions {
    usePythonService?: boolean;
    pythonServiceUrl?: string;
}

export class EnhancedPDFToDocxService extends PDFToDocxService {
    private static readonly DEFAULT_PYTHON_SERVICE_URL = 'http://localhost:5001';

    /**
     * Enhanced PDF to DOCX conversion with Python service fallback
     * @param file PDF file to convert
     * @param options Conversion options
     * @returns Promise<ConversionResult> with the DOCX blob and metadata
     */
    static async convertFileToDocxEnhanced(
        file: File,
        options: EnhancedPDFToDocxOptions = {}
    ): Promise<ConversionResult> {
        const { usePythonService = true, pythonServiceUrl = this.DEFAULT_PYTHON_SERVICE_URL, ...baseOptions } = options;

        // Try Python service first if enabled
        if (usePythonService) {
            try {
                console.log('🔄 Attempting conversion with Python service...');
                const pythonResult = await this.convertWithPythonService(file, pythonServiceUrl);
                if (pythonResult) {
                    console.log('✅ Python service conversion successful');
                    return pythonResult;
                }
            } catch (error) {
                console.warn('⚠️ Python service conversion failed, falling back to TypeScript implementation:', error);
            }
        }

        // Fallback to existing TypeScript implementation
        console.log('🔄 Using TypeScript implementation...');
        return this.convertFileToDocx(file, baseOptions);
    }

    /**
     * Convert PDF using Python service
     * @param file PDF file to convert
     * @param serviceUrl Python service URL
     * @returns Promise<ConversionResult | null>
     */
    private static async convertWithPythonService(
        file: File,
        serviceUrl: string
    ): Promise<ConversionResult | null> {
        try {
            // Convert file to base64
            const arrayBuffer = await file.arrayBuffer();
            const base64Data = this.arrayBufferToBase64(arrayBuffer);

            // Prepare request data
            const requestData = {
                pdf_data: base64Data,
                filename: file.name
            };

            // Send request to Python service
            const response = await fetch(`${serviceUrl}/convert/base64`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                throw new Error(`Python service returned ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (!result.success || !result.docx_data) {
                throw new Error(result.error || 'Python service conversion failed');
            }

            // Convert base64 back to blob
            const docxBlob = this.base64ToBlob(result.docx_data, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

            return {
                docxBlob,
                pageCount: 1, // Python service doesn't provide page count
                textLength: docxBlob.size // Approximate text length with blob size
            };

        } catch (error) {
            console.error('Python service conversion error:', error);
            return null;
        }
    }

    /**
     * Convert ArrayBuffer to base64 string
     * @param arrayBuffer ArrayBuffer to convert
     * @returns base64 string
     */
    private static arrayBufferToBase64(arrayBuffer: ArrayBuffer): string {
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    /**
     * Convert base64 string to Blob
     * @param base64Data base64 string
     * @param mimeType MIME type for the blob
     * @returns Blob object
     */
    private static base64ToBlob(base64Data: string, mimeType: string): Blob {
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    }

    /**
     * Check if Python service is available
     * @param serviceUrl Python service URL
     * @returns Promise<boolean> indicating if service is available
     */
    static async checkPythonServiceHealth(serviceUrl: string = this.DEFAULT_PYTHON_SERVICE_URL): Promise<boolean> {
        try {
            const response = await fetch(`${serviceUrl}/health`);
            if (!response.ok) {
                return false;
            }
            const health = await response.json();
            return health.status === 'healthy';
        } catch (error) {
            console.error('Python service health check failed:', error);
            return false;
        }
    }

    /**
     * Get Python service status
     * @param serviceUrl Python service URL
     * @returns Promise<object> with service status information
     */
    static async getPythonServiceStatus(serviceUrl: string = this.DEFAULT_PYTHON_SERVICE_URL): Promise<any> {
        try {
            const response = await fetch(`${serviceUrl}/health`);
            if (!response.ok) {
                return { status: 'unhealthy', error: `HTTP ${response.status}` };
            }
            return await response.json();
        } catch (error) {
            return { status: 'unreachable', error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
}