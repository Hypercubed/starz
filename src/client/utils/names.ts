const adjectives = [
  'Commander',
  'Admiral',
  'Captain',
  'Marshal',
  'Commodore',
  'General',
  'Colonel',
  'Major',
  'Warden',
  'Sentinel',
  'Vanguard',
  'Overseer',
  'Legate',
  'Centurion',
  'Praetor'
];

const names = [
  'Raxis',
  'Vex',
  'Thane',
  'Zephyr',
  'Korr',
  'Lyra',
  'Dax',
  'Kael',
  'Nova',
  'Orion',
  'Astra',
  'Cade',
  'Ryker',
  'Vega',
  'Nyx'
];

export function generateName() {
  const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomName = names[Math.floor(Math.random() * names.length)];
  return `${randomAdj}-${randomName}`;
}
