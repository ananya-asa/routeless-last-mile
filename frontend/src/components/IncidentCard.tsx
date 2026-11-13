import React from 'react';
import { Incident } from '../data/types';
import { StatusChip } from './StatusChip';

interface Props {
  incident: Incident;
  onConfirm?: () => void;
  onDismiss?: () => void;
}

export const IncidentCard: React.FC<Props> = ({ incident, onConfirm, onDismiss }) => {
  return (
    <div className="border border-stone-200 rounded-lg p-4 bg-white shadow-sm flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-stone-800 uppercase text-xs">{incident.type}</span>
        <StatusChip status={incident.status} />
      </div>
      <p className="text-sm text-stone-600">{incident.details || 'No details'}</p>
      {incident.status === 'reported' && (
        <div className="flex gap-2 mt-2">
          <button onClick={onConfirm} className="bg-emerald-600 text-white text-xs px-3 py-1 rounded hover:bg-emerald-700">Confirm</button>
          <button onClick={onDismiss} className="bg-stone-200 text-stone-700 text-xs px-3 py-1 rounded hover:bg-stone-300">Dismiss</button>
        </div>
      )}
    </div>
  );
};

