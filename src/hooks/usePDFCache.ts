import { useContext } from 'react';
import { PDFCacheContext } from '@/contexts/pdf-cache/PDFCacheContext';

export const usePDFCache = () => {
  const context = useContext(PDFCacheContext);
  if (!context) {
    throw new Error('usePDFCache must be used within PDFCacheProvider');
  }
  return context;
};
