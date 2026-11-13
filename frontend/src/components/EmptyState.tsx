import React from 'react';

interface Props {
  title: string;
  description: string;
}

export const EmptyState: React.FC<Props> = ({ title, description }) => {
  return (
    <div className="text-center py-8 px-4 border border-dashed border-stone-300 rounded-xl bg-stone-50">
      <h3 className="text-sm font-semibold text-stone-700">{title}</h3>
      <p className="text-xs text-stone-500 mt-1">{description}</p>
    </div>
  );
};
