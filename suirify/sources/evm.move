// SPDX-License-Identifier: GPL-3.0
// Project: https://github.com/suirifyprotocol/suirify
// Author: https://github.com/CYBWithFlourish
/// EVM Bridge Module for Suirify
/// Enables linking EVM addresses to Sui-based identities
module suirify::evm {
    use sui::event;
    use suirify::protocol::{Self as protocol, AttestationRegistry, ProtocolConfig, Suirify_Attestation};
    use suirify::auth::VerifierAdminCap;
    use suirify::jurisdictions::JurisdictionPolicy;
    use suirify::enclave;

    /// Error codes
    const EInvalidEVMAddress: u64 = 1;

    /// Chain-agnostic marker. Stored chain ID is informational only.
    const CHAIN_ID_CHAIN_AGNOSTIC: u64 = 0;

    /// Represents the link between EVM address and Sui attestation
    public struct EVMBridge has key, store {
        id: UID,
        evm_address: vector<u8>,        // 20 bytes - ETH address
        evm_chain_id: u64,              // Chain ID (1=Ethereum, 137=Polygon, etc)
        sui_address: address,           // Derived Sui address
        attestation_id: address,        // Points to Suirify_Attestation
        created_at: u64,
        is_active: bool,
    }

    /// Registry to track EVM → Sui mappings
    public struct EVMRegistry has key {
        id: UID,
        total_bridges: u64,
    }

    /// Events
    public struct EVMBridgeCreated has copy, drop {
        evm_address: vector<u8>,
        evm_chain_id: u64,
        sui_address: address,
        attestation_id: address,
        bridge_id: address,
    }

    public struct EVMBridgeRevoked has copy, drop {
        bridge_id: address,
        evm_address: vector<u8>,
    }

    /// Initialize the registry (called once on deployment)
    fun init(ctx: &mut TxContext) {
        let registry = EVMRegistry {
            id: object::new(ctx),
            total_bridges: 0,
        };
        transfer::share_object(registry);
    }

    /// Create EVM bridge and mint attestation via protocol::mint_attestation
    /// Chain-agnostic: the relayer verifies address ownership off-chain; stored chain ID is informational.
    #[allow(lint(self_transfer))]
    public fun create_evm_bridge(
        registry: &mut EVMRegistry,
        protocol_registry: &mut AttestationRegistry,
        config: &mut ProtocolConfig,
        cap: &VerifierAdminCap,
        policy: &JurisdictionPolicy,
        request_id: ID,
        evm_address: vector<u8>,
        _evm_signature: vector<u8>,
        _evm_chain_id: u64,
        jurisdiction_code: u16,
        verifier_source: u8,
        verification_level: u8,
        name_hash: vector<u8>,
        is_human_verified: bool,
        is_over_18: bool,
        verifier_version: u8,
        ctx: &mut TxContext
    ) {
        // Validate EVM address length (must be 20 bytes)
        assert!(vector::length(&evm_address) == 20, EInvalidEVMAddress);

        // The caller (relayer) derives the Sui address from EVM signature
        let derived_sui_address = tx_context::sender(ctx);

        // Mint attestation using core protocol
        protocol::mint_attestation(
            cap,
            config,
            protocol_registry,
            request_id,
            policy,
            derived_sui_address,
            jurisdiction_code,
            verifier_source,
            vector::empty(),
            verification_level,
            name_hash,
            is_human_verified,
            is_over_18,
            verifier_version,
            ctx,
        );

        // Fetch the attestation ID for the derived address
        let attestation_id = protocol::get_attestation_id_for_owner(protocol_registry, derived_sui_address);
        let attestation_addr = object::id_to_address(&attestation_id);

        // Create bridge object
        let bridge = EVMBridge {
            id: object::new(ctx),
            evm_address,
            evm_chain_id: CHAIN_ID_CHAIN_AGNOSTIC,
            sui_address: derived_sui_address,
            attestation_id: attestation_addr,
            created_at: tx_context::epoch(ctx),
            is_active: true,
        };

        let bridge_id = object::uid_to_address(&bridge.id);

        // Update registry
        registry.total_bridges = registry.total_bridges + 1;

        // Emit event
        event::emit(EVMBridgeCreated {
            evm_address: evm_address,
            evm_chain_id: CHAIN_ID_CHAIN_AGNOSTIC,
            sui_address: derived_sui_address,
            attestation_id: attestation_addr,
            bridge_id,
        });

        // Transfer bridge object to the derived Sui address
        transfer::transfer(bridge, derived_sui_address);
    }

