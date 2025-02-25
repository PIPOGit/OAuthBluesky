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
import * as CRYPT						from "./OAuth2/Crypt.js";
// Common DPOP functions
import * as DPOP						from "./OAuth2/dpopProof.js";
// Common JWT functions
import * as JWT							from "./OAuth2/JWT.js";


/**********************************************************
 * Module Constants
 **********************************************************/
// Module SELF constants
const MODULE_NAME						= COMMON.getModuleName( import.meta.url );

// Inner constants
const API								= CONFIGURATION.api;
const LSKEYS							= CONFIGURATION.localStorageKeys;
const CLIENT_APP						= CONFIGURATION.clientApp;

// HTML methods
const HTML_GET							= "GET";
const HTML_POST							= "POST";

// Bluesky constants
const APP_CLIENT_ID						= CLIENT_APP.client_id;
const MAX_NOTIS_TO_RETRIEVE				= 50;


/**********************************************************
 * Module Variables
 **********************************************************/


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
export async function tryAndCatch( currentStep, callbackFunction, callbackOptions=null, show=true ) {
	const STEP_NAME						= "tryAndCatch";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_RETRY					= `${PREFIX}[RETRY] `;
	if (show && window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `Step: ${currentStep}` );

	// Clear and hide error fields and panel
	HTML.clearHTMLError();

	let apiCallResponse					= null;
	try {
		// Let's retrieve first if there are unread user's notifications.
		// ------------------------------------------
		apiCallResponse					= await callbackFunction(callbackOptions);
		if (show && window.BSKY.DEBUG) console.debug( PREFIX + "Current apiCallResponse:", apiCallResponse );

		// Clear and hide error fields and panel
		HTML.clearHTMLError();
	} catch (error) {
		if (show && window.BSKY.GROUP_DEBUG) console.groupEnd();
		
		// Check if it's a "controlled error".
		if ( error.hasOwnProperty("step") ) {
			// Check if the error is due to a different dpop-nonce in step 12...
			let sameSteps				= ( error?.step ) ? COMMON.areEquals(error.step, currentStep) : false;
			let distinctDPoPNonce		= !COMMON.areEquals(BSKY.data.dpopNonceUsed, BSKY.data.dpopNonceReceived);
			// Puede venir también un: "{"error":"InternalServerError","message":"Internal Server Error"}"
			let serverError				= ( error?.json?.message ) ? COMMON.areEquals(error.json.message, "Internal Server Error") : false;

			if ( sameSteps && distinctDPoPNonce) {
				// Show the error and update the HTML fields
				HTML.updateHTMLError(error, false);

				if (show && window.BSKY.DEBUG) console.debug( PREFIX + "Let's retry..." );
				if (show && window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_RETRY );
				try {
					apiCallResponse			= await callbackFunction(callbackOptions);
					if (show && window.BSKY.DEBUG) console.debug( PREFIX_RETRY + "Current apiCallResponse:", apiCallResponse );

					// Clear and hide error fields and panel
					HTML.clearHTMLError();
				} catch (error) {
					if (show && window.BSKY.GROUP_DEBUG) console.groupEnd();

					// TODO: Si el error es de expiración del token [401]
					// vendrá algo así: {"error":"invalid_token","message":"\"exp\" claim timestamp check failed"}
					if (   ( error.status==401 )									// authentication error
						&& ( error.isJson )											// json format
						&& ( COMMON.areEquals( error.json.error, 'invalid_token' ) ) ) {	// 'invalid token'
						// Redirigir a "logout".
						if (show && window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
						if (show && window.BSKY.GROUP_DEBUG) console.groupEnd();
						await fnLogout();
					} else if ( ( error.status==502 )								// Internal Server Error {error: 'InternalServerError', message: 'Internal Server Error'}
						&& ( error.isJson )											// json format
						&& ( COMMON.areEquals( error.json.error, 'InternalServerError' ) ) ) {	// 'invalid token'
						// Do nothing
						if (show && window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
						if (show && window.BSKY.GROUP_DEBUG) console.groupEnd();
					} else if ( ( error.status==400 )								// BAD Response {error: 'InternalServerError', message: 'Internal Server Error'}
						&& ( error.isJson ) ) {										// json format
						// Save the info in the "getProfiles " response.
						apiCallResponse			= new TYPES.APICallResponseError(
							error,
							currentStep,
							callbackOptions,
							sameSteps,
							currentStep,
							distinctDPoPNonce,
							serverError
						);
						if (show && window.BSKY.DEBUG) console.debug( PREFIX_RETRY + "New apiCallResponse:", apiCallResponse );
						if (show && window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
						if (show && window.BSKY.GROUP_DEBUG) console.groupEnd();
					} else {
						// Show the error and update the HTML fields
						if (show && window.BSKY.DEBUG) console.debug( PREFIX + "Not an 'invalid token' error." );
						HTML.updateHTMLError(error);
						throw( error );
					}
				}
				if (show && window.BSKY.GROUP_DEBUG) console.groupEnd();
			} else {
				if (show && window.BSKY.DEBUG) console.debug( PREFIX_RETRY + `[sameSteps=${sameSteps}]` );
				if (show && window.BSKY.DEBUG) console.debug( PREFIX_RETRY + `+ [error.step]`, error.step );
				if (show && window.BSKY.DEBUG) console.debug( PREFIX_RETRY + `+ [currentStep]`, currentStep );
				if (show && window.BSKY.DEBUG) console.debug( PREFIX_RETRY + `[distinctDPoPNonce=${distinctDPoPNonce}]` );
				if (show && window.BSKY.DEBUG) console.debug( PREFIX_RETRY + `+ [BSKY.data.dpopNonceUsed]`, BSKY.data.dpopNonceUsed );
				if (show && window.BSKY.DEBUG) console.debug( PREFIX_RETRY + `+ [BSKY.data.dpopNonceReceived]`, BSKY.data.dpopNonceReceived );
				if (show && window.BSKY.DEBUG) console.debug( PREFIX_RETRY + `[serverError=${serverError}]` );

				// Save the info in the "getProfiles " response.
				apiCallResponse			= new TYPES.APICallResponseError(
					error,
					currentStep,
					callbackOptions,
					sameSteps,
					currentStep,
					distinctDPoPNonce,
					serverError
				);
				if (show && window.BSKY.DEBUG) console.debug( PREFIX_RETRY + "New apiCallResponse:", apiCallResponse );

				// Show the error and update the HTML fields
				HTML.updateHTMLError(error);
				if (show && window.BSKY.GROUP_DEBUG) console.groupEnd();
			}
		} else {
			// Show the error and update the HTML fields
			HTML.updateHTMLError(error);
		}
	}

	if (show && window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (show && window.BSKY.GROUP_DEBUG) console.groupEnd();
	
	return apiCallResponse;
}

// Atomic function to logout the user
export async function performUserLogout() {
	const STEP_NAME						= "performUserLogout";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Now, the user's profile.
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Performing the user's Bluesky logout...` );
    let body							= `token=${BSKY.data.userAccessToken}`;
    let fetchOptions					= {
        method: HTML_POST,
        headers: {
			'Authorization': `DPoP ${BSKY.data.userAccessToken}`,
            'Content-Type': APICall.CONTENT_TYPE_FORM_ENCODED
        },
        body: body
    }
    let url								= BSKY.auth.userRevocationEndPoint;
	let response						= null;
	if ( !COMMON.isNullOrEmpty(url) ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Invoking URL:", url );
		if (window.BSKY.DEBUG) console.debug( PREFIX + "+ with this options:", COMMON.prettyJson( fetchOptions ) );

		response						= await APICall.makeAPICall( "fnLogout", url, fetchOptions );
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Received response:", COMMON.prettyJson( response ) );
	} else {
		if (window.BSKY.DEBUG) console.debug( PREFIX + "No BS logout URL detected!", url );
	}

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return response;
}

// Atomic function to retrieve the user access token
export async function retrieveUserAccessToken() {
	const STEP_NAME						= "retrieveUserAccessToken";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	
	let code							= BSKY.auth.callbackData.code;
	let redirectURL						= BSKY.auth.redirectURL;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + "[redirectURL=="+redirectURL+"] [code=="+code+"]" );
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received data:" );
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "+ code:", code );
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "+ redirectURL:", redirectURL );

	// Prepare the URL..
    let url								= BSKY.auth.userTokenEndPoint;
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Access Token URL:", url );

    // Retrieve the crypto key.
    // ------------------------------------------
	if (window.BSKY.DEBUG) console.debug( PREFIX + "cryptoKey:", COMMON.prettyJson( BSKY.data.cryptoKey ) );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "jwk:", COMMON.prettyJson( BSKY.data.jwk ) );

    // Create the DPoP-Proof 'body' for this request.
    // ------------------------------------------
	let dpopRequest						= new TYPES.DPoPRequest(BSKY.data.cryptoKey.privateKey, BSKY.data.jwk, APP_CLIENT_ID, null, null, url, BSKY.data.dpopNonce, HTML_POST);
	let dpopProof						= await DPOP.createDPoPProof(dpopRequest)
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received dpopProof:", JWT.jwtToPrettyJSON( dpopProof ) );

	// Preparamos los datos a enviar
	let body							= new URLSearchParams({
		// Fixed values
		'grant_type': 'authorization_code',
		// Variable values
		'code': code,
		'code_verifier': BSKY.auth.codeVerifier,
		// ClientAPP values
		'client_id': APP_CLIENT_ID,
		'redirect_uri': redirectURL
	});
	if (window.BSKY.DEBUG) console.debug(PREFIX + "Generated [body]:", COMMON.prettyJson( Object.fromEntries( body ) ));

    // TuneUp the call
    // ------------------------------------------
    let headers							= {
        'DPOP': dpopProof,
        'Content-Type': APICall.CONTENT_TYPE_FORM_ENCODED,
        'DPoP-Nonce': BSKY.data.dpopNonce
    }
    let fetchOptions					= {
        method: HTML_POST,
        headers: headers,
        body: body.toString()
    }
	if (window.BSKY.DEBUG) console.debug( PREFIX + "headers:", COMMON.prettyJson( headers ) );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "fetchOptions:", COMMON.prettyJson( fetchOptions ) );

    // Finally, perform the call
    // ------------------------------------------
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Invoking URL:", url );
 	let responseFromServer				= await APICall.makeAPICall( STEP_NAME, url, fetchOptions );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received responseFromServer:", COMMON.prettyJson( responseFromServer ) );
	// Here, we gather the "access_token" item in the received json.
	BSKY.data.userAuthentication		= responseFromServer.body;
	BSKY.data.userAccessToken			= BSKY.data.userAuthentication.access_token;
	BSKY.data.userRefreshToken			= BSKY.data.userAuthentication.refresh_token;

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return { userAuthentication: BSKY.data.userAuthentication, userAccessToken: BSKY.data.userAccessToken };
}

