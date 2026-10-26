const labels = { 'optionals-only': 'Optionals only', 'winners-circle': 'Winners Circle' };

export function sanitizeParticipationFields(contestant) {
  return Object.hasOwn(labels, contestant.participation) ? { participation: contestant.participation } : {};
}

export const participationLabel = contestant => labels[contestant.participation] || '';
export const winnersCircleNote = 'Practice participant from another state. Not eligible for a crown.';
