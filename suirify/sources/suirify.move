/// suirify.move
/// The main module for the Suirify protocol.
/// This package is responsible for creating, managing, and verifying attestations.
module suirify::protocol {
    use sui::event;
    use suirify::auth;
    use suirify::auth::VerifierAdminCap;
    use suirify::jurisdictions::{Self, JurisdictionPolicy};
    use sui::package::{Self};
    use sui::table::{Self, Table};
    use sui::display;
    use std::string;
    use sui::balance::Balance;
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;

    // Custom Errors
    const EUNAUTHORIZED: u64 = 0;
    const EPROTOCOL_PAUSED: u64 = 1;
    const EONLY_OWNER_CAN_BURN: u64 = 2;
    const EJURISDICTION_MISMATCH: u64 = 3;
    const EINVALID_VERIFIER_SOURCE: u64 = 4;
    const EATTESTATION_ALREADY_EXISTS: u64 = 5;
    const EINVALID_MINT_REQUEST_AMOUNT: u64 = 7;
    const EREQUEST_RECIPIENT_MISMATCH: u64 = 8;

    // Constants
    const STATUS_ACTIVE: u8 = 1;
    const STATUS_EXPIRED: u8 = 2;
    const STATUS_REVOKED: u8 = 3;

    // Structs
    public struct Suirify_Attestation has key, store {
        id: UID,
        owner: address,
        jurisdiction_code: u16,
        verification_level: u8,
        verifier_source: u8,
        verifier_version: u8,
        issue_time_ms: u64,
        expiry_time_ms: u64,
        status: u8,
        revoked: bool,
        revoke_time_ms: u64,
        revoke_reason_code: u8,
        name_hash: vector<u8>,
        is_human_verified: bool,
        is_over_18: bool,
        version: u16,
    }

    /// A singleton object for on-chain governance, holding operational
    /// parameters, limits, and allowlists.
    public struct ProtocolConfig has key, store {
        id: UID,
        paused: bool,
        allowlists: vector<address>,
        default_expiry_duration_ms: u64,
        renewal_period_ms: u64,
        mint_fee: u64,
        upgrade_fee: u64,
        treasury_address: address,
        global_mint_limit_per_day: u64,
        mints_today: u64,
        last_mint_reset_timestamp: u64,
        min_verifier_version: u8,
        contract_version: u16,
    }

    public struct AttestationRegistry has key {
        id: UID,
        user_attestations: Table<address, ID>,
        pending_mint_requests: Table<ID, MintRequest>,
    }

    public struct MintRequest has store {
        payment: Balance<SUI>,
        requester: address,
    }

    // Events
    public struct AttestationMinted has copy, drop {
        objectId: ID,
        recipient: address,
    }

    public struct AttestationRevoked has copy, drop {
        objectId: ID,
        reason_code: u8,
    }

    public struct MintRequestCreated has copy, drop {
        request_id: ID,
        requester: address,
    }

    public struct PROTOCOL has drop {}

    // Functions
    /// Initializes the entire protocol.
    fun init(otw: PROTOCOL, ctx: &mut TxContext) {
        let now = tx_context::epoch_timestamp_ms(ctx);
        let sender = tx_context::sender(ctx);

        //let verifier_admin_cap = auth::create_cap(ctx);
        //transfer::transfer(verifier_admin_cap, tx_context::sender(ctx));
        auth::create_and_transfer_cap(sender, ctx);

        let protocol_config = ProtocolConfig {
            id: object::new(ctx),
            paused: false,
            allowlists: vector[],
            default_expiry_duration_ms: 31536000000, // 1 year
            renewal_period_ms: 2592000000, // 30 days
            mint_fee: 1000000000, // 1 SUI
            upgrade_fee: 500000000, // 0.5 SUI
            treasury_address: tx_context::sender(ctx),
            global_mint_limit_per_day: 1000,
            mints_today: 0,
            last_mint_reset_timestamp: now,
            min_verifier_version: 1,
            contract_version: 1,
        };

        // transfer::transfer(verifier_admin_cap, tx_context::sender(ctx));
        transfer::transfer(protocol_config, tx_context::sender(ctx));

        // Create and share the attestation registry
        let registry = AttestationRegistry {
            id: object::new(ctx),
            user_attestations: table::new(ctx),
            pending_mint_requests: table::new(ctx),
        };
        transfer::share_object(registry);

        let keys = vector[
            string::utf8(b"name"),
            string::utf8(b"description"),
            //string::utf8(b"link"),
            string::utf8(b"image_url"),
            string::utf8(b"thumbnail_url"),
            string::utf8(b"creator"),
            string::utf8(b"project_url"),
            //string::utf8(b"jurisdiction")
        ];

        let values = vector[
            string::utf8(b"Suirify Attestation"),
            string::utf8(b"A soulbound, non-transferable identity attestation for the Sui ecosystem."),
            //string::utf8(b"https://devnet.suirify.com"),
            string::utf8(b"https://i.ibb.co/NnQJgG9p/suirifyimg.png"),
            string::utf8(b"https://i.ibb.co/NnQJgG9p/suirifyimg.png"),
            string::utf8(b"Suirify Protocol"),
            string::utf8(b"https://devnet.suirify.com"),
            //string::utf8(b"Jurisdiction Code: {jurisdiction_code}")
        ];

        let publisher = package::claim(otw, ctx);

        let mut display = display::new_with_fields<Suirify_Attestation>(
            &publisher, keys, values, ctx
        );

        display.update_version();

        transfer::public_transfer(publisher, tx_context::sender(ctx));
        transfer::public_transfer(display, tx_context::sender(ctx));


    }

