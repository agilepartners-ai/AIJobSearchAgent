import { UserProfileData } from '../../services/profileService';

export type TemplateId = 'karlsson' | 'campbell' | 'elorriaga' | 'barese';

export interface ResumeTemplateProps {
  data: UserProfileData;
  isPreview?: boolean;
}