// Atomic function to refresh the user access token
export async function refreshAccessToken() {
	const STEP_NAME						= "refreshAccessToken";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_AFTER					= `${PREFIX}[After] `;
	const PREFIX_PREFETCH				= `${PREFIX}[PREFETCH] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userHandle=="+BSKY.user.userHandle+"]" );

 	if (window.BSKY.DEBUG) console.debug( PREFIX + `Refreshing the access token...` );
	let redirectURL						= BSKY.auth.redirectURL;

	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_PREFETCH );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Current redirectURL:", redirectURL );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Current userRefreshToken:", BSKY.data.userRefreshToken );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Current userAuthentication:", BSKY.data.userAuthentication );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Current userAccessToken:", JWT.jwtToPrettyJSON( BSKY.data.userAccessToken ) );

	// Prepare the URL..
    let url								= BSKY.auth.userTokenEndPoint;
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Access Token URL:", url );

    // Create the DPoP-Proof 'body' for this request.
    // ------------------------------------------
	let dpopRequest						= new TYPES.DPoPRequest(BSKY.data.cryptoKey.privateKey, BSKY.data.jwk, APP_CLIENT_ID, BSKY.data.userAccessToken, null, url, BSKY.data.dpopNonce, HTML_POST);
	let dpopProof						= await DPOP.createDPoPProof(dpopRequest);
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received dpopProof:", JWT.jwtToPrettyJSON( dpopProof ) );

	// Preparamos los datos a enviar
	let body							= new URLSearchParams({
		// Fixed values
		'grant_type': 'refresh_token',
		// ClientAPP values
		'client_id': APP_CLIENT_ID,
		'redirect_uri': redirectURL,
		// Variable values
		'refresh_token': BSKY.data.userRefreshToken
	});
	if (window.BSKY.DEBUG) console.debug(PREFIX + "Generated [body]:", COMMON.prettyJson( Object.fromEntries( body ) ));

    // TuneUp the call
    // ------------------------------------------
    let headers							= {
        'DPOP': dpopProof,
        'Content-Type': APICall.CONTENT_TYPE_FORM_ENCODED,
        'DPoP-Nonce': BSKY.data.dpopNonce
    }
    let fetchOptions					= {
        method: HTML_POST,
        headers: headers,
        body: body.toString()
    }
	if (window.BSKY.DEBUG) console.debug( PREFIX + "headers:", COMMON.prettyJson( headers ) );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "fetchOptions:", COMMON.prettyJson( fetchOptions ) );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();

    // Finally, perform the call
    // ------------------------------------------
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Invoking URL:", url );
 	let responseFromServer				= await APICall.makeAPICall( STEP_NAME, url, fetchOptions );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received responseFromServer:", COMMON.prettyJson( responseFromServer ) );

	// Let's group log messages
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_AFTER );

	BSKY.data.userAuthentication		= responseFromServer.body;
	BSKY.data.userAccessToken			= BSKY.data.userAuthentication.access_token;
	BSKY.data.userRefreshToken			= BSKY.data.userAuthentication.refresh_token;
	if (window.BSKY.DEBUG) console.debug(PREFIX_AFTER + "userAuthentication:", BSKY.data.userAuthentication);
	if (window.BSKY.DEBUG) console.debug(PREFIX_AFTER + "userAccessToken:", BSKY.data.userAccessToken);
	if (window.BSKY.DEBUG) console.debug(PREFIX_AFTER + "userRefreshToken:", BSKY.data.userRefreshToken);

	// Let's create also the access token HASH...
	BSKY.data.accessTokenHash			= await CRYPT.createHash(BSKY.data.userAccessToken, true);
	if (window.BSKY.DEBUG) console.debug(PREFIX_AFTER + "BSKY.data.accessTokenHash:", BSKY.data.accessTokenHash);
	if (window.BSKY.DEBUG) console.debug(PREFIX_AFTER + "BSKY.data.dpopNonce:", BSKY.data.dpopNonce);
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return { userAuthentication: BSKY.data.userAuthentication, userAccessToken: BSKY.data.userAccessToken };
}

// Atomic function to retrieve the user's unread notifications value
export async function retrieveUnreadNotifications(renderHTMLErrors=true) {
	const STEP_NAME						= "retrieveUnreadNotifications";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_PREFETCH				= `${PREFIX}[PREFETCH] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[renderHTMLErrors==${renderHTMLErrors}]` );

	let endpoint						= API.bluesky.XRPC.api.pds.getUnreadCount;
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Requesting if there are unread notifications... Invoking endpoint:", endpoint );

	// The URL is protected, so... PDS Server
	let root							= BSKY.auth.userPDSURL + "/xrpc";
	let url								= root + endpoint;
	if (window.BSKY.DEBUG) console.debug(PREFIX + "Fetching data from the URL:", url);

	// Let's group the following messages
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_PREFETCH );

    // Create the DPoP-Proof 'body' for this request.
	// We already have the cryptoKey somewhere, from previous calls...
    // ------------------------------------------
	let dpopRequest						= new TYPES.DPoPRequest(BSKY.data.cryptoKey.privateKey, BSKY.data.jwk, APP_CLIENT_ID, BSKY.data.userAccessToken, BSKY.data.accessTokenHash, url, BSKY.data.dpopNonce, HTML_GET);
	let dpopProof						= await DPOP.createDPoPProof(dpopRequest)
	if (window.BSKY.DEBUG) console.debug( PREFIX_PREFETCH + "Received dpopProof:", JWT.jwtToPrettyJSON( dpopProof ) );

    // TuneUp the call
    // ------------------------------------------
    let headers							= {
		'Authorization': `DPoP ${BSKY.data.userAccessToken}`,
		'DPoP': dpopProof,
		'Accept': APICall.CONTENT_TYPE_JSON,
        'DPoP-Nonce': BSKY.data.dpopNonce
    }
    let fetchOptions					= {
        method: HTML_GET,
        headers: headers
    }
	if (window.BSKY.DEBUG) console.debug( PREFIX_PREFETCH + "headers:", COMMON.prettyJson( headers ) );
	if (window.BSKY.DEBUG) console.debug( PREFIX_PREFETCH + "fetchOptions:", COMMON.prettyJson( fetchOptions ) );

	if (window.BSKY.GROUP_DEBUG) console.groupEnd();

    // Finally, perform the call
    // ------------------------------------------
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Invoking URL:", url );
 	let responseFromServer				= await APICall.makeAPICall( STEP_NAME, url, fetchOptions, renderHTMLErrors );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received responseFromServer:", COMMON.prettyJson( responseFromServer ) );
	// Here, we gather the "access_token" item in the received json.

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return responseFromServer.body.count;
}

// Atomic function to retrieve the user's notifications
export async function retrieveNotifications(renderHTMLErrors=true) {
	const STEP_NAME						= "retrieveNotifications";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_PREFETCH				= `${PREFIX}[PREFETCH] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[renderHTMLErrors==${renderHTMLErrors}] [MAX ${MAX_NOTIS_TO_RETRIEVE} notifications to retrieve]` );

	let endpoint						= API.bluesky.XRPC.api.pds.listNotifications;
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Requesting the unread notifications... Invoking endpoint:", endpoint );

	// The URL is protected, so... PDS Server
	let root							= BSKY.auth.userPDSURL + "/xrpc";
	let url								= root + endpoint + "?limit=" + MAX_NOTIS_TO_RETRIEVE;		// Not much; it's a test!
	if (window.BSKY.DEBUG) console.debug(PREFIX + "Fetching data from the URL:", url);

	// Let's group the following messages
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_PREFETCH );

    // Create the DPoP-Proof 'body' for this request.
	// We already have the cryptoKey somewhere, from previous calls...
    // ------------------------------------------
	let dpopRequest						= new TYPES.DPoPRequest(BSKY.data.cryptoKey.privateKey, BSKY.data.jwk, APP_CLIENT_ID, BSKY.data.userAccessToken, BSKY.data.accessTokenHash, url, BSKY.data.dpopNonce, HTML_GET);
	let dpopProof						= await DPOP.createDPoPProof(dpopRequest)
	if (window.BSKY.DEBUG) console.debug( PREFIX_PREFETCH + "Received dpopProof:", JWT.jwtToPrettyJSON( dpopProof ) );

    // TuneUp the call
    // ------------------------------------------
    let headers							= {
		'Authorization': `DPoP ${BSKY.data.userAccessToken}`,
		'DPoP': dpopProof,
		'Accept': APICall.CONTENT_TYPE_JSON,
        'DPoP-Nonce': BSKY.data.dpopNonce
    }
    let fetchOptions					= {
        method: HTML_GET,
        headers: headers
    }
	if (window.BSKY.DEBUG) console.debug( PREFIX_PREFETCH + "headers:", COMMON.prettyJson( headers ) );
	if (window.BSKY.DEBUG) console.debug( PREFIX_PREFETCH + "fetchOptions:", COMMON.prettyJson( fetchOptions ) );

	if (window.BSKY.GROUP_DEBUG) console.groupEnd();

    // Finally, perform the call
    // ------------------------------------------
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Invoking URL:", url );
 	let responseFromServer				= await APICall.makeAPICall( STEP_NAME, url, fetchOptions, renderHTMLErrors );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received responseFromServer:", COMMON.prettyJson( responseFromServer ) );
	// Here, we gather the "access_token" item in the received json.

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return responseFromServer.body.notifications;
}

// Atomic function to retrieve the user's profile
export async function retrieveUserProfile( userProfile ) {
	const STEP_NAME						= "retrieveUserProfile";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userHandle " + userProfile + "]" );

	// Prepare the URL..
	let endpoint						= API.bluesky.XRPC.api.public.getProfile;
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Requesting the user's profile... Invoking endpoint:", endpoint );

	// The URL is OPEN, so... Public Server
	let root							= API.bluesky.XRPC.public;
	let url								= root + endpoint + "?actor=" + userProfile;
	if (window.BSKY.DEBUG) console.debug(PREFIX + "Fetching data from the URL:", url);

    // Create the DPoP-Proof 'body' for this request.
    // ------------------------------------------
	let dpopRequest						= new TYPES.DPoPRequest(BSKY.data.cryptoKey.privateKey, BSKY.data.jwk, APP_CLIENT_ID, BSKY.data.userAccessToken, BSKY.data.accessTokenHash, url, BSKY.data.dpopNonce, HTML_GET);
	let dpopProof						= await DPOP.createDPoPProof(dpopRequest)
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received dpopProof:", JWT.jwtToPrettyJSON( dpopProof ) );

    // TuneUp the call
    // ------------------------------------------
    let headers							= {
		'Authorization': `DPoP ${BSKY.data.userAccessToken}`,
		'DPoP': dpopProof,
		'Accept': APICall.CONTENT_TYPE_JSON,
        'DPoP-Nonce': BSKY.data.dpopNonce
    }
    let fetchOptions					= {
        method: HTML_GET,
        headers: headers
    }
	if (window.BSKY.DEBUG) console.debug( PREFIX + "headers:", COMMON.prettyJson( headers ) );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "fetchOptions:", COMMON.prettyJson( fetchOptions ) );

    // Finally, perform the call
    // ------------------------------------------
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Invoking URL:", url );
 	let responseFromServer				= await APICall.makeAPICall( STEP_NAME, url, fetchOptions );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received responseFromServer:", COMMON.prettyJson( responseFromServer ) );
	// Here, we gather the "access_token" item in the received json.
	let profile							= responseFromServer.body;

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return profile;
}

// Atomic function to retrieve the user's profile
export async function retrieveUserProfileFromPDS( userProfile ) {
	const STEP_NAME						= "retrieveUserProfileFromPDS";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userHandle " + userProfile + "]" );

	// Prepare the URL..
	let endpoint						= API.bluesky.XRPC.api.public.getProfile;
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Requesting the user's profile... Invoking endpoint:", endpoint );

	// The URL is PDS, so... PDS Server
	let root							= BSKY.auth.userPDSURL + "/xrpc";
	let url								= root + endpoint + "?actor=" + userProfile;
	if (window.BSKY.DEBUG) console.debug(PREFIX + "Fetching data from the URL:", url);

    // Create the DPoP-Proof 'body' for this request.
    // ------------------------------------------
	let dpopRequest						= new TYPES.DPoPRequest(BSKY.data.cryptoKey.privateKey, BSKY.data.jwk, APP_CLIENT_ID, BSKY.data.userAccessToken, BSKY.data.accessTokenHash, url, BSKY.data.dpopNonce, HTML_GET);
	let dpopProof						= await DPOP.createDPoPProof(dpopRequest)
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received dpopProof:", JWT.jwtToPrettyJSON( dpopProof ) );

    // TuneUp the call
    // ------------------------------------------
    let headers							= {
		'Authorization': `DPoP ${BSKY.data.userAccessToken}`,
		'DPoP': dpopProof,
		'Accept': APICall.CONTENT_TYPE_JSON,
        'DPoP-Nonce': BSKY.data.dpopNonce
    }
    let fetchOptions					= {
        method: HTML_GET,
        headers: headers
    }
	if (window.BSKY.DEBUG) console.debug( PREFIX + "headers:", COMMON.prettyJson( headers ) );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "fetchOptions:", COMMON.prettyJson( fetchOptions ) );

    // Finally, perform the call
    // ------------------------------------------
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Invoking URL:", url );
 	let responseFromServer				= await APICall.makeAPICall( STEP_NAME, url, fetchOptions );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received responseFromServer:", COMMON.prettyJson( responseFromServer ) );
	// Here, we gather the "access_token" item in the received json.
	let profile							= responseFromServer.body;

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return profile;
}

// Atomic function to retrieve who the user follows
export async function retrieveUserFollows(cursor) {
	const STEP_NAME						= "retrieveUserFollows";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userHandle " + BSKY.user.userHandle + "]" );

	// Prepare the URL..
	let endpoint						= API.bluesky.XRPC.api.public.getFollows;
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Requesting who the user is following... Invoking endpoint:", endpoint );

	// The URL is OPEN, so... Public Server
	let root							= API.bluesky.XRPC.public;
	let url								= root + endpoint;
	url									+= "?actor=" + BSKY.user.userHandle;
	url									+= "&limit=100";
	if ( !COMMON.isNullOrEmpty(cursor) ) {
		url								+= "&cursor=" + cursor;
	}
	if (window.BSKY.DEBUG) console.debug(PREFIX + "Fetching data from the URL:", url);

    // Create the DPoP-Proof 'body' for this request.
    // ------------------------------------------
	let dpopRequest						= new TYPES.DPoPRequest(BSKY.data.cryptoKey.privateKey, BSKY.data.jwk, APP_CLIENT_ID, BSKY.data.userAccessToken, BSKY.data.accessTokenHash, url, BSKY.data.dpopNonce, HTML_GET);
	let dpopProof						= await DPOP.createDPoPProof(dpopRequest)
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received dpopProof:", JWT.jwtToPrettyJSON( dpopProof ) );

    // TuneUp the call
    // ------------------------------------------
    let headers							= {
		'Authorization': `DPoP ${BSKY.data.userAccessToken}`,
		'DPoP': dpopProof,
		'Accept': APICall.CONTENT_TYPE_JSON,
        'DPoP-Nonce': BSKY.data.dpopNonce
    }
    let fetchOptions					= {
        method: HTML_GET,
        headers: headers
    }
	if (window.BSKY.DEBUG) console.debug( PREFIX + "headers:", COMMON.prettyJson( headers ) );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "fetchOptions:", COMMON.prettyJson( fetchOptions ) );

    // Finally, perform the call
    // ------------------------------------------
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Invoking URL:", url );
 	let responseFromServer				= await APICall.makeAPICall( STEP_NAME, url, fetchOptions );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received responseFromServer:", COMMON.prettyJson( responseFromServer ) );
	// Here, we gather the "access_token" item in the received json.
	let userData						= responseFromServer.body;

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return userData;
}

// Atomic function to retrieve who (from the PDS) the user follows
export async function retrieveRepoListRecords( data ) {
	const STEP_NAME						= "retrieveRepoListRecords";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[userHandle ${BSKY.user.userHandle}] [nsid=${data.nsid}]` );

	// Prepare the URL..
	let endpoint						= API.bluesky.XRPC.api.pds.listRecords;
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Requesting who the user is following... Invoking endpoint:", endpoint );

	// The URL is PDS, so... PDS Server
	let root							= BSKY.auth.userPDSURL + "/xrpc";
	let url								= root + endpoint;
	url									+= "?repo=" + encodeURIComponent( BSKY.user.userDid );
	if ( data.nsid && !COMMON.isNullOrEmpty(data.nsid) ) {
		url								+= "&collection=" + data.nsid;
	} else {
		url								+= "&collection=app.bsky.graph.follow";
	}
	url									+= "&limit=100";
	if ( data.cursor && !COMMON.isNullOrEmpty(data.cursor) ) {
		url								+= "&cursor=" + data.cursor;
	}
	if (window.BSKY.DEBUG) console.debug(PREFIX + "Fetching data from the URL:", url);

    // Create the DPoP-Proof 'body' for this request.
    // ------------------------------------------
	let dpopRequest						= new TYPES.DPoPRequest(BSKY.data.cryptoKey.privateKey, BSKY.data.jwk, APP_CLIENT_ID, BSKY.data.userAccessToken, BSKY.data.accessTokenHash, url, BSKY.data.dpopNonce, HTML_GET);
	let dpopProof						= await DPOP.createDPoPProof(dpopRequest)
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received dpopProof:", JWT.jwtToPrettyJSON( dpopProof ) );

    // TuneUp the call
    // ------------------------------------------
    let headers							= {
		'Authorization': `DPoP ${BSKY.data.userAccessToken}`,
		'DPoP': dpopProof,
		'Accept': APICall.CONTENT_TYPE_JSON,
        'DPoP-Nonce': BSKY.data.dpopNonce
    }
    let fetchOptions					= {
        method: HTML_GET,
        headers: headers
    }
	if (window.BSKY.DEBUG) console.debug( PREFIX + "headers:", COMMON.prettyJson( headers ) );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "fetchOptions:", COMMON.prettyJson( fetchOptions ) );

    // Finally, perform the call
    // ------------------------------------------
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Invoking URL:", url );
 	let responseFromServer				= await APICall.makeAPICall( STEP_NAME, url, fetchOptions );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received responseFromServer:", COMMON.prettyJson( responseFromServer ) );
	// Here, we gather the "access_token" item in the received json.
	let userData						= responseFromServer.body;

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return userData;
}

