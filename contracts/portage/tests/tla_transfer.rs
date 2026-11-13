//! What actually moves when a berth (a House of Stake leased name) changes hands. Run against the
//! real HoS wasm. Results are written up in docs/FINDINGS.md and docs/FRICTION.md.
mod common;
use anyhow::Result;
use common::*;
use near_workspaces::types::NearToken;
use serde_json::json;

#[tokio::test]
async fn tla_transfer_sweeps_native_near_to_the_seller_but_leaves_tokens() -> Result<()> {
    let w = deploy_world().await?;
    let berth = w.issue_berth("ab2-sweep", w.arjun.id(), w.arjun.id()).await?;
    assert_eq!(w.token_owner(&berth).await?.as_deref(), Some(w.arjun.id().as_str()));
    let seq0 = u(&w.item(&berth).await?["rotation_seq"]);

    w.arjun.transfer_near(&berth, NearToken::from_near(5)).await?.into_result()?;
    w.send_tusd(&w.owner, &berth, 100 * TUSD).await?;
    let arjun_near_before = w.near_of(w.arjun.id()).await?;
    let berth_near_before = w.near_of(&berth).await?;

    let out = ok(w.transfer_berth(&w.arjun, &berth, w.relief.id()).await?, "nft_transfer")?;
    let l = logs(&out);
    println!("transfer logs: {l:#?}");

    let item = w.item(&berth).await?;
    assert_eq!(item["owner_id"], w.relief.id().as_str());
    assert_eq!(u(&item["rotation_seq"]), seq0 + 1, "every hand-over bumps rotation_seq");
    assert_eq!(w.token_owner(&berth).await?.as_deref(), Some(w.relief.id().as_str()));

    let arjun_gain = w.near_of(w.arjun.id()).await? as i128 - arjun_near_before as i128;
    let berth_after = w.near_of(&berth).await?;
    println!("berth NEAR before {berth_near_before} after {berth_after}; seller gained {arjun_gain}");
    assert!(arjun_gain > NearToken::from_millinear(4_900).as_yoctonear() as i128, "native NEAR above the storage reserve went to the seller's payout account");
    assert!(berth_after < NearToken::from_millinear(100).as_yoctonear(), "only the storage reserve stays");
    assert!(l.iter().any(|x| x.contains("swept_near") || x.contains("SweptNear") || x.contains("sweep")), "a sweep event was emitted: {l:?}");

    assert_eq!(w.tusd_of(&berth).await?, 100 * TUSD, "NEP-141 balances are not swept: they stay in the account and pass to the buyer");
    Ok(())
}

#[tokio::test]
async fn an_allowlisted_token_blocks_the_transfer_until_the_berth_is_empty() -> Result<()> {
    let w = deploy_world().await?;
    let berth = w.issue_berth("ab2-gate", w.arjun.id(), w.arjun.id()).await?;
    ok(call(&w.council, w.registry.id(), "add_ft_allowlist", json!({ "token": w.tusd.id() }), ONE_YOCTO).await?, "allowlist")?;
    w.send_tusd(&w.owner, &berth, 10 * TUSD).await?;
    let refused = w.transfer_berth(&w.arjun, &berth, w.relief.id()).await?;
    assert!(refused.is_failure(), "a registry-allowlisted token balance must block the hand-over");
    assert!(failure_text(&refused).contains("SubAccountHoldsTokens") || format!("{:?}", logs(&refused)).contains("holds") || failure_text(&refused).to_lowercase().contains("token"), "{}", failure_text(&refused));
    assert_eq!(w.item(&berth).await?["owner_id"], w.arjun.id().as_str());
    // Empty it through the owner's own door, then the hand-over goes through.
    let req = json!({ "external": [{ "receiver_id": w.tusd.id(), "actions": [{ "action": "function_call", "payload": {
        "function_name": "ft_transfer", "args": b64(&json!({ "receiver_id": w.arjun.id(), "amount": (10 * TUSD).to_string() }).to_string()),
        "deposit": "1", "gas": "15000000000000" } }] }] });
    ok(w.wallet_exec(&w.arjun, &berth, req).await?, "empty berth")?;
    w.worker.fast_forward(3).await?;
    assert_eq!(w.tusd_of(&berth).await?, 0);
    ok(w.transfer_berth(&w.arjun, &berth, w.relief.id()).await?, "transfer after emptying")?;
    assert_eq!(w.item(&berth).await?["owner_id"], w.relief.id().as_str());
    Ok(())
}

