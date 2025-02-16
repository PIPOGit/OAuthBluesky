/**********************************************************
 * Module imports
 *
 * See: https://github.com/udelt/dpop_js_test/blob/main/modules/jwt.js
 **********************************************************/
// Common modules
import CONFIGURATION				from "../../data/config.json" with { type: "json" };
// Common functions
import * as COMMON					from "../common.functions.js";
// Common Base64 functions
import * as Base64					from "./Base64Url.js";
// Common Crypto functions
import * as CRYPT					from "./Crypt.js";


/**********************************************************
 * Module Constants
 **********************************************************/


// Inner constants


/**********************************************************
 * Module Variables
 **********************************************************/


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
        Base64.toBase64Url(Base64.utf8ToUint8Array(h)),
        Base64.toBase64Url(Base64.utf8ToUint8Array(p)),
    ].join(".");

    const messageAsUint8Array = Base64.utf8ToUint8Array(partialToken);
    var signatureAsBase64 = await CRYPT.Sign(privateKey, messageAsUint8Array);
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

export function partToJson(section) {
    var b64 = Base64.ToBase64UrlString(section);
    var str = atob(b64);
    return JSON.parse(str);
}

function prettyJWTString(section){
    var json = partToJson(section);
    return JSON.stringify(json, null, "    ");
}

export function getJWTAsSemiJSON(accessToken){
    var parts = getParts(accessToken);

    var headerString = prettyJWTString(parts.header);
    var payloadString = prettyJWTString(parts.payload);
    var signatureBase64Url = Base64.ToBase64UrlString(parts.signature);

    return {header: headerString, payload: payloadString, signature: signatureBase64Url}
}

export function jwtToPrettyJSON( jwt ) {
    let partsAsString = getJWTAsSemiJSON(jwt);
    return `${partsAsString.header}.${partsAsString.payload}.${partsAsString.signature}`;
}