// Atomic function to retrieve who the user follows
export async function retrieveRepoBlockOfRecords(queryString) {
	const STEP_NAME						= "retrieveRepoBlockOfRecords";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Prepare the URL..
	let endpoint						= API.bluesky.XRPC.api.public.getProfiles;
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Requesting a block of 25 profiles... Invoking endpoint:", endpoint );

	// The URL is PDS, so... PDS Server
	let root							= BSKY.auth.userPDSURL + "/xrpc";
	let url								= root + endpoint;
	url									+= queryString;
	if (window.BSKY.DEBUG) console.debug(PREFIX + "Fetching data from the URL:", url);

    // Create the DPoP-Proof 'body' for this request.
    // ------------------------------------------
	let dpopRequest						= new TYPES.DPoPRequest(BSKY.data.cryptoKey.privateKey, BSKY.data.jwk, APP_CLIENT_ID, BSKY.data.userAccessToken, BSKY.data.accessTokenHash, url, BSKY.data.dpopNonce, HTML_GET);
	let dpopProof						= await DPOP.createDPoPProof(dpopRequest)
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received dpopProof:", JWT.jwtToPrettyJSON( dpopProof ) );

    // TuneUp the call
    // ------------------------------------------
    let headers							= {
		'Authorization': `DPoP ${BSKY.data.userAccessToken}`,
		'DPoP': dpopProof,
		'Accept': APICall.CONTENT_TYPE_JSON,
        'DPoP-Nonce': BSKY.data.dpopNonce
    }
    let fetchOptions					= {
        method: HTML_GET,
        headers: headers
    }
	if (window.BSKY.DEBUG) console.debug( PREFIX + "headers:", COMMON.prettyJson( headers ) );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "fetchOptions:", COMMON.prettyJson( fetchOptions ) );

    // Finally, perform the call
    // ------------------------------------------
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Invoking URL:", url );
 	let responseFromServer				= await APICall.makeAPICall( STEP_NAME, url, fetchOptions );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received responseFromServer:", COMMON.prettyJson( responseFromServer ) );
	// Here, we gather the "access_token" item in the received json.
	let userData						= responseFromServer.body;

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return userData;
}

