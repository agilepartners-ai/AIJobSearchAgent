import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { TemplateId } from '../components/resume-templates/types';

interface ResumeTemplateFormState {
  formData: any;
  expandedSections: string[];
  formatChoice: string;
  selectedTemplateId: TemplateId;
}

const initialState: ResumeTemplateFormState = {
  formData: {},
  expandedSections: ['personal', 'education', 'experience', 'skills', 'template'],
  formatChoice: 'docs',
  selectedTemplateId: 'karlsson',
};

const resumeTemplateFormSlice = createSlice({
  name: 'resumeTemplateForm',
  initialState,
  reducers: {
    setFormData(state, action: PayloadAction<any>) {
      state.formData = action.payload;
    },
    setExpandedSections(state, action: PayloadAction<string[]>) {
      state.expandedSections = action.payload;
    },
    setFormatChoice(state, action: PayloadAction<string>) {
      state.formatChoice = action.payload;
    },
    setSelectedTemplate(state, action: PayloadAction<TemplateId>) {
      state.selectedTemplateId = action.payload;
    },
    resetResumeTemplateForm() {
      return initialState;
    },
  },
});

export const {
  setFormData,
  setExpandedSections,
  setFormatChoice,
  setSelectedTemplate,
  resetResumeTemplateForm,
} = resumeTemplateFormSlice.actions;

export default resumeTemplateFormSlice.reducer;
