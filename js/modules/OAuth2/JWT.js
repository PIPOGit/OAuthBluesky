/**********************************************************
 * Module imports
 *
 * See: https://github.com/udelt/dpop_js_test/blob/main/modules/jwt.js
 **********************************************************/
// Common modules
import * as COMMON					from "../common.functions.js";
import CONFIGURATION				from "../../data/config.json" with { type: "json" };
// For OAuth2 User Token retrieval / DPoP
import * as Base64					from './Base64Url.js';
import * as CryptoModule			from './Crypto.js'


/**********************************************************
 * Module Constants
 **********************************************************/
// Module SELF constants
const MODULE_NAME					= COMMON.getModuleName( import.meta.url );
const MODULE_VERSION				= "1.0.0";
const MODULE_PREFIX					= `[${MODULE_NAME}]: `;


// Inner constants
const DEBUG							= CONFIGURATION.global.debug;
const DEBUG_FOLDED					= CONFIGURATION.global.debug_folded;


/**********************************************************
 * Module Variables
 **********************************************************/
let GROUP_DEBUG						= DEBUG && DEBUG_FOLDED;


/**********************************************************
 * PRIVATE Functions
 **********************************************************/
 

/**********************************************************
 * PUBLIC Functions
 **********************************************************/
export async function create(privateKey, header, payload) {
    const h = JSON.stringify(header);
    const p = JSON.stringify(payload);

    const partialToken = [
        Base64.ToBase64Url(Base64.utf8ToUint8Array(h)),
        Base64.ToBase64Url(Base64.utf8ToUint8Array(p)),
    ].join(".");

    const messageAsUint8Array = Base64.utf8ToUint8Array(partialToken);
    var signatureAsBase64 = await CryptoModule.Sign(privateKey, messageAsUint8Array);
    var token = `${partialToken}.${signatureAsBase64}`;

    return token;        
}


export function getParts(accessToken){    
    var parts = accessToken.split(".");

    var header = parts[0];
    var payload = parts[1];
    var signature = parts[2];

    return {header, payload, signature};
}

export function getJWTAsString(accessToken){
    var parts = getParts(accessToken);

    var headerString = prettyString(parts.header);
    var payloadString = prettyString(parts.payload);
    var signatureBase64Url = Base64.ToBase64UrlString(parts.signature);

    return {header: headerString, payload: payloadString, signature: signatureBase64Url}
}

export const prettyStringJWTPart	= str => JSON.stringify(JSON.parse(atob(toBase64UrlString(str))), null, "    ");
function prettyString(section){
    var b64 = Base64.ToBase64UrlString(section);
    var str = atob(b64);
    var json = JSON.parse(str);
    var pretty = JSON.stringify(json, null, "    ");
    return pretty;
}

export function partToJson(section) {
    var b64 = Base64.ToBase64UrlString(section);
    var str = atob(b64);
    var json = JSON.parse(str);
    return json;
}


export function jwtToPrettyJSON( jwt ) {
    let partsAsString = getJWTAsString(jwt);
    let jwtAsString = `${partsAsString.header}.${partsAsString.payload}.${partsAsString.signature}`;
	return jwtAsString;
}