// Atomic function to retrieve who are the user followers
export async function retrieveUserFollowers(cursor) {
	const STEP_NAME						= "retrieveUserFollowers";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userHandle " + BSKY.user.userHandle + "]" );

	// Prepare the URL..
	let endpoint						= API.bluesky.XRPC.api.public.getFollowers;
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Requesting who are the user's followers... Invoking endpoint:", endpoint );

	// The URL is OPEN, so... Public Server
	// let root							= API.bluesky.XRPC.public;

	// The URL is PDS, so... PDS Server
	let root							= BSKY.auth.userPDSURL + "/xrpc";
	let url								= root + endpoint;
	url									+= "?actor=" + BSKY.user.userHandle;
	url									+= "&limit=100";
	if ( !COMMON.isNullOrEmpty(cursor) ) {
		url								+= "&cursor=" + cursor;
	}
	if (window.BSKY.DEBUG) console.debug(PREFIX + "Fetching data from the URL:", url);

    // Create the DPoP-Proof 'body' for this request.
    // ------------------------------------------
	let dpopRequest						= new TYPES.DPoPRequest(BSKY.data.cryptoKey.privateKey, BSKY.data.jwk, APP_CLIENT_ID, BSKY.data.userAccessToken, BSKY.data.accessTokenHash, url, BSKY.data.dpopNonce, HTML_GET);
	let dpopProof						= await DPOP.createDPoPProof(dpopRequest)
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received dpopProof:", JWT.jwtToPrettyJSON( dpopProof ) );

    // TuneUp the call
    // ------------------------------------------
    let headers							= {
		'Authorization': `DPoP ${BSKY.data.userAccessToken}`,
		'DPoP': dpopProof,
		'Accept': APICall.CONTENT_TYPE_JSON,
        'DPoP-Nonce': BSKY.data.dpopNonce
    }
    let fetchOptions					= {
        method: HTML_GET,
        headers: headers
    }
	if (window.BSKY.DEBUG) console.debug( PREFIX + "headers:", COMMON.prettyJson( headers ) );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "fetchOptions:", COMMON.prettyJson( fetchOptions ) );

    // Finally, perform the call
    // ------------------------------------------
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Invoking URL:", url );
 	let responseFromServer				= await APICall.makeAPICall( STEP_NAME, url, fetchOptions );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received responseFromServer:", COMMON.prettyJson( responseFromServer ) );
	// Here, we gather the "access_token" item in the received json.
	let userData						= responseFromServer.body;

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return userData;
}

