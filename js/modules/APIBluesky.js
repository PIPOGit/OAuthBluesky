/**********************************************************
 * Module imports
 *
 * PKCE HELPER FUNCTIONS
 * See: https://gist.github.com/ahmetgeymen/a9dcd656a1527f6c73d9c712ea2d9d7e
 *
 **********************************************************/
// Global configuration
import CONFIGURATION					from "../data/config.json" with { type: "json" };
// Common functions
import * as COMMON						from "./common.functions.js";
// Common Classes and Exceptions ("Types")
import * as TYPES						from "./common.types.js";
// To perform API calls
import * as APICall						from "./APICall.js";
// Common HTML functions
import * as HTML						from "./HTML.js";
// Common Crypto functions
import * as Crypto						from "./OAuth2/Crypto.js";
// Common DPOP functions
import * as DPOP						from "./OAuth2/dpopProof.js";
// Common JWT functions
import * as JWT							from "./OAuth2/JWT.js";


/**********************************************************
 * Module Constants
 **********************************************************/
// Module SELF constants
const MODULE_NAME						= COMMON.getModuleName( import.meta.url );
const MODULE_VERSION					= "1.0.0";
const MODULE_PREFIX						= `[${MODULE_NAME}]: `;

// Logging constants
const DEBUG								= CONFIGURATION.global.debug;
const DEBUG_FOLDED						= CONFIGURATION.global.debug_folded;

// Inner constants
const API								= CONFIGURATION.api;
const LSKEYS							= CONFIGURATION.localStorageKeys;
const CLIENT_APP						= CONFIGURATION.clientApp;

// HTML methods
const HTML_GET							= "GET";
const HTML_POST							= "POST";

// HTML Content Type constants
const CONTENT_TYPE_JSON					= "application/json";
const CONTENT_TYPE_JSON_UTF8			= "application/json; charset=utf-8";
const CONTENT_TYPE_FORM_ENCODED			= "application/x-www-form-urlencoded";

// Bluesky constants
const APP_CLIENT_ID						= CLIENT_APP.client_id;
const APP_CALLBACK_URL					= CLIENT_APP.redirect_uri;
const MAX_NOTIS_TO_RETRIEVE				= 50;


/**********************************************************
 * Module Variables
 **********************************************************/
let GROUP_DEBUG							= DEBUG && DEBUG_FOLDED;


/**********************************************************
 * PRIVATE Functions
 **********************************************************/


/**********************************************************
 * PUBLIC Functions
 **********************************************************/

/* --------------------------------------------------------
 * LOGGED-IN PROCESS.
 *
 * "Internal Business function": Retrieve something.
 * Due to the behaviour of Bluesky API, sometimes, the server
 * requests to re-authenticate, sending a new "dpop-nonce"
 * value.
 * This module performs a "try-and-catch" call for a given
 * function.
 * -------------------------------------------------------- */
export async function tryAndCatch( currentStep, callbackFunction, callbackOptions ) {
	const STEP_NAME						= "tryAndCatch";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_RETRY					= `${PREFIX}[RETRY] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + `Step: ${currentStep}` );

	// Clear and hide error fields and panel
	HTML.clearHTMLError();

	let apiCallResponse					= null;
	try {
		// Let's retrieve first if there are unread user's notifications.
		// ------------------------------------------
		apiCallResponse					= await callbackFunction(callbackOptions);
		if (DEBUG) console.debug( PREFIX + "Current apiCallResponse:", apiCallResponse );

		// Clear and hide error fields and panel
		HTML.clearHTMLError();
	} catch (error) {
		if (GROUP_DEBUG) console.groupEnd();

		// Check if the error is due to a different dpop-nonce in step 12...
		let sameSteps					= COMMON.areEquals(error.step, currentStep);
		let distinctDPoPNonce			= !COMMON.areEquals(BSKY.data.dpopNonceUsed, BSKY.data.dpopNonceReceived);
		if ( sameSteps && distinctDPoPNonce) {
			// Show the error and update the HTML fields
			HTML.updateHTMLError(error, false);

			if (DEBUG) console.debug( PREFIX + "Let's retry..." );
			if (GROUP_DEBUG) console.groupCollapsed( PREFIX_RETRY );
			try {
				apiCallResponse			= await callbackFunction(callbackOptions);
				if (DEBUG) console.debug( PREFIX_RETRY + "Current apiCallResponse:", apiCallResponse );

				// Clear and hide error fields and panel
				HTML.clearHTMLError();
			} catch (error) {
				if (GROUP_DEBUG) console.groupEnd();
				
				// TODO: Si el error es de expiración del token [401]
				// vendrá algo así: {"error":"invalid_token","message":"\"exp\" claim timestamp check failed"}
				if (   ( error.status==401 )									// authentication error
					&& ( error.isJson )											// json format
					&& ( COMMON.areEquals( error.json.error, 'invalid_token' ) ) ) {	// 'invalid token'
					// Redirigir a "logout".
					if (DEBUG) console.debug( PREFIX + "-- END" );
					if (GROUP_DEBUG) console.groupEnd();
					await fnLogout();
				} else {
					// Show the error and update the HTML fields
					if (DEBUG) console.debug( PREFIX + "Not an 'invalid token' error." );
					HTML.updateHTMLError(error);
					throw( error );
				}
			}
			if (GROUP_DEBUG) console.groupEnd();
		} else {
			if (DEBUG) console.debug( PREFIX_RETRY + `[sameSteps=${sameSteps}]` );
			if (DEBUG) console.debug( PREFIX_RETRY + `+ [error.step]`, error.step );
			if (DEBUG) console.debug( PREFIX_RETRY + `+ [currentStep]`, currentStep );
			if (DEBUG) console.debug( PREFIX_RETRY + `[distinctDPoPNonce=${distinctDPoPNonce}]` );
			if (DEBUG) console.debug( PREFIX_RETRY + `+ [BSKY.data.dpopNonceUsed]`, BSKY.data.dpopNonceUsed );
			if (DEBUG) console.debug( PREFIX_RETRY + `+ [BSKY.data.dpopNonceReceived]`, BSKY.data.dpopNonceReceived );

			// Show the error and update the HTML fields
			HTML.updateHTMLError(error);
		}
	}

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
	
	return apiCallResponse;
}

// Atomic function to logout the user
export async function performUserLogout() {
	const STEP_NAME						= "performUserLogout";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Now, the user's profile.
	if (DEBUG) console.debug( PREFIX + `Performing the user's logout...` );
    let body							= `token=${BSKY.data.userAccessToken}`;
    let fetchOptions					= {
        method: HTML_POST,
        headers: {
			'Authorization': `DPoP ${BSKY.data.userAccessToken}`,
            'Content-Type': CONTENT_TYPE_FORM_ENCODED
        },
        body: body
    }
    let url								= BSKY.auth.userRevocationEndPoint;
 	if (DEBUG) console.debug( PREFIX + "Invoking URL:", url );
 	if (DEBUG) console.debug( PREFIX + "+ with this options:", COMMON.prettyJson( fetchOptions ) );

 	let responseFromServer				= await APICall.makeAPICall( "fnLogout", url, fetchOptions );
	if (DEBUG) console.debug( PREFIX + "Received responseFromServer:", COMMON.prettyJson( responseFromServer ) );

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
	return responseFromServer;
}

