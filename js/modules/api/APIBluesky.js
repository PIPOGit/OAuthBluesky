/**********************************************************
 * Module Info:
 *
 * This file contains all the Bluesky API top-level calls
 * (listed at the end).
 *
 * The functions here just prepare the call to be performed
 * later using: "APICall.xxxx" standardized methods.
 **********************************************************/


/**********************************************************
 * Module imports
 *
 * PKCE HELPER FUNCTIONS
 * See: https://gist.github.com/ahmetgeymen/a9dcd656a1527f6c73d9c712ea2d9d7e
 *
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

// Common Crypto functions
import * as CRYPT						from "../auth/Crypt.js";
// Common DPOP functions
import * as DPOP						from "../auth/DPoPProof.js";
// Common JWT functions
import * as JWT							from "../auth/JWT.js";


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
const XRPC								= BLUESKY.XRPC;

// Bluesky constants
const APP_CLIENT_ID						= CLIENT_APP.client_id;
const MAX_NOTIS_TO_RETRIEVE				= 50;


/**********************************************************
 * Module Variables
 **********************************************************/


/**********************************************************
 * PRIVATE Functions
 **********************************************************/
/* --------------------------------------------------------
 * Returns the URL of the "best" server to use.
 * -------------------------------------------------------- */
function getServerURL() {
	return ( BSKY?.auth?.userPDSURL ) ? BSKY.auth.userPDSURL + "/xrpc" : XRPC.public;
}


/**********************************************************
 * BUSINESS Functions
 **********************************************************/

/* --------------------------------------------------------
 * Atomic function to logout the user
 * -------------------------------------------------------- */
async function performUserLogout() {
	const STEP_NAME						= "performUserLogout";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Now, the user's profile.
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Performing the user's Bluesky logout...` );

	// Prepare the URL..
	// ---------------------------------------------------------
	// The URL comes from the Discovery doc.
    let url								= BSKY.auth.userRevocationEndPoint;

    // The call headers.
	// ---------------------------------------------------------
    let headers										= {};
    headers[ APICall.HTTP_HEADER_CONTENT_TYPE ]		= APICall.CONTENT_TYPE_FORM_ENCODED;
	headers[ APICall.HTTP_HEADER_AUTHORIZATION ]	= `${APICall.HTTP_HEADER_DPOP} ${BSKY.data.userAccessToken}`;

	// The data to send
	// ---------------------------------------------------------
    let body							= `token=${BSKY.data.userAccessToken}`;

    // The call fetch options.
	// ---------------------------------------------------------
	let fetchOptions					= {
        method: APICall.HTTP_POST,
        headers: headers,
        body: body
    }

    // The call params; with a typed format.
	// ---------------------------------------------------------
	const requestParams					= TYPES.HTTPRequest.getInstanceWithFetch( STEP_NAME, url, fetchOptions );

    // The call.
	// ---------------------------------------------------------
	let responseFromServer				= null;
	try {
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Performing the call..." );
		responseFromServer				= await APICall.authenticatedCall( requestParams );
	} catch ( error ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR(${typeof error}):`, error );
		responseFromServer				= error;
	}

	// Sanity check
	// ---------------------------------------------------------
	if ( responseFromServer instanceof TYPES.HTTPResponseError ) {
		if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		throw responseFromServer;
	}

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return responseFromServer;
}

/* --------------------------------------------------------
 * Atomic function to refresh the user access token
 * -------------------------------------------------------- */
async function refreshUserAccessToken() {
	const STEP_NAME						= "refreshUserAccessToken";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_AFTER					= `${PREFIX}[After] `;
	const PREFIX_PREFETCH				= `${PREFIX}[PREFETCH] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userHandle=="+BSKY.user.userHandle+"]" );

	// The incoming data
	// ---------------------------------------------------------
 	if (window.BSKY.DEBUG) console.debug( PREFIX + `Refreshing the access token...` );
	let redirectURL						= BSKY.auth.redirectURL;

	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_PREFETCH );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Current redirectURL[BSKY.auth.redirectURL]:", BSKY.auth.redirectURL );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Current redirectURL[localStorage]:", localStorage.getItem(LSKEYS.CALLBACK_URL) );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Current redirectURL:", redirectURL );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Current userRefreshToken:", BSKY.data.userRefreshToken );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Current userAuthentication:", BSKY.data.userAuthentication );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Current userAccessToken:", JWT.jwtToPrettyJSON( BSKY.data.userAccessToken ) );

	// Prepare the URL..
	// ---------------------------------------------------------
    let url								= BSKY.auth.userTokenEndPoint;
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Access Token URL:", url );

    // The DPoPProof.
	// ---------------------------------------------------------
	let dpopProof						= await DPOP.createDPoPProof( TYPES.DPoPRequest.getInstanceWithoutATH( url, APICall.HTTP_POST ) )

    // The call headers.
	// ---------------------------------------------------------
    let headers										= {};
    headers[ APICall.HTTP_HEADER_CONTENT_TYPE ]		= APICall.CONTENT_TYPE_FORM_ENCODED;
	headers[ APICall.HTTP_HEADER_DPOP ]				= dpopProof;
	headers[ APICall.HTTP_HEADER_DPOP_NONCE ]		= BSKY.data.dpopNonce;

	// The data to send
	// ---------------------------------------------------------
	let body							= new FormData();
	body.append( 'grant_type', 'refresh_token' );					// Fixed value
	body.append( 'refresh_token', BSKY.data.userRefreshToken );		// Variable value
	body.append( 'client_id', APP_CLIENT_ID );						// ClientAPP value
	body.append( 'redirect_uri', redirectURL );						// ClientAPP value
	const bodyAsURLSearchParams			= new URLSearchParams( body );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Generated [body]:", bodyAsURLSearchParams.toString() );

    // The call fetch options.
	// ---------------------------------------------------------
    let fetchOptions					= {
        method: APICall.HTTP_POST,
        headers: headers,
        body: bodyAsURLSearchParams
    }
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();

    // The call params; with a typed format.
	// ---------------------------------------------------------
	const requestParams					= TYPES.HTTPRequest.getInstanceWithFetch( STEP_NAME, url, fetchOptions );

    // The call.
	// ---------------------------------------------------------
	let responseFromServer				= null;
	try {
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Performing the call..." );
		responseFromServer				= await APICall.authenticatedCall( requestParams );
	} catch ( error ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR(${typeof error}):`, error );
		responseFromServer				= error;
	}

	// Sanity check
	// ---------------------------------------------------------
	if ( responseFromServer instanceof TYPES.HTTPResponseError ) {
		if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		throw responseFromServer;
	}

    // The response payload.
	// ---------------------------------------------------------
	const payload						= responseFromServer.json;

    // Post-Process the payload.
	// ---------------------------------------------------------

	// Let's group log messages
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_AFTER );

	BSKY.data.userAuthentication		= payload;
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

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return { userAuthentication: BSKY.data.userAuthentication, userAccessToken: BSKY.data.userAccessToken };
}

/* --------------------------------------------------------
 * Atomic function to retrieve the user access token
 * -------------------------------------------------------- */
async function retrieveUserAccessToken() {
	const STEP_NAME						= "retrieveUserAccessToken";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;

	// The incoming data
	// ---------------------------------------------------------
	let code							= BSKY.auth.callbackData.code;
	let redirectURL						= BSKY.auth.redirectURL;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + "[redirectURL=="+redirectURL+"] [code=="+code+"]" );
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received data:" );
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "+ code:", code );
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "+ redirectURL:", redirectURL );
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "+ dpopNonce:", BSKY.data.dpopNonce );

	// Prepare the URL..
	// ---------------------------------------------------------
    let url								= BSKY.auth.userTokenEndPoint;
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Access Token URL:", url );

    // The DPoPProof.
	// ---------------------------------------------------------
	let dpopProof						= await DPOP.createDPoPProof( TYPES.DPoPRequest.getInstance( url, APICall.HTTP_POST ) )

    // The call headers.
	// ---------------------------------------------------------
    let headers										= {};
    headers[ APICall.HTTP_HEADER_CONTENT_TYPE ]		= APICall.CONTENT_TYPE_FORM_ENCODED;
	headers[ APICall.HTTP_HEADER_DPOP ]				= dpopProof;
	headers[ APICall.HTTP_HEADER_DPOP_NONCE ]		= BSKY.data.dpopNonce;

	// The data to send
	// ---------------------------------------------------------
	let body							= new FormData();
	body.append( 'grant_type', 'authorization_code' );				// Fixed value
	body.append( 'code', code );									// Variable value
	body.append( 'code_verifier', BSKY.auth.codeVerifier );			// Variable value
	body.append( 'client_id', APP_CLIENT_ID );						// ClientAPP value
	body.append( 'redirect_uri', redirectURL );						// ClientAPP value
	const bodyAsURLSearchParams			= new URLSearchParams( body );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Generated [body]:", COMMON.prettyJson( bodyAsURLSearchParams.toString() ) );

    // The call fetch options.
	// ---------------------------------------------------------
    let fetchOptions					= {
        method: APICall.HTTP_POST,
        headers: headers,
        body: bodyAsURLSearchParams
    }

    // The call params; with a typed format.
	// ---------------------------------------------------------
	const requestParams					= TYPES.HTTPRequest.getInstanceWithFetch( STEP_NAME, url, fetchOptions );

    // The call.
	// ---------------------------------------------------------
	let responseFromServer				= null;
	try {
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Performing the call..." );
		responseFromServer				= await APICall.authenticatedCall( requestParams );
	} catch ( error ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR(${typeof error}):`, error );
		responseFromServer				= error;
	}

	// Sanity check
	// ---------------------------------------------------------
	if ( responseFromServer instanceof TYPES.HTTPResponseError ) {
		if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		throw responseFromServer;
	}

    // The response payload.
	// ---------------------------------------------------------
	const payload						= responseFromServer.json;

    // Post-Process the payload.
	// ---------------------------------------------------------

	// Here, we gather the "access_token" item in the received json.
	BSKY.data.userAuthentication		= payload;
	BSKY.data.userAccessToken			= BSKY.data.userAuthentication.access_token;
	BSKY.data.userRefreshToken			= BSKY.data.userAuthentication.refresh_token;

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return { userAuthentication: BSKY.data.userAuthentication, userAccessToken: BSKY.data.userAccessToken };
}

