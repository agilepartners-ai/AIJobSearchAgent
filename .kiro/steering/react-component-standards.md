---
inclusion: fileMatch
fileMatchPattern: '*.tsx'
---

# React Component Standards

## Component Structure
- Use functional components with TypeScript interfaces
- Prefer named exports over default exports for better tree-shaking
- Use proper TypeScript interfaces for props and state

## Styling Guidelines
- Use Tailwind CSS classes exclusively for styling
- Support dark mode with `dark:` prefixes
- Use responsive design with `sm:`, `md:`, `lg:` prefixes
- Common patterns:
  - `bg-white dark:bg-gray-900` for backgrounds
  - `text-gray-900 dark:text-white` for primary text
  - `border-gray-200 dark:border-gray-700` for borders

## State Management
- Use `useAuth()` hook for authentication state
- Use Redux Toolkit for global application state
- Use Jotai atoms for component-specific state (conversations, screens, etc.)
- Use `useAppDispatch` and `useAppSelector` for typed Redux hooks

## Error Handling
- Wrap API calls in try-catch blocks
- Use `useToastContext()` for user notifications
- Include loading states for async operations
- Provide fallback UI for error states

## Common Patterns
- Modal components should use consistent close button styling
- Form components should include proper validation
- Use Lucide React icons consistently
- Include proper accessibility attributes (aria-labels, roles)

## Example Component Structure
```tsx
import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToastContext } from '../ui/ToastProvider';

interface ComponentProps {
  isOpen: boolean;
  onClose: () => void;
  data?: SomeDataType;
}

const MyComponent: React.FC<ComponentProps> = ({ isOpen, onClose, data }) => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { showToast } = useToastContext();

  const handleSubmit = async () => {
    try {
      setLoading(true);
      // API call logic
      showToast('Success message', 'success');
    } catch (error) {
      showToast('Error message', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        {/* Component content */}
      </div>
    </div>
  );
};

export default MyComponent;
```