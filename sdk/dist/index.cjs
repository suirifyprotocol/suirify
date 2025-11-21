'use strict';

const PACKAGE_VERSION = "0.52.0";
const TARGETED_RPC_VERSION = "1.24.0";

const CODE_TO_ERROR_TYPE = {
  "-32700": "ParseError",
  "-32600": "InvalidRequest",
  "-32601": "MethodNotFound",
  "-32602": "InvalidParams",
  "-32603": "InternalError"
};
class SuiHTTPTransportError extends Error {
}
class JsonRpcError extends SuiHTTPTransportError {
  constructor(message, code) {
    super(message);
    this.code = code;
    this.type = CODE_TO_ERROR_TYPE[code] ?? "ServerError";
  }
}
class SuiHTTPStatusError extends SuiHTTPTransportError {
  constructor(message, status, statusText) {
    super(message);
    this.status = status;
    this.statusText = statusText;
  }
}

var __accessCheck$1 = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet$1 = (obj, member, getter) => {
  __accessCheck$1(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd$1 = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet$1 = (obj, member, value, setter) => {
  __accessCheck$1(obj, member, "write to private field");
  member.set(obj, value);
  return value;
};
var __privateWrapper = (obj, member, setter, getter) => ({
  set _(value) {
    __privateSet$1(obj, member, value);
  },
  get _() {
    return __privateGet$1(obj, member, getter);
  }
});
var __privateMethod$1 = (obj, member, method) => {
  __accessCheck$1(obj, member, "access private method");
  return method;
};
var _requestId$1, _disconnects, _webSocket, _connectionPromise, _subscriptions, _pendingRequests, _setupWebSocket, setupWebSocket_fn, _reconnect, reconnect_fn;
function getWebsocketUrl(httpUrl) {
  const url = new URL(httpUrl);
  url.protocol = url.protocol.replace("http", "ws");
  return url.toString();
}
const DEFAULT_CLIENT_OPTIONS = {
  // We fudge the typing because we also check for undefined in the constructor:
  WebSocketConstructor: typeof WebSocket !== "undefined" ? WebSocket : void 0,
  callTimeout: 3e4,
  reconnectTimeout: 3e3,
  maxReconnects: 5
};
class WebsocketClient {
  constructor(endpoint, options = {}) {
    __privateAdd$1(this, _setupWebSocket);
    __privateAdd$1(this, _reconnect);
    __privateAdd$1(this, _requestId$1, 0);
    __privateAdd$1(this, _disconnects, 0);
    __privateAdd$1(this, _webSocket, null);
    __privateAdd$1(this, _connectionPromise, null);
    __privateAdd$1(this, _subscriptions, /* @__PURE__ */ new Set());
    __privateAdd$1(this, _pendingRequests, /* @__PURE__ */ new Map());
    this.endpoint = endpoint;
    this.options = { ...DEFAULT_CLIENT_OPTIONS, ...options };
    if (!this.options.WebSocketConstructor) {
      throw new Error("Missing WebSocket constructor");
    }
    if (this.endpoint.startsWith("http")) {
      this.endpoint = getWebsocketUrl(this.endpoint);
    }
  }
  async makeRequest(method, params) {
    const webSocket = await __privateMethod$1(this, _setupWebSocket, setupWebSocket_fn).call(this);
    return new Promise((resolve, reject) => {
      __privateSet$1(this, _requestId$1, __privateGet$1(this, _requestId$1) + 1);
      __privateGet$1(this, _pendingRequests).set(__privateGet$1(this, _requestId$1), {
        resolve,
        reject,
        timeout: setTimeout(() => {
          __privateGet$1(this, _pendingRequests).delete(__privateGet$1(this, _requestId$1));
          reject(new Error(`Request timeout: ${method}`));
        }, this.options.callTimeout)
      });
      webSocket.send(JSON.stringify({ jsonrpc: "2.0", id: __privateGet$1(this, _requestId$1), method, params }));
    }).then(({ error, result }) => {
      if (error) {
        throw new JsonRpcError(error.message, error.code);
      }
      return result;
    });
  }
  async subscribe(input) {
    const subscription = new RpcSubscription(input);
    __privateGet$1(this, _subscriptions).add(subscription);
    await subscription.subscribe(this);
    return () => subscription.unsubscribe(this);
  }
}
_requestId$1 = new WeakMap();
_disconnects = new WeakMap();
_webSocket = new WeakMap();
_connectionPromise = new WeakMap();
_subscriptions = new WeakMap();
_pendingRequests = new WeakMap();
_setupWebSocket = new WeakSet();
setupWebSocket_fn = function() {
  if (__privateGet$1(this, _connectionPromise)) {
    return __privateGet$1(this, _connectionPromise);
  }
  __privateSet$1(this, _connectionPromise, new Promise((resolve) => {
    __privateGet$1(this, _webSocket)?.close();
    __privateSet$1(this, _webSocket, new this.options.WebSocketConstructor(this.endpoint));
    __privateGet$1(this, _webSocket).addEventListener("open", () => {
      __privateSet$1(this, _disconnects, 0);
      resolve(__privateGet$1(this, _webSocket));
    });
    __privateGet$1(this, _webSocket).addEventListener("close", () => {
      __privateWrapper(this, _disconnects)._++;
      if (__privateGet$1(this, _disconnects) <= this.options.maxReconnects) {
        setTimeout(() => {
          __privateMethod$1(this, _reconnect, reconnect_fn).call(this);
        }, this.options.reconnectTimeout);
      }
    });
    __privateGet$1(this, _webSocket).addEventListener("message", ({ data }) => {
      let json;
      try {
        json = JSON.parse(data);
      } catch (error) {
        console.error(new Error(`Failed to parse RPC message: ${data}`, { cause: error }));
        return;
      }
      if ("id" in json && json.id != null && __privateGet$1(this, _pendingRequests).has(json.id)) {
        const { resolve: resolve2, timeout } = __privateGet$1(this, _pendingRequests).get(json.id);
        clearTimeout(timeout);
        resolve2(json);
      } else if ("params" in json) {
        const { params } = json;
        __privateGet$1(this, _subscriptions).forEach((subscription) => {
          if (subscription.subscriptionId === params.subscription) {
            if (params.subscription === subscription.subscriptionId) {
              subscription.onMessage(params.result);
            }
          }
        });
      }
    });
  }));
  return __privateGet$1(this, _connectionPromise);
};
_reconnect = new WeakSet();
reconnect_fn = async function() {
  __privateGet$1(this, _webSocket)?.close();
  __privateSet$1(this, _connectionPromise, null);
  return Promise.allSettled(
    [...__privateGet$1(this, _subscriptions)].map((subscription) => subscription.subscribe(this))
  );
};
class RpcSubscription {
  constructor(input) {
    this.subscriptionId = null;
    this.subscribed = false;
    this.input = input;
  }
  onMessage(message) {
    if (this.subscribed) {
      this.input.onMessage(message);
    }
  }
  async unsubscribe(client) {
    const { subscriptionId } = this;
    this.subscribed = false;
    if (subscriptionId == null)
      return false;
    this.subscriptionId = null;
    return client.makeRequest(this.input.unsubscribe, [subscriptionId]);
  }
  async subscribe(client) {
    this.subscriptionId = null;
    this.subscribed = true;
    const newSubscriptionId = await client.makeRequest(
      this.input.method,
      this.input.params
    );
    if (this.subscribed) {
      this.subscriptionId = newSubscriptionId;
    }
  }
}

var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet = (obj, member, getter) => {
  __accessCheck(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet = (obj, member, value, setter) => {
  __accessCheck(obj, member, "write to private field");
  member.set(obj, value);
  return value;
};
var __privateMethod = (obj, member, method) => {
  __accessCheck(obj, member, "access private method");
  return method;
};
var _requestId, _options, _websocketClient, _getWebsocketClient, getWebsocketClient_fn;
class SuiHTTPTransport {
  constructor(options) {
    __privateAdd(this, _getWebsocketClient);
    __privateAdd(this, _requestId, 0);
    __privateAdd(this, _options, void 0);
    __privateAdd(this, _websocketClient, void 0);
    __privateSet(this, _options, options);
  }
  fetch(input, init) {
    const fetch = __privateGet(this, _options).fetch ?? globalThis.fetch;
    if (!fetch) {
      throw new Error(
        "The current environment does not support fetch, you can provide a fetch implementation in the options for SuiHTTPTransport."
      );
    }
    return fetch(input, init);
  }
  async request(input) {
    __privateSet(this, _requestId, __privateGet(this, _requestId) + 1);
    const res = await this.fetch(__privateGet(this, _options).rpc?.url ?? __privateGet(this, _options).url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Client-Sdk-Type": "typescript",
        "Client-Sdk-Version": PACKAGE_VERSION,
        "Client-Target-Api-Version": TARGETED_RPC_VERSION,
        ...__privateGet(this, _options).rpc?.headers
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: __privateGet(this, _requestId),
        method: input.method,
        params: input.params
      })
    });
    if (!res.ok) {
      throw new SuiHTTPStatusError(
        `Unexpected status code: ${res.status}`,
        res.status,
        res.statusText
      );
    }
    const data = await res.json();
    if ("error" in data && data.error != null) {
      throw new JsonRpcError(data.error.message, data.error.code);
    }
    return data.result;
  }
  async subscribe(input) {
    const unsubscribe = await __privateMethod(this, _getWebsocketClient, getWebsocketClient_fn).call(this).subscribe(input);
    return async () => !!await unsubscribe();
  }
}
_requestId = new WeakMap();
_options = new WeakMap();
_websocketClient = new WeakMap();
_getWebsocketClient = new WeakSet();
getWebsocketClient_fn = function() {
  if (!__privateGet(this, _websocketClient)) {
    const WebSocketConstructor = __privateGet(this, _options).WebSocketConstructor ?? globalThis.WebSocket;
    if (!WebSocketConstructor) {
      throw new Error(
        "The current environment does not support WebSocket, you can provide a WebSocketConstructor in the options for SuiHTTPTransport."
      );
    }
    __privateSet(this, _websocketClient, new WebsocketClient(
      __privateGet(this, _options).websocket?.url ?? __privateGet(this, _options).url,
      {
        WebSocketConstructor,
        ...__privateGet(this, _options).websocket
      }
    ));
  }
  return __privateGet(this, _websocketClient);
};

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

// base-x encoding / decoding
// Copyright (c) 2018 base-x contributors
// Copyright (c) 2014-2018 The Bitcoin Core developers (base58.cpp)
// Distributed under the MIT software license, see the accompanying
// file LICENSE or http://www.opensource.org/licenses/mit-license.php.
function base (ALPHABET) {
  if (ALPHABET.length >= 255) { throw new TypeError('Alphabet too long') }
  var BASE_MAP = new Uint8Array(256);
  for (var j = 0; j < BASE_MAP.length; j++) {
    BASE_MAP[j] = 255;
  }
  for (var i = 0; i < ALPHABET.length; i++) {
    var x = ALPHABET.charAt(i);
    var xc = x.charCodeAt(0);
    if (BASE_MAP[xc] !== 255) { throw new TypeError(x + ' is ambiguous') }
    BASE_MAP[xc] = i;
  }
  var BASE = ALPHABET.length;
  var LEADER = ALPHABET.charAt(0);
  var FACTOR = Math.log(BASE) / Math.log(256); // log(BASE) / log(256), rounded up
  var iFACTOR = Math.log(256) / Math.log(BASE); // log(256) / log(BASE), rounded up
  function encode (source) {
    if (source instanceof Uint8Array) ; else if (ArrayBuffer.isView(source)) {
      source = new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
    } else if (Array.isArray(source)) {
      source = Uint8Array.from(source);
    }
    if (!(source instanceof Uint8Array)) { throw new TypeError('Expected Uint8Array') }
    if (source.length === 0) { return '' }
        // Skip & count leading zeroes.
    var zeroes = 0;
    var length = 0;
    var pbegin = 0;
    var pend = source.length;
    while (pbegin !== pend && source[pbegin] === 0) {
      pbegin++;
      zeroes++;
    }
        // Allocate enough space in big-endian base58 representation.
    var size = ((pend - pbegin) * iFACTOR + 1) >>> 0;
    var b58 = new Uint8Array(size);
        // Process the bytes.
    while (pbegin !== pend) {
      var carry = source[pbegin];
            // Apply "b58 = b58 * 256 + ch".
      var i = 0;
      for (var it1 = size - 1; (carry !== 0 || i < length) && (it1 !== -1); it1--, i++) {
        carry += (256 * b58[it1]) >>> 0;
        b58[it1] = (carry % BASE) >>> 0;
        carry = (carry / BASE) >>> 0;
      }
      if (carry !== 0) { throw new Error('Non-zero carry') }
      length = i;
      pbegin++;
    }
        // Skip leading zeroes in base58 result.
    var it2 = size - length;
    while (it2 !== size && b58[it2] === 0) {
      it2++;
    }
        // Translate the result into a string.
    var str = LEADER.repeat(zeroes);
    for (; it2 < size; ++it2) { str += ALPHABET.charAt(b58[it2]); }
    return str
  }
  function decodeUnsafe (source) {
    if (typeof source !== 'string') { throw new TypeError('Expected String') }
    if (source.length === 0) { return new Uint8Array() }
    var psz = 0;
        // Skip and count leading '1's.
    var zeroes = 0;
    var length = 0;
    while (source[psz] === LEADER) {
      zeroes++;
      psz++;
    }
        // Allocate enough space in big-endian base256 representation.
    var size = (((source.length - psz) * FACTOR) + 1) >>> 0; // log(58) / log(256), rounded up.
    var b256 = new Uint8Array(size);
        // Process the characters.
    while (source[psz]) {
            // Find code of next character
      var charCode = source.charCodeAt(psz);
            // Base map can not be indexed using char code
      if (charCode > 255) { return }
            // Decode character
      var carry = BASE_MAP[charCode];
            // Invalid character
      if (carry === 255) { return }
      var i = 0;
      for (var it3 = size - 1; (carry !== 0 || i < length) && (it3 !== -1); it3--, i++) {
        carry += (BASE * b256[it3]) >>> 0;
        b256[it3] = (carry % 256) >>> 0;
        carry = (carry / 256) >>> 0;
      }
      if (carry !== 0) { throw new Error('Non-zero carry') }
      length = i;
      psz++;
    }
        // Skip leading zeroes in b256.
    var it4 = size - length;
    while (it4 !== size && b256[it4] === 0) {
      it4++;
    }
    var vch = new Uint8Array(zeroes + (size - it4));
    var j = zeroes;
    while (it4 !== size) {
      vch[j++] = b256[it4++];
    }
    return vch
  }
  function decode (string) {
    var buffer = decodeUnsafe(string);
    if (buffer) { return buffer }
    throw new Error('Non-base' + BASE + ' character')
  }
  return {
    encode: encode,
    decodeUnsafe: decodeUnsafe,
    decode: decode
  }
}
var src = base;

const basex = src;
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

var bs58 = basex(ALPHABET);

var bs58$1 = /*@__PURE__*/getDefaultExportFromCjs(bs58);

const fromB58 = (str) => bs58$1.decode(str);

const CHUNK_SIZE = 8192;
function toB64(bytes) {
  if (bytes.length < CHUNK_SIZE) {
    return btoa(String.fromCharCode(...bytes));
  }
  let output = "";
  for (var i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.slice(i, i + CHUNK_SIZE);
    output += String.fromCharCode(...chunk);
  }
  return btoa(output);
}

function toHEX(bytes) {
  return bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, "0"), "");
}