// Atomic function to retrieve who are the user blocking
export async function retrieveUserBlocks(cursor) {
	const STEP_NAME						= "retrieveUserBlocks";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userHandle " + BSKY.user.userHandle + "]" );

	// Prepare the URL..
	let endpoint						= API.bluesky.XRPC.api.pds.getBlocks;
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Requesting who the user is blocking... Invoking endpoint:", endpoint );

	// The URL is protected, so... PDS Server
	let root							= BSKY.auth.userPDSURL + "/xrpc";
	let url								= root + endpoint;
	url									+= "?limit=100";
	if ( !COMMON.isNullOrEmpty(cursor) ) {
		url								+= "&cursor=" + cursor;
	}
	if (window.BSKY.DEBUG) console.debug(PREFIX + "Fetching data from the URL:", url);

    // Create the DPoP-Proof 'body' for this request.
    // ------------------------------------------
	let dpopRequest						= new TYPES.DPoPRequest(BSKY.data.cryptoKey.privateKey, BSKY.data.jwk, APP_CLIENT_ID, BSKY.data.userAccessToken, BSKY.data.accessTokenHash, url, BSKY.data.dpopNonce, HTML_GET);
	let dpopProof						= await DPOP.createDPoPProof(dpopRequest)
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received dpopProof:", JWT.jwtToPrettyJSON( dpopProof ) );

    // TuneUp the call
    // ------------------------------------------
    let headers							= {
		'Authorization': `DPoP ${BSKY.data.userAccessToken}`,
		'DPoP': dpopProof,
		'Accept': APICall.CONTENT_TYPE_JSON,
        'DPoP-Nonce': BSKY.data.dpopNonce
    }
    let fetchOptions					= {
        method: HTML_GET,
        headers: headers
    }
	if (window.BSKY.DEBUG) console.debug( PREFIX + "headers:", COMMON.prettyJson( headers ) );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "fetchOptions:", COMMON.prettyJson( fetchOptions ) );

    // Finally, perform the call
    // ------------------------------------------
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Invoking URL:", url );
 	let responseFromServer				= await APICall.makeAPICall( STEP_NAME, url, fetchOptions );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received responseFromServer:", COMMON.prettyJson( responseFromServer ) );
	// Here, we gather the "access_token" item in the received json.
	let userData						= responseFromServer.body;

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return userData;
}

