// suirify::auth.move
module suirify::auth {
    // A capability object that grants the holder the exclusive authority
    // to manage the protocol's configuration across all modules.
    public struct VerifierAdminCap has key, store {
        id: UID,
    }

    // Creates the VerifierAdminCap and transfers it to the transaction sender.
    // This should only be called once during the protocol's initialization.
    public fun create_and_transfer_cap(recipient: address, ctx: &mut TxContext) {
        let cap = VerifierAdminCap {
            id: object::new(ctx),
        };
        transfer::transfer(cap, recipient)
    }
}