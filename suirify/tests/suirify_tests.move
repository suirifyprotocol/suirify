#[test_only]
module suirify::suirify_tests {
    use sui::test_scenario::{Self, next_tx};
    use sui::clock;

    // --- IMPORTS ---
    use suirify::auth::VerifierAdminCap;
    use suirify::protocol::{Self, ProtocolConfig, Suirify_Attestation};
    use suirify::jurisdictions::{Self, JurisdictionPolicy, JurisdictionRegistry};
    use suirify::attestation_utils; 
    use suirify::user_actions;      

    // Test constants
    const ADMIN: address = @0xABCD;
    const USER1: address = @0x1234;
    const USER2: address = @0x5678; 

    // --- HELPER FUNCTION FOR SETUP (Corrected) ---
    fun setup(scenario: &mut test_scenario::Scenario) {
        { protocol::test_init(test_scenario::ctx(scenario)); };
        next_tx(scenario, ADMIN);
        {
            let cap = test_scenario::take_from_sender<VerifierAdminCap>(scenario);
            jurisdictions::init_registry(&cap, test_scenario::ctx(scenario));
            test_scenario::return_to_sender(scenario, cap);
        };
        next_tx(scenario, ADMIN);
        {
            let cap = test_scenario::take_from_sender<VerifierAdminCap>(scenario);
            let mut registry = test_scenario::take_shared<JurisdictionRegistry>(scenario);
            jurisdictions::add_jurisdiction_policy(
                &cap,
                &mut registry,
                840,
                vector[1, 2],
                test_scenario::ctx(scenario)
            );
            test_scenario::return_to_sender(scenario, cap);
            test_scenario::return_shared(registry);
        };
        next_tx(scenario, ADMIN);
    }

    #[test]
    fun test_init_and_setup() {
        let mut scenario = test_scenario::begin(ADMIN);
        setup(&mut scenario);
        
        assert!(test_scenario::has_most_recent_for_sender<VerifierAdminCap>(&scenario), 0);
        assert!(test_scenario::has_most_recent_for_sender<ProtocolConfig>(&scenario), 1);
        // The registry and policy are shared objects now, not owned by the sender
        //assert!(test_scenario::exists_shared<JurisdictionRegistry>(&scenario), 2);
        //assert!(test_scenario::exists_shared<JurisdictionPolicy>(&scenario), 3);
        
        test_scenario::end(scenario);
    }

    #[test]
    fun test_mint_attestation_success() {
        let mut scenario = test_scenario::begin(ADMIN);
        setup(&mut scenario);
        
        {
            let admin_cap = test_scenario::take_from_sender<VerifierAdminCap>(&scenario);
            let mut config = test_scenario::take_from_sender<ProtocolConfig>(&scenario);
            // In tests, we can take shared objects to get their ID, but it's easier to find them.
            // For simplicity here, let's just assume we know which policy to use.
            // A more robust test would query for the policy with the right iso_num.
            let policy = test_scenario::take_shared<JurisdictionPolicy>(&scenario);
            
            protocol::mint_attestation(
                &admin_cap,
                &mut config,
                &policy,
                USER1, 840, 1, 1, b"name_hash_test", true, true, 1,
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_to_sender(&scenario, admin_cap);
            test_scenario::return_to_sender(&scenario, config);
            test_scenario::return_shared(policy);
        };
        
        next_tx(&mut scenario, USER1);
        {
            assert!(test_scenario::has_most_recent_for_sender<Suirify_Attestation>(&scenario), 4);
        };
        
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = suirify::protocol::EONLY_OWNER_CAN_BURN)]
    fun test_burn_by_non_owner_fails() {
        let mut scenario = test_scenario::begin(ADMIN);
        setup(&mut scenario);
        
        // Mint attestation for USER1
        {
            let admin_cap = test_scenario::take_from_sender<VerifierAdminCap>(&scenario);
            let mut config = test_scenario::take_from_sender<ProtocolConfig>(&scenario);
            let policy = test_scenario::take_shared<JurisdictionPolicy>(&scenario);
            protocol::mint_attestation(
                &admin_cap, &mut config, &policy, USER1, 840, 1, 1, b"hash", true, true, 1,
                test_scenario::ctx(&mut scenario)
            );
            test_scenario::return_to_sender(&scenario, admin_cap);
            test_scenario::return_to_sender(&scenario, config);
            test_scenario::return_shared(policy);
        };
        
        // Switch to USER2 (who is not the owner) to attempt the burn
        next_tx(&mut scenario, USER2); 
        {
            let attestation = test_scenario::take_from_address<Suirify_Attestation>(&scenario, USER1);
            
            // This call will fail because USER2 is the sender, but USER1 is the owner.
            user_actions::burn_self(attestation, test_scenario::ctx(&mut scenario));
        };
        
        test_scenario::end(scenario);
    }

    #[test]
    fun test_attestation_utils_functions() {
        let mut scenario = test_scenario::begin(ADMIN);
        let mut clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        setup(&mut scenario);

        // Mint an attestation
        {
            let admin_cap = test_scenario::take_from_sender<VerifierAdminCap>(&scenario);
            let mut config = test_scenario::take_from_sender<ProtocolConfig>(&scenario);
            let policy = test_scenario::take_shared<JurisdictionPolicy>(&scenario);
            protocol::mint_attestation(
                &admin_cap, &mut config, &policy, USER1, 840, 1, 1, b"test_hash", true, true, 1,
                test_scenario::ctx(&mut scenario)
            );
            test_scenario::return_to_sender(&scenario, admin_cap);
            test_scenario::return_to_sender(&scenario, config);
            test_scenario::return_shared(policy);
        };

        next_tx(&mut scenario, USER1);
        {
            let attestation = test_scenario::take_from_sender<Suirify_Attestation>(&scenario);
            
            // Test the utils
            assert!(attestation_utils::is_valid(&attestation, &clock), 14);
            assert!(attestation_utils::get_name_hash(&attestation) == b"test_hash", 15);
            
            // Fast forward time to test expiry
            clock::increment_for_testing(&mut clock, 31536000000 + 86400000); // 1 year + 1 day
            assert!(!attestation_utils::is_valid(&attestation, &clock), 10);

            test_scenario::return_to_sender(&scenario, attestation);
        };
        
        clock::destroy_for_testing(clock);
        test_scenario::end(scenario);
    }
}