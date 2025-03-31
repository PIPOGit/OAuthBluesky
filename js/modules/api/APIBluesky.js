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
/* --------------------------------------------------------
 * Modules for Global configuration
 * -------------------------------------------------------- */
// Global configuration
import CONFIGURATION					from "../../data/config.json" with { type: "json" };

/* --------------------------------------------------------
 * Modules with Base functions
 * -------------------------------------------------------- */
// Common functions
import * as COMMON						from "../common/CommonFunctions.js";
// Common HTML functions
import * as HTML						from "../common/HTML.js";
// Common Classes and Exceptions ("Types")
import * as TYPES						from "../common/CommonTypes.js";

/* --------------------------------------------------------
 * Modules with Helper functions
 * -------------------------------------------------------- */
// To perform API calls
import * as APICall						from "../utils/APICall.js";

/* --------------------------------------------------------
 * Modules with Crypto and authentication functions
 * -------------------------------------------------------- */
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
const NSID								= BLUESKY.NSID;

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


/* --------------------------------------------------------
 * Preparesr a standarized call.
 *
 * Body can be: null, a JSON object or a FormData.
 * -------------------------------------------------------- */
// async function performCall( step, method, url, headersType, body=null ) {
async function performCall( params ) {
	const STEP_NAME						= "performCall";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[${params.step}] [${params.method}==${params.url}]` );

    // The incoming data.
	// ---------------------------------------------------------
	let isWithATH						= !COMMON.isNullOrEmpty( params?.withATH );
	let isBody							= !COMMON.isNullOrEmpty( params?.body );
	let isRenderHTMLErrors				= !COMMON.isNullOrEmpty( params?.renderHTMLErrors );

    // The DPoPProof.
	// ---------------------------------------------------------
	let dpopProof						= null;
	if ( isWithATH && params.withATH ) {
		dpopProof						= await DPOP.createDPoPProof( TYPES.DPoPRequest.getInstanceWithoutATH( params.url, params.method ) );
	} else {
		dpopProof						= await DPOP.createDPoPProof( TYPES.DPoPRequest.getInstance( params.url, params.method ) );
	}

    // The call headers.
	// ---------------------------------------------------------
    let headers							= APICall.getHeaders( params.headersType, dpopProof );

    // The call fetch options.
	// ---------------------------------------------------------
    let fetchOptions					= {
        method: params.method,
        headers: headers
    };

    // The body.
	// ---------------------------------------------------------
	if ( isBody ) {
		const contentType				= headers[ APICall.HTTP_HEADER_CONTENT_TYPE ];
		const isOfTypeJSON				= COMMON.areEquals( contentType, APICall.CONTENT_TYPE_JSON ) || COMMON.areEquals( contentType, APICall.CONTENT_TYPE_JSON_UTF8 );
		const isOfTypeFORM				= COMMON.areEquals( contentType, APICall.CONTENT_TYPE_FORM_ENCODED );
		if ( isOfTypeJSON ) {
			fetchOptions.body			= JSON.stringify( params.body );
		} else if ( isOfTypeFORM ) {
			fetchOptions.body			= new URLSearchParams( params.body );
		} else {
			fetchOptions.body			= params.body;
		}
	}

    // The call params; with a typed format.
	// ---------------------------------------------------------
	const requestParams					= TYPES.HTTPRequest.getInstanceWithFetch( STEP_NAME, params.url, fetchOptions );

    // The call.
	// ---------------------------------------------------------
	let responseFromServer				= null;
	const renderHTMLErrors				= isRenderHTMLErrors ? params.renderHTMLErrors : true;
	try {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `On behalf of [${params.step}], calling: [<${params.method}> ${params.url}]...` );
		responseFromServer				= await APICall.authenticatedCall( requestParams, renderHTMLErrors );
		if (window.BSKY.DEBUG) console.debug( PREFIX + `Response from server:`, responseFromServer );
	} catch ( error ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR(${typeof error}): [code==${error.code}] [message==${error.message}] [cause==${error.cause}]` );
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

	// Prepare the URL.
	// ---------------------------------------------------------
	// The URL comes from the Discovery doc.
    let headersType						= APICall.HEADER_ENCODED_AUTH;
	const method						= APICall.HTTP_POST;
    let url								= BSKY.auth.userRevocationEndPoint;

	// The data to send
	// ---------------------------------------------------------
	let body							= new FormData();
	body.append( 'token', BSKY.data.userAccessToken );

    // The call.
	// ---------------------------------------------------------
	let responseFromServer				= null;
	let payload							= null;
	try {
		responseFromServer				= await performCall({
			step:				STEP_NAME,
			method:				method,
			url:				url,
			headersType:		headersType,
			body:				body
		});
	} catch ( error ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR(${typeof error}): [code==${error.code}] [message==${error.message}] [cause==${error.cause}]` );
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

	// Prepare the URL.
	// ---------------------------------------------------------
    let headersType						= APICall.HEADER_ENCODED_AUTH_DPOP;
	const method						= APICall.HTTP_POST;
    let url								= BSKY.auth.userTokenEndPoint;
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Access Token URL:", url );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();

	// The data to send
	// ---------------------------------------------------------
	let body							= new FormData();
	body.append( 'grant_type', 'refresh_token' );					// Fixed value
	body.append( 'refresh_token', BSKY.data.userRefreshToken );		// Variable value
	body.append( 'client_id', APP_CLIENT_ID );						// ClientAPP value
	body.append( 'redirect_uri', redirectURL );						// ClientAPP value

    // The call.
	// ---------------------------------------------------------
	let responseFromServer				= null;
	let payload							= null;
	try {
		responseFromServer				= await performCall({
			step:				STEP_NAME,
			method:				method,
			url:				url,
			headersType:		headersType,
			body:				body,
			withATH:			true
		});

		// The response payload.
		// ---------------------------------------------------------
		payload							= responseFromServer.json;
	} catch ( error ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR(${typeof error}): [code==${error.code}] [message==${error.message}] [cause==${error.cause}]` );
	}

    // Post-Process the payload.
	// ---------------------------------------------------------
	if ( !COMMON.isNullOrEmpty( payload ) ) {
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
	} else {
		return null;
	}
}

