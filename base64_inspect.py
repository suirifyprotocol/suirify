# Inspect a base64 string by showing decoded length and first bytes.
import argparse
import base64


def hex_preview(data: bytes, count: int = 16) -> str:
    snippet = data[:count]
    return snippet.hex()


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Decode a base64 string, report the byte length, and show a hex preview "
            "of the first few bytes."
        )
    )
    parser.add_argument("value", help="Base64-encoded string to inspect")
    parser.add_argument(
        "-n",
        "--preview-bytes",
        type=int,
        default=16,
        help="Number of leading bytes to show in hex (default: 16)",
    )
    args = parser.parse_args()

    data = base64.b64decode(args.value)
    print(f"{len(data)} bytes -> {hex_preview(data, args.preview_bytes)}...")


if __name__ == "__main__":
    main()
