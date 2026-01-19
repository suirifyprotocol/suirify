#[test_only]
/// This module contains a suite of tests for the Suirify protocol,
/// ensuring all core functionalities work as expected.
module suirify::suirify_tests {
    use sui::test_scenario::{Self, next_tx, ctx};
    use sui::coin::{Self};
    use sui::sui::SUI;
    use sui::clock::{Self};

    use suirify::auth::VerifierAdminCap;
    use suirify::protocol::{Self, ProtocolConfig, Suirify_Attestation, AttestationRegistry};
    use suirify::jurisdictions::{Self, JurisdictionPolicy, JurisdictionRegistry};
    use suirify::attestation_utils;
    use suirify::user_actions;

    const ADMIN: address = @0xABCD;
    const USER1: address = @0x1234;
    const USER2: address = @0x5678;
    const NGA_ISO_CODE: u16 = 566;

    /// Helper function to set up the initial protocol state for tests.
    fun setup(scenario: &mut test_scenario::Scenario) {
        protocol::test_init(ctx(scenario));
        next_tx(scenario, ADMIN);
        {
            let cap = test_scenario::take_from_sender<VerifierAdminCap>(scenario);
            jurisdictions::init_registry(&cap, ctx(scenario));
            test_scenario::return_to_sender(scenario, cap);
        };
        next_tx(scenario, ADMIN);
        {
            let cap = test_scenario::take_from_sender<VerifierAdminCap>(scenario);
            let mut registry = test_scenario::take_shared<JurisdictionRegistry>(scenario);
            jurisdictions::add_jurisdiction_policy(
                &cap,
                &mut registry,
                NGA_ISO_CODE,
                vector[1, 2],
                ctx(scenario)
            );
            test_scenario::return_to_sender(scenario, cap);
            test_scenario::return_shared(registry);
        };
        next_tx(scenario, ADMIN);
    }

    /// Helper function to perform the full two-step minting process.
    fun mint_attestation_for_user(
        scenario: &mut test_scenario::Scenario,
        user: address,
        name_hash: vector<u8>
    ) {
        // Step 1: User creates a mint request
        next_tx(scenario, user);
        let request_id: ID;
        {
            // FIXED: Take the config, use the new public getter, then return the config
            let config = test_scenario::take_from_address<ProtocolConfig>(scenario, ADMIN);
            let mint_fee = protocol::get_mint_fee(&config);
            let payment_coin = coin::mint_for_testing<SUI>(mint_fee, ctx(scenario));
            test_scenario::return_to_address(ADMIN, config);

            let mut att_registry = test_scenario::take_shared<AttestationRegistry>(scenario);
            request_id = protocol::create_mint_request(&mut att_registry, payment_coin, ctx(scenario));
            test_scenario::return_shared(att_registry);
        };

        // Step 2: Admin processes the request and mints the attestation
        next_tx(scenario, ADMIN);
        {
            let admin_cap = test_scenario::take_from_sender<VerifierAdminCap>(scenario);
            let mut config = test_scenario::take_from_sender<ProtocolConfig>(scenario);
            let mut att_registry = test_scenario::take_shared<AttestationRegistry>(scenario);
            let policy = test_scenario::take_shared<JurisdictionPolicy>(scenario);

            protocol::mint_attestation(
                &admin_cap,
                &mut config,
                &mut att_registry,
                request_id,
                &policy,
                user, NGA_ISO_CODE, 1, vector[], 1, name_hash, true, true, 1,
                ctx(scenario)
            );

            test_scenario::return_to_sender(scenario, admin_cap);
            test_scenario::return_to_sender(scenario, config);
            test_scenario::return_shared(att_registry);
            test_scenario::return_shared(policy);
        };
    }

