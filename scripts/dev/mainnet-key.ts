// Dev helper: create (once) the mainnet operator key; its implicit account receives the Intents deposit.
import { KeyPair } from "near-api-js";
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
const dir = `${process.env.HOME}/.near-credentials/mainnet`;
mkdirSync(dir, { recursive: true });
const f = `${dir}/operator.json`;
if (!existsSync(f)) {
  const kp = KeyPair.fromRandom("ed25519");
  const implicit = Buffer.from(kp.getPublicKey().data).toString("hex");
  writeFileSync(f, JSON.stringify({ account_id: implicit, public_key: kp.getPublicKey().toString(), private_key: kp.toString() }), { mode: 0o600 });
  appendFileSync(".env.local", `\nMAINNET_OPERATOR_ID=${implicit}\nMAINNET_OPERATOR_KEY=${kp.toString()}\n`);
}
console.log(JSON.parse(readFileSync(f, "utf8")).account_id);