/* --------------------------------------------------------
 * Atomic function to retrieve the user access token
 * -------------------------------------------------------- */
async function retrieveUserAccessToken() {
	const STEP_NAME						= "retrieveUserAccessToken";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_PREFETCH				= `${PREFIX}[PREFETCH] `;

	// The incoming data
	// ---------------------------------------------------------
 	if (window.BSKY.DEBUG) console.debug( PREFIX + `Retrieving the access token...` );
	let code							= BSKY.auth.callbackData.code;
	let redirectURL						= BSKY.auth.redirectURL;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_PREFETCH + "[redirectURL=="+redirectURL+"] [code=="+code+"]" );
 	if (window.BSKY.DEBUG) console.debug( PREFIX_PREFETCH + "Received data:" );
 	if (window.BSKY.DEBUG) console.debug( PREFIX_PREFETCH + "+ code:", code );
 	if (window.BSKY.DEBUG) console.debug( PREFIX_PREFETCH + "+ redirectURL:", redirectURL );
 	if (window.BSKY.DEBUG) console.debug( PREFIX_PREFETCH + "+ dpopNonce:", BSKY.data.dpopNonce );

	// Prepare the URL.
	// ---------------------------------------------------------
    let headersType						= APICall.HEADER_ENCODED_AUTH_DPOP;
	const method						= APICall.HTTP_POST;
    let url								= BSKY.auth.userTokenEndPoint;
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Access Token URL:", url );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();

	// The data to send
	// ---------------------------------------------------------
	let body							= new FormData();
	body.append( 'grant_type', 'authorization_code' );				// Fixed value
	body.append( 'code', code );									// Variable value
	body.append( 'code_verifier', BSKY.auth.codeVerifier );			// Variable value
	body.append( 'client_id', APP_CLIENT_ID );						// ClientAPP value
	body.append( 'redirect_uri', redirectURL );						// ClientAPP value

    // The call.
	// ---------------------------------------------------------
	let responseFromServer				= null;
	let payload							= null;
	try {
		responseFromServer				= await performCall({
			step:				STEP_NAME,
			method:				method,
			url:				url,
			headersType:		headersType,
			body:				body
		});

		// The response payload.
		// ---------------------------------------------------------
		payload							= responseFromServer.json;
	} catch ( error ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR(${typeof error}): [code==${error.code}] [message==${error.message}] [cause==${error.cause}]` );
	}

    // Post-Process the payload.
	// ---------------------------------------------------------
	if ( !COMMON.isNullOrEmpty( payload ) ) {
		// Here, we gather the "access_token" item in the received json.
		BSKY.data.userAuthentication		= payload;
		BSKY.data.userAccessToken			= BSKY.data.userAuthentication.access_token;
		BSKY.data.userRefreshToken			= BSKY.data.userAuthentication.refresh_token;

		if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		return { userAuthentication: BSKY.data.userAuthentication, userAccessToken: BSKY.data.userAccessToken };
	} else {
		return null;
	}
}

/* --------------------------------------------------------
 * PDS: Atomic function to retrieve the user's profile
 * -------------------------------------------------------- */
async function retrieveUserProfile( handle, renderHTMLErrors=true ) {
	const STEP_NAME						= "retrieveUserProfile";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + " [handle " + handle + "]" );

	// Prepare the URL.
	// ---------------------------------------------------------
    let headersType						= APICall.HEADER_STANDARD_AUTH;
	const method						= APICall.HTTP_GET;
	let endpoint						= XRPC.api.pds.getProfile;
	let url								= getServerURL() + endpoint + "?actor=" + handle;

    // The call.
	// ---------------------------------------------------------
	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "Requesting the call..." );
	let responseFromServer				= null;
	let payload							= null;
	try {
		responseFromServer				= await performCall({
			step:				STEP_NAME,
			method:				method,
			url:				url,
			headersType:		headersType,
			renderHTMLErrors:	renderHTMLErrors
		});

		// The response payload.
		// ---------------------------------------------------------
		payload							= responseFromServer.json;
	} catch ( error ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR(${typeof error}): [code==${error.code}] [message==${error.message}] [cause==${error.cause}]` );
	}

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return payload;
}