// Atomic function to retrieve who are the user muting
export async function retrieveUserMutes(cursor) {
	const STEP_NAME						= "retrieveUserMutes";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userHandle " + BSKY.user.userHandle + "]" );

	// Prepare the URL..
	let endpoint						= API.bluesky.XRPC.api.pds.getMutes;
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Requesting who the user is muting... Invoking endpoint:", endpoint );

	// The URL is protected, so... PDS Server
	let root							= BSKY.auth.userPDSURL + "/xrpc";
	let url								= root + endpoint;
	url									+= "?limit=100";
	if ( !COMMON.isNullOrEmpty(cursor) ) {
		url								+= "&cursor=" + cursor;
	}
	if (window.BSKY.DEBUG) console.debug(PREFIX + "Fetching data from the URL:", url);

    // Create the DPoP-Proof 'body' for this request.
    // ------------------------------------------
	let dpopRequest						= new TYPES.DPoPRequest(BSKY.data.cryptoKey.privateKey, BSKY.data.jwk, APP_CLIENT_ID, BSKY.data.userAccessToken, BSKY.data.accessTokenHash, url, BSKY.data.dpopNonce, HTML_GET);
	let dpopProof						= await DPOP.createDPoPProof(dpopRequest)
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received dpopProof:", JWT.jwtToPrettyJSON( dpopProof ) );

    // TuneUp the call
    // ------------------------------------------
    let headers							= {
		'Authorization': `DPoP ${BSKY.data.userAccessToken}`,
		'DPoP': dpopProof,
		'Accept': APICall.CONTENT_TYPE_JSON,
        'DPoP-Nonce': BSKY.data.dpopNonce
    }
    let fetchOptions					= {
        method: HTML_GET,
        headers: headers
    }
	if (window.BSKY.DEBUG) console.debug( PREFIX + "headers:", COMMON.prettyJson( headers ) );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "fetchOptions:", COMMON.prettyJson( fetchOptions ) );

    // Finally, perform the call
    // ------------------------------------------
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Invoking URL:", url );
 	let responseFromServer				= await APICall.makeAPICall( STEP_NAME, url, fetchOptions );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received responseFromServer:", COMMON.prettyJson( responseFromServer ) );
	// Here, we gather the "access_token" item in the received json.
	let userData						= responseFromServer.body;

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return userData;
}