/* --------------------------------------------------------
 * PDS: Atomic function to retrieve the user's profile
 * -------------------------------------------------------- */
async function retrieveUserProfile( userHandle ) {
	const STEP_NAME						= "retrieveUserProfile";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userHandle " + userHandle + "]" );

	// Prepare the URL..
	// ---------------------------------------------------------
	let endpoint						= XRPC.api.pds.getProfile;

	// The URL is protected, so... PDS Server
	let root							= getServerURL();
	let url								= root + endpoint + "?actor=" + userHandle;

    // The DPoPProof.
	// ---------------------------------------------------------
	let dpopProof						= await DPOP.createDPoPProof( TYPES.DPoPRequest.getInstance( url, APICall.HTTP_GET ) )

    // The call headers.
	// ---------------------------------------------------------
    let headers										= {};
    headers[ APICall.HTTP_HEADER_ACCEPT ]			= APICall.CONTENT_TYPE_JSON;
	headers[ APICall.HTTP_HEADER_AUTHORIZATION ]	= `${APICall.HTTP_HEADER_DPOP} ${BSKY.data.userAccessToken}`;
	headers[ APICall.HTTP_HEADER_DPOP ]				= dpopProof;
	headers[ APICall.HTTP_HEADER_DPOP_NONCE ]		= BSKY.data.dpopNonce;

    // The call fetch options.
	// ---------------------------------------------------------
	let fetchOptions					= {
        method: APICall.HTTP_GET,
        headers: headers
    }

    // The call params; with a typed format.
	// ---------------------------------------------------------
	const requestParams					= TYPES.HTTPRequest.getInstanceWithFetch( STEP_NAME, url, fetchOptions );

    // The call.
	// ---------------------------------------------------------
	let responseFromServer				= null;
	try {
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Performing the call..." );
		responseFromServer				= await APICall.authenticatedCall( requestParams );
	} catch ( error ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR(${typeof error}):`, error );
		responseFromServer				= error;
	}

	// Sanity check
	// ---------------------------------------------------------
	if ( responseFromServer instanceof TYPES.HTTPResponseError ) {
		if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		throw responseFromServer;
	}

    // The response payload.
	// ---------------------------------------------------------
	const payload						= responseFromServer.json;

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return payload;
}

/* --------------------------------------------------------
 * PDS: Atomic function to retrieve the user's unread notifications value
 * -------------------------------------------------------- */
async function retrieveUnreadNotifications(renderHTMLErrors=true) {
	const STEP_NAME						= "retrieveUnreadNotifications";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_PREFETCH				= `${PREFIX}[PREFETCH] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[renderHTMLErrors==${renderHTMLErrors}]` );

	// Prepare the URL..
	// ---------------------------------------------------------
	let endpoint						= XRPC.api.pds.getUnreadCount;

	// The URL is protected, so... PDS Server
	let root							= getServerURL();
	let url								= root + endpoint;

    // The DPoPProof.
	// ---------------------------------------------------------
	let dpopProof						= await DPOP.createDPoPProof( TYPES.DPoPRequest.getInstance( url, APICall.HTTP_GET ) )

    // The call headers.
	// ---------------------------------------------------------
    let headers										= {};
    headers[ APICall.HTTP_HEADER_ACCEPT ]			= APICall.CONTENT_TYPE_JSON;
	headers[ APICall.HTTP_HEADER_AUTHORIZATION ]	= `${APICall.HTTP_HEADER_DPOP} ${BSKY.data.userAccessToken}`;
	headers[ APICall.HTTP_HEADER_DPOP ]				= dpopProof;
	headers[ APICall.HTTP_HEADER_DPOP_NONCE ]		= BSKY.data.dpopNonce;

    // The call fetch options.
	// ---------------------------------------------------------
    let fetchOptions					= {
        method: APICall.HTTP_GET,
        headers: headers
    }

    // The call params; with a typed format.
	// ---------------------------------------------------------
	const requestParams					= TYPES.HTTPRequest.getInstanceWithFetch( STEP_NAME, url, fetchOptions );

    // The call.
	// ---------------------------------------------------------
	let responseFromServer				= null;
	try {
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Performing the call..." );
		responseFromServer				= await APICall.authenticatedCall( requestParams );
	} catch ( error ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR(${typeof error}):`, error );
		responseFromServer				= error;
	}

	// Sanity check
	// ---------------------------------------------------------
	if ( responseFromServer instanceof TYPES.HTTPResponseError ) {
		if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		throw responseFromServer;
	}

    // The response payload.
	// ---------------------------------------------------------
	const payload						= responseFromServer.json;

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return payload;
}

