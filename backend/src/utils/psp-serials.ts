// PSP Game Serial Database

export const PSP_SERIALS: Record<string, string> = {
  '3262': 'UCUS98732',  // God of War: Chains of Olympus (USA)
  '3263': 'UCUS98737',  // God of War: Ghost of Sparta (USA)
  
};

export function getPSPSerialByGameId(gameId: string | number): string | null {
  return PSP_SERIALS[String(gameId)] || null;
}

export const PSP_SERIAL_PATTERNS = {
  USA: /^U[CL]US\d{5}$/,
  EUR: /^U[CL]ES\d{5}$/,
  JPN: /^U[CL]JS\d{5}$/,
  ASIA: /^U[CL]AS\d{5}$/,
  NPJH: /^NPJH\d{5}$/, 
  NPUH: /^NPUH\d{5}$/,  
};

export function isValidPSPSerial(serial: string): boolean {
  return Object.values(PSP_SERIAL_PATTERNS).some(pattern => pattern.test(serial));
}