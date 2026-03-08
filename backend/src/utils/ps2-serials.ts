// PS2 Game Serial Database

export const PS2_SERIALS: Record<string, string> = {
  '2782': 'SCUS-97399',  // God of War (USA)
  '2783': 'SCUS-97481',  // God of War II (USA)
  '21122': 'SLUS-21600', // Spider-Man: Friend or Foe 
};

export function getSerialByGameId(gameId: string | number): string | null {
  return PS2_SERIALS[String(gameId)] || null;
}

export function getSerialByName(gameName: string): string | null {
  const normalized = gameName.toLowerCase().trim();
  
  const nameMap: Record<string, string> = {
    'god of war': 'SCUS-97399',
    'god of war ii': 'SCUS-97481',
    'kingdom hearts ii': 'SLUS-20770',
    'final fantasy x': 'SLUS-20064',
  };
  
  return nameMap[normalized] || null;
}