const TX_DIGEST_LENGTH = 32;
function isValidTransactionDigest(value) {
  try {
    const buffer = fromB58(value);
    return buffer.length === TX_DIGEST_LENGTH;
  } catch (e) {
    return false;
  }
}
const SUI_ADDRESS_LENGTH = 32;
function isValidSuiAddress(value) {
  return isHex(value) && getHexByteLength(value) === SUI_ADDRESS_LENGTH;
}
function isValidSuiObjectId(value) {
  return isValidSuiAddress(value);
}
function normalizeSuiAddress(value, forceAdd0x = false) {
  let address = value.toLowerCase();
  if (!forceAdd0x && address.startsWith("0x")) {
    address = address.slice(2);
  }
  return `0x${address.padStart(SUI_ADDRESS_LENGTH * 2, "0")}`;
}
function normalizeSuiObjectId(value, forceAdd0x = false) {
  return normalizeSuiAddress(value, forceAdd0x);
}
function isHex(value) {
  return /^(0x|0X)?[a-fA-F0-9]+$/.test(value) && value.length % 2 === 0;
}
function getHexByteLength(value) {
  return /^(0x|0X)/.test(value) ? (value.length - 2) / 2 : value.length / 2;
}

const SUI_NS_NAME_REGEX = /^(?:[a-z0-9][a-z0-9-]{0,62}(?:\.[a-z0-9][a-z0-9-]{0,62})*)?@[a-z0-9][a-z0-9-]{0,62}$/i;
const SUI_NS_DOMAIN_REGEX = /^(?:[a-z0-9][a-z0-9-]{0,62}\.)+sui$/i;
function normalizeSuiNSName(name, format = "at") {
  const lowerCase = name.toLowerCase();
  let parts;
  if (lowerCase.includes("@")) {
    if (!SUI_NS_NAME_REGEX.test(lowerCase)) {
      throw new Error(`Invalid SuiNS name ${name}`);
    }
    const [labels, domain] = lowerCase.split("@");
    parts = [...labels ? labels.split(".") : [], domain];
  } else {
    if (!SUI_NS_DOMAIN_REGEX.test(lowerCase)) {
      throw new Error(`Invalid SuiNS name ${name}`);
    }
    parts = lowerCase.split(".").slice(0, -1);
  }
  if (format === "dot") {
    return `${parts.join(".")}.sui`;
  }
  return `${parts.slice(0, -1).join(".")}@${parts[parts.length - 1]}`;
}