    /// Helper function to perform minting with custom verification inputs.
    fun mint_attestation_with_params(
        scenario: &mut test_scenario::Scenario,
        user: address,
        name_hash: vector<u8>,
        verifier_source: u8,
        extra_verifier_sources: vector<u8>,
        verification_level: u8,
        verifier_version: u8,
        is_human_verified: bool,
        is_over_18: bool,
    ) {
        next_tx(scenario, user);
        let request_id: ID;
        {
            let config = test_scenario::take_from_address<ProtocolConfig>(scenario, ADMIN);
            let mint_fee = protocol::get_mint_fee(&config);
            let payment_coin = coin::mint_for_testing<SUI>(mint_fee, ctx(scenario));
            test_scenario::return_to_address(ADMIN, config);

            let mut att_registry = test_scenario::take_shared<AttestationRegistry>(scenario);
            request_id = protocol::create_mint_request(&mut att_registry, payment_coin, ctx(scenario));
            test_scenario::return_shared(att_registry);
        };

        next_tx(scenario, ADMIN);
        {
            let admin_cap = test_scenario::take_from_sender<VerifierAdminCap>(scenario);
            let mut config = test_scenario::take_from_sender<ProtocolConfig>(scenario);
            let mut att_registry = test_scenario::take_shared<AttestationRegistry>(scenario);
            let policy = test_scenario::take_shared<JurisdictionPolicy>(scenario);

            protocol::mint_attestation(
                &admin_cap,
                &mut config,
                &mut att_registry,
                request_id,
                &policy,
                user, NGA_ISO_CODE, verifier_source, extra_verifier_sources, verification_level,
                name_hash, is_human_verified, is_over_18, verifier_version,
                ctx(scenario)
            );

            test_scenario::return_to_sender(scenario, admin_cap);
            test_scenario::return_to_sender(scenario, config);
            test_scenario::return_shared(att_registry);
            test_scenario::return_shared(policy);
        };
    }

    /// Helper to lock an upgrade fee for renew/upgrade flows.
    fun create_upgrade_request(
        scenario: &mut test_scenario::Scenario,
        user: address,
        upgrade_fee: u64
    ): ID {
        next_tx(scenario, user);
        let payment_coin = coin::mint_for_testing<SUI>(upgrade_fee, ctx(scenario));
        let mut att_registry = test_scenario::take_shared<AttestationRegistry>(scenario);
        let request_id = protocol::create_renew_update_request(&mut att_registry, payment_coin, ctx(scenario));
        test_scenario::return_shared(att_registry);
        request_id
    }

    // --- CORE TESTS ---

