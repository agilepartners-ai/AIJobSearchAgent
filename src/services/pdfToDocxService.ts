import * as fs from 'fs';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import * as pdfjsLib from 'pdfjs-dist';
import { extractTextFromPDF, PDFExtractionResult } from '../utils/pdfUtils';

// Set the worker source to use the local worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs-dist/build/pdf.worker.min.mjs';

export interface PDFToDocxOptions {
    title?: string;
    creator?: string;
    description?: string;
    includePageNumbers?: boolean;
    headingLevel?: keyof typeof HeadingLevel;
}

export interface ConversionResult {
    docxBlob: Blob;
    pageCount: number;
    textLength: number;
}

export interface ResumeSection {
    type: 'header' | 'section' | 'subsection' | 'bullet' | 'text';
    content: string;
    level?: number;
}

export class PDFToDocxService {
    /**
     * Extract structured text from PDF with enhanced parsing
     * @param pdfBuffer PDF file as ArrayBuffer
     * @returns Promise<ResumeSection[]> Array of structured sections
     */
    private static async extractStructuredTextFromPDF(pdfBuffer: ArrayBuffer): Promise<ResumeSection[]> {
        const pdf = await pdfjsLib.getDocument(pdfBuffer).promise;
        const sections: ResumeSection[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();

            // Enhanced text extraction with position information
            const textItems = textContent.items.map((item: any) => ({
                text: item.str || '',
                x: item.transform[4] || 0,
                y: item.transform[5] || 0,
                width: item.width || 0,
                height: item.height || 0,
                fontSize: item.transform[0] || 12
            })).filter(item => item.text.trim().length > 0);

            // Group text items into lines based on Y position
            const lines = this.groupTextItemsIntoLines(textItems);

            // Process each line with enhanced context
            for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
                const line = lines[lineIndex];
                const lineText = line.text.trim();

                if (lineText.length === 0) continue;

                // Enhanced header detection with font size and position
                if (this.isResumeHeader(lineText, line.fontSize, lineIndex, lines)) {
                    sections.push({ type: 'header', content: lineText });
                }
                // Enhanced bullet point detection
                else if (this.isBulletPoint(lineText, line.x, lineIndex, lines)) {
                    sections.push({ type: 'bullet', content: this.cleanBulletText(lineText) });
                }
                // Enhanced subsection detection
                else if (this.isSubsection(lineText, lineIndex, lines)) {
                    sections.push({ type: 'subsection', content: lineText });
                }
                // Regular text with better paragraph grouping
                else if (lineText.length > 0) {
                    sections.push({ type: 'text', content: lineText });
                }
            }
        }

