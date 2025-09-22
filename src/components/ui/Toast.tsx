import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ id, type, title, message, duration = 2500, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(id), 150);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="text-green-500 flex-shrink-0" size={14} />;
      case 'error':
        return <AlertCircle className="text-red-500 flex-shrink-0" size={14} />;
      case 'warning':
        return <AlertCircle className="text-yellow-500 flex-shrink-0" size={14} />;
      default:
        return <Info className="text-blue-500 flex-shrink-0" size={14} />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500 bg-opacity-20 backdrop-blur-lg border-green-500';
      case 'error':
        return 'bg-red-100 dark:bg-red-900 border-red-300 dark:border-red-700';
      case 'warning':
        return 'bg-yellow-100 dark:bg-yellow-900 border-yellow-300 dark:border-yellow-700';
      default:
        return 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700';
    }
  };

  return (
    <div
      className={`
        transform transition-all duration-150 ease-in-out
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${getBackgroundColor()}
        border-2 rounded-lg shadow-lg backdrop-blur-sm p-2 max-w-[240px] w-auto min-w-[180px]
      `}
    >
      <div className="flex items-start gap-1.5">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <h4 className={`text-xs font-semibold leading-tight ${type === 'success' ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
            {title}
          </h4>
          {message && (
            <p className={`text-xs mt-1 leading-tight ${type === 'success' ? 'text-gray-200' : 'text-gray-700 dark:text-gray-200'}`}>
              {message}
            </p>
          )}
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => onClose(id), 150);
          }}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100 transition-colors p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded flex-shrink-0"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
};

// Toast Container Component
export interface ToastContainerProps {
  toasts: ToastProps[];
  onRemoveToast: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemoveToast }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={onRemoveToast}
        />
      ))}
    </div>
  );
};

// Custom hook for managing toasts
export const useToast = () => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const addToast = (toast: Omit<ToastProps, 'id' | 'onClose'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { ...toast, id, onClose: removeToast }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const showSuccess = (title: string, message?: string) => {
    addToast({ type: 'success', title, message });
  };

  const showError = (title: string, message?: string) => {
    addToast({ type: 'error', title, message });
  };

  const showInfo = (title: string, message?: string) => {
    addToast({ type: 'info', title, message });
  };

  const showWarning = (title: string, message?: string) => {
    addToast({ type: 'warning', title, message });
  };

  return {
    toasts,
    removeToast,
    showSuccess,
    showError,
    showInfo,
    showWarning,
  };
};

export default Toast;
