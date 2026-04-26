import { UserProfileData } from './profileService';
import { TemplateId } from '../components/resume-templates/types';
import { buildKarlssonDocx } from '../lib/docx-builders/KarlssonDocxBuilder';
import { buildCampbellDocx } from '../lib/docx-builders/CampbellDocxBuilder';
import { buildElorriagaDocx } from '../lib/docx-builders/ElorriagaDocxBuilder';
import { buildBareseDocx } from '../lib/docx-builders/BareseDocxBuilder';

export async function generateDocx(data: UserProfileData, templateId: TemplateId): Promise<Blob> {
  console.log(`[generateDocx] Generating DOCX for template: ${templateId}`);
  switch (templateId) {
    case 'karlsson':
      return buildKarlssonDocx(data);
    case 'campbell':
      return buildCampbellDocx(data);
    case 'elorriaga':
      return buildElorriagaDocx(data);
    case 'barese':
      return buildBareseDocx(data);
    default:
      console.warn(`[generateDocx] Unknown template ID: ${templateId}, falling back to Karlsson`);
      return buildKarlssonDocx(data);
  }
}

// Keeping the original class for compatibility if needed elsewhere
export class DocxResumeGenerator {
  constructor(private profile: any, private keywords: string[] = []) {}
  
  async generateDocument(): Promise<any> {
    // This is a simplified fallback that uses buildKarlssonDocx
    const result = await buildKarlssonDocx(this.profile as UserProfileData);
    // If it's a Blob, convert to Buffer/Uint8Array for API compatibility if needed
    // But builders currently return Blob. API needs Buffer.
    return result;
  }
}

/**
 * Compatibility helper for the API and other callers
 */
export function getDocxTemplate(templateId: string, data: any, keywords: string[] = []) {
  return {
    generateDocument: async () => {
      const blob = await generateDocx(data as UserProfileData, templateId as TemplateId);
      // In Node.js environment (like API), convert Blob to Buffer
      if (typeof window === 'undefined' && blob instanceof Blob) {
        const arrayBuffer = await blob.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }
      return blob;
    }
  };
}

export default DocxResumeGenerator;
