import React from 'react';

export const CoordinatorDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
        <h2 className="text-lg font-bold text-stone-800">Coordinator Overview</h2>
        <p className="text-sm text-stone-500">Review reported disruptions and approve recovery plans.</p>
      </div>
    </div>
  );
};