// Atomic function to retrieve who are the user muting
export async function retrieveUserLists(cursor) {
	const STEP_NAME						= "retrieveUserLists";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userHandle " + BSKY.user.userHandle + "]" );

	// Prepare the URL..
	let endpoint						= API.bluesky.XRPC.api.pds.getLists;
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Requesting the user's lists... Invoking endpoint:", endpoint );

	// The URL is protected, so... PDS Server
	let root							= BSKY.auth.userPDSURL + "/xrpc";
	let url								= root + endpoint;
	url									+= "?actor=" + BSKY.user.userHandle;
	url									+= "&limit=100";
	if ( !COMMON.isNullOrEmpty(cursor) ) {
		url								+= "&cursor=" + cursor;
	}
	if (window.BSKY.DEBUG) console.debug(PREFIX + "Fetching data from the URL:", url);

    // Create the DPoP-Proof 'body' for this request.
    // ------------------------------------------
	let dpopRequest						= new TYPES.DPoPRequest(BSKY.data.cryptoKey.privateKey, BSKY.data.jwk, APP_CLIENT_ID, BSKY.data.userAccessToken, BSKY.data.accessTokenHash, url, BSKY.data.dpopNonce, HTML_GET);
	let dpopProof						= await DPOP.createDPoPProof(dpopRequest)
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received dpopProof:", JWT.jwtToPrettyJSON( dpopProof ) );

    // TuneUp the call
    // ------------------------------------------
    let headers							= {
		'Authorization': `DPoP ${BSKY.data.userAccessToken}`,
		'DPoP': dpopProof,
		'Accept': APICall.CONTENT_TYPE_JSON,
        'DPoP-Nonce': BSKY.data.dpopNonce
    }
    let fetchOptions					= {
        method: HTML_GET,
        headers: headers
    }
	if (window.BSKY.DEBUG) console.debug( PREFIX + "headers:", COMMON.prettyJson( headers ) );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "fetchOptions:", COMMON.prettyJson( fetchOptions ) );

    // Finally, perform the call
    // ------------------------------------------
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Invoking URL:", url );
 	let responseFromServer				= await APICall.makeAPICall( STEP_NAME, url, fetchOptions );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received responseFromServer:", COMMON.prettyJson( responseFromServer ) );
	// Here, we gather the "access_token" item in the received json.
	let userData						= responseFromServer.body;

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return userData;
}

// Atomic function to retrieve who are the user muting
export async function retrieveUserMutingModerationLists(cursor) {
	const STEP_NAME						= "retrieveUserMutingModerationLists";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userHandle " + BSKY.user.userHandle + "]" );

	// Prepare the URL..
	let endpoint						= API.bluesky.XRPC.api.pds.getListMutes;
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Requesting the user's lists... Invoking endpoint:", endpoint );

	// The URL is protected, so... PDS Server
	let root							= BSKY.auth.userPDSURL + "/xrpc";
	let url								= root + endpoint;
	url									+= "?actor=" + BSKY.user.userHandle;
	url									+= "&limit=100";
	if ( !COMMON.isNullOrEmpty(cursor) ) {
		url								+= "&cursor=" + cursor;
	}
	if (window.BSKY.DEBUG) console.debug(PREFIX + "Fetching data from the URL:", url);

    // Create the DPoP-Proof 'body' for this request.
    // ------------------------------------------
	let dpopRequest						= new TYPES.DPoPRequest(BSKY.data.cryptoKey.privateKey, BSKY.data.jwk, APP_CLIENT_ID, BSKY.data.userAccessToken, BSKY.data.accessTokenHash, url, BSKY.data.dpopNonce, HTML_GET);
	let dpopProof						= await DPOP.createDPoPProof(dpopRequest)
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received dpopProof:", JWT.jwtToPrettyJSON( dpopProof ) );

    // TuneUp the call
    // ------------------------------------------
    let headers							= {
		'Authorization': `DPoP ${BSKY.data.userAccessToken}`,
		'DPoP': dpopProof,
		'Accept': APICall.CONTENT_TYPE_JSON,
        'DPoP-Nonce': BSKY.data.dpopNonce
    }
    let fetchOptions					= {
        method: HTML_GET,
        headers: headers
    }
	if (window.BSKY.DEBUG) console.debug( PREFIX + "headers:", COMMON.prettyJson( headers ) );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "fetchOptions:", COMMON.prettyJson( fetchOptions ) );

    // Finally, perform the call
    // ------------------------------------------
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Invoking URL:", url );
 	let responseFromServer				= await APICall.makeAPICall( STEP_NAME, url, fetchOptions );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received responseFromServer:", COMMON.prettyJson( responseFromServer ) );
	// Here, we gather the "access_token" item in the received json.
	let userData						= responseFromServer.body;

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return userData;
}

