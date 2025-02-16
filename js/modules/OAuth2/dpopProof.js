/**********************************************************
 * Module imports
 *
 * See: https://github.com/udelt/dpop_js_test/blob/main/modules/dpopProof.js
 **********************************************************/
// Common modules
import CONFIGURATION				from "../../data/config.json" with { type: "json" };
// Common functions
import * as COMMON					from "../common.functions.js";
// Common Classes and Exceptions ("Types")
import * as TYPES					from "../common.types.js";
// Common Base64 functions
import * as Base64					from "./Base64Url.js";
// Common Crypto functions
import * as CRYPT					from "./Crypt.js";
// Common UUID functions
import * as UUID					from "./UUID.js";
// Common JWT functions
import * as JWT						from "./JWT.js";


/**********************************************************
 * Module Constants
 **********************************************************/
// Module SELF constants
const MODULE_NAME					= COMMON.getModuleName( import.meta.url );

// Inner constants

// DPoP constants
const DPoP_HEADER_TYPE				= "dpop+jwt";


/**********************************************************
 * Module Variables
 **********************************************************/


/**********************************************************
 * PRIVATE Functions
 **********************************************************/
async function createDPoPProofWithParams(privateKey, jwk, clientId, accessTokenHash, url, dpopNonce=null, method="POST") {
	const PREFIX = `[${MODULE_NAME}:createDPoPProofWithParams] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed(PREFIX + "[Resource=="+url+"]");

    // Create the DPoP-Proof 'body' for this request.
    // ------------------------------------------
    let dpopProofHeader = {
        typ: DPoP_HEADER_TYPE,
        alg: CRYPT.KEY_ALGORITM,
        jwk: jwk
    };
	if (window.BSKY.DEBUG) console.debug( PREFIX + "dpopProofHeader:", COMMON.prettyJson( dpopProofHeader ) );

	// Let's build up a new dpopProof Payload.
	let dpopProofPayload = {};
	dpopProofPayload.iss = clientId;
	dpopProofPayload.jti = UUID.generateRandomState();
	dpopProofPayload.htm = method;
	dpopProofPayload.htu = url;
	dpopProofPayload.iat = Math.floor(Date.now() / 1000);

	// Depending on the incoming values...
	if ( dpopNonce ) {
		dpopProofPayload.nonce = dpopNonce;
	}
	if ( accessTokenHash ) {
		dpopProofPayload.ath = accessTokenHash;
	}
	if (window.BSKY.DEBUG) console.debug( PREFIX + "dpopProofPayload:", COMMON.prettyJson( dpopProofPayload ) );


    // Crypt and sign the DPoP-Proof header+body
    // ------------------------------------------
    // + Prepare
    const h = JSON.stringify(dpopProofHeader);
    const p = JSON.stringify(dpopProofPayload);
    const partialToken = [
        Base64.toBase64Url(Base64.utf8ToUint8Array(h)),
        Base64.toBase64Url(Base64.utf8ToUint8Array(p)),
    ].join(".");

    // + Sign
    let signatureAsBase64 = await CRYPT.sign(privateKey, partialToken)


    // The DPoP-Proof
    // ------------------------------------------
    let dpopProof = `${partialToken}.${signatureAsBase64}`;
	if (window.BSKY.DEBUG) console.debug( PREFIX + "dpopProof:", dpopProof );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "dpopProof:", JWT.jwtToPrettyJSON( dpopProof ) );

	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
    return dpopProof;
}



/**********************************************************
 * PUBLIC Functions
 **********************************************************/
export async function createDPoPProof(dpopRequest) {
	const PREFIX = `[${MODULE_NAME}:createDPoPProof] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed(PREFIX + "[Resource=="+dpopRequest.url+"]");
	
	let dpopProof = await createDPoPProofWithParams(
		dpopRequest.privateKey,
		dpopRequest.jwk,
		dpopRequest.clientId,
		dpopRequest.accessTokenHash,
		dpopRequest.url,
		dpopRequest.dpopNonce,
		dpopRequest.method
	);

	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
    return dpopProof;
}

