# StegoLab browser payload format

All integers are unsigned big-endian unless a carrier format specifies otherwise. The browser format is intentionally versioned separately from earlier files.

| Offset | Size | Field |
|---|---:|---|
| 0 | 4 | SLP2 magic |
| 4 | 1 | Version 2 |
| 5 | 1 | 0 unencrypted, 1 encrypted |
| 6 | 2 | Reserved, must be zero |
| 8 | 4 | Exact body length |
| 12 | 4 | 600000 iterations when encrypted; zero otherwise |
| 16 | 16 | Random salt; zero when unencrypted |
| 32 | 12 | Random AES-GCM nonce; zero when unencrypted |
| 44 | variable | Body |
| end − 32 | 32 | SHA-256 of the prefix and body |

The body contains a 42-byte metadata prefix: payload type (1 byte), zero reserved byte, filename length (2), MIME length (2), payload length (4), payload SHA-256 (32). UTF-8 filename, MIME and exact payload bytes follow. Filename is bounded to 240 UTF-8 bytes; MIME to 160 bytes. Payload is bounded to 8 MiB. Headers and exact lengths are validated before expensive processing or rendering.

When encrypted, the complete body, including filename, MIME and inner digest, is encrypted with AES-256-GCM and a 128-bit tag. The complete 44-byte outer prefix is authenticated as additional data. The key uses PBKDF2-HMAC-SHA-256 at exactly 600000 iterations; hostile input cannot select arbitrary KDF work. Salt and nonce are generated with crypto.getRandomValues for each operation. Keys are non-extractable CryptoKey objects.

The outer checksum is an early corruption check, not authentication. Unencrypted integrity is a checksum; a capable attacker can recalculate it. Encrypted integrity is authenticated by GCM. An incorrect password or modified encrypted payload never returns partial plaintext.

PNG/BMP wrap the container with STG2 and a 4-byte container length, writing one bit per RGB channel. PNG uses fully opaque pixels only; BMP uses raw RGB bytes without padding/alpha modification. JPEG APP15 chunks have STGLJ2 magic, 2-byte index, 2-byte count, 2-byte chunk length and at most 65519 bytes each. WebP adds one padded STGL RIFF chunk and updates the RIFF length. PDF stores an uncompressed EmbeddedFile stream referenced by the catalog and standard attachment structures; extraction refuses filtered payload streams.

Fresh original carriers are required. Re-embedding is rejected to avoid leaving remnants of a previous payload. There is no compression, error correction, transformation recovery or compatibility decoder for the earlier file format.