const TRANSACTION_BRAND = Symbol.for("@mysten/transaction");
function isTransactionBlock(obj) {
  return !!obj && typeof obj === "object" && obj[TRANSACTION_BRAND] === true;
}

const SUI_CLIENT_BRAND = Symbol.for("@mysten/SuiClient");
class SuiClient {
  get [SUI_CLIENT_BRAND]() {
    return true;
  }
  /**
   * Establish a connection to a Sui RPC endpoint
   *
   * @param options configuration options for the API Client
   */
  constructor(options) {
    this.transport = options.transport ?? new SuiHTTPTransport({ url: options.url });
  }
  async getRpcApiVersion() {
    const resp = await this.transport.request({
      method: "rpc.discover",
      params: []
    });
    return resp.info.version;
  }
  /**
   * Get all Coin<`coin_type`> objects owned by an address.
   */
  async getCoins(input) {
    if (!input.owner || !isValidSuiAddress(normalizeSuiAddress(input.owner))) {
      throw new Error("Invalid Sui address");
    }
    return await this.transport.request({
      method: "suix_getCoins",
      params: [input.owner, input.coinType, input.cursor, input.limit]
    });
  }
  /**
   * Get all Coin objects owned by an address.
   */
  async getAllCoins(input) {
    if (!input.owner || !isValidSuiAddress(normalizeSuiAddress(input.owner))) {
      throw new Error("Invalid Sui address");
    }
    return await this.transport.request({
      method: "suix_getAllCoins",
      params: [input.owner, input.cursor, input.limit]
    });
  }
  /**
   * Get the total coin balance for one coin type, owned by the address owner.
   */
  async getBalance(input) {
    if (!input.owner || !isValidSuiAddress(normalizeSuiAddress(input.owner))) {
      throw new Error("Invalid Sui address");
    }
    return await this.transport.request({
      method: "suix_getBalance",
      params: [input.owner, input.coinType]
    });
  }
  /**
   * Get the total coin balance for all coin types, owned by the address owner.
   */
  async getAllBalances(input) {
    if (!input.owner || !isValidSuiAddress(normalizeSuiAddress(input.owner))) {
      throw new Error("Invalid Sui address");
    }
    return await this.transport.request({ method: "suix_getAllBalances", params: [input.owner] });
  }
  /**
   * Fetch CoinMetadata for a given coin type
   */
  async getCoinMetadata(input) {
    return await this.transport.request({
      method: "suix_getCoinMetadata",
      params: [input.coinType]
    });
  }
  /**
   *  Fetch total supply for a coin
   */
  async getTotalSupply(input) {
    return await this.transport.request({
      method: "suix_getTotalSupply",
      params: [input.coinType]
    });
  }
  /**
   * Invoke any RPC method
   * @param method the method to be invoked
   * @param args the arguments to be passed to the RPC request
   */
  async call(method, params) {
    return await this.transport.request({ method, params });
  }
  /**
   * Get Move function argument types like read, write and full access
   */
  async getMoveFunctionArgTypes(input) {
    return await this.transport.request({
      method: "sui_getMoveFunctionArgTypes",
      params: [input.package, input.module, input.function]
    });
  }
  /**
   * Get a map from module name to
   * structured representations of Move modules
   */
  async getNormalizedMoveModulesByPackage(input) {
    return await this.transport.request({
      method: "sui_getNormalizedMoveModulesByPackage",
      params: [input.package]
    });
  }
  /**
   * Get a structured representation of Move module
   */
  async getNormalizedMoveModule(input) {
    return await this.transport.request({
      method: "sui_getNormalizedMoveModule",
      params: [input.package, input.module]
    });
  }
  /**
   * Get a structured representation of Move function
   */
  async getNormalizedMoveFunction(input) {
    return await this.transport.request({
      method: "sui_getNormalizedMoveFunction",
      params: [input.package, input.module, input.function]
    });
  }
  /**
   * Get a structured representation of Move struct
   */
  async getNormalizedMoveStruct(input) {
    return await this.transport.request({
      method: "sui_getNormalizedMoveStruct",
      params: [input.package, input.module, input.struct]
    });
  }
  /**
   * Get all objects owned by an address
   */
  async getOwnedObjects(input) {
    if (!input.owner || !isValidSuiAddress(normalizeSuiAddress(input.owner))) {
      throw new Error("Invalid Sui address");
    }
    return await this.transport.request({
      method: "suix_getOwnedObjects",
      params: [
        input.owner,
        {
          filter: input.filter,
          options: input.options
        },
        input.cursor,
        input.limit
      ]
    });
  }
  /**
   * Get details about an object
   */
  async getObject(input) {
    if (!input.id || !isValidSuiObjectId(normalizeSuiObjectId(input.id))) {
      throw new Error("Invalid Sui Object id");
    }
    return await this.transport.request({
      method: "sui_getObject",
      params: [input.id, input.options]
    });
  }
  async tryGetPastObject(input) {
    return await this.transport.request({
      method: "sui_tryGetPastObject",
      params: [input.id, input.version, input.options]
    });
  }
  /**
   * Batch get details about a list of objects. If any of the object ids are duplicates the call will fail
   */
  async multiGetObjects(input) {
    input.ids.forEach((id) => {
      if (!id || !isValidSuiObjectId(normalizeSuiObjectId(id))) {
        throw new Error(`Invalid Sui Object id ${id}`);
      }
    });
    const hasDuplicates = input.ids.length !== new Set(input.ids).size;
    if (hasDuplicates) {
      throw new Error(`Duplicate object ids in batch call ${input.ids}`);
    }
    return await this.transport.request({
      method: "sui_multiGetObjects",
      params: [input.ids, input.options]
    });
  }
  /**
   * Get transaction blocks for a given query criteria
   */
  async queryTransactionBlocks(input) {
    return await this.transport.request({
      method: "suix_queryTransactionBlocks",
      params: [
        {
          filter: input.filter,
          options: input.options
        },
        input.cursor,
        input.limit,
        (input.order || "descending") === "descending"
      ]
    });
  }
  async getTransactionBlock(input) {
    if (!isValidTransactionDigest(input.digest)) {
      throw new Error("Invalid Transaction digest");
    }
    return await this.transport.request({
      method: "sui_getTransactionBlock",
      params: [input.digest, input.options]
    });
  }
  async multiGetTransactionBlocks(input) {
    input.digests.forEach((d) => {
      if (!isValidTransactionDigest(d)) {
        throw new Error(`Invalid Transaction digest ${d}`);
      }
    });
    const hasDuplicates = input.digests.length !== new Set(input.digests).size;
    if (hasDuplicates) {
      throw new Error(`Duplicate digests in batch call ${input.digests}`);
    }
    return await this.transport.request({
      method: "sui_multiGetTransactionBlocks",
      params: [input.digests, input.options]
    });
  }
  async executeTransactionBlock(input) {
    return await this.transport.request({
      method: "sui_executeTransactionBlock",
      params: [
        typeof input.transactionBlock === "string" ? input.transactionBlock : toB64(input.transactionBlock),
        Array.isArray(input.signature) ? input.signature : [input.signature],
        input.options,
        input.requestType
      ]
    });
  }
  async signAndExecuteTransactionBlock({
    transactionBlock,
    signer,
    ...input
  }) {
    let transactionBytes;
    if (transactionBlock instanceof Uint8Array) {
      transactionBytes = transactionBlock;
    } else {
      transactionBlock.setSenderIfNotSet(signer.toSuiAddress());
      transactionBytes = await transactionBlock.build({ client: this });
    }
    const { signature, bytes } = await signer.signTransactionBlock(transactionBytes);
    return this.executeTransactionBlock({
      transactionBlock: bytes,
      signature,
      ...input
    });
  }
  /**
   * Get total number of transactions
   */
  async getTotalTransactionBlocks() {
    const resp = await this.transport.request({
      method: "sui_getTotalTransactionBlocks",
      params: []
    });
    return BigInt(resp);
  }
  /**
   * Getting the reference gas price for the network
   */
  async getReferenceGasPrice() {
    const resp = await this.transport.request({
      method: "suix_getReferenceGasPrice",
      params: []
    });
    return BigInt(resp);
  }
  /**
   * Return the delegated stakes for an address
   */
  async getStakes(input) {
    if (!input.owner || !isValidSuiAddress(normalizeSuiAddress(input.owner))) {
      throw new Error("Invalid Sui address");
    }
    return await this.transport.request({ method: "suix_getStakes", params: [input.owner] });
  }
  /**
   * Return the delegated stakes queried by id.
   */
  async getStakesByIds(input) {
    input.stakedSuiIds.forEach((id) => {
      if (!id || !isValidSuiObjectId(normalizeSuiObjectId(id))) {
        throw new Error(`Invalid Sui Stake id ${id}`);
      }
    });
    return await this.transport.request({
      method: "suix_getStakesByIds",
      params: [input.stakedSuiIds]
    });
  }
  /**
   * Return the latest system state content.
   */
  async getLatestSuiSystemState() {
    return await this.transport.request({ method: "suix_getLatestSuiSystemState", params: [] });
  }
  /**
   * Get events for a given query criteria
   */
  async queryEvents(input) {
    return await this.transport.request({
      method: "suix_queryEvents",
      params: [
        input.query,
        input.cursor,
        input.limit,
        (input.order || "descending") === "descending"
      ]
    });
  }
  /**
   * Subscribe to get notifications whenever an event matching the filter occurs
   */
  async subscribeEvent(input) {
    return this.transport.subscribe({
      method: "suix_subscribeEvent",
      unsubscribe: "suix_unsubscribeEvent",
      params: [input.filter],
      onMessage: input.onMessage
    });
  }
  async subscribeTransaction(input) {
    return this.transport.subscribe({
      method: "suix_subscribeTransaction",
      unsubscribe: "suix_unsubscribeTransaction",
      params: [input.filter],
      onMessage: input.onMessage
    });
  }
  /**
   * Runs the transaction block in dev-inspect mode. Which allows for nearly any
   * transaction (or Move call) with any arguments. Detailed results are
   * provided, including both the transaction effects and any return values.
   */
  async devInspectTransactionBlock(input) {
    let devInspectTxBytes;
    if (isTransactionBlock(input.transactionBlock)) {
      input.transactionBlock.setSenderIfNotSet(input.sender);
      devInspectTxBytes = toB64(
        await input.transactionBlock.build({
          client: this,
          onlyTransactionKind: true
        })
      );
    } else if (typeof input.transactionBlock === "string") {
      devInspectTxBytes = input.transactionBlock;
    } else if (input.transactionBlock instanceof Uint8Array) {
      devInspectTxBytes = toB64(input.transactionBlock);
    } else {
      throw new Error("Unknown transaction block format.");
    }
    return await this.transport.request({
      method: "sui_devInspectTransactionBlock",
      params: [input.sender, devInspectTxBytes, input.gasPrice?.toString(), input.epoch]
    });
  }
  /**
   * Dry run a transaction block and return the result.
   */
  async dryRunTransactionBlock(input) {
    return await this.transport.request({
      method: "sui_dryRunTransactionBlock",
      params: [
        typeof input.transactionBlock === "string" ? input.transactionBlock : toB64(input.transactionBlock)
      ]
    });
  }
  /**
   * Return the list of dynamic field objects owned by an object
   */
  async getDynamicFields(input) {
    if (!input.parentId || !isValidSuiObjectId(normalizeSuiObjectId(input.parentId))) {
      throw new Error("Invalid Sui Object id");
    }
    return await this.transport.request({
      method: "suix_getDynamicFields",
      params: [input.parentId, input.cursor, input.limit]
    });
  }
  /**
   * Return the dynamic field object information for a specified object
   */
  async getDynamicFieldObject(input) {
    return await this.transport.request({
      method: "suix_getDynamicFieldObject",
      params: [input.parentId, input.name]
    });
  }
  /**
   * Get the sequence number of the latest checkpoint that has been executed
   */
  async getLatestCheckpointSequenceNumber() {
    const resp = await this.transport.request({
      method: "sui_getLatestCheckpointSequenceNumber",
      params: []
    });
    return String(resp);
  }
  /**
   * Returns information about a given checkpoint
   */
  async getCheckpoint(input) {
    return await this.transport.request({ method: "sui_getCheckpoint", params: [input.id] });
  }
  /**
   * Returns historical checkpoints paginated
   */
  async getCheckpoints(input) {
    return await this.transport.request({
      method: "sui_getCheckpoints",
      params: [input.cursor, input?.limit, input.descendingOrder]
    });
  }
  /**
   * Return the committee information for the asked epoch
   */
  async getCommitteeInfo(input) {
    return await this.transport.request({
      method: "suix_getCommitteeInfo",
      params: [input?.epoch]
    });
  }
  async getNetworkMetrics() {
    return await this.transport.request({ method: "suix_getNetworkMetrics", params: [] });
  }
  async getAddressMetrics() {
    return await this.transport.request({ method: "suix_getLatestAddressMetrics", params: [] });
  }
  async getEpochMetrics(input) {
    return await this.transport.request({
      method: "suix_getEpochMetrics",
      params: [input?.cursor, input?.limit, input?.descendingOrder]
    });
  }
  async getAllEpochAddressMetrics(input) {
    return await this.transport.request({
      method: "suix_getAllEpochAddressMetrics",
      params: [input?.descendingOrder]
    });
  }
  /**
   * Return the committee information for the asked epoch
   */
  async getEpochs(input) {
    return await this.transport.request({
      method: "suix_getEpochs",
      params: [input?.cursor, input?.limit, input?.descendingOrder]
    });
  }
  /**
   * Returns list of top move calls by usage
   */
  async getMoveCallMetrics() {
    return await this.transport.request({ method: "suix_getMoveCallMetrics", params: [] });
  }
  /**
   * Return the committee information for the asked epoch
   */
  async getCurrentEpoch() {
    return await this.transport.request({ method: "suix_getCurrentEpoch", params: [] });
  }
  /**
   * Return the Validators APYs
   */
  async getValidatorsApy() {
    return await this.transport.request({ method: "suix_getValidatorsApy", params: [] });
  }
  // TODO: Migrate this to `sui_getChainIdentifier` once it is widely available.
  async getChainIdentifier() {
    const checkpoint = await this.getCheckpoint({ id: "0" });
    const bytes = fromB58(checkpoint.digest);
    return toHEX(bytes.slice(0, 4));
  }
  async resolveNameServiceAddress(input) {
    return await this.transport.request({
      method: "suix_resolveNameServiceAddress",
      params: [input.name]
    });
  }
  async resolveNameServiceNames({
    format = "dot",
    ...input
  }) {
    const { nextCursor, hasNextPage, data } = await this.transport.request({
      method: "suix_resolveNameServiceNames",
      params: [input.address, input.cursor, input.limit]
    });
    return {
      hasNextPage,
      nextCursor,
      data: data.map((name) => normalizeSuiNSName(name, format))
    };
  }
  async getProtocolConfig(input) {
    return await this.transport.request({
      method: "sui_getProtocolConfig",
      params: [input?.version]
    });
  }
  /**
   * Wait for a transaction block result to be available over the API.
   * This can be used in conjunction with `executeTransactionBlock` to wait for the transaction to
   * be available via the API.
   * This currently polls the `getTransactionBlock` API to check for the transaction.
   */
  async waitForTransactionBlock({
    signal,
    timeout = 60 * 1e3,
    pollInterval = 2 * 1e3,
    ...input
  }) {
    const timeoutSignal = AbortSignal.timeout(timeout);
    const timeoutPromise = new Promise((_, reject) => {
      timeoutSignal.addEventListener("abort", () => reject(timeoutSignal.reason));
    });
    timeoutPromise.catch(() => {
    });
    while (!timeoutSignal.aborted) {
      signal?.throwIfAborted();
      try {
        return await this.getTransactionBlock(input);
      } catch (e) {
        await Promise.race([
          new Promise((resolve) => setTimeout(resolve, pollInterval)),
          timeoutPromise
        ]);
      }
    }
    timeoutSignal.throwIfAborted();
    throw new Error("Unexpected error while waiting for transaction block.");
  }
}