/* --------------------------------------------------------
 * PDS: Atomic function to retrieve the user's notifications
 * -------------------------------------------------------- */
async function retrieveNotifications(renderHTMLErrors=true) {
	const STEP_NAME						= "retrieveNotifications";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_PREFETCH				= `${PREFIX}[PREFETCH] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[renderHTMLErrors==${renderHTMLErrors}] [MAX ${MAX_NOTIS_TO_RETRIEVE} notifications to retrieve]` );

	let endpoint						= XRPC.api.pds.listNotifications;
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Requesting the unread notifications... Invoking endpoint:", endpoint );

	// The URL is protected, so... PDS Server
	let root							= getServerURL();
	let url								= root + endpoint + "?limit=" + MAX_NOTIS_TO_RETRIEVE;		// Not much; it's a test!
	if (window.BSKY.DEBUG) console.debug(PREFIX + "Fetching data from the URL:", url);

	// Let's group the following messages
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_PREFETCH );

    // Create the DPoP-Proof 'body' for this request.
	// We already have the cryptoKey somewhere, from previous calls...
	// ---------------------------------------------------------
	let dpopRequest						= new TYPES.DPoPRequest(BSKY.data.cryptoKey.privateKey, BSKY.data.jwk, APP_CLIENT_ID, BSKY.data.userAccessToken, BSKY.data.accessTokenHash, url, BSKY.data.dpopNonce, APICall.HTTP_GET);
	let dpopProof						= await DPOP.createDPoPProof(dpopRequest)

    // TuneUp the call
	// ---------------------------------------------------------
    let headers										= {};
    headers[ APICall.HTTP_HEADER_ACCEPT ]			= APICall.CONTENT_TYPE_JSON;
	headers[ APICall.HTTP_HEADER_AUTHORIZATION ]	= `${APICall.HTTP_HEADER_DPOP} ${BSKY.data.userAccessToken}`;
	headers[ APICall.HTTP_HEADER_DPOP ]				= dpopProof;
	headers[ APICall.HTTP_HEADER_DPOP_NONCE ]		= BSKY.data.dpopNonce;

	let fetchOptions					= {
        method: APICall.HTTP_GET,
        headers: headers
    }
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();

    // Finally, perform the call
	// ---------------------------------------------------------
 	let responseFromServer				= await APICall.call( STEP_NAME, url, fetchOptions, renderHTMLErrors );

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return responseFromServer.json.notifications;
}

/* --------------------------------------------------------
 * PDS: Atomic function to retrieve who the user follows
 * -------------------------------------------------------- */
async function retrieveUserFollows(cursor) {
	const STEP_NAME						= "retrieveUserFollows";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userHandle " + BSKY.user.userHandle + "]" );

	// Prepare the URL..
	let endpoint						= XRPC.api.pds.getFollows;
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Requesting who the user is following... Invoking endpoint:", endpoint );

	// The URL is PDS, so... PDS Server
	let root							= getServerURL();
	let url								= root + endpoint;
	url									+= "?actor=" + BSKY.user.userHandle;
	url									+= "&limit=100";
	if ( !COMMON.isNullOrEmpty(cursor) ) {
		url								+= "&cursor=" + cursor;
	}
	if (window.BSKY.DEBUG) console.debug(PREFIX + "Fetching data from the URL:", url);

    // Create the DPoP-Proof 'body' for this request.
	// ---------------------------------------------------------
	let dpopRequest						= new TYPES.DPoPRequest(BSKY.data.cryptoKey.privateKey, BSKY.data.jwk, APP_CLIENT_ID, BSKY.data.userAccessToken, BSKY.data.accessTokenHash, url, BSKY.data.dpopNonce, APICall.HTTP_GET);
	let dpopProof						= await DPOP.createDPoPProof(dpopRequest)

    // TuneUp the call
	// ---------------------------------------------------------
    let headers										= {};
    headers[ APICall.HTTP_HEADER_ACCEPT ]			= APICall.CONTENT_TYPE_JSON;
	headers[ APICall.HTTP_HEADER_AUTHORIZATION ]	= `${APICall.HTTP_HEADER_DPOP} ${BSKY.data.userAccessToken}`;
	headers[ APICall.HTTP_HEADER_DPOP ]				= dpopProof;
	headers[ APICall.HTTP_HEADER_DPOP_NONCE ]		= BSKY.data.dpopNonce;

    let fetchOptions					= {
        method: APICall.HTTP_GET,
        headers: headers
    }

    // Finally, perform the call
	// ---------------------------------------------------------
 	let responseFromServer				= await APICall.call( STEP_NAME, url, fetchOptions );
	// Here, we gather the "access_token" item in the received json.
	let payload						= responseFromServer.json;

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return payload;
}

/* --------------------------------------------------------
 * PDS: Atomic function to retrieve who (from the PDS) the user follows
 * -------------------------------------------------------- */
