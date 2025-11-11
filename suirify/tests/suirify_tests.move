#[test_only]
/// This module contains a suite of tests for the Suirify protocol,
/// ensuring all core functionalities work as expected.
module suirify::suirify_tests {
    use sui::test_scenario::{Self, next_tx, ctx};
    use sui::clock;

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

    // ADDED: Private helper function for minting to avoid code duplication.
    /// Mints a standard attestation for USER1.
    fun mint_attestation_for_user1(scenario: &mut test_scenario::Scenario) {
        let admin_cap = test_scenario::take_from_sender<VerifierAdminCap>(scenario);
        let mut config = test_scenario::take_from_sender<ProtocolConfig>(scenario);
        let mut att_registry = test_scenario::take_shared<AttestationRegistry>(scenario);
        let policy = test_scenario::take_shared<JurisdictionPolicy>(scenario);

        protocol::mint_attestation(
            &admin_cap,
            &mut config,
            &mut att_registry,
            &policy,
            USER1, NGA_ISO_CODE, 1, 1, b"name_hash_test", true, true, 1,
            ctx(scenario)
        );

        test_scenario::return_to_sender(scenario, admin_cap);
        test_scenario::return_to_sender(scenario, config);
        test_scenario::return_shared(att_registry);
        test_scenario::return_shared(policy);
    }

    #[test]
    /// Verifies that the `init` and `setup` functions correctly create all initial objects.
    fun test_init_and_setup() {
        let mut scenario = test_scenario::begin(ADMIN);
        setup(&mut scenario);

        assert!(test_scenario::has_most_recent_for_sender<VerifierAdminCap>(&scenario), 0);
        assert!(test_scenario::has_most_recent_for_sender<ProtocolConfig>(&scenario), 1);

        // Correctly check for shared object existence by taking and returning them.
        // If any of these objects do not exist, the test will abort here.
        let jur_reg = test_scenario::take_shared<JurisdictionRegistry>(&scenario);
        test_scenario::return_shared(jur_reg);
        let att_reg = test_scenario::take_shared<AttestationRegistry>(&scenario);
        test_scenario::return_shared(att_reg);
        let policy = test_scenario::take_shared<JurisdictionPolicy>(&scenario);
        test_scenario::return_shared(policy);

        test_scenario::end(scenario);
    }

    #[test]
    /// Tests the successful minting of a new attestation.
    fun test_mint_attestation_success() {
        let mut scenario = test_scenario::begin(ADMIN);
        setup(&mut scenario);

        // MODIFIED: Call the private helper function.
        mint_attestation_for_user1(&mut scenario);

        next_tx(&mut scenario, USER1);
        {
            assert!(test_scenario::has_most_recent_for_sender<Suirify_Attestation>(&scenario), 5);
        };

        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = suirify::protocol::EATTESTATION_ALREADY_EXISTS)]
    /// Verifies that the contract prevents minting a second attestation for the same user.
    fun test_mint_duplicate_attestation_fails() {
        let mut scenario = test_scenario::begin(ADMIN);
        setup(&mut scenario);

        // The first mint for USER1 should succeed.
        mint_attestation_for_user1(&mut scenario);

        // The second mint for the SAME user (USER1) should fail.
        // We re-take the objects because the helper function returned them.
        mint_attestation_for_user1(&mut scenario);

        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = suirify::protocol::EONLY_OWNER_CAN_BURN)]
    /// Verifies that only the owner of an attestation can burn it.
    fun test_burn_by_non_owner_fails() {
        let mut scenario = test_scenario::begin(ADMIN);
        setup(&mut scenario);

        // Mint an attestation for USER1 first.
        // MODIFIED: Call the helper function.
        mint_attestation_for_user1(&mut scenario);

        // Switch to USER2 to attempt the burn.
        next_tx(&mut scenario, USER2);
        {
            let attestation = test_scenario::take_from_address<Suirify_Attestation>(&scenario, USER1);
            let mut att_registry = test_scenario::take_shared<AttestationRegistry>(&scenario);

            // This call will fail because the sender (USER2) is not the owner (USER1).
            user_actions::burn_self(attestation, &mut att_registry, ctx(&mut scenario));

            test_scenario::return_shared(att_registry);
        };

        test_scenario::end(scenario);
    }

    #[test]
    /// Verifies that an owner can successfully delete their own attestation.
    fun test_burn_by_owner_success() {
        let mut scenario = test_scenario::begin(ADMIN);
        setup(&mut scenario);

        // Mint an attestation for USER1.
        // MODIFIED: Call the helper function.
        mint_attestation_for_user1(&mut scenario);

        // Switch to USER1 to burn their attestation.
        next_tx(&mut scenario, USER1);
        {
            let attestation = test_scenario::take_from_sender<Suirify_Attestation>(&scenario);
            let mut att_registry = test_scenario::take_shared<AttestationRegistry>(&scenario);

            user_actions::burn_self(attestation, &mut att_registry, ctx(&mut scenario));
            test_scenario::return_shared(att_registry);

            // Verify the attestation object no longer exists for the user.
            assert!(!test_scenario::has_most_recent_for_sender<Suirify_Attestation>(&scenario), 6);
        };

        test_scenario::end(scenario);
    }

    #[test]
    /// Tests the read-only utility functions in `attestation_utils`.
    fun test_attestation_utils_functions() {
        let mut scenario = test_scenario::begin(ADMIN);
        let mut clock = clock::create_for_testing(ctx(&mut scenario));
        next_tx(&mut scenario, ADMIN);
        
        setup(&mut scenario);

        // Mint an attestation for USER1.
        // MODIFIED: Call the helper function.
        mint_attestation_for_user1(&mut scenario);

        next_tx(&mut scenario, USER1);
        {
            let attestation = test_scenario::take_from_sender<Suirify_Attestation>(&scenario);

            assert!(attestation_utils::is_valid(&attestation, &clock), 7);
            assert!(attestation_utils::get_name_hash(&attestation) == b"name_hash_test", 8);

            clock::increment_for_testing(&mut clock, 31536000000 + 1); // 1 year + 1ms

            assert!(!attestation_utils::is_valid(&attestation, &clock), 9);

            test_scenario::return_to_sender(&scenario, attestation);
        };

        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }
}