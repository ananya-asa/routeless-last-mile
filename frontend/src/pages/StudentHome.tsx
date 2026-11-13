import React from 'react';

export const StudentHome: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
        <h2 className="text-lg font-bold text-stone-800">Student Commute Status</h2>
        <p className="text-sm text-stone-500">Pick village and check your route or report a breakdown.</p>
      </div>
    </div>
  );
};
