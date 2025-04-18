/**********************************************************
 * Module imports
 *
 * See: https://github.com/udelt/dpop_js_test/blob/main/modules/crypto.js
 **********************************************************/
// Common modules
import CONFIGURATION					from "../../data/config.json" with { type: "json" };

// Common functions
import * as COMMON						from "../common/CommonFunctions.js";

// Common Base64 functions
import * as Base64						from "./Base64Url.js";


/**********************************************************
 * Module Constants
 **********************************************************/
// Module SELF constants
const MODULE_NAME						= COMMON.getModuleName( import.meta.url );

// Inner constants
const CRYPTO							= CONFIGURATION.crypto;

// Crypt constants
export const JWK_DB_KEY					= CRYPTO.JWK_DB_KEY;
export const JWK_EXPORT_FORMAT			= CRYPTO.JWK_EXPORT_FORMAT;
export const SIGNING_ALGORITM			= CRYPTO.SIGNING_ALGORITM;
export const KEY_ALGORITM				= CRYPTO.KEY_ALGORITM;
export const CURVE_ALGORITM				= CRYPTO.CURVE_ALGORITM;
export const HASHING_ALGORITM			= CRYPTO.HASHING_ALGORITM;


/**********************************************************
 * Module Variables
 **********************************************************/


/**********************************************************
 * PRIVATE Functions
 **********************************************************/


/**********************************************************
 * PUBLIC Functions
 **********************************************************/
export async function generateCryptoKey() {
	const STEP_NAME						= "generateCryptoKey";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed(PREFIX);

	// Create the crypto key.
    // Must save it, 'cause we'll reuse it later.
	// ---------------------------------------------------------

	// Let's generate a cryptographic key to sign/verify.
    let cryptoKey						= await generateKey();

	// Export the public key in JWK format.
    // Must save it, 'cause we'll reuse it later.
	// ---------------------------------------------------------
    let jwk								= await crypto.subtle.exportKey(JWK_EXPORT_FORMAT, cryptoKey.publicKey)
		.then( keydata => {
        return keydata;
    });

	// Remove private data from the JWK.
	// ---------------------------------------------------------
    delete jwk.ext;
    delete jwk.key_ops;
	if (window.BSKY.DEBUG) console.debug( PREFIX + "jwk:", COMMON.prettyJson( jwk ) );

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return { cryptoKey: cryptoKey, jwk: jwk };
}

export async function generateKey() {
	const STEP_NAME						= "generateKey";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed(PREFIX);

    let cryptoKeyOptions = { name: SIGNING_ALGORITM, namedCurve: CURVE_ALGORITM };
    let cryptoKeyPurposes = ["sign", "verify"];
	if (window.BSKY.DEBUG) console.debug(PREFIX + "Generating a new key with:");
	if (window.BSKY.DEBUG) console.debug(PREFIX + "+ cryptoKeyOptions:", cryptoKeyOptions);
	if (window.BSKY.DEBUG) console.debug(PREFIX + "+ cryptoKeyPurposes:", cryptoKeyPurposes);

    var key = await crypto.subtle.generateKey(cryptoKeyOptions, false, cryptoKeyPurposes).then(function(eckey) {
		return eckey;
	}).catch(function(err) {
		console.error(err);
	});

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
    return key;
}

export async function exportJwk(publicKey) {
	var jwk = await crypto.subtle.exportKey(JWK_EXPORT_FORMAT, publicKey).then(function(keydata) {
		return keydata;
	}).catch(function(err) {
		console.error(err);
	});
	return jwk;
}

export async function sign(privateKey, message) {
    const messageAsUint8Array = Base64.utf8ToUint8Array(message);
    let signOptions = {
        name: SIGNING_ALGORITM,
        hash: { name: HASHING_ALGORITM },
    };
    var signature = await crypto.subtle.sign(
		signOptions,
		privateKey,
		messageAsUint8Array)
	.then(function(signature) {
		const signatureAsBase64 = Base64.toBase64Url(new Uint8Array(signature));
		return signatureAsBase64;
	}).catch(function(err){
		console.log(err);
		throw(err);
	});
    return signature;
};

// Calculate the SHA256 hash of the input text.
// Returns a promise that resolves to an ArrayBuffer
export async function sha256(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    return window.crypto.subtle.digest(HASHING_ALGORITM, data);
}

export async function createHash(accessToken, noPadding = false){
    // var encodedAT = new TextEncoder().encode(accessToken);
    // var atHash = await crypto.subtle.digest(HASHING_ALGORITM, encodedAT)

	var atHash = await sha256(accessToken)
    .then(function(hash) {
        var base = Base64.toBase64Url(new Uint8Array(hash));
        if (noPadding){
            base = base.replace(/\=+$/, '');
        }
        return base;
    })
    .catch(function(err){
        console.log(err);
        throw err;
    });
    return atHash;
}

