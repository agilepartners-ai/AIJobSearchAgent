import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ApplicationFormData = {
  company_name: string;
  position: string;
  status: string;
  application_date: string;
  location: string;
  job_posting_url: string;
  job_description: string;
  notes: string;
  resume_url: string;
  cover_letter_url: string;
};

type ApplicationModalState = {
  showModal: boolean;
  editingApplication: any | null;
  formData: ApplicationFormData;
};

const initialState: ApplicationModalState = {
  showModal: false,
  editingApplication: null,
  formData: {
    company_name: '',
    position: '',
    status: 'not_applied',
    application_date: '',
    location: '',
    job_posting_url: '',
    job_description: '',
    notes: '',
    resume_url: '',
    cover_letter_url: ''
  }
};

const applicationModalSlice = createSlice({
  name: 'applicationModal',
  initialState,
  reducers: {
    openModal(state, action: PayloadAction<{ editingApplication: any | null, formData?: ApplicationFormData }>) {
      state.showModal = true;
      state.editingApplication = action.payload.editingApplication;
      if (action.payload.formData) {
        state.formData = action.payload.formData;
      }
    },
    closeModal(state) {
      state.showModal = false;
      state.editingApplication = null;
      state.formData = initialState.formData;
    },
    setFormData(state, action: PayloadAction<ApplicationFormData>) {
      state.formData = action.payload;
    },
    updateFormField(state, action: PayloadAction<{ field: keyof ApplicationFormData, value: string }>) {
      state.formData[action.payload.field] = action.payload.value;
    },
    resetForm(state) {
      state.formData = initialState.formData;
    }
  }
});

export const { openModal, closeModal, setFormData, updateFormField, resetForm } = applicationModalSlice.actions;
export default applicationModalSlice.reducer;
