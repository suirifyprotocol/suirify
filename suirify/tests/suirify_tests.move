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
                user, NGA_ISO_CODE, 1, 1, name_hash, true, true, 1,
                ctx(scenario)
            );

            test_scenario::return_to_sender(scenario, admin_cap);
            test_scenario::return_to_sender(scenario, config);
            test_scenario::return_shared(att_registry);
            test_scenario::return_shared(policy);
        };
    }

    // --- ALL OTHER TESTS REMAIN EXACTLY THE SAME ---

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
    #[expected_failure(abort_code = suirify::protocol::EATTESTATION_ALREADY_EXISTS)]
    fun test_mint_duplicate_attestation_fails() {
        let mut scenario = test_scenario::begin(ADMIN);
        setup(&mut scenario);
        mint_attestation_for_user(&mut scenario, USER1, b"name_hash_1");
        mint_attestation_for_user(&mut scenario, USER1, b"name_hash_2");
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = suirify::protocol::EONLY_OWNER_CAN_BURN)]
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
}