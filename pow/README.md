# DeepSeek PoW Pure Go Implementation

The server-side PoW is implemented in pure Go: `internal/deepseek/pow.go` extracts fields from the upstream challenge map, calls `ds2api/pow` to solve the nonce, and assembles the `x-ds-pow-response` header.

## Algorithm

DeepSeekHashV1 = SHA3-256 but **Keccak-f[1600] skips round 0** (only rounds 1..23). Other parameters unchanged:
rate=136, padding=0x06+0x80, output=32 bytes.

PoW protocol: the server picks answer in [0, difficulty) and computes `challenge = hash(prefix + str(answer))`.
The client iterates [0, difficulty) to find the matching nonce.

```
prefix = salt + "_" + str(expire_at) + "_"
input  = (prefix + str(nonce)).encode("utf-8")
hash   = DeepSeekHashV1(input)      → 32 bytes
header = base64(json({algorithm, challenge, salt, answer, signature, target_path}))
```

## Main Entry Points

- `pow/deepseek_hash.go`: DeepSeekHashV1 / Keccak-f[1600] rounds 1..23.
- `pow/deepseek_pow.go`: `SolvePow`, `BuildPowHeader`, `SolveAndBuildHeader`.
- `internal/deepseek/pow.go`: Server-side adapter, validates `algorithm == DeepSeekHashV1` and calls `pow.SolvePow`.

## Testing

```bash
cd pow && go test -v ./... && go test -bench=. -benchmem
```
