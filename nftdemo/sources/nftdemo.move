module nftdemo::suirify {
    use std::string::{Self, String, utf8};
    use sui::url::{Self, Url};
    use sui::display;
    use sui::package;

    /// The One-Time-Witness (OTW).
    /// This must have the same name as the module but uppercase.
    public struct SUIRIFY has drop {}

    /// The NFT Struct
    public struct SuirifyNFT has key, store {
        id: UID,
        name: String,
        description: String,
        image_url: Url,
    }

    /// Init runs once on deployment. 
    /// It sets up the "Display" standard so wallets know how to show the image.
    fun init(otw: SUIRIFY, ctx: &mut TxContext) {
        let deployer = ctx.sender();

        // 1. Claim the Publisher object (required for Display)
        let publisher = package::claim(otw, ctx);

        // 2. Define the Display keys (what fields the wallet looks for)
        let keys = vector[
            utf8(b"name"),
            utf8(b"link"),
            utf8(b"image_url"),
            utf8(b"description"),
            utf8(b"project_url"),
            utf8(b"creator"),
        ];

        let values = vector[
            utf8(b"{name}"),                  
            utf8(b"https://devnet.suirify.com"), 
            utf8(b"{image_url}"),           
            utf8(b"{description}"),          
            utf8(b"https://devnet.suirify.com"),
            utf8(b"Suirify Protocol"),            
        ];

        // 4. Create the Display object
        let mut display = display::new_with_fields<SuirifyNFT>(
            &publisher, keys, values, ctx
        );

        // 5. Commit changes to the Display object
        display.update_version();

        // 6. Transfer the Publisher and Display objects to the deployer
        transfer::public_transfer(publisher, deployer);
        transfer::public_transfer(display, deployer);
    }

    /// Function to mint a new NFT
    public fun mint(
        name: vector<u8>,
        description: vector<u8>,
        url: vector<u8>,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let suirifynft = SuirifyNFT {
            id: object::new(ctx),
            name: string::utf8(name),
            description: string::utf8(description),
            image_url: url::new_unsafe_from_bytes(url),
        };

        transfer::public_transfer(suirifynft, recipient);
    }

    /// Function to burn (destroy) the NFT
    public fun burn(suirifynft: SuirifyNFT) {
        let SuirifyNFT { id, name: _, description: _, image_url: _ } = suirifynft;
        object::delete(id);
    }
}