    public fun create_mint_request(
        registry: &mut AttestationRegistry,
        payment: Coin<SUI>,
        ctx: &mut TxContext,
    ): ID {
        let request_uid = object::new(ctx);
        let request_id = object::uid_to_inner(&request_uid);
        let requester =tx_context::sender(ctx);
        let request = MintRequest {
            payment: coin::into_balance(payment),
            requester: requester,
        };
        table::add(&mut registry.pending_mint_requests, request_id, request);
        object::delete(request_uid);
         
        event::emit(MintRequestCreated {
            request_id,
            requester,
        });

        request_id
    }

    /// Creates a new Suirify_Attestation with extended metadata and transfers it
    /// to the recipient.
    public fun mint_attestation(
        _cap: &VerifierAdminCap,
        config: &mut ProtocolConfig,
        registry: &mut AttestationRegistry,
        request_id: ID,
        policy: &JurisdictionPolicy,
        recipient: address,
        jurisdiction_code: u16,
        verifier_source: u8,
        verification_level: u8,
        name_hash: vector<u8>,
        is_human_verified: bool,
        is_over_18: bool,
        verifier_version: u8,
        ctx: &mut TxContext,
    ) {
        {
            let request_ref = table::borrow_mut(&mut registry.pending_mint_requests, request_id);
            assert!(request_ref.requester == recipient, EREQUEST_RECIPIENT_MISMATCH);
            let locked_amount = sui::balance::value(&request_ref.payment);
            assert!(locked_amount == config.mint_fee, EINVALID_MINT_REQUEST_AMOUNT);
        };

        let MintRequest { payment, requester: _ } =
            table::remove(&mut registry.pending_mint_requests, request_id);
        let fee_coin = coin::from_balance(payment, ctx);
        transfer::public_transfer(fee_coin, config.treasury_address);

        let now = tx_context::epoch_timestamp_ms(ctx);

        assert!(!table::contains(&registry.user_attestations, recipient), EATTESTATION_ALREADY_EXISTS);

        assert!(!config.paused, EPROTOCOL_PAUSED);
        assert!(verifier_version >= config.min_verifier_version, EUNAUTHORIZED);

        // assert!(policy.iso_num == jurisdiction_code, EJURISDICTION_MISMATCH);
        // assert!(vector::contains(&policy.allowed_sources, &verifier_source), EINVALID_VERIFIER_SOURCE);
        assert!(jurisdictions::get_iso_num(policy) == jurisdiction_code, EJURISDICTION_MISMATCH);
        assert!(vector::contains(jurisdictions::get_allowed_sources(policy), &verifier_source), EINVALID_VERIFIER_SOURCE);


        // If an allowlist is configured (non-empty), enforce membership
        if (vector::length(&config.allowlists) > 0) {
            // abort if recipient not present in allowlist
            assert!(vector::contains(&config.allowlists, &recipient), EUNAUTHORIZED);
        };

        // Reset daily counters if needed and enforce global per-day limit
        reset_daily_mint_if_needed(config, now);

        // ensure there's room for this mint (use +1 to avoid ordering ambiguity)
        let next_mint_count = config.mints_today + 1;
        assert!(next_mint_count <= config.global_mint_limit_per_day, EUNAUTHORIZED);
        config.mints_today = next_mint_count;

        let attestation = Suirify_Attestation {
            id: object::new(ctx),
            owner: recipient,
            jurisdiction_code,
            verification_level,
            verifier_source,
            verifier_version,
            issue_time_ms: now,
            expiry_time_ms: now + config.default_expiry_duration_ms,
            status: STATUS_ACTIVE,
            revoked: false,
            revoke_time_ms: 0,
            revoke_reason_code: 0,
            name_hash,
            is_human_verified,
            is_over_18,
            version: config.contract_version,
        };

        let attestation_id = object::id(&attestation);
        table::add(&mut registry.user_attestations, recipient, attestation_id);
        

        event::emit(AttestationMinted {
            objectId: object::id(&attestation),
            recipient,
        });

        transfer::transfer(attestation, recipient);
    }

