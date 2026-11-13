//! The allotment home, fenced by the berth's own spend grant. Real HoS wallet code enforces it.
mod common;
use anyhow::Result;
use common::*;
use near_workspaces::types::NearToken;
use serde_json::json;

async fn set(w: &World, berth: &near_workspaces::AccountId, receiver: &near_workspaces::AccountId, amount: u128) -> Result<()> {
    let out = ok(call(&w.arjun, w.allotment.id(), "set_allotment", json!({ "berth": berth, "token": w.tusd.id(), "receiver": receiver, "amount": amount.to_string(), "every_secs": "10" }), NearToken::from_millinear(10)).await?, "set_allotment")?;
    let l = logs(&out);
    assert!(out.json::<bool>()?, "set_allotment refused: {l:?}");
    Ok(())
}

async fn run(w: &World, berth: &near_workspaces::AccountId) -> Result<near_workspaces::result::ExecutionFinalResult> {
    call(&w.root, w.allotment.id(), "run", json!({ "berth": berth }), NearToken::from_yoctonear(0)).await
}

#[tokio::test]
async fn allotment_pays_only_the_granted_receiver_up_to_the_budget() -> Result<()> {
    let w = deploy_world().await?;
    let berth = w.issue_berth("ab2-allot", w.arjun.id(), w.arjun.id()).await?;
    w.send_tusd(&w.owner, &berth, 1_000 * TUSD).await?;
    w.add_allotment_extension_and_grant(&w.arjun, &berth, vec![w.mother.id()], 300 * TUSD).await?;
    set(&w, &berth, w.mother.id(), 200 * TUSD).await?;

    let first = ok(run(&w, &berth).await?, "first run")?;
    println!("first run logs: {:#?}", logs(&first));
    w.worker.fast_forward(3).await?;
    assert_eq!(w.tusd_of(w.mother.id()).await?, 200 * TUSD, "the allotment arrived");
    assert_eq!(w.tusd_of(&berth).await?, 800 * TUSD);

    w.wait_secs(11).await?;
    let second = run(&w, &berth).await?;
    println!("second run logs: {:#?} failures {}", logs(&second), failure_text(&second));
    w.worker.fast_forward(3).await?;
    assert_eq!(w.tusd_of(w.mother.id()).await?, 200 * TUSD, "200 more would pass the 300 budget: the wallet refused");
    let a: serde_json::Value = w.allotment.view("get_allotment").args_json(json!({ "berth": berth })).await?.json()?;
    assert_eq!(a["stopped"], "E_WALLET_REFUSED");
    assert!(failure_text(&second).contains("TOKEN_CAP_EXCEEDED") || format!("{second:?}").contains("TOKEN_CAP_EXCEEDED") || format!("{second:?}").to_lowercase().contains("cap"), "decoded reason visible in the receipt");

    // A receiver the crew member never granted.
    let stranger = w.relief.id();
    set(&w, &berth, stranger, 10 * TUSD).await?;
    let third = run(&w, &berth).await?;
    w.worker.fast_forward(3).await?;
    assert_eq!(w.tusd_of(stranger).await?, 0, "an ungranted receiver gets nothing");
    println!("ungranted: {}", format!("{third:?}").contains("RECEIVER_NOT_GRANTED"));
    Ok(())
}

#[tokio::test]
async fn allotment_stops_after_hand_over() -> Result<()> {
    let w = deploy_world().await?;
    let berth = w.issue_berth("ab2-stop", w.arjun.id(), w.arjun.id()).await?;
    w.send_tusd(&w.owner, &berth, 100 * TUSD).await?;
    w.add_allotment_extension_and_grant(&w.arjun, &berth, vec![w.mother.id()], 1_000 * TUSD).await?;
    set(&w, &berth, w.mother.id(), 20 * TUSD).await?;
    ok(run(&w, &berth).await?, "run")?;
    w.worker.fast_forward(3).await?;
    assert_eq!(w.tusd_of(w.mother.id()).await?, 20 * TUSD);

    // Arjun empties the berth to his own account and hands it over.
    ok(w.transfer_berth(&w.arjun, &berth, w.relief.id()).await?, "hand-over")?;
    w.wait_secs(11).await?;
    let after = ok(run(&w, &berth).await?, "run after hand-over")?;
    println!("{:?}", logs(&after));
    w.worker.fast_forward(3).await?;
    assert_eq!(w.tusd_of(w.mother.id()).await?, 20 * TUSD, "nothing more leaves the berth for the old holder's family");
    let a: serde_json::Value = w.allotment.view("get_allotment").args_json(json!({ "berth": berth })).await?.json()?;
    assert_eq!(a["stopped"], "E_BERTH_CHANGED_HANDS");
    Ok(())
}