// Atomic function to retrieve the user access token
export async function retrieveUserAccessToken(code) {
	const STEP_NAME						= "retrieveUserAccessToken";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + " [code=="+code+"]" );

	// Prepare the URL..
    let url								= BSKY.auth.userTokenEndPoint;
 	if (DEBUG) console.debug( PREFIX + "Access Token URL:", url );

    // Retrieve the crypto key.
    // ------------------------------------------
	if (DEBUG) console.debug( PREFIX + "cryptoKey:", COMMON.prettyJson( BSKY.data.cryptoKey ) );
	if (DEBUG) console.debug( PREFIX + "jwk:", COMMON.prettyJson( BSKY.data.jwk ) );

    // Create the DPoP-Proof 'body' for this request.
    // ------------------------------------------
	let dpopRequest						= new TYPES.DPoPRequest(BSKY.data.cryptoKey.privateKey, BSKY.data.jwk, APP_CLIENT_ID, null, null, url, BSKY.data.dpopNonce, HTML_POST);
	let dpopProof						= await DPOP.createDPoPProof(dpopRequest)
	if (DEBUG) console.debug( PREFIX + "Received dpopProof:", JWT.jwtToPrettyJSON( dpopProof ) );

	// Preparamos los datos a enviar
	let body							= new URLSearchParams({
		// Fixed values
		'grant_type': 'authorization_code',
		// Variable values
		'code': code,
		'code_verifier': BSKY.auth.codeVerifier,
		// Neocities values
		'client_id': APP_CLIENT_ID,
		'redirect_uri': APP_CALLBACK_URL
	});
	if (DEBUG) console.debug(PREFIX + "Generated [body]:", COMMON.prettyJson( Object.fromEntries( body ) ));

    // TuneUp the call
    // ------------------------------------------
    let headers							= {
        'DPOP': dpopProof,
        'Content-Type': CONTENT_TYPE_FORM_ENCODED,
        'DPoP-Nonce': BSKY.data.dpopNonce
    }
    let fetchOptions					= {
        method: HTML_POST,
        headers: headers,
        body: body.toString()
    }
	if (DEBUG) console.debug( PREFIX + "headers:", COMMON.prettyJson( headers ) );
	if (DEBUG) console.debug( PREFIX + "fetchOptions:", COMMON.prettyJson( fetchOptions ) );

    // Finally, perform the call
    // ------------------------------------------
 	if (DEBUG) console.debug( PREFIX + "Invoking URL:", url );
 	let responseFromServer				= await APICall.makeAPICall( STEP_NAME, url, fetchOptions );
	if (DEBUG) console.debug( PREFIX + "Received responseFromServer:", COMMON.prettyJson( responseFromServer ) );
	// Here, we gather the "access_token" item in the received json.
	BSKY.data.userAuthentication		= responseFromServer.body;
	BSKY.data.userAccessToken			= BSKY.data.userAuthentication.access_token;
	BSKY.data.userRefreshToken			= BSKY.data.userAuthentication.refresh_token;

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
	return { userAuthentication: BSKY.data.userAuthentication, userAccessToken: BSKY.data.userAccessToken };
}

