# gRPC Notes

## Current Decision

- Use the Sui TypeScript SDK gRPC client: `SuiGrpcClient` from `@mysten/sui/grpc`.
- Do not vendor or copy the `sui-apis/proto` repository into this project for normal SDK-based usage.
- Keep GraphQL as fallback for indexed query patterns where needed.

## Why We Are Not Downloading Proto Files

- `@mysten/sui` already ships generated gRPC clients and message bindings.
- Adding raw proto files to this repo would create extra maintenance and version drift risk.
- We only need the proto repo if we intentionally switch to a raw gRPC implementation.

Reference proto source:

- `https://github.com/MystenLabs/sui-apis/tree/main/proto`

## Required Server-Side Packages

For Node.js backend services, use native gRPC transport:

```bash
npm install @mysten/sui @protobuf-ts/grpc-transport @grpc/grpc-js
```

## Recommended Client Initialization (Node)

```ts
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { GrpcTransport } from '@protobuf-ts/grpc-transport';
import { ChannelCredentials } from '@grpc/grpc-js';

const transport = new GrpcTransport({
	host: 'fullnode.testnet.sui.io:443',
	channelCredentials: ChannelCredentials.createSsl(),
});

const client = new SuiGrpcClient({
	network: 'testnet',
	transport,
});
```

## API Usage Direction

- Prefer `client.core.*` for common app operations.
- Use service clients (`ledgerService`, `stateService`, etc.) when lower-level access is needed.
- For complex filtered historical/event queries, use GraphQL fallback as needed.

## When To Download `sui-apis/proto`

Only download proto files if all of these are true:

- You are not using `@mysten/sui/grpc` client wrappers.
- You are building a custom raw gRPC client with `@grpc/grpc-js` + `@grpc/proto-loader`.
- You need direct control over proto loading/generation in your own codebase.

## Team Rule

- Default path: SDK (`@mysten/sui/grpc`).
- No proto vendoring in this repo unless there is an explicit architecture decision to move to raw gRPC clients.
