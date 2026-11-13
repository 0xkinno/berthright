// Stable refusal codes from the contracts and the House of Stake wallet, in plain words.
export const CODES: Record<string, string> = {
  E_RESERVE_NOT_ON_BOARD: "Refused: four months of this berth's wages and the fare home are not on board yet. The shipowner must lock them before anyone signs on.",
  E_RESERVE_BELOW_MLC: "Refused: a ship cannot promise less than four months of wages.",
  E_GRACE_TOO_LONG: "Refused: the grace period cannot be longer than 30 ship days.",
  E_WAGE_DIFFERS_FROM_YOUR_CONTRACT: "Refused: the wage you confirmed is not the wage on this berth. Check your contract before signing on.",
  E_NOT_BERTH_HOLDER: "Refused: you do not hold this berth.",
  E_COLLECTION_MISMATCH: "Refused: this account is not a berth in the crew namespace.",
  E_NOT_IN_COLLECTION: "Refused: the registry does not list this berth.",
  E_BERTH_NOT_ACTIVE: "Refused: the berth is frozen, expired or suspended.",
  E_BERTH_UNREADABLE: "The berth did not answer. Nothing moved; try again.",
  E_BERTH_TAKEN: "Refused: someone is already signed on to this berth.",
  E_NOTHING_DUE: "Nothing is due yet.",
  E_ARREARS_RECORDED: "The chest could not cover these wages. They are recorded as unpaid and the grace clock is running.",
  E_NOT_YET_ABANDONED: "Refused: the grace period has not ended yet.",
  E_NOT_ABANDONED: "Refused: the ship is still paying, so the guarantee stays locked.",
  E_ALREADY_RELEASED: "Refused: this crew member's guarantee was already paid.",
  E_RESERVE_LOCKED: "Refused: that money is a crew reserve or earned wages. The owner can only take back true surplus.",
  E_SHIP_ABANDONED: "Refused: the ship is abandoned. Use release instead.",
  E_SHIP_NOT_ACTIVE: "Refused: the ship is not active.",
  E_NOT_SHIP_OWNER: "Refused: only the shipowner can do this.",
  E_NOT_A_CREW_NAME: "Refused: a berth must be a name issued under the crew namespace.",
  E_CREW_ON_BOARD: "Refused: crew are still signed on.",
  E_WRONG_TOKEN: "Refused: this ship is funded in a different token.",
  E_BERTH_CHANGED_HANDS: "Stopped: the berth changed hands, so the old holder's allotment ended.",
  E_WALLET_REFUSED: "Stopped: the berth's own wallet refused the payment (no grant, wrong receiver, over budget, expired or frozen).",
  E_NOT_DUE: "Not due yet.",
  E_FLOAT_TOO_LOW: "The allotment contract's gas float is low. Nothing moved.",
  RECEIVER_NOT_GRANTED: "Refused by the berth wallet: that receiver was never granted.",
  TOKEN_CAP_EXCEEDED: "Refused by the berth wallet: this would pass the budget the crew member set.",
  TOKEN_NOT_GRANTED: "Refused by the berth wallet: that token was never granted.",
  NO_SPEND_GRANT: "Refused by the berth wallet: there is no grant (hand-over wipes it).",
  GRANT_EXPIRED: "Refused by the berth wallet: the grant expired.",
  FROZEN: "Refused by the berth wallet: the berth is frozen.",
  ONLY_OWNER: "Refused by the berth wallet: only the holder can do that.",
  ONLY_AUTHORITY: "Refused: only House of Stake's authority can do that.",
  TRANSFER_NOT_REQUESTED: "Refused: a live berth cannot move unless its holder asks.",
  SubAccountHoldsTokens: "Refused by the registry: the berth still holds a listed token. Empty it first.",
};

export function decode(text?: string | null): { code: string | null; words: string } {
  if (!text) return { code: null, words: "" };
  for (const code of Object.keys(CODES).sort((a, b) => b.length - a.length)) {
    if (text.includes(code)) return { code, words: CODES[code] };
  }
  const m = text.match(/E_[A-Z_]+/);
  if (m) return { code: m[0], words: m[0] };
  return { code: null, words: text.slice(0, 240) };
}
