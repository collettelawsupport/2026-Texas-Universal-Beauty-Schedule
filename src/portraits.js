// Organizer-supplied portraits are tied to stable roster IDs, not name guesses.
const portraits = {
  'contestant-99796932b0b04a123a4f2223': 'brynley-buzzard.jpg',
  'contestant-7a430f914fcdf0df0f444342': 'analisa-hernandez.png',
  'contestant-d0db144587f37d862bece431': 'aviendha-smith.jpg',
  'contestant-d3d52342cdeb2120ff2df9ed': 'bonnie-raquet.png',
  'contestant-436d508fe463a35ec9207a2c': 'emma-jorgensen.jpg',
  'contestant-57110e45991c9c02b7fca42f': 'isabella-chauvette.png',
  'contestant-666de8bd04dce85c7e49894a': 'jasmine-romero.jpg',
  'contestant-c2248ff3c271f69ff8b30fac': 'jesse-finch.jpg',
  'contestant-fd6c86e6c86b274b25cce972': 'magnolia-maupin.jpg',
  'contestant-dd0d4936dfa93984caa5b7eb': 'mareigh-chavez.jpg',
  'contestant-526c47bafe5b62440b136973': 'misty-davis.png',
  'contestant-efe45ed63f1e80df1a248d1f': 'paxtyn-pike.png',
  'contestant-0a6974bdea67ca6c68427d05': 'penelope-pike.png',
  'contestant-4f11d749e8f5c260169bd526': 'silas-elgourbi.jpg',
  'contestant-b9e4d56dccc44a41d2cc129e': 'skylar-beaver.jpg',
  'contestant-5cb7014c7bdd22522c5cd15d': 'victoria-dishon.jpg'
};

export function portraitFor(contestant, { optimize = true } = {}) {
  const file = Object.hasOwn(portraits, contestant.id) ? portraits[contestant.id] : null;
  if (!file) return null;
  const original = `/assets/portrait-${file}`;
  return {
    key: file.replace(/\.[^.]+$/, ''),
    original,
    src: optimize ? `/.netlify/images?url=${encodeURIComponent(original)}&w=320&fm=webp&q=85` : original
  };
}