/**
 * Thin wrapper around the official @mysten/sui.js JsonRpcProvider.
 */
const resolveDefaultRpc = () => {
    if (typeof process === "undefined")
        return undefined;
    return (process.env?.SUI_RPC ||
        process.env?.SUI_RPC_URL ||
        process.env?.SUI_FULLNODE_URL ||
        process.env?.SUI_PROVIDER_URL);
};
const DEFAULT_RPC_URL = resolveDefaultRpc() || "https://fullnode.devnet.sui.io:443";
class DefaultSuiProvider {
    constructor(rpcUrl = DEFAULT_RPC_URL) {
        this.client = new SuiClient({ url: rpcUrl });
    }
    /**
     * Fetches all objects owned by a given address, returning the raw RPC payloads.
     * Options request enough metadata for downstream parsing.
     */
    async getOwnedObjects(owner) {
        const result = await this.client.getOwnedObjects({
            owner,
            options: {
                showContent: true,
                showOwner: true,
                showType: true
            }
        });
        return (result?.data ?? []);
    }
    /**
     * Fetches a specific object by its ID.
     */
    async getObject(objectId) {
        try {
            const result = await this.client.getObject({
                id: objectId,
                options: {
                    showContent: true,
                    showOwner: true,
                    showType: true
                }
            });
            return result;
        }
        catch (error) {
            console.error("Failed to fetch object", objectId, error);
            return null;
        }
    }
}
const createSuiProvider = (rpcUrl) => new DefaultSuiProvider(rpcUrl);