async function retrieveRepoListRecords( data ) {
	const STEP_NAME						= "retrieveRepoListRecords";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[userHandle ${BSKY.user.userHandle}] [nsid=${data.nsid}]` );

	// Prepare the URL..
	let endpoint						= XRPC.api.pds.listRecords;

	// The URL is PDS, so... PDS Server
	let root							= getServerURL();
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

    // Create the DPoP-Proof 'body' for this request.
	// ---------------------------------------------------------
	let dpopRequest						= new TYPES.DPoPRequest(BSKY.data.cryptoKey.privateKey, BSKY.data.jwk, APP_CLIENT_ID, BSKY.data.userAccessToken, BSKY.data.accessTokenHash, url, BSKY.data.dpopNonce, APICall.HTTP_GET);
	let dpopProof						= await DPOP.createDPoPProof(dpopRequest)

    // TuneUp the call
	// ---------------------------------------------------------
    let headers										= {};
    headers[ APICall.HTTP_HEADER_ACCEPT ]			= APICall.CONTENT_TYPE_JSON;
	headers[ APICall.HTTP_HEADER_AUTHORIZATION ]	= `${APICall.HTTP_HEADER_DPOP} ${BSKY.data.userAccessToken}`;
	headers[ APICall.HTTP_HEADER_DPOP ]				= dpopProof;
	headers[ APICall.HTTP_HEADER_DPOP_NONCE ]		= BSKY.data.dpopNonce;

    let fetchOptions					= {
        method: APICall.HTTP_GET,
        headers: headers
    }

    // Finally, perform the call
	// ---------------------------------------------------------
	let payload							= null;
	// try {
		let responseFromServer			= await APICall.call( STEP_NAME, url, fetchOptions, data.renderHTMLErrors );
		// Here, we gather the "access_token" item in the received json.
		payload							= responseFromServer.json;
	// } catch ( error ) {
	// 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received ERROR:", COMMON.prettyJson( error ) );
	// 	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	// 	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	// 	throw( error );
	// }

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return payload;
}

/* --------------------------------------------------------
 * PDS: Atomic function to retrieve who the user follows
 * -------------------------------------------------------- */
async function retrieveRepoBlockOfRecords(queryString) {
	const STEP_NAME						= "retrieveRepoBlockOfRecords";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Prepare the URL..
	let endpoint						= XRPC.api.pds.getProfiles;

	// The URL is PDS, so... PDS Server
	let root							= getServerURL();
	let url								= root + endpoint;
	url									+= queryString;

    // Create the DPoP-Proof 'body' for this request.
	// ---------------------------------------------------------
	let dpopRequest						= new TYPES.DPoPRequest(BSKY.data.cryptoKey.privateKey, BSKY.data.jwk, APP_CLIENT_ID, BSKY.data.userAccessToken, BSKY.data.accessTokenHash, url, BSKY.data.dpopNonce, APICall.HTTP_GET);
	let dpopProof						= await DPOP.createDPoPProof(dpopRequest)

    // TuneUp the call
	// ---------------------------------------------------------
    let headers										= {};
    headers[ APICall.HTTP_HEADER_ACCEPT ]			= APICall.CONTENT_TYPE_JSON;
	headers[ APICall.HTTP_HEADER_AUTHORIZATION ]	= `${APICall.HTTP_HEADER_DPOP} ${BSKY.data.userAccessToken}`;
	headers[ APICall.HTTP_HEADER_DPOP ]				= dpopProof;
	headers[ APICall.HTTP_HEADER_DPOP_NONCE ]		= BSKY.data.dpopNonce;

    let fetchOptions					= {
        method: APICall.HTTP_GET,
        headers: headers
    }

    // Finally, perform the call
	// ---------------------------------------------------------
 	let responseFromServer				= await APICall.call( STEP_NAME, url, fetchOptions );
	// Here, we gather the "access_token" item in the received json.
	let payload						= responseFromServer.json;

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return payload;
}

/* --------------------------------------------------------
 * PDS: Atomic function to retrieve who are the user followers
 * -------------------------------------------------------- */
async function retrieveUserFollowers(cursor) {
	const STEP_NAME						= "retrieveUserFollowers";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userHandle " + BSKY.user.userHandle + "]" );

	// Prepare the URL..
	let endpoint						= XRPC.api.pds.getFollowers;

	// The URL is PDS, so... PDS Server
	let root							= getServerURL();
	let url								= root + endpoint;
	url									+= "?actor=" + BSKY.user.userHandle;
	url									+= "&limit=100";
	if ( !COMMON.isNullOrEmpty(cursor) ) {
		url								+= "&cursor=" + cursor;
	}

    // Create the DPoP-Proof 'body' for this request.
	// ---------------------------------------------------------
	let dpopRequest						= new TYPES.DPoPRequest(BSKY.data.cryptoKey.privateKey, BSKY.data.jwk, APP_CLIENT_ID, BSKY.data.userAccessToken, BSKY.data.accessTokenHash, url, BSKY.data.dpopNonce, APICall.HTTP_GET);
	let dpopProof						= await DPOP.createDPoPProof(dpopRequest)

    // TuneUp the call
	// ---------------------------------------------------------
    let headers										= {};
    headers[ APICall.HTTP_HEADER_ACCEPT ]			= APICall.CONTENT_TYPE_JSON;
	headers[ APICall.HTTP_HEADER_AUTHORIZATION ]	= `${APICall.HTTP_HEADER_DPOP} ${BSKY.data.userAccessToken}`;
	headers[ APICall.HTTP_HEADER_DPOP ]				= dpopProof;
	headers[ APICall.HTTP_HEADER_DPOP_NONCE ]		= BSKY.data.dpopNonce;

    let fetchOptions					= {
        method: APICall.HTTP_GET,
        headers: headers
    }

    // Finally, perform the call
	// ---------------------------------------------------------
 	let responseFromServer				= await APICall.call( STEP_NAME, url, fetchOptions );
	// Here, we gather the "access_token" item in the received json.
	let payload						= responseFromServer.json;

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return payload;
}

/* --------------------------------------------------------
 * PDS: Atomic function to retrieve who are the user blocking
 * -------------------------------------------------------- */
async function retrieveUserBlocks(cursor) {
	const STEP_NAME						= "retrieveUserBlocks";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userHandle " + BSKY.user.userHandle + "]" );

	// Prepare the URL..
	let endpoint						= XRPC.api.pds.getBlocks;

	// The URL is protected, so... PDS Server
	let root							= getServerURL();
	let url								= root + endpoint;
	url									+= "?limit=100";
	if ( !COMMON.isNullOrEmpty(cursor) ) {
		url								+= "&cursor=" + cursor;
	}

    // Create the DPoP-Proof 'body' for this request.
	// ---------------------------------------------------------
	let dpopRequest						= new TYPES.DPoPRequest(BSKY.data.cryptoKey.privateKey, BSKY.data.jwk, APP_CLIENT_ID, BSKY.data.userAccessToken, BSKY.data.accessTokenHash, url, BSKY.data.dpopNonce, APICall.HTTP_GET);
	let dpopProof						= await DPOP.createDPoPProof(dpopRequest)

    // TuneUp the call
	// ---------------------------------------------------------
    let headers										= {};
    headers[ APICall.HTTP_HEADER_ACCEPT ]			= APICall.CONTENT_TYPE_JSON;
	headers[ APICall.HTTP_HEADER_AUTHORIZATION ]	= `${APICall.HTTP_HEADER_DPOP} ${BSKY.data.userAccessToken}`;
	headers[ APICall.HTTP_HEADER_DPOP ]				= dpopProof;
	headers[ APICall.HTTP_HEADER_DPOP_NONCE ]		= BSKY.data.dpopNonce;

    let fetchOptions					= {
        method: APICall.HTTP_GET,
        headers: headers
    }

    // Finally, perform the call
	// ---------------------------------------------------------
 	let responseFromServer				= await APICall.call( STEP_NAME, url, fetchOptions );
	// Here, we gather the "access_token" item in the received json.
	let payload						= responseFromServer.json;

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return payload;
}

/* --------------------------------------------------------
 * PDS: Atomic function to retrieve who are the user muting
 * -------------------------------------------------------- */
async function retrieveUserMutes(cursor) {
	const STEP_NAME						= "retrieveUserMutes";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userHandle " + BSKY.user.userHandle + "]" );

	// Prepare the URL..
	let endpoint						= XRPC.api.pds.getMutes;

	// The URL is protected, so... PDS Server
	let root							= getServerURL();
	let url								= root + endpoint;
	url									+= "?limit=100";
	if ( !COMMON.isNullOrEmpty(cursor) ) {
		url								+= "&cursor=" + cursor;
	}

    // Create the DPoP-Proof 'body' for this request.
	// ---------------------------------------------------------
	let dpopRequest						= new TYPES.DPoPRequest(BSKY.data.cryptoKey.privateKey, BSKY.data.jwk, APP_CLIENT_ID, BSKY.data.userAccessToken, BSKY.data.accessTokenHash, url, BSKY.data.dpopNonce, APICall.HTTP_GET);
	let dpopProof						= await DPOP.createDPoPProof(dpopRequest)

    // TuneUp the call
	// ---------------------------------------------------------
    let headers										= {};
    headers[ APICall.HTTP_HEADER_ACCEPT ]			= APICall.CONTENT_TYPE_JSON;
	headers[ APICall.HTTP_HEADER_AUTHORIZATION ]	= `${APICall.HTTP_HEADER_DPOP} ${BSKY.data.userAccessToken}`;
	headers[ APICall.HTTP_HEADER_DPOP ]				= dpopProof;
	headers[ APICall.HTTP_HEADER_DPOP_NONCE ]		= BSKY.data.dpopNonce;

    let fetchOptions					= {
        method: APICall.HTTP_GET,
        headers: headers
    }

    // Finally, perform the call
	// ---------------------------------------------------------
 	let responseFromServer				= await APICall.call( STEP_NAME, url, fetchOptions );
	// Here, we gather the "access_token" item in the received json.
	let payload						= responseFromServer.json;

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return payload;
}

/* --------------------------------------------------------
 * PDS: Atomic function to retrieve the details of a list
 * -------------------------------------------------------- */
async function retrieveListDetails( list, cursor ) {
	const STEP_NAME						= "retrieveListDetails";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[atUri==${list.uri}]` );

	// Prepare the URL..
	// ---------------------------------------------------------
	let endpoint						= XRPC.api.pds.getList;

	// The URL is protected, so... PDS Server
	let root							= getServerURL();
	let url								= root + endpoint;
	url									+= "?list=" + list.uri;
	url									+= "&limit=100";
	if ( !COMMON.isNullOrEmpty(cursor) ) {
		url								+= "&cursor=" + cursor;
	}

    // The DPoPProof.
	// ---------------------------------------------------------
	let dpopProof						= await DPOP.createDPoPProof( TYPES.DPoPRequest.getInstance( url, APICall.HTTP_GET ) )

    // The call headers.
	// ---------------------------------------------------------
    let headers										= {};
    headers[ APICall.HTTP_HEADER_ACCEPT ]			= APICall.CONTENT_TYPE_JSON;
	headers[ APICall.HTTP_HEADER_AUTHORIZATION ]	= `${APICall.HTTP_HEADER_DPOP} ${BSKY.data.userAccessToken}`;
	headers[ APICall.HTTP_HEADER_DPOP ]				= dpopProof;
	headers[ APICall.HTTP_HEADER_DPOP_NONCE ]		= BSKY.data.dpopNonce;

    // The call fetch options.
	// ---------------------------------------------------------
    let fetchOptions					= {
        method: APICall.HTTP_GET,
        headers: headers
    }

    // The call params; with a typed format.
	// ---------------------------------------------------------
	const requestParams					= TYPES.HTTPRequest.getInstanceWithFetch( STEP_NAME, url, fetchOptions );

    // The call.
	// ---------------------------------------------------------
	let responseFromServer				= null;
	try {
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Performing the call..." );
		responseFromServer				= await APICall.authenticatedCall( requestParams, false );
	} catch ( error ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR(${typeof error}):`, error );
		responseFromServer				= error;
	}

	// Sanity check
	// ---------------------------------------------------------
	if ( responseFromServer instanceof TYPES.HTTPResponseError ) {
		if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		throw responseFromServer;
	}

    // The response payload.
	// ---------------------------------------------------------
	const payload						= responseFromServer.json;

	/*
    // Finally, perform the call
	// ---------------------------------------------------------
 	let responseFromServer				= await APICall.call( STEP_NAME, url, fetchOptions );
	// Here, we gather the "access_token" item in the received json.
	let payload							= responseFromServer.json;
	*/

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return payload;
}

/* --------------------------------------------------------
 * PDS: Atomic function to retrieve the user lists
 * -------------------------------------------------------- */
async function retrieveUserLists(cursor) {
	const STEP_NAME						= "retrieveUserLists";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userHandle " + BSKY.user.userHandle + "]" );

	// Prepare the URL..
	let endpoint						= XRPC.api.pds.getLists;

	// The URL is protected, so... PDS Server
	let root							= getServerURL();
	let url								= root + endpoint;
	url									+= "?actor=" + BSKY.user.userHandle;
	url									+= "&limit=100";
	if ( !COMMON.isNullOrEmpty(cursor) ) {
		url								+= "&cursor=" + cursor;
	}

    // Create the DPoP-Proof 'body' for this request.
	// ---------------------------------------------------------
	let dpopRequest						= new TYPES.DPoPRequest(
		BSKY.data.cryptoKey.privateKey,
		BSKY.data.jwk,
		APP_CLIENT_ID,
		BSKY.data.userAccessToken,
		BSKY.data.accessTokenHash,
		url,
		BSKY.data.dpopNonce,
		APICall.HTTP_GET);
	let dpopProof						= await DPOP.createDPoPProof(dpopRequest)

    // TuneUp the call
	// ---------------------------------------------------------
    let headers										= {};
    headers[ APICall.HTTP_HEADER_ACCEPT ]			= APICall.CONTENT_TYPE_JSON;
	headers[ APICall.HTTP_HEADER_AUTHORIZATION ]	= `${APICall.HTTP_HEADER_DPOP} ${BSKY.data.userAccessToken}`;
	headers[ APICall.HTTP_HEADER_DPOP ]				= dpopProof;
	headers[ APICall.HTTP_HEADER_DPOP_NONCE ]		= BSKY.data.dpopNonce;

    let fetchOptions					= {
        method: APICall.HTTP_GET,
        headers: headers
    }

    // Finally, perform the call
	// ---------------------------------------------------------
 	let responseFromServer				= await APICall.call( STEP_NAME, url, fetchOptions );
	// Here, we gather the "access_token" item in the received json.
	let payload						= responseFromServer.json;

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return payload;
}

/* --------------------------------------------------------
 * PDS: Atomic function to retrieve who are the user muting
 * -------------------------------------------------------- */
async function retrieveUserMutingModerationLists(cursor) {
	const STEP_NAME						= "retrieveUserMutingModerationLists";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userHandle " + BSKY.user.userHandle + "]" );

	// Prepare the URL..
	let endpoint						= XRPC.api.pds.getListMutes;

	// The URL is protected, so... PDS Server
	let root							= getServerURL();
	let url								= root + endpoint;
	url									+= "?actor=" + BSKY.user.userHandle;
	url									+= "&limit=100";
	if ( !COMMON.isNullOrEmpty(cursor) ) {
		url								+= "&cursor=" + cursor;
	}

    // Create the DPoP-Proof 'body' for this request.
	// ---------------------------------------------------------
	let dpopRequest						= new TYPES.DPoPRequest(
		BSKY.data.cryptoKey.privateKey,
		BSKY.data.jwk,
		APP_CLIENT_ID,
		BSKY.data.userAccessToken,
		BSKY.data.accessTokenHash,
		url,
		BSKY.data.dpopNonce,
		APICall.HTTP_GET);
	let dpopProof						= await DPOP.createDPoPProof(dpopRequest)

    // TuneUp the call
	// ---------------------------------------------------------
    let headers										= {};
    headers[ APICall.HTTP_HEADER_ACCEPT ]			= APICall.CONTENT_TYPE_JSON;
	headers[ APICall.HTTP_HEADER_AUTHORIZATION ]	= `${APICall.HTTP_HEADER_DPOP} ${BSKY.data.userAccessToken}`;
	headers[ APICall.HTTP_HEADER_DPOP ]				= dpopProof;
	headers[ APICall.HTTP_HEADER_DPOP_NONCE ]		= BSKY.data.dpopNonce;

    let fetchOptions					= {
        method: APICall.HTTP_GET,
        headers: headers
    }

    // Finally, perform the call
	// ---------------------------------------------------------
 	let responseFromServer				= await APICall.call( STEP_NAME, url, fetchOptions );
	// Here, we gather the "access_token" item in the received json.
	let payload						= responseFromServer.json;

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return payload;
}

/* --------------------------------------------------------
 * PDS: Atomic function to retrieve who are the user blocks
 * -------------------------------------------------------- */
async function retrieveUserBlockingModerationLists(cursor) {
	const STEP_NAME						= "retrieveUserBlockingModerationLists";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userHandle " + BSKY.user.userHandle + "]" );

	// Prepare the URL..
	let endpoint						= XRPC.api.pds.getListBlocks;

	// The URL is protected, so... PDS Server
	let root							= getServerURL();
	let url								= root + endpoint;
	url									+= "?actor=" + BSKY.user.userHandle;
	url									+= "&limit=100";
	if ( !COMMON.isNullOrEmpty(cursor) ) {
		url								+= "&cursor=" + cursor;
	}

    // Create the DPoP-Proof 'body' for this request.
	// ---------------------------------------------------------
	let dpopRequest						= new TYPES.DPoPRequest(
		BSKY.data.cryptoKey.privateKey,
		BSKY.data.jwk,
		APP_CLIENT_ID,
		BSKY.data.userAccessToken,
		BSKY.data.accessTokenHash,
		url,
		BSKY.data.dpopNonce,
		APICall.HTTP_GET);
	let dpopProof						= await DPOP.createDPoPProof(dpopRequest)

    // TuneUp the call
	// ---------------------------------------------------------
    let headers										= {};
    headers[ APICall.HTTP_HEADER_ACCEPT ]			= APICall.CONTENT_TYPE_JSON;
	headers[ APICall.HTTP_HEADER_AUTHORIZATION ]	= `${APICall.HTTP_HEADER_DPOP} ${BSKY.data.userAccessToken}`;
	headers[ APICall.HTTP_HEADER_DPOP ]				= dpopProof;
	headers[ APICall.HTTP_HEADER_DPOP_NONCE ]		= BSKY.data.dpopNonce;

    let fetchOptions					= {
        method: APICall.HTTP_GET,
        headers: headers
    }

    // Finally, perform the call
	// ---------------------------------------------------------
 	let responseFromServer				= await APICall.call( STEP_NAME, url, fetchOptions );
	// Here, we gather the "access_token" item in the received json.
	let payload						= responseFromServer.json;

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return payload;
}

/* --------------------------------------------------------
 * PDS: Atomic function to retrieve the actor feeds
 * -------------------------------------------------------- */
async function retrieveUserFeeds(cursor) {
	const STEP_NAME						= "retrieveUserFeeds";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userHandle " + BSKY.user.userHandle + "]" );

	// Prepare the URL..
	// ---------------------------------------------------------
	let endpoint						= XRPC.api.pds.getActorFeeds;

	// The URL is protected, so... PDS Server
	let root							= getServerURL();
	let url								= root + endpoint;
	url									+= "?actor=" + encodeURIComponent( BSKY.user.userDid );
	url									+= "&limit=100";
	if ( !COMMON.isNullOrEmpty(cursor) ) {
		url								+= "&cursor=" + cursor;
	}

    // The DPoPProof.
	// ---------------------------------------------------------
	let dpopProof						= await DPOP.createDPoPProof( TYPES.DPoPRequest.getInstance( url, APICall.HTTP_GET ) )

    // The call headers.
	// ---------------------------------------------------------
    let headers										= {};
    headers[ APICall.HTTP_HEADER_ACCEPT ]			= APICall.CONTENT_TYPE_JSON;
	headers[ APICall.HTTP_HEADER_AUTHORIZATION ]	= `${APICall.HTTP_HEADER_DPOP} ${BSKY.data.userAccessToken}`;
	headers[ APICall.HTTP_HEADER_DPOP ]				= dpopProof;
	headers[ APICall.HTTP_HEADER_DPOP_NONCE ]		= BSKY.data.dpopNonce;

    // The call fetch options.
	// ---------------------------------------------------------
    let fetchOptions					= {
        method: APICall.HTTP_GET,
        headers: headers
    }

    // The call params; with a typed format.
	// ---------------------------------------------------------
	const requestParams					= TYPES.HTTPRequest.getInstanceWithFetch( STEP_NAME, url, fetchOptions );

    // The call.
	// ---------------------------------------------------------
	let responseFromServer				= null;
	try {
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Performing the call..." );
		responseFromServer				= await APICall.authenticatedCall( requestParams );
	} catch ( error ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR(${typeof error}):`, error );
		responseFromServer				= error;
	}

	// Sanity check
	// ---------------------------------------------------------
	if ( responseFromServer instanceof TYPES.HTTPResponseError ) {
		if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		throw responseFromServer;
	}

    // The response payload.
	// ---------------------------------------------------------
	const payload						= responseFromServer.json;

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return payload;
}

