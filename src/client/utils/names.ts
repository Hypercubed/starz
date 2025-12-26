const adjectives = [
  'Commander',
  'Admiral',
  'Marshal',
  'Commodore',
  'General',
  'Colonel',
  'Warden',
  'Sentinel',
  'Vanguard',
  'Overseer',
  'Legate',
  'Centurion',
  'Praetor',
  'Brigadier',
  'Ambassador',
  'Director',
  'Chancellor',
  'Prefect'
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
  'Nyx',
  'Crusher',
  'Wheaton',
  'Szilard',
  'Coloma'
];

export function generateName() {
  const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomName = names[Math.floor(Math.random() * names.length)];
  return `${randomAdj}-${randomName}`;
}
