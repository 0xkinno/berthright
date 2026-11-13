# Platform probe

What we confirmed by real calls, and where.

## In the sandbox (real HoS wasm, commit d85860a)

- A berth minted by a bound payment authority (`rent_sub_account_paid`) answers `nft_item_info`
  with spec `sharded-item-1.0.0`, status `Active`, `rotation_seq` 0, and the registry's
  `nft_token` names the same owner (`contracts/portage/tests/common/mod.rs` `issue_berth`).
- The owner drives the berth with `w_execute_extension` (add extension, `ft_transfer` out).
- A berth has zero access keys; an AddKey-shaped request is refused; a third party calling
  `force_transfer` on `hos-extension` is refused (`add_key_on_a_berth_is_impossible_and_house_of_stake_cannot_move_it_alone`).
- Grants are enforced to the unit (`allotment_pays_only_the_granted_receiver_up_to_the_budget`).

## On testnet

Pending deployment: the same probes run against `crew.berthright.testnet` and their transaction
links are added here.

## What surprised us

See [FRICTION.md](FRICTION.md).