/**
 * Helper utilities for coercing Sui RPC payloads into typed objects.
 */
/**
 * Attempts to normalize different RPC response shapes into a predictable structure.
 * If you notice that your RPC node returns data in a different layout, adapt the
 * accessors below and add another branch with a comment describing the payload.
 */
function normalizeRpcObject(raw) {
    if (!raw)
        return {};
    const candidateData = raw.data || raw.details || raw;
    const content = candidateData?.content || candidateData?.data?.content;
    const fields = content?.fields || candidateData?.fields || candidateData?.data?.fields || null;
    const owner = candidateData?.owner?.AddressOwner ||
        candidateData?.owner?.ObjectOwner ||
        candidateData?.owner?.Shared ||
        candidateData?.owner ||
        raw?.owner;
    const type = candidateData?.type ||
        content?.type ||
        candidateData?.data?.type ||
        raw?.type;
    const objectId = candidateData?.objectId ||
        candidateData?.reference?.objectId ||
        candidateData?.data?.objectId ||
        candidateData?.id ||
        raw?.objectId;
    const versionRaw = candidateData?.version ||
        candidateData?.reference?.version ||
        candidateData?.data?.version;
    return {
        type,
        owner,
        objectId,
        version: typeof versionRaw === "string" ? Number(versionRaw) : versionRaw,
        fields
    };
}
const coerceNumber = (value) => {
    if (value === undefined || value === null)
        return undefined;
    if (typeof value === "number")
        return value;
    if (typeof value === "string" && value.length > 0 && !Number.isNaN(Number(value))) {
        return Number(value);
    }
    return undefined;
};
const coerceBoolean = (value) => {
    if (value === undefined || value === null)
        return undefined;
    if (typeof value === "boolean")
        return value;
    if (typeof value === "number")
        return value !== 0;
    if (typeof value === "string")
        return value === "true" || value === "1";
    return undefined;
};
function parseAttestationObject(raw) {
    const normalized = normalizeRpcObject(raw);
    if (!normalized.fields) {
        return null;
    }
    const f = normalized.fields;
    return {
        objectId: normalized.objectId || "",
        owner: normalized.owner || "",
        jurisdiction_code: coerceNumber(f.jurisdiction_code),
        verification_level: coerceNumber(f.verification_level),
        verifier_source: coerceNumber(f.verifier_source),
        verifier_version: coerceNumber(f.verifier_version),
        issue_time_ms: coerceNumber(f.issue_time_ms),
        expiry_time_ms: coerceNumber(f.expiry_time_ms),
        status: coerceNumber(f.status),
        revoked: coerceBoolean(f.revoked) ?? false,
        revoke_time_ms: coerceNumber(f.revoke_time_ms),
        revoke_reason_code: coerceNumber(f.revoke_reason_code),
        name_hash: f.name_hash ?? null,
        is_human_verified: coerceBoolean(f.is_human_verified),
        is_over_18: coerceBoolean(f.is_over_18),
        version: normalized.version
    };
}

