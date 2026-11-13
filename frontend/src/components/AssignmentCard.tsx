import React from 'react';
import { RecoveryProposal } from '../data/types';

interface Props {
  proposal: RecoveryProposal;
}

export const AssignmentCard: React.FC<Props> = ({ proposal }) => {
  return (
    <div className="border border-emerald-200 bg-emerald-50/50 rounded-lg p-3 text-sm">
      <div className="font-semibold text-emerald-900">{proposal.studentId} → {proposal.transportLabel}</div>
      <div className="text-xs text-emerald-700 mt-1">{proposal.explanation}</div>
    </div>
  );
};
