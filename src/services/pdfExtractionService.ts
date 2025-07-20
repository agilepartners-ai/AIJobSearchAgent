import * as pdfjsLib from 'pdfjs-dist';

// Set the worker source to a CDN-hosted version
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface ExtractionResult {
  text: string;
  pageCount: number;
}

export class PDFExtractionService {
  /**
   * Extract text from a PDF file
   * @param file PDF file to extract text from
   * @returns Extracted text and page count
   */
  static async extractTextFromFile(file: File): Promise<ExtractionResult> {
    try {
      console.log('Extracting text from file:', file.name);
      
      // Convert file to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Load PDF document
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      console.log(`PDF loaded with ${pdf.numPages} pages`);
      
      // Extract text from each page
      const textContent = await this.extractTextFromPdf(pdf);
      
      return {
        text: textContent,
        pageCount: pdf.numPages
      };
    } catch (error) {
      console.error('Error extracting text from PDF file:', error);
      throw new Error('Failed to extract text from PDF file. Please try again.');
    }
  }

  /**
   * Extract text from a PDF URL
   * @param url URL of the PDF to extract text from
   * @returns Extracted text and page count
   */
  static async extractTextFromUrl(url: string): Promise<ExtractionResult> {
    try {
      console.log('Extracting text from URL:', url);
      
      // Load PDF document from URL
      const loadingTask = pdfjsLib.getDocument(url);
      const pdf = await loadingTask.promise;
      
      console.log(`PDF loaded with ${pdf.numPages} pages`);
      
      // Extract text from each page
      const textContent = await this.extractTextFromPdf(pdf);
      
      return {
        text: textContent,
        pageCount: pdf.numPages
      };
    } catch (error) {
      console.error('Error extracting text from PDF URL:', error);
      throw new Error('Failed to extract text from PDF URL. Please ensure the URL is accessible and points to a valid PDF.');
    }
  }

  /**
   * Extract text from a PDF document
   * @param pdf PDF document to extract text from
   * @returns Extracted text
   */
  private static async extractTextFromPdf(pdf: pdfjsLib.PDFDocumentProxy): Promise<string> {
    let fullText = '';
    
    // Process each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Concatenate text items
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += pageText + '\n\n';
    }
    
    return fullText.trim();
  }
}