/* --------------------------------------------------------
 * PDS: Atomic function to retrieve the user's unread notifications value
 * -------------------------------------------------------- */
async function retrieveUnreadNotifications( renderHTMLErrors=true ) {
	const STEP_NAME						= "retrieveUnreadNotifications";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_PREFETCH				= `${PREFIX}[PREFETCH] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[renderHTMLErrors==${renderHTMLErrors}]` );

	// Prepare the URL.
	// ---------------------------------------------------------
    let headersType						= APICall.HEADER_STANDARD_AUTH;
	const method						= APICall.HTTP_GET;
	let endpoint						= XRPC.api.pds.getUnreadCount;
	let url								= getServerURL() + endpoint;

    // The call.
	// ---------------------------------------------------------
	let responseFromServer				= null;
	let payload							= null;
	try {
		responseFromServer				= await performCall({
			step:				STEP_NAME,
			method:				method,
			url:				url,
			headersType:		headersType,
			renderHTMLErrors:	renderHTMLErrors
		});

		// The response payload.
		// ---------------------------------------------------------
		payload							= responseFromServer.json;
	} catch ( error ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR(${typeof error}): [code==${error.code}] [message==${error.message}] [cause==${error.cause}]` );
	}

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return payload;
}

/* --------------------------------------------------------
 * PDS: Atomic function to retrieve the user's notifications
 * -------------------------------------------------------- */
async function retrieveNotifications( renderHTMLErrors=true ) {
	const STEP_NAME						= "retrieveNotifications";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_PREFETCH				= `${PREFIX}[PREFETCH] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[renderHTMLErrors==${renderHTMLErrors}] [MAX ${MAX_NOTIS_TO_RETRIEVE} notifications to retrieve]` );

	// Prepare the URL.
	// ---------------------------------------------------------
    let headersType						= APICall.HEADER_STANDARD_AUTH;
	const method						= APICall.HTTP_GET;
	let endpoint						= XRPC.api.pds.listNotifications;
	let url								= getServerURL() + endpoint + "?limit=" + MAX_NOTIS_TO_RETRIEVE;		// Not much; it's a test!

    // The call.
	// ---------------------------------------------------------
	let responseFromServer				= null;
	let payload							= null;
	try {
		responseFromServer				= await performCall({
			step:				STEP_NAME,
			method:				method,
			url:				url,
			headersType:		headersType,
			renderHTMLErrors:	renderHTMLErrors
		});

		// The response payload.
		// ---------------------------------------------------------
		payload							= responseFromServer.json;
	} catch ( error ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR(${typeof error}): [code==${error.code}] [message==${error.message}] [cause==${error.cause}]` );
	}

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return payload.notifications;
}