    /// Allows the admin to permanently revoke an existing attestation.
    public fun revoke_attestation(
        _cap: &VerifierAdminCap,
        config: &ProtocolConfig,
        attestation: &mut Suirify_Attestation,
        reason_code: u8,
        ctx: &mut TxContext,
    ) {
        assert!(!config.paused, EPROTOCOL_PAUSED);

        attestation.status = STATUS_REVOKED;
        attestation.revoked = true;
        attestation.revoke_reason_code = reason_code;
        attestation.revoke_time_ms = tx_context::epoch_timestamp_ms(ctx);

        event::emit(AttestationRevoked {
            objectId: object::id(attestation),
            reason_code,
        });
    }

    /// Allows the owner of an attestation to permanently and irrevocably delete it
    /// from the blockchain ("right to be forgotten").
    public fun burn_self(attestation: Suirify_Attestation, registry: &mut AttestationRegistry, ctx: &mut TxContext) {
        let owner = attestation.owner;
        assert!(owner == tx_context::sender(ctx), EONLY_OWNER_CAN_BURN);

        table::remove(&mut registry.user_attestations, owner);

        let Suirify_Attestation { id, owner: _, .. } = attestation;
        object::delete(id);
    }

    // Getter functions for cross-module access
    public fun get_status(attestation: &Suirify_Attestation): u8 {
        attestation.status
    }

    public fun is_revoked(attestation: &Suirify_Attestation): bool {
        attestation.revoked
    }

    public fun get_expiry_time(attestation: &Suirify_Attestation): u64 {
        attestation.expiry_time_ms
    }

    public fun get_name_hash(attestation: &Suirify_Attestation): vector<u8> {
        attestation.name_hash
    }

    public fun get_owner(attestation: &Suirify_Attestation): address {
        attestation.owner
    }

    public fun is_active(attestation: &Suirify_Attestation): bool {
        attestation.status == STATUS_ACTIVE
    }

    public fun is_expired_status(attestation: &Suirify_Attestation): bool {
        attestation.status == STATUS_EXPIRED
    }

    public fun get_mint_fee(config: &ProtocolConfig): u64 {
        config.mint_fee
    }

    /// Marks the attestation as expired if its expiry time has passed.
    public fun mark_expired_if_needed(attestation: &mut Suirify_Attestation, now_ms: u64) {
        if (!attestation.revoked && attestation.status == STATUS_ACTIVE && now_ms >= attestation.expiry_time_ms) {
            attestation.status = STATUS_EXPIRED;
        };
    }
    // Admin functions to update protocol configuration
    // Updates the upgrade fee
    public fun update_mint_fee(
        _cap: &VerifierAdminCap,
        config: &mut ProtocolConfig,
        new_fee: u64,
    ) {
        config.mint_fee = new_fee;
    }

    // Updates the upgrade fee
    public fun update_upgrade_fee(
        _cap: &VerifierAdminCap,
        config: &mut ProtocolConfig,
        new_upgrade_fee: u64,
    ) {
        config.upgrade_fee = new_upgrade_fee;
    }

    // Updates the treasury address
    public fun update_treasury_address(
        _cap: &VerifierAdminCap,
        config: &mut ProtocolConfig,
        new_treasury_address: address,
    ) {
        config.treasury_address = new_treasury_address;
    }

    // Pauses or unpauses the protocol
    public fun set_protocol_paused(
        _cap: &VerifierAdminCap,
        config: &mut ProtocolConfig,
        paused: bool,
    ) {
        config.paused = paused;
    }

    // Updates the default expiry duration
    public fun update_default_expiry_duration(
        _cap: &VerifierAdminCap,
        config: &mut ProtocolConfig,
        new_duration_ms: u64,
    ) {
        config.default_expiry_duration_ms = new_duration_ms;
    }

    // Updates the renewal period
    public fun update_renewal_period(
        _cap: &VerifierAdminCap,
        config: &mut ProtocolConfig,
        new_period_ms: u64,
    ) {
        config.renewal_period_ms = new_period_ms;
    }

    // the global mint limit per day(
    public fun update_global_mint_limit_per_day(
        _cap: &VerifierAdminCap,
        config: &mut ProtocolConfig,
        new_global_mint_limit_per_day: u64,
    ) {
        config.global_mint_limit_per_day = new_global_mint_limit_per_day;
    }