#[tokio::test]
async fn tla_transfer_wipes_the_allotment_grant() -> Result<()> {
    let w = deploy_world().await?;
    let berth = w.issue_berth("ab2-grant", w.arjun.id(), w.arjun.id()).await?;
    w.add_allotment_extension_and_grant(&w.arjun, &berth, vec![w.mother.id()], 500 * TUSD).await?;
    let g: serde_json::Value = w.worker.view(&berth, "hos_spend_grant").args_json(json!({ "extension": w.allotment.id() })).await?.json()?;
    assert!(!g.is_null(), "grant in place before the hand-over");
    ok(w.transfer_berth(&w.arjun, &berth, w.relief.id()).await?, "transfer")?;
    let g: serde_json::Value = w.worker.view(&berth, "hos_spend_grant").args_json(json!({ "extension": w.allotment.id() })).await?.json()?;
    assert!(g.is_null(), "the old holder's grant is gone");
    let ext: Vec<String> = w.worker.view(&berth, "w_extensions").await?.json()?;
    assert!(!ext.contains(&w.allotment.id().to_string()), "the allotment extension is gone: {ext:?}");
    assert!(!ext.contains(&w.arjun.id().to_string()), "the old holder is evicted: {ext:?}");
    assert!(ext.contains(&w.relief.id().to_string()));
    Ok(())
}

#[tokio::test]
async fn a_failed_sweep_leaves_the_near_for_the_new_owner() -> Result<()> {
    let w = deploy_world().await?;
    // Payout account that does not exist: the detached sweep transfer must fail.
    let ghost: near_workspaces::AccountId = format!("ghost.{}", w.root.id()).parse()?;
    let berth = w.issue_berth("ab2-ghost", w.arjun.id(), &ghost).await?;
    w.arjun.transfer_near(&berth, NearToken::from_near(3)).await?.into_result()?;
    let out = ok(w.transfer_berth(&w.arjun, &berth, w.relief.id()).await?, "transfer")?;
    let l = logs(&out);
    println!("logs: {l:#?}");
    assert!(l.iter().any(|x| x.contains("sweep_failed") || x.contains("SweepFailed")), "SweepFailed emitted: {l:?}");
    assert!(w.near_of(&berth).await? > NearToken::from_near(3).as_yoctonear(), "the NEAR stays in the berth, now held by the buyer");
    assert_eq!(w.item(&berth).await?["owner_id"], w.relief.id().as_str());
    Ok(())
}

#[tokio::test]
async fn add_key_on_a_berth_is_impossible_and_house_of_stake_cannot_move_it_alone() -> Result<()> {
    let w = deploy_world().await?;
    let berth = w.issue_berth("ab2-keys", w.arjun.id(), w.arjun.id()).await?;
    let keys = w.worker.view_access_keys(&berth).await?;
    assert!(keys.is_empty(), "a berth carries no access key: {keys:?}");
    // There is no request op for keys; an AddKey-shaped request is refused by the wallet.
    let bad = w.wallet_exec(&w.arjun, &berth, json!({ "internal": [{ "op": "add_key", "payload": { "public_key": "ed25519:DcA2MzgpJbrUATQLLceocVckhhAqrkingax4oJ9kZ847" } }] })).await?;
    assert!(bad.is_failure(), "AddKey must be refused");
    // The registry's own extension cannot rotate a live lease without the holder asking.
    let forced = call(&w.root, w.extension.id(), "force_transfer", json!({ "sub_account": berth, "to": w.relief.id(), "cause": "Transfer", "asked_by": null }), ONE_YOCTO).await?;
    assert!(forced.is_failure(), "a third party cannot move a live berth");
    assert_eq!(w.item(&berth).await?["owner_id"], w.arjun.id().as_str());
    Ok(())
}

fn b64(s: &str) -> String {
    use base64::Engine;
    base64::engine::general_purpose::STANDARD.encode(s.as_bytes())
}
