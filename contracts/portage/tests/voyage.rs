//! The whole story on the real HoS fleet: refused sign-on, sign-on, wages into the berth, the
//! allotment home, the owner stops paying, early declaration refused, release to Arjun's own
//! account, and a frozen berth still receiving wages.
mod common;
use anyhow::Result;
use common::*;
use near_workspaces::types::NearToken;
use serde_json::json;

const SPD: u64 = 10;
const WAGE: u128 = 10 * TUSD;
const ALLOW: u128 = 200 * TUSD;

#[tokio::test]
async fn full_voyage_sign_on_wages_allotment_abandonment_release() -> Result<()> {
    let w = deploy_world().await?;
    let berth = w.issue_berth("ab2-kestrel", w.arjun.id(), w.arjun.id()).await?;
    let ship = w.create_ship(SPD, 14, ALLOW).await?;
    w.open_berth(ship, &berth, WAGE, 270).await?;
    let reserve = WAGE * 30 * 4 + ALLOW;

    // 1. Refused: the reserve is not on board.
    w.fund(ship, reserve - 1).await?;
    let (signed, l) = w.sign_on(&w.arjun, &berth, WAGE).await?;
    assert!(!signed);
    assert!(l.iter().any(|x| x.contains("E_RESERVE_NOT_ON_BOARD")), "{l:?}");
    // Refused: a stranger.
    let (signed, l) = w.sign_on(&w.relief, &berth, WAGE).await?;
    assert!(!signed && l.iter().any(|x| x.contains("E_NOT_BERTH_HOLDER")), "{l:?}");
    // Refused: wage differs from Arjun's contract.
    w.fund(ship, 1 + 3 * WAGE).await?;
    let (signed, l) = w.sign_on(&w.arjun, &berth, WAGE - 1).await?;
    assert!(!signed && l.iter().any(|x| x.contains("E_WAGE_DIFFERS_FROM_YOUR_CONTRACT")), "{l:?}");

    // 2. Signed on: four months and the fare home are locked.
    let (signed, l) = w.sign_on(&w.arjun, &berth, WAGE).await?;
    assert!(signed, "{l:?}");
    assert_eq!(u(&w.ship_view(ship).await?["reserved"]), reserve);

    // 3. Wages land in the berth.
    w.wait_secs(2 * SPD).await?;
    ok(w.settle(&berth).await?, "settle")?;
    w.worker.fast_forward(3).await?;
    let in_berth = w.tusd_of(&berth).await?;
    assert!(in_berth >= 2 * WAGE, "at least two ship days of wages arrived: {in_berth}");

    // 4. Allotment home through the grant.
    w.add_allotment_extension_and_grant(&w.arjun, &berth, vec![w.mother.id()], 1_000 * TUSD).await?;
    let set = ok(call(&w.arjun, w.allotment.id(), "set_allotment", json!({ "berth": berth, "token": w.tusd.id(), "receiver": w.mother.id(), "amount": (6 * TUSD).to_string(), "every_secs": "100" }), NearToken::from_millinear(10)).await?, "set")?;
    assert!(set.json::<bool>()?);
    ok(call(&w.root, w.allotment.id(), "run", json!({ "berth": berth }), NearToken::from_yoctonear(0)).await?, "run")?;
    w.worker.fast_forward(3).await?;
    assert_eq!(w.tusd_of(w.mother.id()).await?, 6 * TUSD);

    // 5. The three spare days run out; the owner stops paying. Early declaration is refused.
    w.wait_secs(3 * SPD).await?;
    let _ = w.settle(&berth).await?;
    let early = call(&w.root, w.portage.id(), "declare_abandonment", json!({ "ship_id": ship.to_string() }), NearToken::from_yoctonear(0)).await?;
    assert!(early.is_failure() && failure_text(&early).contains("E_NOT_YET_ABANDONED"), "{}", failure_text(&early));

    // 6. After 14 ship days of grace, anyone declares; anyone releases.
    w.wait_secs(15 * SPD).await?;
    ok(call(&w.root, w.portage.id(), "declare_abandonment", json!({ "ship_id": ship.to_string() }), NearToken::from_yoctonear(0)).await?, "declare")?;
    let before = w.tusd_of(w.arjun.id()).await?;
    let rel = ok(call(&w.root, w.portage.id(), "release_guarantee", json!({ "berth": berth }), NearToken::from_yoctonear(0)).await?, "release")?;
    println!("release logs {:#?}", logs(&rel));
    w.worker.fast_forward(3).await?;
    let got = w.tusd_of(w.arjun.id()).await? - before;
    assert!(got >= 120 * WAGE + ALLOW - WAGE, "four months and the fare home went to Arjun's own account: {got}");
    let again = call(&w.root, w.portage.id(), "release_guarantee", json!({ "berth": berth }), NearToken::from_yoctonear(0)).await?;
    assert!(failure_text(&again).contains("E_ALREADY_RELEASED"));
    let s = w.ship_view(ship).await?;
    assert_eq!(u(&s["funded_total"]), u(&s["unreserved"]) + u(&s["reserved"]) + u(&s["payable"]) + u(&s["paid_total"]) + u(&s["withdrawn_total"]));
    Ok(())
}

