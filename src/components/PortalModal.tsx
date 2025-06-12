import React from 'react';
import { createPortal } from 'react-dom';

export const PortalModal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return createPortal(children, document.body);
}; 