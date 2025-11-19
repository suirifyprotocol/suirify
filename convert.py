# Convert a `suiprivkey...` Bech32 string into a 32-byte base64 secret.
import argparse
import base64
import sys

from bech32 import bech32_decode, convertbits


def to_base64_secret(bech32_key: str) -> str:
    key = bech32_key.strip()
    if not key:
        raise SystemExit("Empty key provided.")

    hrp, data = bech32_decode(key)
    if hrp != "suiprivkey":
        raise SystemExit(f"Unexpected HRP '{hrp}'. Expected 'suiprivkey'.")

    raw = bytes(convertbits(data, 5, 8, False))
    if not raw:
        raise SystemExit("Unable to decode Bech32 payload.")

    scheme = raw[0]
    if scheme != 0:
        raise SystemExit(
            f"Unsupported key scheme byte 0x{scheme:02x}; expected 0x00 for Ed25519."
        )

    secret = raw[1:33]
    if len(secret) != 32:
        raise SystemExit(
            f"Secret length is {len(secret)} bytes; expected exactly 32 bytes."
        )

    return base64.b64encode(secret).decode()


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Convert a suiprivkey... Bech32 private key into the base64-encoded "
            "32-byte secret expected by ENCLAVE_PRIVATE_KEY_B64."
        )
    )
    parser.add_argument(
        "key",
        nargs="?",
        help="Bech32 private key starting with suiprivkey...",
    )
    args = parser.parse_args()

    bech32_key = args.key or input("Paste suiprivkey... key: ").strip()
    secret_b64 = to_base64_secret(bech32_key)
    print(secret_b64)


if __name__ == "__main__":
    main()