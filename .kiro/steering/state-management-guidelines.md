---
inclusion: fileMatch
fileMatchPattern: 'src/store/*.ts'
---

# State Management Guidelines

## Redux Toolkit Patterns
- Use Redux Toolkit for global application state
- Create typed hooks in `store/hooks.ts`
- Use Redux Persist for data that should survive page refreshes
- Follow the existing slice patterns in the codebase

## Jotai Patterns
- Use Jotai atoms for component-specific or feature-specific state
- Prefer Jotai for temporary UI state (modals, conversations, screens)
- Use primitive atoms and derived atoms appropriately

## Existing Store Structure
```typescript
// Redux slices (global state)
- dashboardSlice.ts - Dashboard UI state and data
- applicationModalSlice.ts - Application modal state
- aiEnhancementModalSlice.ts - AI enhancement modal state
- resumeTemplateFormSlice.ts - Resume template form state

// Jotai atoms (component state)
- conversation.ts - Interview conversation state
- screens.ts - Screen navigation state
- game.ts - Interview game scoring state
- settings.ts - User settings
- tokens.ts - API tokens
- musicVolume.ts - Audio settings
```

## Redux Slice Pattern
```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SliceState {
  data: DataType[];
  loading: boolean;
  error: string | null;
}

const initialState: SliceState = {
  data: [],
  loading: false,
  error: null,
};

const sliceName = createSlice({
  name: 'sliceName',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setData: (state, action: PayloadAction<DataType[]>) => {
      state.data = action.payload;
      state.loading = false;
      state.error = null;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },
    resetState: (state) => {
      Object.assign(state, initialState);
    },
  },
});

export const { setLoading, setData, setError, resetState } = sliceName.actions;
export default sliceName.reducer;
```

## Jotai Atom Pattern
```typescript
import { atom } from 'jotai';

// Primitive atoms
export const dataAtom = atom<DataType | null>(null);
export const loadingAtom = atom<boolean>(false);

// Derived atoms
export const processedDataAtom = atom(
  (get) => {
    const data = get(dataAtom);
    return data ? processData(data) : null;
  }
);

// Write-only atoms for actions
export const updateDataAtom = atom(
  null,
  (get, set, newData: DataType) => {
    set(dataAtom, newData);
    set(loadingAtom, false);
  }
);
```

## Usage in Components
```typescript
// Redux usage
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setData, setLoading } from '../../store/sliceName';

const Component = () => {
  const dispatch = useAppDispatch();
  const { data, loading } = useAppSelector(state => state.sliceName);

  const handleUpdate = () => {
    dispatch(setLoading(true));
    // API call logic
    dispatch(setData(newData));
  };
};

// Jotai usage
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { dataAtom, loadingAtom } from '../store/atoms';

const Component = () => {
  const [data, setData] = useAtom(dataAtom);
  const loading = useAtomValue(loadingAtom);
  const updateData = useSetAtom(updateDataAtom);
};
```

## When to Use Which
- **Redux**: Global app state, data shared across many components, persistent data
- **Jotai**: Component-specific state, temporary UI state, derived state, modal states