/* --------------------------------------------------------
 * PDS: Atomic function to retrieve who the user follows
 * -------------------------------------------------------- */
async function retrieveUserFollows(cursor) {
	const STEP_NAME						= "retrieveUserFollows";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userHandle " + BSKY.user.userHandle + "]" );

	// Prepare the URL.
	// ---------------------------------------------------------
    let headersType						= APICall.HEADER_STANDARD_AUTH;
	const method						= APICall.HTTP_GET;
	let endpoint						= XRPC.api.pds.getFollows;
	let url								= getServerURL() + endpoint;
	url									+= "?actor=" + BSKY.user.userHandle;
	url									+= "&limit=100";
	if ( !COMMON.isNullOrEmpty(cursor) ) {
		url								+= "&cursor=" + cursor;
	}

    // The call.
	// ---------------------------------------------------------
	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "Requesting the call..." );
	let responseFromServer				= null;
	let payload							= null;
	try {
		responseFromServer				= await performCall({
			step:				STEP_NAME,
			method:				method,
			url:				url,
			headersType:		headersType
		});

		// The response payload.
		// ---------------------------------------------------------
		payload							= responseFromServer.json;
	} catch ( error ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR(${typeof error}): [code==${error.code}] [message==${error.message}] [cause==${error.cause}]` );
	}

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

	// Prepare the URL.
	// ---------------------------------------------------------
    let headersType						= APICall.HEADER_STANDARD_AUTH;
	const method						= APICall.HTTP_GET;
	let endpoint						= XRPC.api.pds.listRecords;
	let url								= getServerURL() + endpoint;
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

    // The call.
	// ---------------------------------------------------------
	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "Requesting the call..." );
	let responseFromServer				= null;
	let payload							= null;
	try {
		responseFromServer				= await performCall({
			step:				STEP_NAME,
			method:				method,
			url:				url,
			headersType:		headersType
		});

		// The response payload.
		// ---------------------------------------------------------
		payload							= responseFromServer.json;
	} catch ( error ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR(${typeof error}): [code==${error.code}] [message==${error.message}] [cause==${error.cause}]` );
	}

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

	// Prepare the URL.
	// ---------------------------------------------------------
    let headersType						= APICall.HEADER_STANDARD_AUTH;
	const method						= APICall.HTTP_GET;
	let endpoint						= XRPC.api.pds.getProfiles;
	let url								= getServerURL() + endpoint;
	url									+= queryString;

    // The call.
	// ---------------------------------------------------------
	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "Requesting the call..." );
	let responseFromServer				= null;
	let payload							= null;
	try {
		responseFromServer				= await performCall({
			step:				STEP_NAME,
			method:				method,
			url:				url,
			headersType:		headersType
		});

		// The response payload.
		// ---------------------------------------------------------
		payload							= responseFromServer.json;
	} catch ( error ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR(${typeof error}): [code==${error.code}] [message==${error.message}] [cause==${error.cause}]` );
	}

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
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[cursor==${cursor}]` );

	// Prepare the URL.
	// ---------------------------------------------------------
    let headersType						= APICall.HEADER_STANDARD_AUTH;
	const method						= APICall.HTTP_GET;
	let endpoint						= XRPC.api.pds.getFollowers;
	let url								= getServerURL() + endpoint;
	url									+= "?actor=" + BSKY.user.userHandle;
	url									+= "&limit=100";
	if ( !COMMON.isNullOrEmpty(cursor) ) {
		url								+= "&cursor=" + cursor;
	}

    // The call.
	// ---------------------------------------------------------
	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "Requesting the call..." );
	let responseFromServer				= null;
	let payload							= null;
	try {
		responseFromServer				= await performCall({
			step:				STEP_NAME,
			method:				method,
			url:				url,
			headersType:		headersType
		});

		// The response payload.
		// ---------------------------------------------------------
		payload							= responseFromServer.json;
	} catch ( error ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR(${typeof error}): [code==${error.code}] [message==${error.message}] [cause==${error.cause}]` );
	}

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

	// Prepare the URL.
	// ---------------------------------------------------------
    let headersType						= APICall.HEADER_STANDARD_AUTH;
	const method						= APICall.HTTP_GET;
	let endpoint						= XRPC.api.pds.getBlocks;
	let url								= getServerURL() + endpoint;
	url									+= "?limit=100";
	if ( !COMMON.isNullOrEmpty(cursor) ) {
		url								+= "&cursor=" + cursor;
	}

    // The call.
	// ---------------------------------------------------------
	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "Requesting the call..." );
	let responseFromServer				= null;
	let payload							= null;
	try {
		responseFromServer				= await performCall({
			step:				STEP_NAME,
			method:				method,
			url:				url,
			headersType:		headersType
		});

		// The response payload.
		// ---------------------------------------------------------
		payload							= responseFromServer.json;
	} catch ( error ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR(${typeof error}): [code==${error.code}] [message==${error.message}] [cause==${error.cause}]` );
	}

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

	// Prepare the URL.
	// ---------------------------------------------------------
    let headersType						= APICall.HEADER_STANDARD_AUTH;
	const method						= APICall.HTTP_GET;
	let endpoint						= XRPC.api.pds.getMutes;
	let url								= getServerURL() + endpoint;
	url									+= "?limit=100";
	if ( !COMMON.isNullOrEmpty(cursor) ) {
		url								+= "&cursor=" + cursor;
	}

    // The call.
	// ---------------------------------------------------------
	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "Requesting the call..." );
	let responseFromServer				= null;
	let payload							= null;
	try {
		responseFromServer				= await performCall({
			step:				STEP_NAME,
			method:				method,
			url:				url,
			headersType:		headersType
		});

		// The response payload.
		// ---------------------------------------------------------
		payload							= responseFromServer.json;
	} catch ( error ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR(${typeof error}): [code==${error.code}] [message==${error.message}] [cause==${error.cause}]` );
	}

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return payload;
}

/* --------------------------------------------------------
 * PDS: Atomic function to retrieve the details of a list
 * -------------------------------------------------------- */
async function retrieveListDetails( list, cursor, renderHTMLErrors=true ) {
	const STEP_NAME						= "retrieveListDetails";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[atUri==${list.uri}]` );

	// Prepare the URL.
	// ---------------------------------------------------------
    let headersType						= APICall.HEADER_STANDARD_AUTH;
	const method						= APICall.HTTP_GET;
	let endpoint						= XRPC.api.pds.getList;
	let url								= getServerURL() + endpoint;
	url									+= "?list=" + list.uri;
	url									+= "&limit=100";
	if ( !COMMON.isNullOrEmpty(cursor) ) {
		url								+= "&cursor=" + cursor;
	}

    // The call.
	// ---------------------------------------------------------
	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "Requesting the call..." );
	let responseFromServer				= null;
	let payload							= null;
	try {
		responseFromServer				= await performCall({
			step:				STEP_NAME,
			method:				method,
			url:				url,
			headersType:		headersType,
			renderHTMLErrors:	renderHTMLErrors
		});

		// The response payload.
		// ---------------------------------------------------------
		payload							= responseFromServer.json;
	} catch ( error ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR(${typeof error}): [code==${error.code}] [message==${error.message}] [cause==${error.cause}]` );
	}

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

	// Prepare the URL.
	// ---------------------------------------------------------
    let headersType						= APICall.HEADER_STANDARD_AUTH;
	const method						= APICall.HTTP_GET;
	let endpoint						= XRPC.api.pds.getLists;
	let url								= getServerURL() + endpoint;
	url									+= "?actor=" + BSKY.user.userHandle;
	url									+= "&limit=100";
	if ( !COMMON.isNullOrEmpty(cursor) ) {
		url								+= "&cursor=" + cursor;
	}

    // The call.
	// ---------------------------------------------------------
	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "Requesting the call..." );
	let responseFromServer				= null;
	let payload							= null;
	try {
		responseFromServer				= await performCall({
			step:				STEP_NAME,
			method:				method,
			url:				url,
			headersType:		headersType
		});

		// The response payload.
		// ---------------------------------------------------------
		payload							= responseFromServer.json;
	} catch ( error ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR(${typeof error}): [code==${error.code}] [message==${error.message}] [cause==${error.cause}]` );
	}

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

	// Prepare the URL.
	// ---------------------------------------------------------
    let headersType						= APICall.HEADER_STANDARD_AUTH;
	const method						= APICall.HTTP_GET;
	let endpoint						= XRPC.api.pds.getListMutes;
	let url								= getServerURL() + endpoint;
	url									+= "?actor=" + BSKY.user.userHandle;
	url									+= "&limit=100";
	if ( !COMMON.isNullOrEmpty(cursor) ) {
		url								+= "&cursor=" + cursor;
	}

    // The call.
	// ---------------------------------------------------------
	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "Requesting the call..." );
	let responseFromServer				= null;
	let payload							= null;
	try {
		responseFromServer				= await performCall({
			step:				STEP_NAME,
			method:				method,
			url:				url,
			headersType:		headersType
		});

		// The response payload.
		// ---------------------------------------------------------
		payload							= responseFromServer.json;
	} catch ( error ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR(${typeof error}): [code==${error.code}] [message==${error.message}] [cause==${error.cause}]` );
	}

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

	// Prepare the URL.
	// ---------------------------------------------------------
    let headersType						= APICall.HEADER_STANDARD_AUTH;
	const method						= APICall.HTTP_GET;
	let endpoint						= XRPC.api.pds.getListBlocks;
	let url								= getServerURL() + endpoint;
	url									+= "?actor=" + BSKY.user.userHandle;
	url									+= "&limit=100";
	if ( !COMMON.isNullOrEmpty(cursor) ) {
		url								+= "&cursor=" + cursor;
	}

    // The call.
	// ---------------------------------------------------------
	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "Requesting the call..." );
	let responseFromServer				= null;
	let payload							= null;
	try {
		responseFromServer				= await performCall({
			step:				STEP_NAME,
			method:				method,
			url:				url,
			headersType:		headersType
		});

		// The response payload.
		// ---------------------------------------------------------
		payload							= responseFromServer.json;
	} catch ( error ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR(${typeof error}): [code==${error.code}] [message==${error.message}] [cause==${error.cause}]` );
	}

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

	// Prepare the URL.
	// ---------------------------------------------------------
    let headersType						= APICall.HEADER_STANDARD_AUTH;
	const method						= APICall.HTTP_GET;
	let endpoint						= XRPC.api.pds.getActorFeeds;
	let url								= getServerURL() + endpoint;
	url									+= "?actor=" + encodeURIComponent( BSKY.user.userDid );
	url									+= "&limit=100";
	if ( !COMMON.isNullOrEmpty(cursor) ) {
		url								+= "&cursor=" + cursor;
	}

    // The call.
	// ---------------------------------------------------------
	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "Requesting the call..." );
	let responseFromServer				= null;
	let payload							= null;
	try {
		responseFromServer				= await performCall({
			step:				STEP_NAME,
			method:				method,
			url:				url,
			headersType:		headersType
		});

		// The response payload.
		// ---------------------------------------------------------
		payload							= responseFromServer.json;
	} catch ( error ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR(${typeof error}): [code==${error.code}] [message==${error.message}] [cause==${error.cause}]` );
	}

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

	// Prepare the URL.
	// ---------------------------------------------------------
    let headersType						= APICall.HEADER_STANDARD_AUTH;
	const method						= APICall.HTTP_GET;
	let endpoint						= XRPC.api.pds.getTrendingTopics;
	let url								= getServerURL() + endpoint;
	url									+= "?viewer=" + encodeURIComponent( BSKY.user.userDid );
	url									+= "&limit=25";
	if ( !COMMON.isNullOrEmpty(cursor) ) {
		url								+= "&cursor=" + cursor;
	}

    // The call.
	// ---------------------------------------------------------
	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "Requesting the call..." );
	let responseFromServer				= null;
	let payload							= null;
	try {
		responseFromServer				= await performCall({
			step:				STEP_NAME,
			method:				method,
			url:				url,
			headersType:		headersType
		});

		// The response payload.
		// ---------------------------------------------------------
		payload							= responseFromServer.json;
	} catch ( error ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR(${typeof error}): [code==${error.code}] [message==${error.message}] [cause==${error.cause}]` );
	}

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

	// Prepare the URL.
	// ---------------------------------------------------------
    let headersType						= APICall.HEADER_ENCODED_DPOP;
	const method						= APICall.HTTP_GET;
	let endpoint						= XRPC.api.pds.searchActorsTypeahead;
	let url								= getServerURL() + endpoint + "?q=" + searchedProfiles;
	if (window.BSKY.DEBUG) console.debug(PREFIX + "Fetching data from the URL:", url);

    // The call.
	// ---------------------------------------------------------
	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "Requesting the call..." );
	let responseFromServer				= null;
	let payload							= null;
	try {
		responseFromServer				= await performCall({
			step:				STEP_NAME,
			method:				method,
			url:				url,
			headersType:		headersType
		});

		// The response payload.
		// ---------------------------------------------------------
		payload							= responseFromServer.json;
	} catch ( error ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR(${typeof error}): [code==${error.code}] [message==${error.message}] [cause==${error.cause}]` );
	}

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
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[cursor==${cursor}]` );

	// Prepare the URL.
	// ---------------------------------------------------------
    let headersType						= APICall.HEADER_STANDARD_AUTH;
	const method						= APICall.HTTP_GET;
	let endpoint						= XRPC.api.pds.getAuthorFeed;
	let url								= getServerURL() + endpoint;
	url									+= "?actor=" + BSKY.user.userHandle;
	url									+= "&limit=100";
	if ( !COMMON.isNullOrEmpty(cursor) ) {
		url								+= "&cursor=" + cursor;
	}

    // The call.
	// ---------------------------------------------------------
	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "Requesting the call..." );
	let responseFromServer				= null;
	let payload							= null;
	try {
		responseFromServer				= await performCall({
			step:				STEP_NAME,
			method:				method,
			url:				url,
			headersType:		headersType
		});

		// The response payload.
		// ---------------------------------------------------------
		payload							= responseFromServer.json;
	} catch ( error ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR(${typeof error}): [code==${error.code}] [message==${error.message}] [cause==${error.cause}]` );
	}

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return payload;
}


/**********************************************************
 * SOCIAL Functions
 *	+ followAccount( did )
 *	+ unfollowAccount( did )
 *	+ muteAccount( did )
 *	+ unmuteAccount( did )
 *	+ blockAccount( did )
 *	+ unblockAccount( did )
 **********************************************************/
// Creates a record in the PDS Repo
async function createRecord( nsid, did ) {
	const STEP_NAME						= "createRecord";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[nsid==${nsid}] [did==${did}]` );

	// Prepare the URL.
	// ---------------------------------------------------------
    let headersType						= APICall.HEADER_STANDARD_JSON_AUTH;
	const method						= APICall.HTTP_POST;
	let endpoint						= XRPC.api.pds.createRecord;
	let url								= getServerURL() + endpoint;

	// The data to send
	// ---------------------------------------------------------
	const body						= {
		repo: BSKY.user.userDid,
		collection: nsid,
		record: {
			"$type": nsid,
			subject: did,
			createdAt: new Date().toISOString()
		}
	};
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Generated [body]:", COMMON.prettyJson( body ) );

    // The call.
	// ---------------------------------------------------------
	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "Requesting the call..." );
	let responseFromServer				= null;
	let payload							= null;
	try {
		responseFromServer				= await performCall({
			step:				STEP_NAME,
			method:				method,
			url:				url,
			headersType:		headersType,
			body:				body
		});

		// The response payload.
		// ---------------------------------------------------------
		payload							= responseFromServer.json;
	} catch ( error ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR(${typeof error}): [code==${error.code}] [message==${error.message}] [cause==${error.cause}]` );
	}

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return payload;
}

// Deletes a record in the PDS Repo
async function deleteRecord( nsid, rkey ) {
	const STEP_NAME						= "deleteRecord";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[nsid==${nsid}] [rkey==${rkey}]` );

	// Prepare the URL.
	// ---------------------------------------------------------
    let headersType						= APICall.HEADER_STANDARD_JSON_AUTH;
	const method						= APICall.HTTP_POST;
	let endpoint						= XRPC.api.pds.deleteRecord;
	let url								= getServerURL() + endpoint;

	// The data to send
	// ---------------------------------------------------------
	const body							= {
		repo: BSKY.user.userDid,
		collection: nsid,
		rkey: rkey
	};
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Generated [body]:", COMMON.prettyJson( body ) );

    // The call.
	// ---------------------------------------------------------
	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "Requesting the call..." );
	let responseFromServer				= null;
	let payload							= null;
	try {
		responseFromServer				= await performCall({
			step:				STEP_NAME,
			method:				method,
			url:				url,
			headersType:		headersType,
			body:				body
		});

		// The response payload.
		// ---------------------------------------------------------
		payload							= responseFromServer.json;
	} catch ( error ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR(${typeof error}): [code==${error.code}] [message==${error.message}] [cause==${error.cause}]` );
	}

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return payload;
}


/**********************************************************
 * PUBLIC Functions
 *
 * Exported functions; visible from outside.
 *
 * Each of them will perform a call to:
 * "APICall.authenticatedCall"
 **********************************************************/
export async function getAccessToken()									{ return await retrieveUserAccessToken(); }
export async function getAuthorFeed( cursor )							{ return await retrieveAuthorFeed( cursor ); }
export async function getBlockOfRecords( queryString )					{ return await retrieveRepoBlockOfRecords( queryString ); }
export async function getBlocks( cursor )								{ return await retrieveUserBlocks( cursor ); }
export async function getFollowers( cursor )							{ return await retrieveUserFollowers( cursor ); }
export async function getListDetails( list, cursor, renderHTMLErrors=true )	{ return await retrieveListDetails( list, cursor, renderHTMLErrors ); }
export async function getMutes( cursor )								{ return await retrieveUserMutes( cursor ); }
export async function getNotifications(renderHTMLErrors=true)			{ return await retrieveNotifications( renderHTMLErrors ); }
export async function getProfile( searchString )						{ return await searchProfile( searchString ); }
export async function getRecords( recordInfo )							{ return await retrieveRepoListRecords( recordInfo ); }
export async function getTrendingTopics( cursor )						{ return await retrieveTrendingTopics( cursor ); }
export async function getUnreadNotifications(renderHTMLErrors=true)		{ return await retrieveUnreadNotifications( renderHTMLErrors ); }
export async function getUserBlockModLists( cursor )					{ return await retrieveUserBlockingModerationLists( cursor ); }
export async function getUserFeeds( cursor )							{ return await retrieveUserFeeds( cursor ); }
export async function getUserLists( cursor )							{ return await retrieveUserLists( cursor ); }
export async function getUserModLists( cursor )							{ return await retrieveUserMutingModerationLists( cursor ); }
export async function getUserProfile( handle, renderHTMLErrors=true )	{ return await retrieveUserProfile( handle, renderHTMLErrors ); }
export async function logout( code )									{ return await performUserLogout(); }
export async function refreshAccessToken( code )						{ return await refreshUserAccessToken( code ); }

// Follow
export async function follow( did )										{ return await createRecord( NSID.follow, did ); }
export async function unfollow( rkey )									{ return await deleteRecord( NSID.follow, rkey ); }

// Mute
export async function mute( did )										{ return await createRecord( NSID.mute, did ); }
export async function unmute( rkey )									{ return await deleteRecord( NSID.mute, rkey ); }

// Block
export async function block( did )										{ return await createRecord( NSID.block, did ); }
export async function unblock( rkey )									{ return await deleteRecord( NSID.block, rkey ); }