        return this.postProcessSections(sections);
    }

    /**
     * Group text items into lines based on Y position and proximity
     */
    private static groupTextItemsIntoLines(textItems: any[]): any[] {
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
    }

    /**
     * Enhanced header detection with context and font size
     */
    private static isResumeHeader(text: string, fontSize: number, lineIndex: number, allLines: any[]): boolean {
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
            if (nextLine && (this.isBulletPoint(nextLine.text, nextLine.x, lineIndex + 1, allLines) || nextLine.x > 100)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Enhanced bullet point detection
     */
    private static isBulletPoint(text: string, x: number, lineIndex: number, allLines: any[]): boolean {
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
            if (prevLine && this.isBulletPoint(prevLine.text, prevLine.x, lineIndex - 1, allLines)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Clean bullet point text
     */
    private static cleanBulletText(text: string): string {
        return text
            .replace(/^[•●○]\s*/, '')
            .replace(/^[-–]\s*/, '')
            .replace(/^\d+[\.\)]\s*/, '')
            .trim();
    }

    /**
     * Enhanced subsection detection
     */
    private static isSubsection(text: string, lineIndex: number, allLines: any[]): boolean {
        // Date patterns
        if (/\d{4}\s*-\s*\d{4}|\d{4}\s*-\s*Present|January|February|March|April|May|June|July|August|September|October|November|December/i.test(text)) {
            return true;
        }

        // Company names or job titles (capitalized, moderate length)
        if (text.length > 3 && text.length < 60 && text === text.toUpperCase() && !text.includes(' ')) {
            return true;
        }

        // Location patterns
        if (/\b[A-Z][a-z]+,\s*[A-Z]{2}\b|\b[A-Z][a-z]+\s*,\s*[A-Z][a-z]+\b/.test(text)) {
            return true;
        }

        return false;
    }

    /**
     * Post-process sections to improve structure
     */
    private static postProcessSections(sections: ResumeSection[]): ResumeSection[] {
        const processed: ResumeSection[] = [];
        let currentParagraph = '';

        for (let i = 0; i < sections.length; i++) {
            const section = sections[i];

            if (section.type === 'text') {
                // Check if this should be merged with previous text
                if (currentParagraph && this.shouldMergeWithPrevious(section.content, processed[processed.length - 1])) {
                    // Merge with previous paragraph
                    const lastSection = processed[processed.length - 1];
                    if (lastSection.type === 'text') {
                        lastSection.content += ' ' + section.content;
                    } else {
                        currentParagraph = section.content;
                        processed.push(section);
                    }
                } else {
                    currentParagraph = section.content;
                    processed.push(section);
                }
            } else {
                currentParagraph = '';
                processed.push(section);
            }
        }

        return processed;
    }

    /**
     * Determine if text should be merged with previous paragraph
     */
    private static shouldMergeWithPrevious(currentText: string, previousSection?: ResumeSection): boolean {
        if (!previousSection || previousSection.type !== 'text') {
            return false;
        }

        // Don't merge if current text looks like a new paragraph start
        if (currentText.length < 20 && currentText === currentText.toUpperCase()) {
            return false;
        }

        // Don't merge if previous section ends with punctuation that suggests completion
        if (previousSection.content.match(/[.!?]$/)) {
            return false;
        }

        return true;
    }


    /**
     * Clean text by removing HTML entities and object references
     * @param text Text to clean
     * @returns Cleaned text
     */
    private static cleanText(text: string): string {
        return text
            .replace(/\[object Object\]/g, '')
            .replace(/&/g, '&')
            .replace(/</g, '<')
            .replace(/>/g, '>')
            .replace(/"/g, '"')
            .replace(/'/g, "'")
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Parse technical skills from text
     * @param skillsText Text containing skills
     * @returns Array of skill strings
     */
    private static parseTechnicalSkills(skillsText: string): string[] {
        const cleaned = this.cleanText(skillsText);

        // Common technical skills to extract
        const commonSkills = [
            'SQL', 'Pandas', 'OpenCV', 'TensorFlow', 'React.js', 'Flask',
            'YOLOv8', 'NumPy', 'Statistics and Probability', 'AQICN API',
            'OpenWeather API', 'Python', 'MySQL', 'Streamlit', 'Scikit-Learn',
            'JavaScript', 'TypeScript', 'Node.js', 'Express', 'MongoDB',
            'PostgreSQL', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP'
        ];

        return commonSkills.filter(skill =>
            cleaned.toLowerCase().includes(skill.toLowerCase())
        );
    }

    /**
     * Create formatted DOCX document from structured sections (from pdfUtils)
     * @param sections Array of structured sections from pdfUtils
     * @param options Conversion options
     * @returns Promise<Blob> DOCX file as blob
     */
    private static async createFormattedDocxFromSections(sections: any[], options: PDFToDocxOptions): Promise<Blob> {
        const children: Paragraph[] = [];

        // Add header with enhanced contact info
        const contactInfo = this.extractContactInfoFromSections(sections);
        if (contactInfo.name) {
            // Name in large, bold font
            children.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: contactInfo.name,
                            bold: true,
                            size: 36, // Larger name
                        }),
                    ],
                    spacing: { after: 150 },
                })
            );

            // Contact information line
            const contactParts: string[] = [];
            if (contactInfo.email) contactParts.push(contactInfo.email);
            if (contactInfo.phone) contactParts.push(contactInfo.phone);
            if (contactInfo.location) contactParts.push(contactInfo.location);

            if (contactParts.length > 0) {
                children.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: contactParts.join(' • '),
                                size: 22,
                                color: '666666', // Gray color for contact info
                            }),
                        ],
                        spacing: { after: 300 },
                    })
                );
            }
        }

        // Process sections with enhanced formatting
        let inSkillsSection = false;

        sections.forEach((section, index) => {
            const cleanedContent = this.cleanText(section.content);

            switch (section.type) {
                case 'header':
                    // Close any open skills section
                    inSkillsSection = false;

                    children.push(
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: cleanedContent,
                                    bold: true,
                                    size: 28,
                                    allCaps: true,
                                    color: '2563EB', // Blue color for headers
                                }),
                            ],
                            heading: HeadingLevel.HEADING_2,
                            spacing: { before: 400, after: 200 },
                        })
                    );

                    // Special handling for technical skills section
                    if (cleanedContent.toUpperCase().includes('TECHNICAL SKILLS') ||
                        cleanedContent.toUpperCase().includes('SKILLS')) {
                        inSkillsSection = true;
                        // Extract skills from following sections
                        const skills = this.extractSkillsFromSections(sections, index);
                        if (skills.length > 0) {
                            const skillsParagraphs = this.createSkillsSection(skills);
                            children.push(...skillsParagraphs);
                        }
                    }
                    break;

                case 'subsection':
                    children.push(
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: cleanedContent,
                                    bold: true,
                                    size: 24,
                                    color: '374151', // Dark gray for subsections
                                }),
                            ],
                            spacing: { before: 200, after: 100 },
                        })
                    );
                    break;

                case 'bullet':
                    if (!inSkillsSection) { // Don't show bullets in skills section
                        children.push(
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: `• ${cleanedContent}`,
                                        size: 22,
                                    }),
                                ],
                                indent: { left: 360 }, // Indent bullet points
                                spacing: { after: 100 },
                            })
                        );
                    }
                    break;

                case 'text':
                    if (!inSkillsSection) { // Don't show regular text in skills section
                        children.push(
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: cleanedContent,
                                        size: 22,
                                    }),
                                ],
                                spacing: { after: 120 },
                            })
                        );
                    }
                    break;
            }
        });

        const doc = new Document({
            creator: options.creator || 'AI Job Search Agent',
            title: options.title || 'Converted Resume',
            description: options.description || 'Resume converted from PDF format with enhanced formatting',
            sections: [{
                properties: {},
                children: children,
            }],
        });

        const buffer = await Packer.toBuffer(doc);
        return new Blob([new Uint8Array(buffer)], {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
    }

    /**
     * Extract contact information from sections (from pdfUtils format)
     * @param sections Array of sections from pdfUtils
     * @returns Contact information object
     */
    private static extractContactInfoFromSections(sections: any[]): { name?: string; email?: string; phone?: string; location?: string } {
        const contact: { name?: string; email?: string; phone?: string; location?: string } = {};

        // Look for name in the first few sections (likely to be at the top)
        for (const section of sections.slice(0, 5)) {
            if (section.type === 'text') {
                const content = section.content.trim();

                // Skip if it contains email or phone patterns
                if (content.includes('@') || /\d{3,}/.test(content)) {
                    continue;
                }

                // Likely a name if it's 2-4 words, title case, and reasonable length
                const words = content.split(' ');
                if (words.length >= 2 && words.length <= 4 &&
                    content.length > 5 && content.length < 60 &&
                    content === this.toTitleCase(content)) {
                    contact.name = content;
                    break;
                }
            }
        }

        // Look for contact information throughout the document
        for (const section of sections) {
            const content = section.content;

            // Email detection
            const emailMatch = content.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
            if (emailMatch && !contact.email) {
                contact.email = emailMatch[0];
            }

            // Phone detection (multiple patterns)
            const phonePatterns = [
                /\b\d{10}\b/,  // 10 digits
                /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,  // XXX-XXX-XXXX or XXX.XXX.XXXX
                /\(\d{3}\)\s*\d{3}[-.]?\d{4}\b/,  // (XXX) XXX-XXXX
                /\+\d{1,3}[-.]?\d{3}[-.]?\d{3}[-.]?\d{4}\b/,  // +XX-XXX-XXX-XXXX
            ];

            for (const pattern of phonePatterns) {
                const phoneMatch = content.match(pattern);
                if (phoneMatch && !contact.phone) {
                    contact.phone = phoneMatch[0];
                    break;
                }
            }

            // Location detection (City, State or City, Country)
            const locationMatch = content.match(/\b[A-Z][a-z]+,\s*[A-Z]{2}\b|\b[A-Z][a-z]+,\s*[A-Z][a-z]+\b/);
            if (locationMatch && !contact.location) {
                contact.location = locationMatch[0];
            }
        }

        return contact;
    }

    /**
     * Create formatted DOCX document from structured sections with enhanced formatting
     * @param sections Array of structured sections
     * @param options Conversion options
     * @returns Promise<Blob> DOCX file as blob
     */
    private static async createFormattedDocx(sections: ResumeSection[], options: PDFToDocxOptions): Promise<Blob> {
        const children: Paragraph[] = [];

        // Add header with enhanced contact info
        const contactInfo = this.extractContactInfo(sections);
        if (contactInfo.name) {
            // Name in large, bold font
            children.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: contactInfo.name,
                            bold: true,
                            size: 36, // Larger name
                        }),
                    ],
                    spacing: { after: 150 },
                })
            );

            // Contact information line
            const contactParts: string[] = [];
            if (contactInfo.email) contactParts.push(contactInfo.email);
            if (contactInfo.phone) contactParts.push(contactInfo.phone);
            if (contactInfo.location) contactParts.push(contactInfo.location);

            if (contactParts.length > 0) {
                children.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: contactParts.join(' • '),
                                size: 22,
                                color: '666666', // Gray color for contact info
                            }),
                        ],
                        spacing: { after: 300 },
                    })
                );
            }
        }

        // Process sections with enhanced formatting
        let inSkillsSection = false;

        sections.forEach((section, index) => {
            const cleanedContent = this.cleanText(section.content);

            switch (section.type) {
                case 'header':
                    // Close any open skills section
                    inSkillsSection = false;

                    children.push(
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: cleanedContent,
                                    bold: true,
                                    size: 28,
                                    allCaps: true,
                                    color: '2563EB', // Blue color for headers
                                }),
                            ],
                            heading: HeadingLevel.HEADING_2,
                            spacing: { before: 400, after: 200 },
                        })
                    );

                    // Special handling for technical skills section
                    if (cleanedContent.toUpperCase().includes('TECHNICAL SKILLS') ||
                        cleanedContent.toUpperCase().includes('SKILLS')) {
                        inSkillsSection = true;
                        // Extract skills from following sections
                        const skills = this.extractSkillsFromSections(sections, index);
                        if (skills.length > 0) {
                            const skillsParagraphs = this.createSkillsSection(skills);
                            children.push(...skillsParagraphs);
                        }
                    }
                    break;

                case 'subsection':
                    children.push(
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: cleanedContent,
                                    bold: true,
                                    size: 24,
                                    color: '374151', // Dark gray for subsections
                                }),
                            ],
                            spacing: { before: 200, after: 100 },
                        })
                    );
                    break;

                case 'bullet':
                    if (!inSkillsSection) { // Don't show bullets in skills section
                        children.push(
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: `• ${cleanedContent}`,
                                        size: 22,
                                    }),
                                ],
                                indent: { left: 360 }, // Indent bullet points
                                spacing: { after: 100 },
                            })
                        );
                    }
                    break;

                case 'text':
                    if (!inSkillsSection) { // Don't show regular text in skills section
                        children.push(
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: cleanedContent,
                                        size: 22,
                                    }),
                                ],
                                spacing: { after: 120 },
                            })
                        );
                    }
                    break;
            }
        });

        const doc = new Document({
            creator: options.creator || 'AI Job Search Agent',
            title: options.title || 'Converted Resume',
            description: options.description || 'Resume converted from PDF format with enhanced formatting',
            sections: [{
                properties: {},
                children: children,
            }],
        });

        const buffer = await Packer.toBuffer(doc);
        return new Blob([new Uint8Array(buffer)], {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
    }

    /**
     * Extract skills from sections following a skills header (works with both formats)
     * @param sections All sections
     * @param headerIndex Index of the skills header
     * @returns Array of skill strings
     */
    private static extractSkillsFromSections(sections: any[], headerIndex: number): string[] {
        const skills: string[] = [];

        // Look at the next several sections for skills
        for (let i = headerIndex + 1; i < Math.min(headerIndex + 6, sections.length); i++) {
            const section = sections[i];

            if (section.type === 'header') {
                break; // Stop at next header
            }

            if (section.type === 'text' || section.type === 'bullet') {
                const content = section.content;
                // Extract common technical skills
                const commonSkills = [
                    'SQL', 'Pandas', 'OpenCV', 'TensorFlow', 'React.js', 'Flask',
                    'YOLOv8', 'NumPy', 'Statistics and Probability', 'AQICN API',
                    'OpenWeather API', 'Python', 'MySQL', 'Streamlit', 'Scikit-Learn',
                    'JavaScript', 'TypeScript', 'Node.js', 'Express', 'MongoDB',
                    'PostgreSQL', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP',
                    'HTML', 'CSS', 'Git', 'Linux', 'Windows', 'MacOS'
                ];

                commonSkills.forEach(skill => {
                    if (content.toLowerCase().includes(skill.toLowerCase()) && !skills.includes(skill)) {
                        skills.push(skill);
                    }
                });
            }
        }

        return skills;
    }

    /**
     * Extract contact information from sections with enhanced detection
     * @param sections Array of sections
     * @returns Contact information object
     */
    private static extractContactInfo(sections: ResumeSection[]): { name?: string; email?: string; phone?: string; location?: string } {
        const contact: { name?: string; email?: string; phone?: string; location?: string } = {};

        // Look for name in the first few sections (likely to be at the top)
        for (const section of sections.slice(0, 5)) {
            if (section.type === 'text') {
                const content = section.content.trim();

                // Skip if it contains email or phone patterns
                if (content.includes('@') || /\d{3,}/.test(content)) {
                    continue;
                }

                // Likely a name if it's 2-4 words, title case, and reasonable length
                const words = content.split(' ');
                if (words.length >= 2 && words.length <= 4 &&
                    content.length > 5 && content.length < 60 &&
                    content === this.toTitleCase(content)) {
                    contact.name = content;
                    break;
                }
            }
        }

        // Look for contact information throughout the document
        for (const section of sections) {
            const content = section.content;

            // Email detection
            const emailMatch = content.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
            if (emailMatch && !contact.email) {
                contact.email = emailMatch[0];
            }

            // Phone detection (multiple patterns)
            const phonePatterns = [
                /\b\d{10}\b/,  // 10 digits
                /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,  // XXX-XXX-XXXX or XXX.XXX.XXXX
                /\(\d{3}\)\s*\d{3}[-.]?\d{4}\b/,  // (XXX) XXX-XXXX
                /\+\d{1,3}[-.]?\d{3}[-.]?\d{3}[-.]?\d{4}\b/,  // +XX-XXX-XXX-XXXX
            ];

            for (const pattern of phonePatterns) {
                const phoneMatch = content.match(pattern);
                if (phoneMatch && !contact.phone) {
                    contact.phone = phoneMatch[0];
                    break;
                }
            }

            // Location detection (City, State or City, Country)
            const locationMatch = content.match(/\b[A-Z][a-z]+,\s*[A-Z]{2}\b|\b[A-Z][a-z]+,\s*[A-Z][a-z]+\b/);
            if (locationMatch && !contact.location) {
                contact.location = locationMatch[0];
            }
        }

        return contact;
    }

    /**
     * Convert string to title case
     * @param str String to convert
     * @returns Title case string
     */
    private static toTitleCase(str: string): string {
        return str.replace(/\w\S*/g, (txt) =>
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
    }

    /**
     * Convert a PDF file to DOCX format with enhanced structured parsing
     * @param file PDF file to convert
     * @param options Conversion options
     * @returns Promise<ConversionResult> with the DOCX blob and metadata
     */
    static async convertFileToDocx(
        file: File,
        options: PDFToDocxOptions = {}
    ): Promise<ConversionResult> {
        try {
            console.log('🔄 Starting enhanced PDF to DOCX conversion...');

            // Use enhanced PDF extraction with structured sections
            const extractionResult: PDFExtractionResult = await extractTextFromPDF(file);

            if (extractionResult.error) {
                throw new Error(extractionResult.error);
            }

            console.log(`📄 Extracted ${extractionResult.structuredSections?.length || 0} structured sections`);

            // Create DOCX document from structured sections or fallback to basic text
            let docxBlob: Blob;
            if (extractionResult.structuredSections && extractionResult.structuredSections.length > 0) {
                // Use structured sections for better formatting
                docxBlob = await this.createFormattedDocxFromSections(extractionResult.structuredSections, options);
            } else {
                // Fallback to basic text processing
                const sections = await this.extractStructuredTextFromPDF(await file.arrayBuffer());
                docxBlob = await this.createFormattedDocx(sections, options);
            }

            return {
                docxBlob,
                pageCount: extractionResult.pages,
                textLength: extractionResult.text.length
            };

        } catch (error) {
            console.error('❌ Error converting PDF to DOCX:', error);
            throw new Error('Failed to convert PDF to DOCX. Please try again.');
        }
    }

    /**
     * Convert a PDF from URL to DOCX format with enhanced structured parsing
     * @param url URL of the PDF to convert
     * @param options Conversion options
     * @returns Promise<ConversionResult> with the DOCX blob and metadata
     */
    static async convertUrlToDocx(
        url: string,
        options: PDFToDocxOptions = {}
    ): Promise<ConversionResult> {
        try {
            console.log('🔄 Starting PDF URL to DOCX conversion...');

            // Fetch PDF from URL
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch PDF from URL: ${response.statusText}`);
            }

            const arrayBuffer = await response.arrayBuffer();

            // Extract structured text from PDF
            const sections = await this.extractStructuredTextFromPDF(arrayBuffer);

            console.log(`📄 Extracted ${sections.length} structured sections`);

            // Create DOCX document from structured sections
            const docxBlob = await this.createFormattedDocx(sections, options);

            return {
                docxBlob,
                pageCount: 1, // We'll calculate this differently
                textLength: sections.reduce((total: number, section: ResumeSection) => total + section.content.length, 0)
            };

        } catch (error) {
            console.error('❌ Error converting PDF URL to DOCX:', error);
            throw new Error('Failed to convert PDF URL to DOCX. Please ensure the URL is accessible and points to a valid PDF.');
        }
    }



    /**
     * Create skills section paragraphs with proper formatting
     * @param skills Array of skill strings
     * @returns Array of formatted paragraphs
     */
    private static createSkillsSection(skills: string[]): Paragraph[] {
        const paragraphs: Paragraph[] = [];

        // Create a formatted skills grid (3 skills per row)
        const skillRows: string[][] = [];
        for (let i = 0; i < skills.length; i += 3) {
            skillRows.push(skills.slice(i, i + 3));
        }

        skillRows.forEach(row => {
            paragraphs.push(
                new Paragraph({
                    children: row.map((skill, index) =>
                        new TextRun({
                            text: skill + (index < row.length - 1 ? ' • ' : ''),
                            size: 22,
                        })
                    ),
                    spacing: { after: 100 },
                })
            );
        });

        return paragraphs;
    }

    /**
     * Enhanced conversion function with comprehensive error handling
     * @param file PDF file to convert
     * @param options Conversion options
     * @returns Promise<Blob> DOCX file as blob
     */
    static async convertPdfToDocx(file: File, options: PDFToDocxOptions = {}): Promise<Blob> {
        try {
            console.log('🔄 Starting enhanced PDF to DOCX conversion...');

            const arrayBuffer = await file.arrayBuffer();
            const sections = await this.extractStructuredTextFromPDF(arrayBuffer);

            // Post-process sections to clean up formatting
            const cleanedSections = sections.map(section => ({
                ...section,
                content: this.cleanText(section.content)
            }));

            // Special handling for technical skills section
            const processedSections = cleanedSections.map(section => {
                if (section.type === 'header' && section.content.toUpperCase().includes('TECHNICAL SKILLS')) {
                    // Find the next text sections that might contain skills
                    const skillsIndex = cleanedSections.indexOf(section);
                    const nextSections = cleanedSections.slice(skillsIndex + 1, skillsIndex + 4);

                    // Extract skills from the following sections
                    const extractedSkills = nextSections
                        .filter(s => s.type === 'text' || s.type === 'bullet')
                        .map(s => s.content);

                    if (extractedSkills.length > 0) {
                        const allSkillsText = extractedSkills.join(' ');
                        const skills = this.parseTechnicalSkills(allSkillsText);

                        if (skills.length > 0) {
                            // Replace the skills content with formatted skills
                            return {
                                ...section,
                                content: section.content,
                                skills: skills // Add skills array for special processing
                            };
                        }
                    }
                }
                return section;
            });

            const docxBlob = await this.createFormattedDocx(processedSections, options);

            console.log('✅ PDF to DOCX conversion completed successfully');
            return docxBlob;

        } catch (error) {
            console.error('❌ Conversion failed:', error);
            throw new Error('Failed to convert PDF to DOCX');
        }
    }

    /**
     * Download DOCX blob as file
     * @param blob DOCX blob to download
     * @param filename Desired filename (without extension)
     */
    static downloadDocxBlob(blob: Blob, filename: string): void {
        try {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${filename}.docx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            console.log(`✅ DOCX file downloaded: ${filename}.docx`);
        } catch (error) {
            console.error('❌ Error downloading DOCX file:', error);
            throw new Error('Failed to download DOCX file');
        }
    }

    /**
     * Get default conversion options
     * @returns Default PDFToDocxOptions
     */
    static getDefaultOptions(): PDFToDocxOptions {
        return {
            title: 'Converted Document',
            creator: 'AI Job Search Agent',
            description: 'Document converted from PDF format',
            includePageNumbers: false,
            headingLevel: 'TITLE'
        };
    }

    /**
     * Validate conversion options
     * @param options Options to validate
     * @returns boolean indicating if options are valid
     */
    static validateOptions(options: PDFToDocxOptions): boolean {
        if (options.title && options.title.length > 255) {
            console.warn('⚠️ Title is too long (max 255 characters)');
            return false;
        }

        if (options.creator && options.creator.length > 255) {
            console.warn('⚠️ Creator name is too long (max 255 characters)');
            return false;
        }

        return true;
    }
}