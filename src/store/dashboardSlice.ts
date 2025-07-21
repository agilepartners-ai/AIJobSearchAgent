import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface DashboardState {
  showModal: boolean;
  showJobPreferencesModal: boolean;
  showJobSearchModal: boolean;
  showProfileModal: boolean;
  editingApplication: any | null;
  searchForm: {
    query: string;
    location: string;
    experience: string;
    employment_type: string;
    remote_jobs_only: boolean;
    date_posted: string;
  };
  searchResults: any[];
  searchLoading: boolean;
  searchError: string;
  selectedJobDescription: { title: string; company: string; description: string } | null;
}

const initialState: DashboardState = {
  showModal: false,
  showJobPreferencesModal: false,
  showJobSearchModal: false,
  showProfileModal: false,
  editingApplication: null,
  searchForm: {
    query: '',
    location: '',
    experience: '',
    employment_type: '',
    remote_jobs_only: false,
    date_posted: '',
  },
  searchResults: [],
  searchLoading: false,
  searchError: '',
  selectedJobDescription: null,
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    setShowModal(state, action: PayloadAction<boolean>) {
      state.showModal = action.payload;
    },
    setShowJobPreferencesModal(state, action: PayloadAction<boolean>) {
      state.showJobPreferencesModal = action.payload;
    },
    setShowJobSearchModal(state, action: PayloadAction<boolean>) {
      state.showJobSearchModal = action.payload;
    },
    setShowProfileModal(state, action: PayloadAction<boolean>) {
      state.showProfileModal = action.payload;
    },
    setEditingApplication(state, action: PayloadAction<any | null>) {
      state.editingApplication = action.payload;
    },
    setSearchForm(state, action: PayloadAction<DashboardState['searchForm']>) {
      state.searchForm = action.payload;
    },
    setSearchResults(state, action: PayloadAction<any[]>) {
      state.searchResults = action.payload;
    },
    setSearchLoading(state, action: PayloadAction<boolean>) {
      state.searchLoading = action.payload;
    },
    setSearchError(state, action: PayloadAction<string>) {
      state.searchError = action.payload;
    },
    setSelectedJobDescription(state, action: PayloadAction<DashboardState['selectedJobDescription']>) {
      state.selectedJobDescription = action.payload;
    },
    resetDashboardState() {
      return initialState;
    },
  },
});

export const {
  setShowModal,
  setShowJobPreferencesModal,
  setShowJobSearchModal,
  setShowProfileModal,
  setEditingApplication,
  setSearchForm,
  setSearchResults,
  setSearchLoading,
  setSearchError,
  setSelectedJobDescription,
  resetDashboardState,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;
