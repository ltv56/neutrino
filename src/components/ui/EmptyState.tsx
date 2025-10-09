import React from 'react';

interface EmptyStateProps {
  title?: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const EmptyState: React.FC<EmptyStateProps> = ({ title, message, action }) => {
  return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="text-center">
        {title && (
          <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
        )}
        <p className="text-gray-500 mb-4">{message}</p>
        {action && (
          <button
            onClick={action.onClick}
            className="btn"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
};

export default EmptyState;