// Atomic function to refresh the user access token
export async function refreshAccessToken() {
	const STEP_NAME						= "refreshAccessToken";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_AFTER					= `${PREFIX}[After] `;
	const PREFIX_PREFETCH				= `${PREFIX}[PREFETCH] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userHandle=="+BSKY.user.userHandle+"]" );

 	if (DEBUG) console.debug( PREFIX + `Refreshing the access token...` );

	if (GROUP_DEBUG) console.groupCollapsed( PREFIX_PREFETCH );
	if (DEBUG) console.debug( PREFIX + "Current userRefreshToken:", BSKY.data.userRefreshToken );
	if (DEBUG) console.debug( PREFIX + "Current userAuthentication:", BSKY.data.userAuthentication );
	if (DEBUG) console.debug( PREFIX + "Current userAccessToken:", JWT.jwtToPrettyJSON( BSKY.data.userAccessToken ) );

	// Prepare the URL..
    let url								= BSKY.auth.userTokenEndPoint;
 	if (DEBUG) console.debug( PREFIX + "Access Token URL:", url );

    // Create the DPoP-Proof 'body' for this request.
    // ------------------------------------------
	let dpopRequest						= new TYPES.DPoPRequest(BSKY.data.cryptoKey.privateKey, BSKY.data.jwk, APP_CLIENT_ID, BSKY.data.userAccessToken, null, url, BSKY.data.dpopNonce, HTML_POST);
	let dpopProof						= await DPOP.createDPoPProof(dpopRequest);
	if (DEBUG) console.debug( PREFIX + "Received dpopProof:", JWT.jwtToPrettyJSON( dpopProof ) );

	// Preparamos los datos a enviar
	let body							= new URLSearchParams({
		// Fixed values
		'grant_type': 'refresh_token',
		// Neocities values
		'client_id': APP_CLIENT_ID,
		'redirect_uri': APP_CALLBACK_URL,
		// Variable values
		'refresh_token': BSKY.data.userRefreshToken
	});
	if (DEBUG) console.debug(PREFIX + "Generated [body]:", COMMON.prettyJson( Object.fromEntries( body ) ));

    // TuneUp the call
    // ------------------------------------------
    let headers							= {
        'DPOP': dpopProof,
        'Content-Type': CONTENT_TYPE_FORM_ENCODED,
        'DPoP-Nonce': BSKY.data.dpopNonce
    }
    let fetchOptions					= {
        method: HTML_POST,
        headers: headers,
        body: body.toString()
    }
	if (DEBUG) console.debug( PREFIX + "headers:", COMMON.prettyJson( headers ) );
	if (DEBUG) console.debug( PREFIX + "fetchOptions:", COMMON.prettyJson( fetchOptions ) );
	if (GROUP_DEBUG) console.groupEnd();

    // Finally, perform the call
    // ------------------------------------------
 	if (DEBUG) console.debug( PREFIX + "Invoking URL:", url );
 	let responseFromServer				= await APICall.makeAPICall( STEP_NAME, url, fetchOptions );
	if (DEBUG) console.debug( PREFIX + "Received responseFromServer:", COMMON.prettyJson( responseFromServer ) );

	// Let's group log messages
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX_AFTER );

	BSKY.data.userAuthentication		= responseFromServer.body;
	BSKY.data.userAccessToken			= BSKY.data.userAuthentication.access_token;
	BSKY.data.userRefreshToken			= BSKY.data.userAuthentication.refresh_token;
	if (DEBUG) console.debug(PREFIX_AFTER + "userAuthentication:", BSKY.data.userAuthentication);
	if (DEBUG) console.debug(PREFIX_AFTER + "userAccessToken:", BSKY.data.userAccessToken);
	if (DEBUG) console.debug(PREFIX_AFTER + "userRefreshToken:", BSKY.data.userRefreshToken);

	// Let's create also the access token HASH...
	BSKY.data.accessTokenHash			= await Crypto.createHash(BSKY.data.userAccessToken, true);
	if (DEBUG) console.debug(PREFIX_AFTER + "BSKY.data.accessTokenHash:", BSKY.data.accessTokenHash);
	if (DEBUG) console.debug(PREFIX_AFTER + "BSKY.data.dpopNonce:", BSKY.data.dpopNonce);
	if (GROUP_DEBUG) console.groupEnd();

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
	return { userAuthentication: BSKY.data.userAuthentication, userAccessToken: BSKY.data.userAccessToken };
}

// Atomic function to retrieve the user's unread notifications value
export async function retrieveUnreadNotifications(renderHTMLErrors=true) {
	const STEP_NAME						= "retrieveUnreadNotifications";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_PREFETCH				= `${PREFIX}[PREFETCH] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + `[renderHTMLErrors==${renderHTMLErrors}]` );

	let endpoint						= API.bluesky.XRPC.api.pds.getUnreadCount;
 	if (DEBUG) console.debug( PREFIX + "Requesting if there are unread notifications... Invoking endpoint:", endpoint );

	// The URL is protected, so... PDS Server
	let root							= BSKY.auth.userPDSURL + "/xrpc";
	let url								= root + endpoint;
	if (DEBUG) console.debug(PREFIX + "Fetching data from the URL:", url);

	// Let's group the following messages
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX_PREFETCH );

    // Create the DPoP-Proof 'body' for this request.
	// We already have the cryptoKey somewhere, from previous calls...
    // ------------------------------------------
	let dpopRequest						= new TYPES.DPoPRequest(BSKY.data.cryptoKey.privateKey, BSKY.data.jwk, APP_CLIENT_ID, BSKY.data.userAccessToken, BSKY.data.accessTokenHash, url, BSKY.data.dpopNonce, HTML_GET);
	let dpopProof						= await DPOP.createDPoPProof(dpopRequest)
	if (DEBUG) console.debug( PREFIX_PREFETCH + "Received dpopProof:", JWT.jwtToPrettyJSON( dpopProof ) );

    // TuneUp the call
    // ------------------------------------------
    let headers							= {
		'Authorization': `DPoP ${BSKY.data.userAccessToken}`,
		'DPoP': dpopProof,
		'Accept': CONTENT_TYPE_JSON,
        'DPoP-Nonce': BSKY.data.dpopNonce
    }
    let fetchOptions					= {
        method: HTML_GET,
        headers: headers
    }
	if (DEBUG) console.debug( PREFIX_PREFETCH + "headers:", COMMON.prettyJson( headers ) );
	if (DEBUG) console.debug( PREFIX_PREFETCH + "fetchOptions:", COMMON.prettyJson( fetchOptions ) );

	if (GROUP_DEBUG) console.groupEnd();

    // Finally, perform the call
    // ------------------------------------------
 	if (DEBUG) console.debug( PREFIX + "Invoking URL:", url );
 	let responseFromServer				= await APICall.makeAPICall( STEP_NAME, url, fetchOptions, renderHTMLErrors );
	if (DEBUG) console.debug( PREFIX + "Received responseFromServer:", COMMON.prettyJson( responseFromServer ) );
	// Here, we gather the "access_token" item in the received json.

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
	return responseFromServer.body.count;
}

