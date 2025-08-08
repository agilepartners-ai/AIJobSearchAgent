import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ResumeTemplateFormState {
  formData: Record<string, unknown>;
  expandedSections: string[];
  formatChoice: string;
  selectedTemplate: string;
}

const initialState: ResumeTemplateFormState = {
  formData: {},
  expandedSections: ['personal', 'education', 'experience', 'skills', 'template'],
  formatChoice: 'html',
  selectedTemplate: 'modern',
};

const resumeTemplateFormSlice = createSlice({
  name: 'resumeTemplateForm',
  initialState,
  reducers: {
    setFormData(state, action: PayloadAction<Record<string, unknown>>) {
      state.formData = action.payload;
    },
    setExpandedSections(state, action: PayloadAction<string[]>) {
      state.expandedSections = action.payload;
    },
    setFormatChoice(state, action: PayloadAction<string>) {
      state.formatChoice = action.payload;
    },
    setSelectedTemplate(state, action: PayloadAction<string>) {
      state.selectedTemplate = action.payload;
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
