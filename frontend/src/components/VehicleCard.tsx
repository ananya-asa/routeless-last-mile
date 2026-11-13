import React from 'react';
import { TransportOption } from '../data/types';
import { StatusChip } from './StatusChip';

interface Props {
  transport: TransportOption;
}

export const VehicleCard: React.FC<Props> = ({ transport }) => {
  return (
    <div className="border border-stone-200 rounded-lg p-4 bg-white shadow-sm flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-stone-800">{transport.label}</span>
        <StatusChip status={transport.status} />
      </div>
      <div className="text-xs text-stone-500">
        Seats: {transport.occupied_seats} / {transport.capacity}
      </div>
    </div>
  );
};