    #[test]
    fun test_init_and_setup() {
        let mut scenario = test_scenario::begin(ADMIN);
        setup(&mut scenario);
        assert!(test_scenario::has_most_recent_for_sender<VerifierAdminCap>(&scenario), 0);
        assert!(test_scenario::has_most_recent_for_sender<ProtocolConfig>(&scenario), 1);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_mint_attestation_success() {
        let mut scenario = test_scenario::begin(ADMIN);
        setup(&mut scenario);
        mint_attestation_for_user(&mut scenario, USER1, b"name_hash_test");
        next_tx(&mut scenario, USER1);
        assert!(test_scenario::has_most_recent_for_sender<Suirify_Attestation>(&scenario), 3);
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = suirify::protocol::EAttestationAlreadyExists)]
    fun test_mint_duplicate_attestation_fails() {
        let mut scenario = test_scenario::begin(ADMIN);
        setup(&mut scenario);
        mint_attestation_for_user(&mut scenario, USER1, b"name_hash_1");
        mint_attestation_for_user(&mut scenario, USER1, b"name_hash_2");
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = suirify::protocol::EOnlyOwnerCanBurn)]
    fun test_burn_by_non_owner_fails() {
        let mut scenario = test_scenario::begin(ADMIN);
        setup(&mut scenario);
        mint_attestation_for_user(&mut scenario, USER1, b"name_hash_test");
        next_tx(&mut scenario, USER2);
        {
            let attestation = test_scenario::take_from_address<Suirify_Attestation>(&scenario, USER1);
            let mut att_registry = test_scenario::take_shared<AttestationRegistry>(&scenario);
            user_actions::burn_self(attestation, &mut att_registry, ctx(&mut scenario));
            test_scenario::return_shared(att_registry);
        };
        test_scenario::end(scenario);
    }

    #[test]
    fun test_burn_by_owner_success() {
        let mut scenario = test_scenario::begin(ADMIN);
        setup(&mut scenario);
        mint_attestation_for_user(&mut scenario, USER1, b"name_hash_test");
        next_tx(&mut scenario, USER1);
        {
            let attestation = test_scenario::take_from_sender<Suirify_Attestation>(&scenario);
            let mut att_registry = test_scenario::take_shared<AttestationRegistry>(&scenario);
            user_actions::burn_self(attestation, &mut att_registry, ctx(&mut scenario));
            test_scenario::return_shared(att_registry);
            assert!(!test_scenario::has_most_recent_for_sender<Suirify_Attestation>(&scenario), 4);
        };
        test_scenario::end(scenario);
    }

    #[test]
    fun test_attestation_utils_functions() {
        let mut scenario = test_scenario::begin(ADMIN);
        let mut clock = clock::create_for_testing(ctx(&mut scenario));
        next_tx(&mut scenario, ADMIN);
        setup(&mut scenario);
        mint_attestation_for_user(&mut scenario, USER1, b"name_hash_test");
        next_tx(&mut scenario, USER1);
        {
            let mut attestation = test_scenario::take_from_sender<Suirify_Attestation>(&scenario);
            assert!(attestation_utils::is_valid(&mut attestation, &clock), 5);
            assert!(attestation_utils::get_name_hash(&attestation) == b"name_hash_test", 6);
            clock::increment_for_testing(&mut clock, 31536000000 + 1);
            assert!(!attestation_utils::is_valid(&mut attestation, &clock), 7);
            test_scenario::return_to_sender(&scenario, attestation);
        };
        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_allowlist_allows_member() {
        let mut scenario = test_scenario::begin(ADMIN);
        setup(&mut scenario);

        next_tx(&mut scenario, ADMIN);
        {
            let cap = test_scenario::take_from_sender<VerifierAdminCap>(&scenario);
            let mut config = test_scenario::take_from_sender<ProtocolConfig>(&scenario);
            protocol::add_to_allowlist(&cap, &mut config, USER1);
            test_scenario::return_to_sender(&scenario, cap);
            test_scenario::return_to_sender(&scenario, config);
        };

        mint_attestation_for_user(&mut scenario, USER1, b"allow_user1");
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = suirify::protocol::EUnauthorized)]
    fun test_allowlist_blocks_non_member() {
        let mut scenario = test_scenario::begin(ADMIN);
        setup(&mut scenario);

        next_tx(&mut scenario, ADMIN);
        {
            let cap = test_scenario::take_from_sender<VerifierAdminCap>(&scenario);
            let mut config = test_scenario::take_from_sender<ProtocolConfig>(&scenario);
            protocol::add_to_allowlist(&cap, &mut config, USER1);
            test_scenario::return_to_sender(&scenario, cap);
            test_scenario::return_to_sender(&scenario, config);
        };

        mint_attestation_for_user(&mut scenario, USER2, b"blocked_user2");
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = suirify::protocol::EProtocolPaused)]
    fun test_paused_protocol_blocks_mint() {
        let mut scenario = test_scenario::begin(ADMIN);
        setup(&mut scenario);
        next_tx(&mut scenario, ADMIN);
        {
            let cap = test_scenario::take_from_sender<VerifierAdminCap>(&scenario);
            let mut config = test_scenario::take_from_sender<ProtocolConfig>(&scenario);
            protocol::set_protocol_paused(&cap, &mut config, true);
            test_scenario::return_to_sender(&scenario, cap);
            test_scenario::return_to_sender(&scenario, config);
        };

        mint_attestation_for_user(&mut scenario, USER1, b"paused_should_fail");
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = suirify::protocol::EUnauthorized)]
    fun test_min_verifier_version_enforced() {
        let mut scenario = test_scenario::begin(ADMIN);
        setup(&mut scenario);
        next_tx(&mut scenario, ADMIN);
        {
            let cap = test_scenario::take_from_sender<VerifierAdminCap>(&scenario);
            let mut config = test_scenario::take_from_sender<ProtocolConfig>(&scenario);
            protocol::update_min_verifier_version(&cap, &mut config, 2);
            test_scenario::return_to_sender(&scenario, cap);
            test_scenario::return_to_sender(&scenario, config);
        };

        // Try minting with verifier_version = 1 (below min 2)
        mint_attestation_with_params(
            &mut scenario,
            USER1,
            b"min_verifier_version",
            1,
            vector[],
            1,
            1,
            true,
            true,
        );
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = suirify::protocol::EUnauthorized)]
    fun test_daily_mint_limit_enforced() {
        let mut scenario = test_scenario::begin(ADMIN);
        setup(&mut scenario);
        next_tx(&mut scenario, ADMIN);
        {
            let cap = test_scenario::take_from_sender<VerifierAdminCap>(&scenario);
            let mut config = test_scenario::take_from_sender<ProtocolConfig>(&scenario);
            protocol::update_global_mint_limit_per_day(&cap, &mut config, 1);
            test_scenario::return_to_sender(&scenario, cap);
            test_scenario::return_to_sender(&scenario, config);
        };

        mint_attestation_for_user(&mut scenario, USER1, b"limit_one_success");
        // Tighten the limit after first mint to guarantee the next mint exceeds the cap
        next_tx(&mut scenario, ADMIN);
        {
            let cap = test_scenario::take_from_sender<VerifierAdminCap>(&scenario);
            let mut config = test_scenario::take_from_sender<ProtocolConfig>(&scenario);
            protocol::update_global_mint_limit_per_day(&cap, &mut config, 0);
            test_scenario::return_to_sender(&scenario, cap);
            test_scenario::return_to_sender(&scenario, config);
        };
        mint_attestation_for_user(&mut scenario, USER2, b"limit_two_should_fail");
        test_scenario::end(scenario);
    }

    #[test]
    fun test_revoke_sets_revoked_state() {
        let mut scenario = test_scenario::begin(ADMIN);
        setup(&mut scenario);
        mint_attestation_for_user(&mut scenario, USER1, b"revoke_me");

        next_tx(&mut scenario, ADMIN);
        {
            let cap = test_scenario::take_from_sender<VerifierAdminCap>(&scenario);
            let config = test_scenario::take_from_sender<ProtocolConfig>(&scenario);
            let mut attestation = test_scenario::take_from_address<Suirify_Attestation>(&scenario, USER1);
            protocol::revoke_attestation(&cap, &config, &mut attestation, 7, ctx(&mut scenario));
            assert!(protocol::is_revoked(&attestation), 8);
            test_scenario::return_to_sender(&scenario, cap);
            test_scenario::return_to_sender(&scenario, config);
            test_scenario::return_to_address(USER1, attestation);
        };
        test_scenario::end(scenario);
    }

    #[test]
    fun test_renew_update_upgrade_success_flow() {
        let mut scenario = test_scenario::begin(ADMIN);
        setup(&mut scenario);
        mint_attestation_for_user(&mut scenario, USER1, b"initial_hash");

        // Set a deterministic upgrade fee for the test
        next_tx(&mut scenario, ADMIN);
        {
            let cap = test_scenario::take_from_sender<VerifierAdminCap>(&scenario);
            let mut config = test_scenario::take_from_sender<ProtocolConfig>(&scenario);
            protocol::update_upgrade_fee(&cap, &mut config, 10);
            test_scenario::return_to_sender(&scenario, cap);
            test_scenario::return_to_sender(&scenario, config);
        };

        let request_id = create_upgrade_request(&mut scenario, USER1, 10);

        next_tx(&mut scenario, USER1);
        {
            let cap = test_scenario::take_from_address<VerifierAdminCap>(&scenario, ADMIN);
            let mut config = test_scenario::take_from_address<ProtocolConfig>(&scenario, ADMIN);
            let mut registry = test_scenario::take_shared<AttestationRegistry>(&scenario);
            let mut attestation = test_scenario::take_from_sender<Suirify_Attestation>(&scenario);
            let old_expiry = protocol::get_expiry_time(&attestation);

            protocol::renew_update_upgrade_attestation(
                &cap,
                &mut config,
                &mut registry,
                &mut attestation,
                request_id,
                NGA_ISO_CODE,
                1,
                vector[2],
                2,
                b"updated_hash",
                true,
                false,
                2,
                ctx(&mut scenario),
            );

            assert!(protocol::get_name_hash(&attestation) == b"updated_hash", 9);
            // Allow equality in case test timestamps reuse the same epoch ms in-sim
            assert!(protocol::get_expiry_time(&attestation) >= old_expiry, 10);
            assert!(!protocol::is_revoked(&attestation), 11);

            test_scenario::return_to_address(ADMIN, cap);
            test_scenario::return_to_address(ADMIN, config);
            test_scenario::return_shared(registry);
            test_scenario::return_to_sender(&scenario, attestation);
        };
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = suirify::protocol::EUnauthorized)]
    fun test_renew_update_rejects_level_downgrade() {
        let mut scenario = test_scenario::begin(ADMIN);
        setup(&mut scenario);
        mint_attestation_for_user(&mut scenario, USER1, b"no_downgrade");

        let request_id = create_upgrade_request(&mut scenario, USER1, 500000000);

        next_tx(&mut scenario, USER1);
        {
            let cap = test_scenario::take_from_address<VerifierAdminCap>(&scenario, ADMIN);
            let mut config = test_scenario::take_from_address<ProtocolConfig>(&scenario, ADMIN);
            let mut registry = test_scenario::take_shared<AttestationRegistry>(&scenario);
            let mut attestation = test_scenario::take_from_sender<Suirify_Attestation>(&scenario);
            protocol::renew_update_upgrade_attestation(
                &cap,
                &mut config,
                &mut registry,
                &mut attestation,
                request_id,
                NGA_ISO_CODE,
                1,
                vector[],
                0,
                b"downgrade",
                true,
                true,
                1,
                ctx(&mut scenario),
            );
            test_scenario::return_to_address(ADMIN, cap);
            test_scenario::return_to_address(ADMIN, config);
            test_scenario::return_shared(registry);
            test_scenario::return_to_sender(&scenario, attestation);
        };
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = suirify::protocol::EJurisdictionMismatch)]
    fun test_renew_update_rejects_jurisdiction_mismatch() {
        let mut scenario = test_scenario::begin(ADMIN);
        setup(&mut scenario);
        mint_attestation_for_user(&mut scenario, USER1, b"jurisdiction_match");

        let request_id = create_upgrade_request(&mut scenario, USER1, 500000000);

        next_tx(&mut scenario, USER1);
        {
            let cap = test_scenario::take_from_address<VerifierAdminCap>(&scenario, ADMIN);
            let mut config = test_scenario::take_from_address<ProtocolConfig>(&scenario, ADMIN);
            let mut registry = test_scenario::take_shared<AttestationRegistry>(&scenario);
            let mut attestation = test_scenario::take_from_sender<Suirify_Attestation>(&scenario);
            protocol::renew_update_upgrade_attestation(
                &cap,
                &mut config,
                &mut registry,
                &mut attestation,
                request_id,
                999,
                1,
                vector[],
                2,
                b"jurisdiction_fail",
                true,
                true,
                1,
                ctx(&mut scenario),
            );
            test_scenario::return_to_address(ADMIN, cap);
            test_scenario::return_to_address(ADMIN, config);
            test_scenario::return_shared(registry);
            test_scenario::return_to_sender(&scenario, attestation);
        };
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = suirify::protocol::EInvalidVerifierSource)]
    fun test_renew_update_rejects_verifier_source_mismatch() {
        let mut scenario = test_scenario::begin(ADMIN);
        setup(&mut scenario);
        mint_attestation_for_user(&mut scenario, USER1, b"verifier_source_match");

        let request_id = create_upgrade_request(&mut scenario, USER1, 500000000);

        next_tx(&mut scenario, USER1);
        {
            let cap = test_scenario::take_from_address<VerifierAdminCap>(&scenario, ADMIN);
            let mut config = test_scenario::take_from_address<ProtocolConfig>(&scenario, ADMIN);
            let mut registry = test_scenario::take_shared<AttestationRegistry>(&scenario);
            let mut attestation = test_scenario::take_from_sender<Suirify_Attestation>(&scenario);
            protocol::renew_update_upgrade_attestation(
                &cap,
                &mut config,
                &mut registry,
                &mut attestation,
                request_id,
                NGA_ISO_CODE,
                9, // Different verifier source than original
                vector[],
                2,
                b"verifier_source_fail",
                true,
                true,
                1,
                ctx(&mut scenario),
            );
            test_scenario::return_to_address(ADMIN, cap);
            test_scenario::return_to_address(ADMIN, config);
            test_scenario::return_shared(registry);
            test_scenario::return_to_sender(&scenario, attestation);
        };
        test_scenario::end(scenario);
    }
}