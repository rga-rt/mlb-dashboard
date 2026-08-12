// Whether a transaction is an injured-list move. The feed models IL placements
// and activations as generic "Status Change" (SC) rows, so we sniff the
// description — this lets the News badge flag injuries in clay, matching the
// roster status badge. Auto-imported by Nuxt (~/utils).
export function isInjuryTransaction(typeCode: string, description: string): boolean {
  return typeCode === 'SC' && /injured list/i.test(description)
}