    // Resets the daily mint count if 24 hours have passed since the last reset
    public fun reset_daily_mint_if_needed(config: &mut ProtocolConfig, now_ms: u64) {
        // 86_400_000 ms = 24 hours
        if (config.last_mint_reset_timestamp == 0 || now_ms >= config.last_mint_reset_timestamp + 86400000) {
            config.mints_today = 0;
            config.last_mint_reset_timestamp = now_ms;
        };
    }

    // Getter for tests: expose mints_today for verification
    public fun get_mints_today(config: &ProtocolConfig): u64 {
        config.mints_today
    }

    // Updates the minimum verifier version(
    public fun update_min_verifier_version(
        _cap: &VerifierAdminCap,
        config: &mut ProtocolConfig,
        new_min_verifier_version: u8,
    ) {
        config.min_verifier_version = new_min_verifier_version;
    }

    // Adds an address to the allowlists
    public fun add_to_allowlist(
        _cap: &VerifierAdminCap,
        config: &mut ProtocolConfig,
        address_to_add: address,
    ) {
        vector::push_back(&mut config.allowlists, address_to_add);
    }

    // Removes an address from the allowlist
    public fun remove_from_allowlist(
        _cap: &VerifierAdminCap,
        config: &mut ProtocolConfig,
        address_to_remove: address,
    ) {
        let (found, index) = vector::index_of(&config.allowlists, &address_to_remove);
        if (found) {
            vector::remove(&mut config.allowlists, index);
        };
    }

    // Checks if an address is in the allowlist
    public fun is_in_allowlist(
        _cap: &VerifierAdminCap,
        config: &ProtocolConfig,
        address_to_check: address,
    ): bool {
        vector::contains(&config.allowlists, &address_to_check)
    }

    // Test-only function to initialize the protocol for testing purposes
    #[test_only]
    public fun test_init(ctx: &mut TxContext) {
        init(PROTOCOL {}, ctx);
    }
}

/// Provides a clean, stable, and secure read-only API for dApps and SDKs.
module suirify::attestation_utils {
    use sui::clock::Clock;
    use suirify::protocol::{Self, Suirify_Attestation};

    /// Returns true if the attestation is currently active,
    /// not revoked, and not expired. Updates status to expired if needed.
    public fun is_valid(attestation: &mut Suirify_Attestation, clock: &Clock): bool {
    protocol::mark_expired_if_needed(attestation, clock.timestamp_ms());

    protocol::is_active(attestation) &&
    !protocol::is_revoked(attestation)
    }

    /// Returns the stored name_hash from the attestation.
    public fun get_name_hash(attestation: &Suirify_Attestation): vector<u8> {
        protocol::get_name_hash(attestation)
    }
}

/// Defines actions that can only be initiated by the owner of a Suirify_Attestation.
module suirify::user_actions {
    use suirify::protocol::{Self, Suirify_Attestation, AttestationRegistry};

    /// Allows the owner of an attestation to permanently and irrevocably delete it
    /// from the blockchain ("right to be forgotten").
    public fun burn_self(attestation: Suirify_Attestation, registry: &mut AttestationRegistry, ctx: &mut TxContext) {
        protocol::burn_self(attestation, registry, ctx);
    }
}

/// Defines and manages jurisdiction-specific verification policies.
module suirify::jurisdictions {
    use suirify::auth::VerifierAdminCap;
    // use suirify::protocol::VerifierAdminCap;

    /// Defines jurisdiction-specific verification policies.
    public struct JurisdictionPolicy has key, store {
        id: UID,
        iso_num: u16,
        allowed_sources: vector<u8>,
    }

    /// Registry to manage all jurisdiction policies
    public struct JurisdictionRegistry has key {
        id: UID,
        policies: vector<ID>, // Track all policy IDs
    }

    /// Initialize the registry (call this once)
    public fun init_registry(
        _cap: &VerifierAdminCap,
        ctx: &mut TxContext,
    ) {
        let registry = JurisdictionRegistry {
            id: object::new(ctx),
            policies: vector[],
        };
        transfer::share_object(registry); // Shared object for global access
    }

    /// Creates a new jurisdiction policy as a shared object
    public fun add_jurisdiction_policy(
        _cap: &VerifierAdminCap,
        registry: &mut JurisdictionRegistry,
        iso_num: u16,
        allowed_sources: vector<u8>,
        ctx: &mut TxContext,
    ) {
        let policy = JurisdictionPolicy {
            id: object::new(ctx),
            iso_num,
            allowed_sources,
        };
        
        let policy_id = object::id(&policy);
        vector::push_back(&mut registry.policies, policy_id);
        
        transfer::share_object(policy); // Make policy globally accessible
    }

    public fun get_iso_num(policy: &JurisdictionPolicy): u16 {
        policy.iso_num
    }
    public fun get_allowed_sources(policy: &JurisdictionPolicy): &vector<u8> {
        &policy.allowed_sources
    }

} 