/* --------------------------------------------------------
 * PDS: Atomic function to retrieve who are the user muting
 * -------------------------------------------------------- */
async function retrieveTrendingTopics(cursor) {
	const STEP_NAME						= "retrieveTrendingTopics";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userHandle " + BSKY.user.userHandle + "]" );

	// Prepare the URL..
	// ---------------------------------------------------------
	let endpoint						= XRPC.api.pds.getTrendingTopics;

	// The URL is protected, so... PDS Server
	let root							= getServerURL();
	let url								= root + endpoint;
	url									+= "?viewer=" + encodeURIComponent( BSKY.user.userDid );
	url									+= "&limit=25";
	if ( !COMMON.isNullOrEmpty(cursor) ) {
		url								+= "&cursor=" + cursor;
	}

    // The DPoPProof.
	// ---------------------------------------------------------
	let dpopProof						= await DPOP.createDPoPProof( TYPES.DPoPRequest.getInstance( url, APICall.HTTP_GET ) )

    // The call headers.
	// ---------------------------------------------------------
    let headers										= {};
    headers[ APICall.HTTP_HEADER_ACCEPT ]			= APICall.CONTENT_TYPE_JSON;
	headers[ APICall.HTTP_HEADER_AUTHORIZATION ]	= `${APICall.HTTP_HEADER_DPOP} ${BSKY.data.userAccessToken}`;
	headers[ APICall.HTTP_HEADER_DPOP ]				= dpopProof;
	headers[ APICall.HTTP_HEADER_DPOP_NONCE ]		= BSKY.data.dpopNonce;

    // The call fetch options.
	// ---------------------------------------------------------
    let fetchOptions					= {
        method: APICall.HTTP_GET,
        headers: headers
    }

    // The call params; with a typed format.
	// ---------------------------------------------------------
	const requestParams					= TYPES.HTTPRequest.getInstanceWithFetch( STEP_NAME, url, fetchOptions );

    // The call.
	// ---------------------------------------------------------
	let responseFromServer				= null;
	try {
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Performing the call..." );
		responseFromServer				= await APICall.authenticatedCall( requestParams );
	} catch ( error ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR(${typeof error}):`, error );
		responseFromServer				= error;
	}

	// Sanity check
	// ---------------------------------------------------------
	if ( responseFromServer instanceof TYPES.HTTPResponseError ) {
		if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		throw responseFromServer;
	}

    // The response payload.
	// ---------------------------------------------------------
	const payload						= responseFromServer.json;

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return payload;
}

/* --------------------------------------------------------
 * PDS: Atomic function to create a "convo" for chats
 * -------------------------------------------------------- */
async function searchProfile( searchedProfiles ) {
	const STEP_NAME						= "searchProfile";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[searchedProfiles=${searchedProfiles}]` );

	// Prepare the URL..
	// ---------------------------------------------------------
	let endpoint						= XRPC.api.pds.searchActorsTypeahead;

	// The URL is PDS, so... PDS Server
	let root							= getServerURL();
	let url								= root + endpoint + "?q=" + searchedProfiles;
	if (window.BSKY.DEBUG) console.debug(PREFIX + "Fetching data from the URL:", url);

	/*
    // Create the DPoP-Proof 'body' for this request.
	// ---------------------------------------------------------
	let dpopRequest						= new TYPES.DPoPRequest(
		BSKY.data.cryptoKey.privateKey,
		BSKY.data.jwk,
		APP_CLIENT_ID,
		BSKY.data.userAccessToken,
		BSKY.data.accessTokenHash,
		url,
		BSKY.data.dpopNonce,
		APICall.HTTP_GET);
	let dpopProof						= await DPOP.createDPoPProof(dpopRequest);
	*/

    // The DPoPProof.
	// ---------------------------------------------------------
	let dpopProof						= await DPOP.createDPoPProof( TYPES.DPoPRequest.getInstance( url, APICall.HTTP_GET ) )

    // The call headers.
	// ---------------------------------------------------------
    let headers										= {};
    headers[ APICall.HTTP_HEADER_ACCEPT ]			= APICall.CONTENT_TYPE_JSON;
    headers[ APICall.HTTP_HEADER_CONTENT_TYPE ]		= APICall.CONTENT_TYPE_FORM_ENCODED;
	headers[ APICall.HTTP_HEADER_AUTHORIZATION ]	= `${APICall.HTTP_HEADER_DPOP} ${BSKY.data.userAccessToken}`;
	headers[ APICall.HTTP_HEADER_DPOP ]				= dpopProof;
	headers[ APICall.HTTP_HEADER_DPOP_NONCE ]		= BSKY.data.dpopNonce;

    // The call fetch options.
	// ---------------------------------------------------------
    let fetchOptions					= {
        method: APICall.HTTP_GET,
        headers: headers
    }

    // The call params; with a typed format.
	// ---------------------------------------------------------
	const requestParams					= TYPES.HTTPRequest.getInstanceWithFetch( STEP_NAME, url, fetchOptions );

	/*
    // Finally, perform the call
	// ---------------------------------------------------------
 	let responseFromServer				= await APICall.call( STEP_NAME, url, fetchOptions );
	let payload						= responseFromServer.json;
	*/

    // The call.
	// ---------------------------------------------------------
	let responseFromServer				= null;
	try {
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Performing the call..." );
		responseFromServer				= await APICall.authenticatedCall( requestParams );
	} catch ( error ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR(${typeof error}):`, error );
		responseFromServer				= error;
	}

	// Sanity check
	// ---------------------------------------------------------
	if ( responseFromServer instanceof TYPES.HTTPResponseError ) {
		if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		throw responseFromServer;
	}

    // The response payload.
	// ---------------------------------------------------------
	const payload						= responseFromServer.json;

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return payload;
}

/* --------------------------------------------------------
 * PDS: Atomic function to retrieve the user AuthorFeed
 * -------------------------------------------------------- */
async function retrieveAuthorFeed(cursor) {
	const STEP_NAME						= "retrieveAuthorFeed";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userHandle " + BSKY.user.userHandle + "]" );

	// Prepare the URL..
	let endpoint						= XRPC.api.pds.getAuthorFeed;

	// The URL is protected, so... PDS Server
	let root							= getServerURL();
	let url								= root + endpoint;
	url									+= "?actor=" + BSKY.user.userHandle;
	url									+= "&limit=100";
	if ( !COMMON.isNullOrEmpty(cursor) ) {
		url								+= "&cursor=" + cursor;
	}

    // Create the DPoP-Proof 'body' for this request.
	// ---------------------------------------------------------
	let dpopRequest						= new TYPES.DPoPRequest(
		BSKY.data.cryptoKey.privateKey,
		BSKY.data.jwk,
		APP_CLIENT_ID,
		BSKY.data.userAccessToken,
		BSKY.data.accessTokenHash,
		url,
		BSKY.data.dpopNonce,
		APICall.HTTP_GET);
	let dpopProof						= await DPOP.createDPoPProof(dpopRequest)

    // TuneUp the call
	// ---------------------------------------------------------
    let headers										= {};
    headers[ APICall.HTTP_HEADER_ACCEPT ]			= APICall.CONTENT_TYPE_JSON;
	headers[ APICall.HTTP_HEADER_AUTHORIZATION ]	= `${APICall.HTTP_HEADER_DPOP} ${BSKY.data.userAccessToken}`;
	headers[ APICall.HTTP_HEADER_DPOP ]				= dpopProof;
	headers[ APICall.HTTP_HEADER_DPOP_NONCE ]		= BSKY.data.dpopNonce;

    let fetchOptions					= {
        method: APICall.HTTP_GET,
        headers: headers
    }

    // Finally, perform the call
	// ---------------------------------------------------------
 	let responseFromServer				= await APICall.call( STEP_NAME, url, fetchOptions );
	// Here, we gather the "access_token" item in the received json.
	let payload						= responseFromServer.json;

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
// export async function getAccessToken() {								return await APICall.tryAndCatch( "retrieveUserAccessToken", retrieveUserAccessToken ); }
// export async function getUserProfile( handle ) {						return await APICall.tryAndCatch( "retrieveUserProfile", retrieveUserProfile, handle ); }
// export async function getTrendingTopics( cursor ) {						return await APICall.tryAndCatch( "retrieveTrendingTopics", retrieveTrendingTopics, cursor ); }
// export async function getUnreadNotifications(renderHTMLErrors=true) {	return await APICall.tryAndCatch( "retrieveUnreadNotifications", retrieveUnreadNotifications, renderHTMLErrors ); }
// export async function refreshAccessToken( code ) {						return await APICall.tryAndCatch( "refreshUserAccessToken", refreshUserAccessToken, code ); }
// export async function logout( code ) {									return await APICall.tryAndCatch( "performUserLogout", performUserLogout ); }
// export async function getProfile( searchString ) {						return await APICall.tryAndCatch( "searchProfile", searchProfile, searchString ); }
export async function getAccessToken() {								return await retrieveUserAccessToken(); }
export async function getUserProfile( handle ) {						return await retrieveUserProfile( handle ); }
export async function getTrendingTopics( cursor ) {						return await retrieveTrendingTopics( cursor ); }
export async function getUnreadNotifications(renderHTMLErrors=true) {	return await retrieveUnreadNotifications( renderHTMLErrors ); }
export async function refreshAccessToken( code ) {						return await refreshUserAccessToken( code ); }
export async function logout( code ) {									return await performUserLogout(); }
export async function getProfile( searchString ) {						return await searchProfile( searchString ); }
export async function getUserFeeds( cursor ) {							return await retrieveUserFeeds( cursor ); }
export async function getListDetails( list, cursor ) {					return await retrieveListDetails( list, cursor ); }

export async function getAuthorFeed( cursor ) {							return await APICall.tryAndCatch( "retrieveAuthorFeed", retrieveAuthorFeed, cursor ); }
export async function getBlockOfRecords( queryString ) {				return await APICall.tryAndCatch( "retrieveRepoBlockOfRecords", retrieveRepoBlockOfRecords, queryString ); }
export async function getBlocks( cursor ) {								return await APICall.tryAndCatch( "retrieveUserBlocks", retrieveUserBlocks, cursor ); }
export async function getFollowers( cursor ) {							return await APICall.tryAndCatch( "retrieveUserFollowers", retrieveUserFollowers, cursor ); }
export async function getMutes( cursor ) {								return await APICall.tryAndCatch( "retrieveUserMutes", retrieveUserMutes, cursor ); }
export async function getNotifications(renderHTMLErrors=true) {			return await APICall.tryAndCatch( "retrieveNotifications", retrieveNotifications, renderHTMLErrors ); }
export async function getRecords( recordInfo ) {						return await APICall.tryAndCatch( "retrieveRepoListRecords", retrieveRepoListRecords, recordInfo ); }
export async function getUserBlockModLists( cursor ) {					return await APICall.tryAndCatch( "retrieveUserBlockingModerationLists", retrieveUserBlockingModerationLists, cursor ); }
export async function getUserLists( cursor ) {							return await APICall.tryAndCatch( "retrieveUserLists", retrieveUserLists, cursor ); }
export async function getUserModLists( cursor ) {						return await APICall.tryAndCatch( "retrieveUserMutingModerationLists", retrieveUserMutingModerationLists, cursor ); }


