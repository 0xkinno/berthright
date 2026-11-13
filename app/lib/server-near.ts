// Server-only signing for the two accounts the app itself operates on testnet: the judge sponsor
// (creates throwaway judge accounts) and the crew welfare trust (issues berths). Keys come from
// environment variables only. Never imported by client components.
import "server-only";
import { Account, JsonRpcProvider, actions, type KeyPairString } from "near-api-js";
import { RPC_URLS } from "./config";
import { parseOutcome } from "./near";

export function serverAccount(idVar: string, keyVar: string): Account | null {
  const id = process.env[idVar];
  const key = process.env[keyVar];
  if (!id || !key) return null;
  return new Account(id, new JsonRpcProvider({ url: RPC_URLS[0] }) as never, key as KeyPairString);
}

export async function fnCall(acc: Account, receiverId: string, method: string, args: object, deposit = 0n, gasT = 300) {
  const res = await acc.signAndSendTransaction({ receiverId, actions: [actions.functionCall(method, args, BigInt(gasT) * 10n ** 12n, deposit)], waitUntil: "FINAL" } as never);
  return parseOutcome(res);
}