// Atomic function to retrieve who are the user muting
export async function retrieveUserBlockingModerationLists(cursor) {
	const STEP_NAME						= "retrieveUserBlockingModerationLists";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userHandle " + BSKY.user.userHandle + "]" );

	// Prepare the URL..
	let endpoint						= API.bluesky.XRPC.api.pds.getListBlocks;
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Requesting the user's lists... Invoking endpoint:", endpoint );

	// The URL is protected, so... PDS Server
	let root							= BSKY.auth.userPDSURL + "/xrpc";
	let url								= root + endpoint;
	url									+= "?actor=" + BSKY.user.userHandle;
	url									+= "&limit=100";
	if ( !COMMON.isNullOrEmpty(cursor) ) {
		url								+= "&cursor=" + cursor;
	}
	if (window.BSKY.DEBUG) console.debug(PREFIX + "Fetching data from the URL:", url);

    // Create the DPoP-Proof 'body' for this request.
    // ------------------------------------------
	let dpopRequest						= new TYPES.DPoPRequest(BSKY.data.cryptoKey.privateKey, BSKY.data.jwk, APP_CLIENT_ID, BSKY.data.userAccessToken, BSKY.data.accessTokenHash, url, BSKY.data.dpopNonce, HTML_GET);
	let dpopProof						= await DPOP.createDPoPProof(dpopRequest)
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received dpopProof:", JWT.jwtToPrettyJSON( dpopProof ) );

    // TuneUp the call
    // ------------------------------------------
    let headers							= {
		'Authorization': `DPoP ${BSKY.data.userAccessToken}`,
		'DPoP': dpopProof,
		'Accept': APICall.CONTENT_TYPE_JSON,
        'DPoP-Nonce': BSKY.data.dpopNonce
    }
    let fetchOptions					= {
        method: HTML_GET,
        headers: headers
    }
	if (window.BSKY.DEBUG) console.debug( PREFIX + "headers:", COMMON.prettyJson( headers ) );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "fetchOptions:", COMMON.prettyJson( fetchOptions ) );

    // Finally, perform the call
    // ------------------------------------------
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Invoking URL:", url );
 	let responseFromServer				= await APICall.makeAPICall( STEP_NAME, url, fetchOptions );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received responseFromServer:", COMMON.prettyJson( responseFromServer ) );
	// Here, we gather the "access_token" item in the received json.
	let userData						= responseFromServer.body;

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return userData;
}

// Atomic function to retrieve who are the user muting
export async function retrieveTrendingTopics(cursor) {
	const STEP_NAME						= "retrieveTrendingTopics";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userHandle " + BSKY.user.userHandle + "]" );

	// Prepare the URL..
	let endpoint						= API.bluesky.XRPC.api.pds.getTrendingTopics;
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Requesting the Bluesky Trending Topics... Invoking endpoint:", endpoint );

	// The URL is protected, so... PDS Server
	let root							= BSKY.auth.userPDSURL + "/xrpc";
	let url								= root + endpoint;
	url									+= "?viewer=" + encodeURIComponent( BSKY.user.userDid );
	url									+= "&limit=25";
	if ( !COMMON.isNullOrEmpty(cursor) ) {
		url								+= "&cursor=" + cursor;
	}
	if (window.BSKY.DEBUG) console.debug(PREFIX + "Fetching data from the URL:", url);

    // Create the DPoP-Proof 'body' for this request.
    // ------------------------------------------
	let dpopRequest						= new TYPES.DPoPRequest(BSKY.data.cryptoKey.privateKey, BSKY.data.jwk, APP_CLIENT_ID, BSKY.data.userAccessToken, BSKY.data.accessTokenHash, url, BSKY.data.dpopNonce, HTML_GET);
	let dpopProof						= await DPOP.createDPoPProof(dpopRequest)
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received dpopProof:", JWT.jwtToPrettyJSON( dpopProof ) );

    // TuneUp the call
    // ------------------------------------------
    let headers							= {
		'Authorization': `DPoP ${BSKY.data.userAccessToken}`,
		'DPoP': dpopProof,
		'Accept': APICall.CONTENT_TYPE_JSON,
        'DPoP-Nonce': BSKY.data.dpopNonce
    }
    let fetchOptions					= {
        method: HTML_GET,
        headers: headers
    }
	if (window.BSKY.DEBUG) console.debug( PREFIX + "headers:", COMMON.prettyJson( headers ) );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "fetchOptions:", COMMON.prettyJson( fetchOptions ) );

    // Finally, perform the call
    // ------------------------------------------
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Invoking URL:", url );
 	let responseFromServer				= await APICall.makeAPICall( STEP_NAME, url, fetchOptions );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received responseFromServer:", COMMON.prettyJson( responseFromServer ) );
	// Here, we gather the "access_token" item in the received json.
	let userData						= responseFromServer.body;

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return userData;
}

// Atomic function to create a "convo" for chats
export async function searchProfile( searchedProfiles ) {
	const STEP_NAME						= "searchProfile";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[searchedProfiles=${searchedProfiles}]` );

	// Prepare the URL..
	let endpoint						= API.bluesky.XRPC.api.public.searchActorsTypeahead;
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Requesting the Bluesky Trending Topics... Invoking endpoint:", endpoint );

	// The URL is OPEN, so... Public Server
	let root							= API.bluesky.XRPC.public;
	let url								= root + endpoint + "?q=" + searchedProfiles;
	if (window.BSKY.DEBUG) console.debug(PREFIX + "Fetching data from the URL:", url);

    // Create the DPoP-Proof 'body' for this request.
    // ------------------------------------------
	let dpopRequest						= new TYPES.DPoPRequest(BSKY.data.cryptoKey.privateKey, BSKY.data.jwk, APP_CLIENT_ID, BSKY.data.userAccessToken, BSKY.data.accessTokenHash, url, BSKY.data.dpopNonce, HTML_GET);
	let dpopProof						= await DPOP.createDPoPProof(dpopRequest)
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received dpopProof:", JWT.jwtToPrettyJSON( dpopProof ) );

    // TuneUp the call
    // ------------------------------------------
    let headers							= {
		'Authorization': `DPoP ${BSKY.data.userAccessToken}`,
        'Content-Type': APICall.CONTENT_TYPE_FORM_ENCODED,
		'DPoP': dpopProof,
		'Accept': APICall.CONTENT_TYPE_JSON,
        'DPoP-Nonce': BSKY.data.dpopNonce
    }
    let fetchOptions					= {
        method: HTML_GET,
        headers: headers
    }
	if (window.BSKY.DEBUG) console.debug( PREFIX + "headers:", COMMON.prettyJson( headers ) );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "fetchOptions:", COMMON.prettyJson( fetchOptions ) );

    // Finally, perform the call
    // ------------------------------------------
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Invoking URL:", url );
 	let responseFromServer				= await APICall.makeAPICall( STEP_NAME, url, fetchOptions );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received responseFromServer:", COMMON.prettyJson( responseFromServer ) );
	let userData						= responseFromServer.body;

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return userData;
}