/** Time helpers for consistent millisecond calculations. */
const nowMs = () => Date.now();
const msUntil = (futureMs) => {
    if (futureMs === undefined)
        return undefined;
    return futureMs - nowMs();
};

/**
 * Main entry point for reading SUIrify attestations via Sui RPC.
 */
const getEnv = (key) => typeof process !== "undefined" ? process.env?.[key] : undefined;
const ENV_PACKAGE_ID = getEnv("SUIRIFY_PACKAGE_ID") || getEnv("PACKAGE_ID");
const FALLBACK_PACKAGE_ID = "0xfaad95533f8c546fbf0d35c5a0816b5d2a86cd8a3d27d5af1a25c63bb652cb7d";
const DEFAULT_PACKAGE_ID = ENV_PACKAGE_ID || FALLBACK_PACKAGE_ID;
const ENV_ATTESTATION_TYPE = getEnv("SUIRIFY_ATTESTATION_TYPE") || getEnv("ATTESTATION_TYPE");
const ATTESTATION_TYPE = ENV_ATTESTATION_TYPE || `${DEFAULT_PACKAGE_ID}::protocol::Suirify_Attestation`;
const DEFAULT_CACHE_MS = 5000;
const PUBLIC_FIELDS = [
    "is_human_verified",
    "is_over_18",
    "verification_level",
    "expiry_time_ms",
    "revoked"
];
class SuirifySdk {
    constructor(opts = {}) {
        this.cache = new Map();
        this.consentHandler = null;
        this.provider = opts.provider || createSuiProvider(opts.rpcUrl);
        this.cacheMs = opts.cacheMs ?? DEFAULT_CACHE_MS;
        this.attestationType = opts.attestationType || ATTESTATION_TYPE;
    }
    /** Override the consent handler (default always resolves true). */
    setConsentHandler(handler) {
        this.consentHandler = handler;
    }
    /**
     * Finds all object IDs owned by `ownerAddress` whose type exactly matches ATTESTATION_TYPE.
     */
    async findAttestationObjects(ownerAddress) {
        const owned = await this.provider.getOwnedObjects(ownerAddress);
        const attestationObjectIds = [];
        for (const object of owned) {
            const normalized = normalizeRpcObject(object);
            if (normalized.type === this.attestationType && normalized.objectId) {
                attestationObjectIds.push(normalized.objectId);
            }
        }
        return attestationObjectIds;
    }
    /** Fetches and parses an attestation object by ID. */
    async getAttestationByObjectId(objectId) {
        const raw = await this.provider.getObject(objectId);
        if (!raw)
            return null;
        return parseAttestationObject(raw);
    }
    /**
     * Returns the primary attestation for `ownerAddress`, or found=false if none exist.
     */
    async getAttestationForOwner(ownerAddress) {
        const cached = this.cache.get(ownerAddress);
        if (cached && nowMs() - cached.timestamp < this.cacheMs) {
            return cached.result;
        }
        await this.ensureConsent(["attestation_lookup"], "User denied attestation lookup request");
        try {
            const objectIds = await this.findAttestationObjects(ownerAddress);
            if (objectIds.length === 0) {
                const res = { found: false };
                this.cache.set(ownerAddress, { timestamp: nowMs(), result: res });
                return res;
            }
            const attestation = await this.getAttestationByObjectId(objectIds[0]);
            if (!attestation) {
                const res = {
                    found: false,
                    error: "Unable to parse attestation object"
                };
                this.cache.set(ownerAddress, { timestamp: nowMs(), result: res });
                return res;
            }
            const res = {
                found: true,
                attestation,
                objectId: attestation.objectId
            };
            this.cache.set(ownerAddress, { timestamp: nowMs(), result: res });
            return res;
        }
        catch (error) {
            console.error("Failed to read attestation", error);
            const res = {
                found: false,
                error: error instanceof Error ? error.message : String(error)
            };
            this.cache.set(ownerAddress, { timestamp: nowMs(), result: res });
            return res;
        }
    }
    /**
     * Checks revocation and expiry fields for validity.
     */
    async isValid(att) {
        if (att.revoked) {
            return { valid: false, reason: "Attestation revoked" };
        }
        if (att.expiry_time_ms !== undefined) {
            const delta = msUntil(att.expiry_time_ms);
            if (delta !== undefined && delta <= 0) {
                return { valid: false, reason: "Attestation expired" };
            }
        }
        if (att.status !== undefined && att.status !== 1) {
            return {
                valid: false,
                reason: "Attestation is not in an active status (status !== 1)"
            };
        }
        return { valid: true };
    }
    /** Default consent helper. Override via setConsentHandler for UI integrations. */
    async presentConsentModal(fieldsToRequest) {
        if (this.consentHandler) {
            return this.consentHandler(fieldsToRequest);
        }
        // eslint-disable-next-line no-console
        console.warn("presentConsentModal was called without a handler; auto-consenting for demo purposes", fieldsToRequest);
        return true;
    }
    async ensureConsent(scopes, denialMessage) {
        const consented = await this.presentConsentModal(scopes);
        if (!consented) {
            throw new Error(denialMessage);
        }
    }
    /**
     * Convenience helper that ensures consent is granted before returning whitelisted claims.
     */
    async getPublicClaims(ownerAddress, fields = ["is_human_verified", "is_over_18"]) {
        const sanitizedFields = fields.filter((field) => PUBLIC_FIELDS.includes(field));
        if (sanitizedFields.length === 0) {
            throw new Error("No readable public fields were requested");
        }
        await this.ensureConsent(sanitizedFields, "User did not consent to read attestation fields");
        const res = await this.getAttestationForOwner(ownerAddress);
        if (!res.found || !res.attestation) {
            throw new Error("No attestation found for owner");
        }
        const claims = {};
        sanitizedFields.forEach((field) => {
            claims[field] = res.attestation?.[field];
        });
        return claims;
    }
}

exports.ATTESTATION_TYPE = ATTESTATION_TYPE;
exports.SuirifySdk = SuirifySdk;
exports.createSuiProvider = createSuiProvider;
//# sourceMappingURL=index.cjs.map