    /// Create EVM bridge and mint attestation via enclave-backed flow
    /// Chain-agnostic: the relayer verifies address ownership off-chain; stored chain ID is informational.
    #[allow(lint(self_transfer))]
    public fun create_evm_bridge_with_enclave(
        registry: &mut EVMRegistry,
        protocol_registry: &mut AttestationRegistry,
        config: &mut ProtocolConfig,
        cap: &VerifierAdminCap,
        policy: &JurisdictionPolicy,
        enclave_config: &enclave::EnclaveConfig,
        enclave_obj: &enclave::Enclave,
        request_id: ID,
        evm_address: vector<u8>,
        _evm_signature: vector<u8>,
        _evm_chain_id: u64,
        payload: vector<u8>,
        enclave_signature: vector<u8>,
        ctx: &mut TxContext,
    ) {
        // Validate EVM address length (must be 20 bytes)
        assert!(vector::length(&evm_address) == 20, EInvalidEVMAddress);

        // The caller (relayer) derives the Sui address from EVM signature
        let derived_sui_address = tx_context::sender(ctx);

        // Mint attestation using enclave-verified flow
        protocol::mint_attestation_with_enclave(
            cap,
            config,
            protocol_registry,
            request_id,
            policy,
            enclave_config,
            enclave_obj,
            payload,
            enclave_signature,
            ctx,
        );

        // Fetch the attestation ID for the derived address
        let attestation_id = protocol::get_attestation_id_for_owner(protocol_registry, derived_sui_address);
        let attestation_addr = object::id_to_address(&attestation_id);

        // Create bridge object
        let bridge = EVMBridge {
            id: object::new(ctx),
            evm_address,
            evm_chain_id: CHAIN_ID_CHAIN_AGNOSTIC,
            sui_address: derived_sui_address,
            attestation_id: attestation_addr,
            created_at: tx_context::epoch(ctx),
            is_active: true,
        };

        let bridge_id = object::uid_to_address(&bridge.id);

        // Update registry
        registry.total_bridges = registry.total_bridges + 1;

        // Emit event
        event::emit(EVMBridgeCreated {
            evm_address: evm_address,
            evm_chain_id: CHAIN_ID_CHAIN_AGNOSTIC,
            sui_address: derived_sui_address,
            attestation_id: attestation_addr,
            bridge_id,
        });

        // Transfer bridge object to the derived Sui address
        transfer::transfer(bridge, derived_sui_address);
    }

    /// Revoke EVM bridge
    public fun revoke_bridge(
        bridge: EVMBridge,
        _ctx: &mut TxContext
    ) {
        let EVMBridge {
            id,
            evm_address,
            evm_chain_id: _,
            sui_address: _,
            attestation_id: _,
            created_at: _,
            is_active: _
        } = bridge;

        event::emit(EVMBridgeRevoked {
            bridge_id: object::uid_to_address(&id),
            evm_address,
        });

        object::delete(id);
    }

    /// View functions
    public fun get_evm_address(bridge: &EVMBridge): vector<u8> {
        bridge.evm_address
    }

    public fun get_chain_id(bridge: &EVMBridge): u64 {
        bridge.evm_chain_id
    }

    public fun get_sui_address(bridge: &EVMBridge): address {
        bridge.sui_address
    }

    public fun is_active(bridge: &EVMBridge): bool {
        bridge.is_active
    }

    public fun get_attestation_id(bridge: &EVMBridge): address {
        bridge.attestation_id
    }

    public fun get_total_bridges(registry: &EVMRegistry): u64 {
        registry.total_bridges
    }

    /// Renew/update/upgrade an existing attestation for an EVM-linked user using a pending renew request.
    /// This is a thin wrapper over protocol::renew_update_upgrade_attestation for EVM flows.
    public fun renew_update_upgrade_evm_attestation(
        protocol_registry: &mut AttestationRegistry,
        config: &mut ProtocolConfig,
        cap: &VerifierAdminCap,
        attestation: &mut Suirify_Attestation,
        request_id: ID,
        jurisdiction_code: u16,
        verifier_source: u8,
        extra_verifier_sources: vector<u8>,
        verification_level: u8,
        name_hash: vector<u8>,
        is_human_verified: bool,
        is_over_18: bool,
        verifier_version: u8,
        ctx: &mut TxContext,
    ) {
        protocol::renew_update_upgrade_attestation(
            cap,
            config,
            protocol_registry,
            attestation,
            request_id,
            jurisdiction_code,
            verifier_source,
            extra_verifier_sources,
            verification_level,
            name_hash,
            is_human_verified,
            is_over_18,
            verifier_version,
            ctx,
        );
    }

    /// Renew/update/upgrade via enclave-verified payload for EVM flows, using a pending renew/update request.
    public fun renew_update_upgrade_evm_attestation_with_enclave(
        protocol_registry: &mut AttestationRegistry,
        config: &mut ProtocolConfig,
        cap: &VerifierAdminCap,
        attestation: &mut Suirify_Attestation,
        request_id: ID,
        enclave_config: &enclave::EnclaveConfig,
        enclave_obj: &enclave::Enclave,
        payload: vector<u8>,
        signature: vector<u8>,
        ctx: &mut TxContext,
    ) {
        protocol::renew_update_upgrade_attestation_with_enclave(
            cap,
            config,
            protocol_registry,
            attestation,
            request_id,
            enclave_config,
            enclave_obj,
            payload,
            signature,
            ctx,
        );
    }
}