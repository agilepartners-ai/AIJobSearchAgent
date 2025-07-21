// Suppress SES warnings for development
// These warnings come from dependencies and are safe to ignore in development

// Override console.warn to filter out SES deprecation warnings
const originalWarn = console.warn;
const originalError = console.error;
const originalLog = console.log;

console.warn = (...args: any[]) => {
  const message = args.join(' ');
  
  // Filter out SES deprecation warnings
  if (message.includes("The 'dateTaming' option is deprecated") ||
      message.includes("The 'mathTaming' option is deprecated") ||
      message.includes("SES Removing unpermitted intrinsics") ||
      message.includes("Removing intrinsics.%DatePrototype%.toTemporalInstant") ||
      message.includes("React Router Future Flag Warning") ||
      message.includes("Components object is deprecated") ||
      message.includes("lockdown-install.js")) {
    return;
  }
  
  // Allow other warnings through
  originalWarn.apply(console, args);
};

console.error = (...args: any[]) => {
  const message = args.join(' ');
  
  // Filter out SES-related errors
  if (message.includes("SES_UNCAUGHT_EXCEPTION") ||
      message.includes("lockdown-install.js") ||
      message.includes("SES The 'dateTaming'") ||
      message.includes("SES The 'mathTaming'") ||
      message.includes("SES Removing unpermitted")) {
    return;
  }
  
  // Allow other errors through
  originalError.apply(console, args);
};

console.log = (...args: any[]) => {
  const message = args.join(' ');
  
  // Filter out SES-related logs
  if (message.includes("SES The 'dateTaming'") ||
      message.includes("SES The 'mathTaming'") ||
      message.includes("SES Removing unpermitted") ||
      message.includes("lockdown-install.js")) {
    return;
  }
  
  // Allow other logs through
  originalLog.apply(console, args);
};

// Global error handler to catch SES errors
window.addEventListener('error', (event) => {
  if (event.message && (
    event.message.includes('SES_UNCAUGHT_EXCEPTION') ||
    event.message.includes('lockdown-install.js') ||
    event.message.includes("dateTaming") ||
    event.message.includes("mathTaming")
  )) {
    event.preventDefault();
    return false;
  }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message && (
    event.reason.message.includes('SES_UNCAUGHT_EXCEPTION') ||
    event.reason.message.includes('lockdown-install.js')
  )) {
    event.preventDefault();
  }
});

export {};