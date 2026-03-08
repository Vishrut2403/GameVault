// PS3 Game Serial Database

export const PS3_SERIALS: Record<string, string> = {
  '15013': 'BCES00800',  // God of War III (EUR)
};

export function getPS3SerialByGameId(gameId: string | number): string | null {
  return PS3_SERIALS[String(gameId)] || null;
}

export function getPS3SerialByName(gameName: string): string | null {
  const normalized = gameName.toLowerCase().trim();
  
  const nameMap: Record<string, string> = {
    'god of war iii': 'BCUS98111',
    'god of war 3': 'BCUS98111',
    'god of war: ascension': 'BCUS98229',
  };
  
  return nameMap[normalized] || null;
}

export const PS3_SERIAL_PATTERNS = {
  USA: /^B[CL]US\d{5}$/,
  EUR: /^B[CL]ES\d{5}$/,
  JPN: /^B[CL]JS\d{5}$/,
  ASIA: /^B[CL]AS\d{5}$/,
};

export function isValidPS3Serial(serial: string): boolean {
  return Object.values(PS3_SERIAL_PATTERNS).some(pattern => pattern.test(serial));
}