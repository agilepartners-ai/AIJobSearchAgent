import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface FileMeta {
  name: string;
  type: string;
  size: number;
  lastModified: number;
}

export interface AIEnhancementModalState {
  isOpen: boolean;
  jobDescription: string;
  selectedFileMeta: FileMeta | null;
  selectedFileContent: string | null; // base64
  cloudProvider: string;
  cloudFileUrl: string;
  error: string;
  showResults: boolean;
  optimizationResults: any;
}

const initialState: AIEnhancementModalState = {
  isOpen: false,
  jobDescription: '',
  selectedFileMeta: null,
  selectedFileContent: null,
  cloudProvider: '',
  cloudFileUrl: '',
  error: '',
  showResults: false,
  optimizationResults: null,
};

const aiEnhancementModalSlice = createSlice({
  name: 'aiEnhancementModal',
  initialState,
  reducers: {
    openModal(state, action: PayloadAction<{ jobDescription: string }>) {
      state.isOpen = true;
      state.jobDescription = action.payload.jobDescription;
    },
    closeModal(state) {
      return { ...initialState };
    },
    setSelectedFile(state, action: PayloadAction<{ meta: FileMeta; content: string }>) {
      state.selectedFileMeta = action.payload.meta;
      state.selectedFileContent = action.payload.content;
      state.cloudProvider = '';
      state.cloudFileUrl = '';
    },
    setCloudProvider(state, action: PayloadAction<string>) {
      state.cloudProvider = action.payload;
      state.selectedFileMeta = null;
      state.selectedFileContent = null;
      state.cloudFileUrl = '';
    },
    setCloudFileUrl(state, action: PayloadAction<string>) {
      state.cloudFileUrl = action.payload;
    },
    setError(state, action: PayloadAction<string>) {
      state.error = action.payload;
    },
    setShowResults(state, action: PayloadAction<boolean>) {
      state.showResults = action.payload;
    },
    setOptimizationResults(state, action: PayloadAction<any>) {
      state.optimizationResults = action.payload;
    },
    resetState() {
      return { ...initialState };
    },
  },
});

export const {
  openModal,
  closeModal,
  setSelectedFile,
  setCloudProvider,
  setCloudFileUrl,
  setError,
  setShowResults,
  setOptimizationResults,
  resetState,
} = aiEnhancementModalSlice.actions;

export default aiEnhancementModalSlice.reducer;
