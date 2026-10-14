import { optionalCategories } from './data.js';

export const optionalKeys = optionalCategories.map(([key]) => key);
export const optionalDetailLabels = {
  'prettiest-best': { eyes: 'Eyes', hair: 'Hair', smile: 'Smile', dress: 'Dress', sportswear: 'Sportswear' },
  'commercial-print': { headshot: 'Headshot', portfolio: 'Portfolio', 'zed-card': 'Zed Card', 'tear-sheet': 'Tear Sheet' },
  'optional-talent': { 'command-performance': 'Command Performance', 'optional-talent': 'Optional Talent' }
};
const approved = values => [...new Set(values.filter(key => optionalKeys.includes(key)))];
export function sanitizeOptionalFields(record) {
  const optionals = Array.isArray(record.optionals) ? approved(record.optionals) : null;
  const fields = { optionals };
  if (optionals && Array.isArray(record.optionalCoverage)) fields.optionalCoverage = approved(record.optionalCoverage);
  if (optionals && record.optionalDetails && typeof record.optionalDetails === 'object') {
    const details = {};
    for (const [category, labels] of Object.entries(optionalDetailLabels)) {
      const values = record.optionalDetails[category];
      if (optionals.includes(category) && Array.isArray(values)) {
        const valid = [...new Set(values.filter(key => Object.hasOwn(labels, key)))];
        if (valid.length) details[category] = valid;
      }
    }
    if (Object.keys(details).length) fields.optionalDetails = details;
  }
  return fields;
}
export function knownOptionalKeys(contestant) {
  if (!Array.isArray(contestant.optionals)) return [];
  return Array.isArray(contestant.optionalCoverage) ? contestant.optionalCoverage : optionalKeys;
}
export function unknownOptionals(contestant) {
  const known = knownOptionalKeys(contestant);
  return optionalCategories.filter(([key]) => !known.includes(key) && !contestant.optionals?.includes(key));
}
export function optionalStatus(event, contestant) {
  if (event.audience === 'all') return 'required';
  const relevant = event.audience === 'any-optional' ? optionalKeys : event.optional || [];
  if (relevant.some(key => contestant.optionals?.includes(key))) return 'entered';
  return relevant.some(key => !knownOptionalKeys(contestant).includes(key)) ? 'unknown' : 'not-entered';
}
export function optionalEntryLabels(contestant) {
  return optionalCategories.filter(([key]) => contestant.optionals?.includes(key)).map(([key, label]) => {
    const details = contestant.optionalDetails?.[key]?.map(value => optionalDetailLabels[key]?.[value]).filter(Boolean);
    return details?.length && !(details.length === 1 && details[0] === label) ? `${label}: ${details.join(', ')}` : label;
  });
}