// Atomic function to retrieve the user's notifications
export async function retrieveNotifications(renderHTMLErrors=true) {
	const STEP_NAME						= "retrieveNotifications";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_PREFETCH				= `${PREFIX}[PREFETCH] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + `[renderHTMLErrors==${renderHTMLErrors}] [MAX ${MAX_NOTIS_TO_RETRIEVE} notifications to retrieve]` );

	let endpoint						= API.bluesky.XRPC.api.pds.listNotifications;
 	if (DEBUG) console.debug( PREFIX + "Requesting the unread notifications... Invoking endpoint:", endpoint );

	// The URL is protected, so... PDS Server
	let root							= BSKY.auth.userPDSURL + "/xrpc";
	let url								= root + endpoint + "?limit=" + MAX_NOTIS_TO_RETRIEVE;		// Not much; it's a test!
	if (DEBUG) console.debug(PREFIX + "Fetching data from the URL:", url);

	// Let's group the following messages
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX_PREFETCH );

    // Create the DPoP-Proof 'body' for this request.
	// We already have the cryptoKey somewhere, from previous calls...
    // ------------------------------------------
	let dpopRequest						= new TYPES.DPoPRequest(BSKY.data.cryptoKey.privateKey, BSKY.data.jwk, APP_CLIENT_ID, BSKY.data.userAccessToken, BSKY.data.accessTokenHash, url, BSKY.data.dpopNonce, HTML_GET);
	let dpopProof						= await DPOP.createDPoPProof(dpopRequest)
	if (DEBUG) console.debug( PREFIX_PREFETCH + "Received dpopProof:", JWT.jwtToPrettyJSON( dpopProof ) );

    // TuneUp the call
    // ------------------------------------------
    let headers							= {
		'Authorization': `DPoP ${BSKY.data.userAccessToken}`,
		'DPoP': dpopProof,
		'Accept': CONTENT_TYPE_JSON,
        'DPoP-Nonce': BSKY.data.dpopNonce
    }
    let fetchOptions					= {
        method: HTML_GET,
        headers: headers
    }
	if (DEBUG) console.debug( PREFIX_PREFETCH + "headers:", COMMON.prettyJson( headers ) );
	if (DEBUG) console.debug( PREFIX_PREFETCH + "fetchOptions:", COMMON.prettyJson( fetchOptions ) );

	if (GROUP_DEBUG) console.groupEnd();

    // Finally, perform the call
    // ------------------------------------------
 	if (DEBUG) console.debug( PREFIX + "Invoking URL:", url );
 	let responseFromServer				= await APICall.makeAPICall( STEP_NAME, url, fetchOptions, renderHTMLErrors );
	if (DEBUG) console.debug( PREFIX + "Received responseFromServer:", COMMON.prettyJson( responseFromServer ) );
	// Here, we gather the "access_token" item in the received json.

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
	return responseFromServer.body.notifications;
}

// Atomic function to retrieve the user's profile
export async function retrieveUserProfile() {
	const STEP_NAME						= "retrieveUserProfile";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userHandle " + BSKY.user.userHandle + "]" );

	// Prepare the URL..
	let endpoint						= API.bluesky.XRPC.api.public.getProfile;
 	if (DEBUG) console.debug( PREFIX + "Requesting the user's profile... Invoking endpoint:", endpoint );

	// The URL is OPEN, so... Public Server
	let root							= API.bluesky.XRPC.public;
	let url								= root + endpoint + "?actor=" + BSKY.user.userHandle;
	if (DEBUG) console.debug(PREFIX + "Fetching data from the URL:", url);

    // Create the DPoP-Proof 'body' for this request.
    // ------------------------------------------
	let dpopRequest						= new TYPES.DPoPRequest(BSKY.data.cryptoKey.privateKey, BSKY.data.jwk, APP_CLIENT_ID, BSKY.data.userAccessToken, BSKY.data.accessTokenHash, url, BSKY.data.dpopNonce, HTML_GET);
	let dpopProof						= await DPOP.createDPoPProof(dpopRequest)
	if (DEBUG) console.debug( PREFIX + "Received dpopProof:", JWT.jwtToPrettyJSON( dpopProof ) );

    // TuneUp the call
    // ------------------------------------------
    let headers							= {
		'Authorization': `DPoP ${BSKY.data.userAccessToken}`,
		'DPoP': dpopProof,
		'Accept': CONTENT_TYPE_JSON,
        'DPoP-Nonce': BSKY.data.dpopNonce
    }
    let fetchOptions					= {
        method: HTML_GET,
        headers: headers
    }
	if (DEBUG) console.debug( PREFIX + "headers:", COMMON.prettyJson( headers ) );
	if (DEBUG) console.debug( PREFIX + "fetchOptions:", COMMON.prettyJson( fetchOptions ) );

    // Finally, perform the call
    // ------------------------------------------
 	if (DEBUG) console.debug( PREFIX + "Invoking URL:", url );
 	let responseFromServer				= await APICall.makeAPICall( STEP_NAME, url, fetchOptions );
	if (DEBUG) console.debug( PREFIX + "Received responseFromServer:", COMMON.prettyJson( responseFromServer ) );
	// Here, we gather the "access_token" item in the received json.
	let userProfile						= responseFromServer.body;

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
	return userProfile;
}

// Atomic function to retrieve who the user follows
export async function retrieveUserFollows(cursor) {
	const STEP_NAME						= "retrieveUserFollows";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userHandle " + BSKY.user.userHandle + "]" );

	// Prepare the URL..
	let endpoint						= API.bluesky.XRPC.api.public.getFollows;
 	if (DEBUG) console.debug( PREFIX + "Requesting who the user is following... Invoking endpoint:", endpoint );

	// The URL is OPEN, so... Public Server
	let root							= API.bluesky.XRPC.public;
	let url								= root + endpoint;
	url									+= "?actor=" + BSKY.user.userHandle;
	url									+= "&limit=100";
	if ( !COMMON.isNullOrEmpty(cursor) ) {
		url								+= "&cursor=" + cursor;
	}
	if (DEBUG) console.debug(PREFIX + "Fetching data from the URL:", url);

    // Create the DPoP-Proof 'body' for this request.
    // ------------------------------------------
	let dpopRequest						= new TYPES.DPoPRequest(BSKY.data.cryptoKey.privateKey, BSKY.data.jwk, APP_CLIENT_ID, BSKY.data.userAccessToken, BSKY.data.accessTokenHash, url, BSKY.data.dpopNonce, HTML_GET);
	let dpopProof						= await DPOP.createDPoPProof(dpopRequest)
	if (DEBUG) console.debug( PREFIX + "Received dpopProof:", JWT.jwtToPrettyJSON( dpopProof ) );

    // TuneUp the call
    // ------------------------------------------
    let headers							= {
		'Authorization': `DPoP ${BSKY.data.userAccessToken}`,
		'DPoP': dpopProof,
		'Accept': CONTENT_TYPE_JSON,
        'DPoP-Nonce': BSKY.data.dpopNonce
    }
    let fetchOptions					= {
        method: HTML_GET,
        headers: headers
    }
	if (DEBUG) console.debug( PREFIX + "headers:", COMMON.prettyJson( headers ) );
	if (DEBUG) console.debug( PREFIX + "fetchOptions:", COMMON.prettyJson( fetchOptions ) );

    // Finally, perform the call
    // ------------------------------------------
 	if (DEBUG) console.debug( PREFIX + "Invoking URL:", url );
 	let responseFromServer				= await APICall.makeAPICall( STEP_NAME, url, fetchOptions );
	if (DEBUG) console.debug( PREFIX + "Received responseFromServer:", COMMON.prettyJson( responseFromServer ) );
	// Here, we gather the "access_token" item in the received json.
	let userData						= responseFromServer.body;

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
	return userData;
}

// Atomic function to retrieve who the user follows
export async function retrieveRepoListRecords(cursor) {
	const STEP_NAME						= "retrieveRepoListRecords";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userHandle " + BSKY.user.userHandle + "]" );

	// Prepare the URL..
	let endpoint						= API.bluesky.XRPC.api.pds.listRecords;
 	if (DEBUG) console.debug( PREFIX + "Requesting who the user is following... Invoking endpoint:", endpoint );

	// The URL is OPEN, so... Public Server
	let root							= BSKY.auth.userPDSURL + "/xrpc";
	let url								= root + endpoint;
	url									+= "?repo=" + encodeURIComponent( BSKY.user.userDid );
	url									+= "&collection=app.bsky.graph.follow";
	url									+= "&limit=100";
	if ( !COMMON.isNullOrEmpty(cursor) ) {
		url								+= "&cursor=" + cursor;
	}
	if (DEBUG) console.debug(PREFIX + "Fetching data from the URL:", url);

    // Create the DPoP-Proof 'body' for this request.
    // ------------------------------------------
	let dpopRequest						= new TYPES.DPoPRequest(BSKY.data.cryptoKey.privateKey, BSKY.data.jwk, APP_CLIENT_ID, BSKY.data.userAccessToken, BSKY.data.accessTokenHash, url, BSKY.data.dpopNonce, HTML_GET);
	let dpopProof						= await DPOP.createDPoPProof(dpopRequest)
	if (DEBUG) console.debug( PREFIX + "Received dpopProof:", JWT.jwtToPrettyJSON( dpopProof ) );

    // TuneUp the call
    // ------------------------------------------
    let headers							= {
		'Authorization': `DPoP ${BSKY.data.userAccessToken}`,
		'DPoP': dpopProof,
		'Accept': CONTENT_TYPE_JSON,
        'DPoP-Nonce': BSKY.data.dpopNonce
    }
    let fetchOptions					= {
        method: HTML_GET,
        headers: headers
    }
	if (DEBUG) console.debug( PREFIX + "headers:", COMMON.prettyJson( headers ) );
	if (DEBUG) console.debug( PREFIX + "fetchOptions:", COMMON.prettyJson( fetchOptions ) );

    // Finally, perform the call
    // ------------------------------------------
 	if (DEBUG) console.debug( PREFIX + "Invoking URL:", url );
 	let responseFromServer				= await APICall.makeAPICall( STEP_NAME, url, fetchOptions );
	if (DEBUG) console.debug( PREFIX + "Received responseFromServer:", COMMON.prettyJson( responseFromServer ) );
	// Here, we gather the "access_token" item in the received json.
	let userData						= responseFromServer.body;

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
	return userData;
}

// Atomic function to retrieve who are the user followers
export async function retrieveUserFollowers(cursor) {
	const STEP_NAME						= "retrieveUserFollowers";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userHandle " + BSKY.user.userHandle + "]" );

	// Prepare the URL..
	let endpoint						= API.bluesky.XRPC.api.public.getFollowers;
 	if (DEBUG) console.debug( PREFIX + "Requesting who are the user's followers... Invoking endpoint:", endpoint );

	// The URL is OPEN, so... Public Server
	let root							= API.bluesky.XRPC.public;
	let url								= root + endpoint;
	url									+= "?actor=" + BSKY.user.userHandle;
	url									+= "&limit=100";
	if ( !COMMON.isNullOrEmpty(cursor) ) {
		url								+= "&cursor=" + cursor;
	}
	if (DEBUG) console.debug(PREFIX + "Fetching data from the URL:", url);

    // Create the DPoP-Proof 'body' for this request.
    // ------------------------------------------
	let dpopRequest						= new TYPES.DPoPRequest(BSKY.data.cryptoKey.privateKey, BSKY.data.jwk, APP_CLIENT_ID, BSKY.data.userAccessToken, BSKY.data.accessTokenHash, url, BSKY.data.dpopNonce, HTML_GET);
	let dpopProof						= await DPOP.createDPoPProof(dpopRequest)
	if (DEBUG) console.debug( PREFIX + "Received dpopProof:", JWT.jwtToPrettyJSON( dpopProof ) );

    // TuneUp the call
    // ------------------------------------------
    let headers							= {
		'Authorization': `DPoP ${BSKY.data.userAccessToken}`,
		'DPoP': dpopProof,
		'Accept': CONTENT_TYPE_JSON,
        'DPoP-Nonce': BSKY.data.dpopNonce
    }
    let fetchOptions					= {
        method: HTML_GET,
        headers: headers
    }
	if (DEBUG) console.debug( PREFIX + "headers:", COMMON.prettyJson( headers ) );
	if (DEBUG) console.debug( PREFIX + "fetchOptions:", COMMON.prettyJson( fetchOptions ) );

    // Finally, perform the call
    // ------------------------------------------
 	if (DEBUG) console.debug( PREFIX + "Invoking URL:", url );
 	let responseFromServer				= await APICall.makeAPICall( STEP_NAME, url, fetchOptions );
	if (DEBUG) console.debug( PREFIX + "Received responseFromServer:", COMMON.prettyJson( responseFromServer ) );
	// Here, we gather the "access_token" item in the received json.
	let userData						= responseFromServer.body;

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
	return userData;
}

// Atomic function to retrieve who are the user blocking
export async function retrieveUserBlocks(cursor) {
	const STEP_NAME						= "retrieveUserBlocks";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userHandle " + BSKY.user.userHandle + "]" );

	// Prepare the URL..
	let endpoint						= API.bluesky.XRPC.api.pds.getBlocks;
 	if (DEBUG) console.debug( PREFIX + "Requesting who the user is blocking... Invoking endpoint:", endpoint );

	// The URL is protected, so... PDS Server
	let root							= BSKY.auth.userPDSURL + "/xrpc";
	let url								= root + endpoint;
	url									+= "?limit=100";
	if ( !COMMON.isNullOrEmpty(cursor) ) {
		url								+= "&cursor=" + cursor;
	}
	if (DEBUG) console.debug(PREFIX + "Fetching data from the URL:", url);

    // Create the DPoP-Proof 'body' for this request.
    // ------------------------------------------
	let dpopRequest						= new TYPES.DPoPRequest(BSKY.data.cryptoKey.privateKey, BSKY.data.jwk, APP_CLIENT_ID, BSKY.data.userAccessToken, BSKY.data.accessTokenHash, url, BSKY.data.dpopNonce, HTML_GET);
	let dpopProof						= await DPOP.createDPoPProof(dpopRequest)
	if (DEBUG) console.debug( PREFIX + "Received dpopProof:", JWT.jwtToPrettyJSON( dpopProof ) );

    // TuneUp the call
    // ------------------------------------------
    let headers							= {
		'Authorization': `DPoP ${BSKY.data.userAccessToken}`,
		'DPoP': dpopProof,
		'Accept': CONTENT_TYPE_JSON,
        'DPoP-Nonce': BSKY.data.dpopNonce
    }
    let fetchOptions					= {
        method: HTML_GET,
        headers: headers
    }
	if (DEBUG) console.debug( PREFIX + "headers:", COMMON.prettyJson( headers ) );
	if (DEBUG) console.debug( PREFIX + "fetchOptions:", COMMON.prettyJson( fetchOptions ) );

    // Finally, perform the call
    // ------------------------------------------
 	if (DEBUG) console.debug( PREFIX + "Invoking URL:", url );
 	let responseFromServer				= await APICall.makeAPICall( STEP_NAME, url, fetchOptions );
	if (DEBUG) console.debug( PREFIX + "Received responseFromServer:", COMMON.prettyJson( responseFromServer ) );
	// Here, we gather the "access_token" item in the received json.
	let userData						= responseFromServer.body;

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
	return userData;
}

// Atomic function to retrieve who are the user muting
export async function retrieveUserMutes(cursor) {
	const STEP_NAME						= "retrieveUserMutes";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userHandle " + BSKY.user.userHandle + "]" );

	// Prepare the URL..
	let endpoint						= API.bluesky.XRPC.api.pds.getMutes;
 	if (DEBUG) console.debug( PREFIX + "Requesting who the user is muting... Invoking endpoint:", endpoint );

	// The URL is protected, so... PDS Server
	let root							= BSKY.auth.userPDSURL + "/xrpc";
	let url								= root + endpoint;
	url									+= "?limit=100";
	if ( !COMMON.isNullOrEmpty(cursor) ) {
		url								+= "&cursor=" + cursor;
	}
	if (DEBUG) console.debug(PREFIX + "Fetching data from the URL:", url);

    // Create the DPoP-Proof 'body' for this request.
    // ------------------------------------------
	let dpopRequest						= new TYPES.DPoPRequest(BSKY.data.cryptoKey.privateKey, BSKY.data.jwk, APP_CLIENT_ID, BSKY.data.userAccessToken, BSKY.data.accessTokenHash, url, BSKY.data.dpopNonce, HTML_GET);
	let dpopProof						= await DPOP.createDPoPProof(dpopRequest)
	if (DEBUG) console.debug( PREFIX + "Received dpopProof:", JWT.jwtToPrettyJSON( dpopProof ) );

    // TuneUp the call
    // ------------------------------------------
    let headers							= {
		'Authorization': `DPoP ${BSKY.data.userAccessToken}`,
		'DPoP': dpopProof,
		'Accept': CONTENT_TYPE_JSON,
        'DPoP-Nonce': BSKY.data.dpopNonce
    }
    let fetchOptions					= {
        method: HTML_GET,
        headers: headers
    }
	if (DEBUG) console.debug( PREFIX + "headers:", COMMON.prettyJson( headers ) );
	if (DEBUG) console.debug( PREFIX + "fetchOptions:", COMMON.prettyJson( fetchOptions ) );

    // Finally, perform the call
    // ------------------------------------------
 	if (DEBUG) console.debug( PREFIX + "Invoking URL:", url );
 	let responseFromServer				= await APICall.makeAPICall( STEP_NAME, url, fetchOptions );
	if (DEBUG) console.debug( PREFIX + "Received responseFromServer:", COMMON.prettyJson( responseFromServer ) );
	// Here, we gather the "access_token" item in the received json.
	let userData						= responseFromServer.body;

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
	return userData;
}

// Atomic function to retrieve who are the user muting
export async function retrieveUserLists(cursor) {
	const STEP_NAME						= "retrieveUserLists";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userHandle " + BSKY.user.userHandle + "]" );

	// Prepare the URL..
	let endpoint						= API.bluesky.XRPC.api.pds.getLists;
 	if (DEBUG) console.debug( PREFIX + "Requesting the user's lists... Invoking endpoint:", endpoint );

	// The URL is protected, so... PDS Server
	let root							= BSKY.auth.userPDSURL + "/xrpc";
	let url								= root + endpoint;
	url									+= "?actor=" + BSKY.user.userHandle;
	url									+= "&limit=100";
	if ( !COMMON.isNullOrEmpty(cursor) ) {
		url								+= "&cursor=" + cursor;
	}
	if (DEBUG) console.debug(PREFIX + "Fetching data from the URL:", url);

    // Create the DPoP-Proof 'body' for this request.
    // ------------------------------------------
	let dpopRequest						= new TYPES.DPoPRequest(BSKY.data.cryptoKey.privateKey, BSKY.data.jwk, APP_CLIENT_ID, BSKY.data.userAccessToken, BSKY.data.accessTokenHash, url, BSKY.data.dpopNonce, HTML_GET);
	let dpopProof						= await DPOP.createDPoPProof(dpopRequest)
	if (DEBUG) console.debug( PREFIX + "Received dpopProof:", JWT.jwtToPrettyJSON( dpopProof ) );

    // TuneUp the call
    // ------------------------------------------
    let headers							= {
		'Authorization': `DPoP ${BSKY.data.userAccessToken}`,
		'DPoP': dpopProof,
		'Accept': CONTENT_TYPE_JSON,
        'DPoP-Nonce': BSKY.data.dpopNonce
    }
    let fetchOptions					= {
        method: HTML_GET,
        headers: headers
    }
	if (DEBUG) console.debug( PREFIX + "headers:", COMMON.prettyJson( headers ) );
	if (DEBUG) console.debug( PREFIX + "fetchOptions:", COMMON.prettyJson( fetchOptions ) );

    // Finally, perform the call
    // ------------------------------------------
 	if (DEBUG) console.debug( PREFIX + "Invoking URL:", url );
 	let responseFromServer				= await APICall.makeAPICall( STEP_NAME, url, fetchOptions );
	if (DEBUG) console.debug( PREFIX + "Received responseFromServer:", COMMON.prettyJson( responseFromServer ) );
	// Here, we gather the "access_token" item in the received json.
	let userData						= responseFromServer.body;

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
	return userData;
}

// Atomic function to retrieve who are the user muting
export async function retrieveTrendingTopics(cursor) {
	const STEP_NAME						= "retrieveTrendingTopics";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userHandle " + BSKY.user.userHandle + "]" );

	// Prepare the URL..
	let endpoint						= API.bluesky.XRPC.api.pds.getTrendingTopics;
 	if (DEBUG) console.debug( PREFIX + "Requesting the Bluesky Trending Topics... Invoking endpoint:", endpoint );

	// The URL is protected, so... PDS Server
	let root							= BSKY.auth.userPDSURL + "/xrpc";
	let url								= root + endpoint;
	url									+= "?viewer=" + encodeURIComponent( BSKY.user.userDid );
	url									+= "&limit=25";
	if ( !COMMON.isNullOrEmpty(cursor) ) {
		url								+= "&cursor=" + cursor;
	}
	if (DEBUG) console.debug(PREFIX + "Fetching data from the URL:", url);

    // Create the DPoP-Proof 'body' for this request.
    // ------------------------------------------
	let dpopRequest						= new TYPES.DPoPRequest(BSKY.data.cryptoKey.privateKey, BSKY.data.jwk, APP_CLIENT_ID, BSKY.data.userAccessToken, BSKY.data.accessTokenHash, url, BSKY.data.dpopNonce, HTML_GET);
	let dpopProof						= await DPOP.createDPoPProof(dpopRequest)
	if (DEBUG) console.debug( PREFIX + "Received dpopProof:", JWT.jwtToPrettyJSON( dpopProof ) );

    // TuneUp the call
    // ------------------------------------------
    let headers							= {
		'Authorization': `DPoP ${BSKY.data.userAccessToken}`,
		'DPoP': dpopProof,
		'Accept': CONTENT_TYPE_JSON,
        'DPoP-Nonce': BSKY.data.dpopNonce
    }
    let fetchOptions					= {
        method: HTML_GET,
        headers: headers
    }
	if (DEBUG) console.debug( PREFIX + "headers:", COMMON.prettyJson( headers ) );
	if (DEBUG) console.debug( PREFIX + "fetchOptions:", COMMON.prettyJson( fetchOptions ) );

    // Finally, perform the call
    // ------------------------------------------
 	if (DEBUG) console.debug( PREFIX + "Invoking URL:", url );
 	let responseFromServer				= await APICall.makeAPICall( STEP_NAME, url, fetchOptions );
	if (DEBUG) console.debug( PREFIX + "Received responseFromServer:", COMMON.prettyJson( responseFromServer ) );
	// Here, we gather the "access_token" item in the received json.
	let userData						= responseFromServer.body;

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
	return userData;
}

