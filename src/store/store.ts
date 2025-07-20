import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';
import applicationModalReducer from './applicationModalSlice';
import dashboardReducer from './dashboardSlice';
import resumeTemplateFormReducer from './resumeTemplateFormSlice';
import aiEnhancementModalReducer from './aiEnhancementModalSlice';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

const rootReducer = combineReducers({
  applicationModal: applicationModalReducer,
  dashboard: dashboardReducer,
  resumeTemplateForm: resumeTemplateFormReducer,
  aiEnhancementModal: aiEnhancementModalReducer,
});

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['applicationModal', 'dashboard', 'resumeTemplateForm', 'aiEnhancementModal']
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
