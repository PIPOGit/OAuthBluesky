/**********************************************************
 * Module Info:
 *
 * This file contains all the PLC Directory API top-level calls
 * (listed at the end).
 *
 * + docs..: "https://web.plc.directory/api/redoc",
 * + apiurl: "https://plc.directory",
 *
 **********************************************************/


/**********************************************************
 * Module imports
 **********************************************************/
// Global configuration
import CONFIGURATION					from "../../data/config.json" with { type: "json" };

// Common functions
import * as COMMON						from "../common/CommonFunctions.js";
// Common HTML functions
import * as HTML						from "../common/HTML.js";
// Common Classes and Exceptions ("Types")
import * as TYPES						from "../common/CommonTypes.js";

// To perform API calls
import * as APICall						from "../utils/APICall.js";

// Common DPOP functions
import * as DPOP						from "../auth/DPoPProof.js";


/**********************************************************
 * Module Constants
 **********************************************************/
// Module SELF constants
const MODULE_NAME						= COMMON.getModuleName( import.meta.url );

// Inner constants
const API								= CONFIGURATION.api;
const LSKEYS							= CONFIGURATION.localStorageKeys;
const CLIENT_APP						= CONFIGURATION.clientApp;
const BLUESKY							= API.bluesky;
const PLC								= BLUESKY.plc;
const ENDPOINTS							= PLC.api;


/**********************************************************
 * Module Variables
 **********************************************************/


/**********************************************************
 * Module Load
 **********************************************************/


/**********************************************************
 * BOOTSTRAP Functions
 **********************************************************/


/**********************************************************
 * Module BootStrap Loader Function
 **********************************************************/


/**********************************************************
 * PRIVATE Functions
 **********************************************************/
async function callPLCDirectoryURL( step, endpoint, did=BSKY.user?.profile?.did, handle=BSKY.user?.profile?.handle ) {
	const STEP_NAME						= "callPLCDirectoryURL";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[step==${step}] [did==${did}] [handle==${handle}] [endpoint==${endpoint}]` );

	// The URL is PDS, so... PDS Server
	const url							= PLC.url + endpoint + encodeURIComponent( did );
	if (window.BSKY.DEBUG) console.debug(PREFIX + "Fetching data from the URL:", url);

    // The call headers, except the DPoP one, which will be included later.
	// ---------------------------------------------------------
    let headers										= {};
    headers[ APICall.HTTP_HEADER_ACCEPT ]			= APICall.CONTENT_TYPE_JSON;
	headers[ APICall.HTTP_HEADER_AUTHORIZATION ]	= `${APICall.HTTP_HEADER_DPOP} ${BSKY.data.userAccessToken}`;
	headers[ APICall.HTTP_HEADER_DPOP_NONCE ]		= BSKY.data.dpopNonce;

    // The call fetch options.
    let fetchOptions					= {
        method: APICall.HTTP_GET,
        headers: headers
    }

    // The call params; with a typed format.
	// ---------------------------------------------------------
	let requestParams					= TYPES.HTTPRequest.getInstanceWithFetch( STEP_NAME, url, fetchOptions );

    // The call.
	// ---------------------------------------------------------
	let responseFromServer				= null;
	try {
		responseFromServer				= await APICall.authenticatedCall( requestParams );
	} catch ( error ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR(${typeof error}):`, error );
		responseFromServer				= error;
	}
	if (window.BSKY.DEBUG) console.debug( PREFIX + "GOT responseFromServer:", responseFromServer );

    // The response payload.
	// ---------------------------------------------------------
	const payload						= responseFromServer.json;
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Returning:", payload );

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return payload;
}


/**********************************************************
 * BUSINESS Functions
 **********************************************************/
/* --------------------------------------------------------
 * LOGGED-IN PROCESS.
 *
 * Retrieve both:
 * + generic information about BlueSky, and
 * + information about this particular user.
 *
 * -------------------------------------------------------- */
export async function plcResolveDID( did ) {
	const STEP_NAME						= "plcResolveDID";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[did==${did}]` );

    // The call.
	// ---------------------------------------------------------
	let responseFromServer				= null;
	try {
		responseFromServer				= await callPLCDirectoryURL( STEP_NAME, ENDPOINTS.resolveDID, did );
	} catch ( error ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR(${typeof error}):`, error );
		responseFromServer				= error;
	}
	if (window.BSKY.DEBUG) console.debug( PREFIX + `  DID Doc: [${did}]`, responseFromServer );

	// Sanity check
	// ---------------------------------------------------------
	if ( responseFromServer instanceof TYPES.HTTPResponseError ) {
		if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		throw responseFromServer;
	}

    // The response payload.
	// ---------------------------------------------------------
	const payload						= responseFromServer;

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return payload;
}


/**********************************************************
 * PUBLIC Functions
 *
 * Exported functions; visible from outside.
 *
 * Each of them will perform a call to: "APICall.call" o:
 * "APICall.authenticatedCall"
 **********************************************************/
export async function resolveDid( did ) { return await plcResolveDID( did ); }