#[tokio::test]
async fn a_frozen_berth_does_not_lose_wages() -> Result<()> {
    let w = deploy_world().await?;
    let berth = w.issue_berth("ab2-frozen", w.arjun.id(), w.arjun.id()).await?;
    let ship = w.create_ship(SPD, 14, ALLOW).await?;
    w.open_berth(ship, &berth, WAGE, 270).await?;
    w.fund(ship, WAGE * 120 + ALLOW + 20 * WAGE).await?;
    assert!(w.sign_on(&w.arjun, &berth, WAGE).await?.0);
    // Phone stolen in port: Arjun freezes the berth from his own account.
    ok(call(&w.arjun, &berth, "hos_freeze", json!({}), ONE_YOCTO).await?, "freeze")?;
    assert_eq!(w.item(&berth).await?["status"], "Frozen");
    w.wait_secs(2 * SPD).await?;
    ok(w.settle(&berth).await?, "settle frozen")?;
    w.worker.fast_forward(3).await?;
    assert!(w.tusd_of(&berth).await? >= 2 * WAGE, "wages still land in a frozen berth");
    // Nobody, not even an extension, can move them out while frozen.
    assert_eq!(w.berth_view(&berth).await?["status"], "Signed");
    Ok(())
}

#[tokio::test]
async fn sign_off_then_hand_over_pays_arjun_and_lets_the_relief_sign_on() -> Result<()> {
    let w = deploy_world().await?;
    let berth = w.issue_berth("ab2-change", w.arjun.id(), w.arjun.id()).await?;
    let ship = w.create_ship(SPD, 14, ALLOW).await?;
    w.open_berth(ship, &berth, WAGE, 270).await?;
    w.fund(ship, (WAGE * 120 + ALLOW) * 2 + 20 * WAGE).await?;
    assert!(w.sign_on(&w.arjun, &berth, WAGE).await?.0);
    w.wait_secs(3 * SPD).await?;
    let before = w.tusd_of(w.arjun.id()).await?;
    ok(call(&w.arjun, w.portage.id(), "sign_off", json!({ "berth": berth }), NearToken::from_yoctonear(0)).await?, "sign_off")?;
    w.worker.fast_forward(3).await?;
    assert!(w.tusd_of(w.arjun.id()).await? - before >= 3 * WAGE, "final wages to Arjun's own account");
    ok(w.transfer_berth(&w.arjun, &berth, w.relief.id()).await?, "hand-over")?;
    assert!(w.sign_on(&w.relief, &berth, WAGE).await?.0, "the relief signs on to the same berth");
    let h: Vec<serde_json::Value> = w.portage.view("berth_history").args_json(json!({ "berth": berth })).await?.json()?;
    assert_eq!(h.iter().map(|e| e["kind"].as_str().unwrap()).collect::<Vec<_>>(), vec!["signed_on", "signed_off", "signed_on"]);
    Ok(())
}

#[tokio::test]
async fn an_unannounced_hand_over_on_chain_pays_arjun_not_the_relief() -> Result<()> {
    let w = deploy_world().await?;
    let berth = w.issue_berth("ab2-sneak", w.arjun.id(), w.arjun.id()).await?;
    let ship = w.create_ship(SPD, 14, ALLOW).await?;
    w.open_berth(ship, &berth, WAGE, 270).await?;
    w.fund(ship, WAGE * 120 + ALLOW + 20 * WAGE).await?;
    assert!(w.sign_on(&w.arjun, &berth, WAGE).await?.0);
    w.wait_secs(3 * SPD).await?;
    ok(w.transfer_berth(&w.arjun, &berth, w.relief.id()).await?, "hand-over without sign-off")?;
    let before = w.tusd_of(w.arjun.id()).await?;
    let berth_before = w.tusd_of(&berth).await?;
    ok(w.settle(&berth).await?, "settle")?;
    w.worker.fast_forward(3).await?;
    assert!(w.tusd_of(w.arjun.id()).await? - before >= 3 * WAGE);
    assert_eq!(w.tusd_of(&berth).await?, berth_before, "not a unit went into the berth the relief now holds");
    assert_eq!(w.berth_view(&berth).await?["status"], "Interrupted");
    Ok(())
}
