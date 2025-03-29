/**********************************************************
 * Module imports
 *
 * PKCE HELPER FUNCTIONS
 * See: https://gist.github.com/ahmetgeymen/a9dcd656a1527f6c73d9c712ea2d9d7e
 *
 **********************************************************/
// Common modules
import CONFIGURATION					from "../../data/config.json" with { type: "json" };

// Common functions
import * as COMMON						from "../common/CommonFunctions.js";

// Common Crypto functions
import * as CRYPT						from "./Crypt.js";
// Common UUID functions
import * as UUID						from "./UUID.js";


/**********************************************************
 * Module Constants
 **********************************************************/
// Module SELF constants
const MODULE_NAME						= COMMON.getModuleName( import.meta.url );

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

// Generate a secure random string using the browser crypto functions
/*
export function generateRandomString() {
    var array = new Uint32Array(28);
    window.crypto.getRandomValues(array);
    return Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('');
}
*/

// Base64-urlencodes the input string
export function base64urlencode(str) {
    // Convert the ArrayBuffer to string using Uint8 array to conver to what btoa accepts.
    // btoa accepts chars only within ascii 0-255 and base64 encodes them.
    // Then convert the base64 encoded to base64url encoded
    //   (replace + with -, replace / with _, trim trailing =)
    return btoa(String.fromCharCode.apply(null, new Uint8Array(str)))
        .replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

// Return the base64-urlencoded sha256 hash for the PKCE challenge
export async function pkceChallengeFromVerifier(v) {
    let hashed							= await CRYPT.sha256(v);
    return base64urlencode(hashed);
}

// Return the data to make the call to the PAR Server
export async function prepareDataForPARRequest( userHandle, clientId, callbackUrl ) {
	const STEP_NAME						= "prepareDataForPARRequest";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received data:" );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "+ userHandle.:", userHandle );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "+ clientId...:", clientId );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "+ callbackUrl:", callbackUrl );

	// The state & code verifier
	// ---------------------------------------------------------
    let state							= UUID.generateRandomState();
    let codeVerifier					= UUID.generateRandomCodeVerifier();
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Generated state:", state );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Generated codeVerifier:", codeVerifier );

    // The code verifier challenge
	// ---------------------------------------------------------
    let codeChallenge					= await pkceChallengeFromVerifier(codeVerifier);
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Generated codeChallenge:", codeChallenge );

    // Build up the URL.
    // Just, to make it simple! I know there are better ways to do this, BUT...
	// ---------------------------------------------------------
    let body							= "response_type=code";
    body								+= "&prompt=login";
    body								+= "&code_challenge_method=S256";
    body								+= "&scope=atproto+transition:generic"; // MUST match the scopes in the client-metadata.json
    body								+= "&client_id=" + encodeURIComponent( clientId );
    body								+= "&redirect_uri=" + encodeURIComponent( callbackUrl );
    body								+= "&code_challenge=" + codeChallenge;
    body								+= "&state=" + state;
    body								+= "&login_hint=" + userHandle;
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Generated body:", body );

	if (window.BSKY.GROUP_DEBUG) console.groupEnd(PREFIX);
	return{ state: state, codeVerifier: codeVerifier, codeChallenge: codeChallenge, body: body };
}

