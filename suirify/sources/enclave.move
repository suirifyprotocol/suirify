module suirify::enclave {
    use sui::bcs;
    use sui::ed25519;
    use sui::event;
    use std::string::String;

    use suirify::auth::VerifierAdminCap;

    const EINVALID_PCR_LENGTH: u64 = 0;
    const EINVALID_SIGNATURE: u64 = 1;
    const EVERSION_MISMATCH: u64 = 2;

    const PCR_LENGTH_BYTES: u64 = 48;

    public struct EnclaveConfig has key, store {
        id: UID,
        name: String,
        pcr0: vector<u8>,
        pcr1: vector<u8>,
        pcr2: vector<u8>,
        config_version: u64,
        last_rotation_ms: u64,
    }

    public struct Enclave has key, store {
        id: UID,
        config_id: ID,
        public_key: vector<u8>,
        config_version: u64,
        attestation_time_ms: u64,
    }

    public struct PcrsUpdated has copy, drop {
        config_id: ID,
        config_version: u64,
        pcr0: vector<u8>,
        pcr1: vector<u8>,
        pcr2: vector<u8>,
    }

    public struct EnclaveRegistered has copy, drop {
        config_id: ID,
        enclave_id: ID,
        config_version: u64,
        attestation_time_ms: u64,
    }

    // Struct fields are not public (to enforce deconstruction only in this module)
    public struct SignedMintData has copy, drop, store {
        request_id: ID,
        recipient: address,
        jurisdiction_code: u16,
        verification_level: u8,
        verifier_source: u8,
        name_hash: vector<u8>,
        is_human_verified: bool,
        is_over_18: bool,
        verifier_version: u8,
        issued_ms: u64,
    }

    public fun create_config(
        _cap: &VerifierAdminCap,
        name: String,
        pcr0: vector<u8>,
        pcr1: vector<u8>,
        pcr2: vector<u8>,
        ctx: &mut TxContext,
    ) {
        assert_valid_pcr(&pcr0);
        assert_valid_pcr(&pcr1);
        assert_valid_pcr(&pcr2);

        let now = tx_context::epoch_timestamp_ms(ctx);
        let config = EnclaveConfig {
            id: object::new(ctx),
            name,
            pcr0,
            pcr1,
            pcr2,
            config_version: 1,
            last_rotation_ms: now,
        };

        transfer::share_object(config);
    }

    public fun update_pcrs(
        _cap: &VerifierAdminCap,
        config: &mut EnclaveConfig,
        pcr0: vector<u8>,
        pcr1: vector<u8>,
        pcr2: vector<u8>,
        ctx: &mut TxContext,
    ) {
        assert_valid_pcr(&pcr0);
        assert_valid_pcr(&pcr1);
        assert_valid_pcr(&pcr2);

        config.pcr0 = pcr0;
        config.pcr1 = pcr1;
        config.pcr2 = pcr2;
        config.config_version = config.config_version + 1;
        config.last_rotation_ms = tx_context::epoch_timestamp_ms(ctx);

        event::emit(PcrsUpdated {
            config_id: object::id(config),
            config_version: config.config_version,
            pcr0: config.pcr0,  // Vectors can be copied directly
            pcr1: config.pcr1,
            pcr2: config.pcr2,
        });
    }

    public fun update_name(
        _cap: &VerifierAdminCap,
        config: &mut EnclaveConfig,
        new_name: String,
    ) {
        config.name = new_name;
    }

    public fun register_enclave(
        config: &EnclaveConfig,
        public_key: vector<u8>,
        config_version: u64,
        attestation_time_ms: u64,
        ctx: &mut TxContext,
    ): Enclave {
        // Uses the public getter
        assert!(config_version == get_config_version_from_config(config), EVERSION_MISMATCH);

        let enclave = Enclave {
            id: object::new(ctx),
            config_id: object::id(config),
            public_key,
            config_version,
            attestation_time_ms,
        };

        event::emit(EnclaveRegistered {
            config_id: object::id(config),
            enclave_id: object::id(&enclave),
            config_version,
            attestation_time_ms,
        });

        enclave
    }

    public fun destroy_enclave(
        _cap: &VerifierAdminCap,
        enclave: Enclave,
    ) {
        let Enclave { id, config_id: _, public_key: _, config_version: _, attestation_time_ms: _ } = enclave;
        object::delete(id);
    }

    public fun verify_response(
        enclave: &Enclave,
        payload: &vector<u8>,
        signature: &vector<u8>,
    ): SignedMintData {
        let is_valid = ed25519::ed25519_verify(signature, &enclave.public_key, payload);
        assert!(is_valid, EINVALID_SIGNATURE);
        
        // bcs::peel_* functions to deserialize
        let mut bcs_bytes = bcs::new(*payload);
        let request_id = bcs::peel_address(&mut bcs_bytes).to_id();
        let recipient = bcs::peel_address(&mut bcs_bytes);
        let jurisdiction_code = bcs::peel_u16(&mut bcs_bytes);
        let verification_level = bcs::peel_u8(&mut bcs_bytes);
        let verifier_source = bcs::peel_u8(&mut bcs_bytes);
        let name_hash = bcs::peel_vec_u8(&mut bcs_bytes);
        let is_human_verified = bcs::peel_bool(&mut bcs_bytes);
        let is_over_18 = bcs::peel_bool(&mut bcs_bytes);
        let verifier_version = bcs::peel_u8(&mut bcs_bytes);
        let issued_ms = bcs::peel_u64(&mut bcs_bytes);

        SignedMintData {
            request_id,
            recipient,
            jurisdiction_code,
            verification_level,
            verifier_source,
            name_hash,
            is_human_verified,
            is_over_18,
            verifier_version,
            issued_ms,
        }
    }

    public fun verify_and_extract_mint_data(
        enclave: &Enclave,
        payload: &vector<u8>,
        signature: &vector<u8>,
    ): (ID, address, u16, u8, u8, vector<u8>, bool, bool, u8, u64) {
        let signed = verify_response(enclave, payload, signature);

        // Deconstruction allowed here in the defining module
        let SignedMintData {
            request_id,
            recipient,
            jurisdiction_code,
            verification_level,
            verifier_source,
            name_hash,
            is_human_verified,
            is_over_18,
            verifier_version,
            issued_ms,
        } = signed;

        // Return the fields as a publicly accessible tuple
        (
            request_id,
            recipient,
            jurisdiction_code,
            verification_level,
            verifier_source,
            name_hash,
            is_human_verified,
            is_over_18,
            verifier_version,
            issued_ms
        )
    }

    // Getter functions for cross-module access
    public fun get_config_id(enclave: &Enclave): ID {
        enclave.config_id
    }

    public fun get_config_version(enclave: &Enclave): u64 {
        enclave.config_version
    }

    public fun get_config_version_from_config(config: &EnclaveConfig): u64 {
        config.config_version
    }

    fun assert_valid_pcr(pcr: &vector<u8>) {
        assert!(vector::length(pcr) as u64 == PCR_LENGTH_BYTES, EINVALID_PCR_LENGTH);
    }
}