---
inclusion: fileMatch
fileMatchPattern: 'src/components/**/*.tsx'
---

# UI Component Patterns

## Modal Components
- Use consistent modal backdrop: `fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50`
- Include close button with X icon from Lucide React
- Support keyboard navigation (Escape key)
- Use proper z-index layering

## Form Components
- Use controlled components with useState
- Include proper validation and error states
- Show loading states during submission
- Use consistent input styling with Tailwind
- Implement password strength validation for password fields
- Use rate limiting for sensitive operations (password reset, etc.)
- Provide clear success and error feedback

## Button Patterns
```typescript
// Primary button
className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"

// Secondary button
className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-4 py-2 rounded-lg font-medium transition-colors"

// Danger button
className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
```

## Loading States
- Use consistent loading spinners or skeleton screens
- Show loading text for longer operations
- Disable interactive elements during loading
- Provide progress indicators where appropriate

## Toast Notifications
- Use `useToastContext()` for user feedback
- Types: 'success', 'error', 'warning', 'info'
- Keep messages concise and actionable
- Auto-dismiss after appropriate timeout

## Icon Usage
- Use Lucide React icons consistently
- Standard sizes: 16px (size={16}), 20px (size={20}), 24px (size={24})
- Apply consistent colors: `text-gray-600 dark:text-gray-400` for secondary icons

## Responsive Design
- Mobile-first approach with Tailwind breakpoints
- Use `sm:`, `md:`, `lg:`, `xl:` prefixes appropriately
- Ensure touch targets are at least 44px on mobile
- Test on various screen sizes

## Dark Mode Support
- Always include dark mode variants for colors
- Use semantic color names (primary, secondary, etc.)
- Test both light and dark themes
- Use `dark:` prefix for dark mode styles

## Accessibility
- Include proper ARIA labels and roles
- Ensure keyboard navigation works
- Maintain proper color contrast ratios
- Use semantic HTML elements

## Animation Patterns
- Use Framer Motion for complex animations
- Keep animations subtle and purposeful
- Use consistent timing (duration: 200-300ms for UI transitions)
- Respect user's motion preferences

## Common Component Structure
```typescript
interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
  // Other specific props
}

const Component: React.FC<ComponentProps> = ({ 
  className = '', 
  children,
  ...props 
}) => {
  return (
    <div className={`base-styles ${className}`} {...props}>
      {children}
    </div>
  );
};
```