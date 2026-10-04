import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * Modal open/close state only.
 *
 * This slice used to persist the uploaded file as base64, plus the full
 * optimization result object, into localStorage via redux-persist. That meant
 * a multi-megabyte resume and an entire generated document set were written to
 * disk on every change. Documents now live in component state and in the database
 * Storage, so only the trigger state belongs here.
 */
export interface AIEnhancementModalState {
  isOpen: boolean;
  jobDescription: string;
}

const initialState: AIEnhancementModalState = {
  isOpen: false,
  jobDescription: '',
};

const aiEnhancementModalSlice = createSlice({
  name: 'aiEnhancementModal',
  initialState,
  reducers: {
    openModal(state, action: PayloadAction<{ jobDescription: string }>) {
      state.isOpen = true;
      state.jobDescription = action.payload.jobDescription;
    },
    closeModal() {
      return { ...initialState };
    },
    resetState() {
      return { ...initialState };
    },
  },
});

export const { openModal, closeModal, resetState } = aiEnhancementModalSlice.actions;
export default aiEnhancementModalSlice.reducer;
