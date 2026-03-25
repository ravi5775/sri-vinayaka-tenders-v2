import React, { useEffect, useState } from 'react';
import { useToastContext as useToast } from '../contexts/ToastContext';
import { CheckCircle, AlertTriangle, X } from 'lucide-react';
import { sanitize } from '../utils/sanitizer';

const Toast: React.FC = () => {
  const { toast, hideToast } = useToast();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (toast?.isVisible) {
      setShow(true);
    } else {
      const timeoutId = setTimeout(() => {
        setShow(false);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [toast]);

  if (!show || !toast) return null;

  const isSuccess = toast.type === 'success';
  const Icon = isSuccess ? CheckCircle : AlertTriangle;
  const bgColor = isSuccess ? 'bg-green-500' : 'bg-destructive';

  return (
    <div
      className={`fixed top-5 right-5 z-[100] w-full max-w-sm rounded-md shadow-lg flex items-center p-4 ${bgColor} text-white transition-transform duration-300 ease-out ${toast.isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex-shrink-0">
        <Icon className="h-6 w-6" />
      </div>
      <div className="ml-3 mr-auto">
        <p className="font-medium">{sanitize(toast.message)}</p>
      </div>
      <button
        onClick={hideToast}
        className="ml-4 p-1 rounded-md hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
};

export default Toast;
