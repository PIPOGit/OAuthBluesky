/**********************************************************
 * Module imports
 *
 * See: https://github.com/udelt/dpop_js_test/blob/main/modules/crypto.js
 **********************************************************/
// Common modules
import * as COMMON					from "../common.functions.js";
import CONFIGURATION				from "../../data/config.json" with { type: "json" };
// For OAuth2 User Token retrieval / DPoP
import * as Base64					from './Base64Url.js';


/**********************************************************
 * Module Constants
 **********************************************************/
// Module SELF constants
const MODULE_NAME					= COMMON.getModuleName( import.meta.url );
const MODULE_VERSION				= "1.0.0";
const MODULE_PREFIX					= `[${MODULE_NAME}]: `;


// Inner constants
export const CRYPT_ALGORITHM		= "ECDSA";
export const CRYPT_NAMED_CURVE		= "P-256";


/**********************************************************
 * Module Variables
 **********************************************************/


/**********************************************************
 * PRIVATE Functions
 **********************************************************/


/**********************************************************
 * PUBLIC Functions
 **********************************************************/
export async function generateKey() {
    var key = await crypto.subtle.generateKey({
		name: CRYPT_ALGORITHM,
		namedCurve: CRYPT_NAMED_CURVE
	}, false, ["sign", "verify"]).then(function(eckey) {
		return eckey;
	}).catch(function(err) {
		console.error(err);
	});
    return key;
}

export async function exportJwk(publicKey) {
	var jwk = await crypto.subtle.exportKey("jwk", publicKey).then(function(keydata) {
		return keydata;
	}).catch(function(err) {
		console.error(err);
	});
	return jwk;
}

export async function Sign(privateKey, messageAsUint8Array){
    var signature = await crypto.subtle.sign({
            name: CRYPT_ALGORITHM,
            hash: { name: "SHA-256" },
		},
		privateKey,
		messageAsUint8Array)
        .then(function(signature) {
            const signatureAsBase64 = Base64.ToBase64Url(new Uint8Array(signature));
            return signatureAsBase64;
        })
        .catch(function(err){
            console.log(err);
            throw(err);
        });
    return signature;
};

export async function createHash(accessToken, noPadding = false){
    var encodedAT = new TextEncoder().encode(accessToken);
    var atHash = await crypto.subtle.digest('SHA-256', encodedAT)
    .then(function(hash) {        
        var base = Base64.ToBase64Url(new Uint8Array(hash));
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
