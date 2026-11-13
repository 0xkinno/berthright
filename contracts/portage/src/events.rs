//! NEP-297 events, standard `berthright`, version `1.0.0`. Each event carries enough to rebuild
//! every ship and berth from logs alone (`scripts/verify.ts` does exactly that).

use near_sdk::serde_json::{json, Value};
use near_sdk::env;

pub const STANDARD: &str = "berthright";
pub const VERSION: &str = "1.0.0";

pub fn emit(event: &str, data: Value) {
    let payload = json!({
        "standard": STANDARD,
        "version": VERSION,
        "event": event,
        "data": [data],
    });
    env::log_str(&format!("EVENT_JSON:{payload}"));
}

/// A refusal inside a callback cannot panic without losing the state written before it, so it is
/// logged with its stable code instead. The app decodes the code into plain words.
pub fn refuse(code: &str, detail: Value) {
    env::log_str(&format!("REFUSED:{}", json!({ "code": code, "detail": detail })));
}
