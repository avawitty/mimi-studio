import { triggerAlert } from '../services/errorHandling';

export const useErrorHandler = () => {
  const handleError = (error: unknown, defaultMessage: string = 'An unexpected error occurred') => {
    console.error(error);
    const message = error instanceof Error ? error.message : defaultMessage;
    triggerAlert(message, 'error');
  };
  return { handleError };
};
