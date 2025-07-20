import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';
import applicationModalReducer from './applicationModalSlice';
import dashboardReducer from './dashboardSlice';
import resumeTemplateFormReducer from './resumeTemplateFormSlice';
import aiEnhancementModalReducer from './aiEnhancementModalSlice';
import { persistStore, persistReducer } from 'redux-persist';
import createWebStorage from 'redux-persist/lib/storage/createWebStorage';

const createNoopStorage = () => {
  return {
    getItem(_key: string) {
      return Promise.resolve(null);
    },
    setItem(_key: string, value: string) {
      return Promise.resolve(value);
    },
    removeItem(_key: string) {
      return Promise.resolve();
    },
  };
};

const customStorage = typeof window !== 'undefined' ? createWebStorage('local') : createNoopStorage();

const rootReducer = combineReducers({
  applicationModal: applicationModalReducer,
  dashboard: dashboardReducer,
  resumeTemplateForm: resumeTemplateFormReducer,
  aiEnhancementModal: aiEnhancementModalReducer,
});

const persistConfig = {
  key: 'root',
  storage: customStorage,
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
