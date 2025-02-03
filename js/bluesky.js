/**********************************************************
 * File Info:
 *
 * This file contains all the operative to work
 * against the Bluesky servers, under OAuth2.
 *
 **********************************************************/


/**********************************************************
 * Module imports
 **********************************************************/
// Global configuration
import CONFIGURATION					from "./data/config.json" with { type: "json" };
// Common functions
import * as COMMON						from "./modules/common.functions.js";
// Common Classes and Exceptions ("Types")
import * as TYPES						from "./modules/common.types.js";
// To perform API calls
import * as APICall						from "./modules/APICall.js";
// Common BrowserDB functions
import * as DB							from "./modules/BrowserDB.js";
// Common HTML functions
import * as HTML						from "./modules/HTML.js";
// Common PKCE functions
import * as PKCE						from "./modules/PKCE.js";
// Common OAuth2 functions
import * as OAuth2						from "./modules/OAuth2.js";
// Common Base64 functions
import * as Base64						from "./modules/OAuth2/Base64Url.js";
// Common Crypto functions
import * as Crypto						from "./modules/OAuth2/Crypto.js";
// Common DPOP functions
import * as DPOP						from "./modules/OAuth2/dpopProof.js";
// Common JWT functions
import * as JWT							from "./modules/OAuth2/JWT.js";
// Common UUID functions
import * as UUID						from "./modules/OAuth2/UUID.js";


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
const NEOCITIES							= CONFIGURATION.neocities;

// HTML methods
const HTML_GET							= "GET";
const HTML_POST							= "POST";

// HTML Content Type constants
const CONTENT_TYPE_JSON					= "application/json";
const CONTENT_TYPE_JSON_UTF8			= "application/json; charset=utf-8";
const CONTENT_TYPE_FORM_ENCODED			= "application/x-www-form-urlencoded";

// Crypto constants
const SIGNING_ALGORITM					= "ECDSA";
const KEY_ALGORITM						= "ES256";
const CURVE_ALGORITM					= "P-256";
const HASHING_ALGORITM					= "SHA-256";

// Bluesky constants
const APP_CLIENT_ID						= NEOCITIES.client_id;
const APP_CALLBACK_URL					= NEOCITIES.redirect_uri;
const MAX_NOTIS_TO_RETRIEVE				= 50;


/**********************************************************
 * Module Variables
 **********************************************************/
let GROUP_DEBUG							= DEBUG && DEBUG_FOLDED;
window.BSKY								= window.BSKY || {};
window.BSKY.data						= {};

// Bluesky Variables
let userHandle							= null;
let userDid								= null;
let userDidDocument						= null;
let userPDSURL							= null;
let userPDSMetadata						= null;
let userAuthServerURL					= null;
let userAuthServerDiscovery				= null;
let userAuthorizationEndPoint			= null;
let userTokenEndPoint					= null;
let userPAREndPoint						= null;
let userRevocationEndPoint				= null;
let userAuthServerRequestURI			= null;

// Auth variables
let state								= null;
let codeVerifier						= null;
let codeChallenge						= null;
let callbackData						= null;

// Response from the access token request
let userAuthentication					= null;
let userAccessToken						= null;
let userRefreshToken					= null;
let accessTokenHash						= null;


/**********************************************************
 * BOOTSTRAP Functions
 **********************************************************/


/**********************************************************
 * Module Load
 **********************************************************/
( ( parent, argument ) => {
	if ( COMMON.getTypeOf( argument ) === 'function' ) {
		parent.addEventListener( "DOMContentLoaded", argument );
		return;
	};
}).call(
	this			// The reference object (as per protocol).
	, window		// The first argument for the constructor; the top-most object in the DOM hierarchy.
	, bootstrap		// The loading function to be executed, once the page is loaded.
);


/**********************************************************
 * Module BootStrap Loader Function
 **********************************************************/
async function bootstrap() {
	'use strict'

	const STEP_NAME						= "bootstrap";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (DEBUG) console.groupCollapsed( PREFIX );

	// ================================================================
	// Module info.
	if (DEBUG) console.debug( PREFIX + "MODULE_NAME:", MODULE_NAME, "import.meta.url:", import.meta.url );
	if (DEBUG) console.debug( PREFIX + "CONST_URL:", new URL( window.location ) );
	if (DEBUG) console.debug( PREFIX + "Configuration:", CONFIGURATION );
	if (DEBUG) console.debug( PREFIX + "DEBUG:", DEBUG, "DEBUG_FOLDED:", DEBUG_FOLDED, "GROUP_DEBUG:", GROUP_DEBUG );

	if (DEBUG) console.debug( PREFIX + "API:", API );
	if (DEBUG) console.debug( PREFIX + "NEOCITIES:", NEOCITIES );

	if (DEBUG) console.debug( PREFIX + "PERMISSION: Notification.permission:", Notification.permission );
	if (DEBUG) console.debug( PREFIX + "PERMISSION: navigator.geolocation:", navigator.geolocation );


	// ================================================================
	// Actualizamos el objeto raiz.
	// + Properties
	window.BSKY.data.MILLISECONDS		= 250;
	window.BSKY.data.cryptoKey			= null;
	window.BSKY.data.jwk				= null;
	window.BSKY.data.dpopNonce			= null;
	window.BSKY.data.dpopNonceUsed		= null;
	window.BSKY.data.dpopNonceReceived	= null;
	window.BSKY.data.wwwAuthenticate	= null;
	// + Functions
	window.BSKY.analizeCallbackURL		= fnAnalizeCallbackURL;
	window.BSKY.dashboard				= fnDashboard;
	window.BSKY.logout					= fnLogout;
	window.BSKY.refreshAccessToken		= fnRefreshAccessToken;
	if (DEBUG) console.debug( PREFIX + `Updated object: [window.BSKY].`, window.BSKY );

	// ================================================================
	// Page Events

	/*
		// JQuery Events
		$( window ).on( "load", function(jqEvent) {
			if (DEBUG) console.debug( PREFIX + `[$(window).on("load")] window is loaded` );
		});
		$( window ).on( "load", postBootstrap );
	*/

	/*
		// Vanilla Javascript Events
		window.onload = (event) => {
			// executes when complete page is fully loaded, including all frames, objects and images
			if (DEBUG) console.debug( PREFIX + `[window.onload] window is loaded` );
		};
	*/

	// ================================================================
	// Module END
	console.info( `Loaded module ${MODULE_NAME}, version ${MODULE_VERSION}.` );
	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (DEBUG) console.groupEnd();

	// ================================================================
	// Ejecutamos las acciones propias de esta página.

	// El reloj
	setInterval(() => HTML.clock(), BSKY.data.MILLISECONDS );

	// Geolocation
	await geoLocationInformation();

	// La configuración de HighlightJS
	hljs.configure({
		ignoreUnescapedHTML: true
	});
}

async function geoLocationInformation() {
	const STEP_NAME = "geoLocationInformation";
	const PREFIX = `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_SUCCESS				= `${PREFIX}[SUCCESS] `;
	const PREFIX_ERROR					= `${PREFIX}[ERROR] `;

	function geoLocationSuccess(position) {
		if (GROUP_DEBUG) console.groupCollapsed( PREFIX_SUCCESS );
		if (DEBUG) console.debug( PREFIX_SUCCESS + `Geolocated:`, position );
		if (DEBUG) console.debug( PREFIX_SUCCESS + "-- END" );
		if (GROUP_DEBUG) console.groupEnd();
	}

	function geoLocationError(error) {
		if (GROUP_DEBUG) console.groupCollapsed( PREFIX_ERROR );
		if (DEBUG) console.debug( PREFIX_ERROR + `Geolocation NOT ALLOWED:`, error );
		switch(error.code) {
			case error.PERMISSION_DENIED:
				if (DEBUG) console.debug( PREFIX_ERROR + "User denied the request for Geolocation." );
				break;
			case error.POSITION_UNAVAILABLE:
				if (DEBUG) console.debug( PREFIX_ERROR + "Location information is unavailable." );
				break;
			case error.TIMEOUT:
				if (DEBUG) console.debug( PREFIX_ERROR + "The request to get user location timed out." );
				break;
			case error.UNKNOWN_ERROR:
				if (DEBUG) console.debug( PREFIX_ERROR + "An unknown error occurred." );
				break;
			default:
				if (DEBUG) console.debug( PREFIX_ERROR + "Default unknown error occurred." );
		}
		if (DEBUG) console.debug( PREFIX_ERROR + "-- END" );
		if (GROUP_DEBUG) console.groupEnd();
	}

	// Process the geolocation steps
	if ( navigator.geolocation ) {
		await navigator.geolocation.getCurrentPosition(geoLocationSuccess, geoLocationError);
	} else {
		if (DEBUG) console.debug( PREFIX + `Geolocation NOT ALLOWED by the browser.` );
	}
}


/**********************************************************
 * HELPER Functions
 **********************************************************/
// Local Storage Helper functions
function saveRuntimeDataInLocalStorage() {
	const STEP_NAME						= "saveRuntimeDataInLocalStorage";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userHandle=="+userHandle+"]" );

	localStorage.setItem(LSKEYS.user.handle, userHandle);
	let savedInformation				= {
		// Bluesky Variables
		userHandle: userHandle,
		userDid: userDid,
		userDidDocument: userDidDocument,
		userPDSURL: userPDSURL,
		userPDSMetadata: userPDSMetadata,
		userAuthServerURL: userAuthServerURL,
		userAuthServerDiscovery: userAuthServerDiscovery,
		userAuthorizationEndPoint: userAuthorizationEndPoint,
		userTokenEndPoint: userTokenEndPoint,
		userPAREndPoint: userPAREndPoint,
		userRevocationEndPoint: userRevocationEndPoint,
		userAuthServerRequestURI: userAuthServerRequestURI,
		dpopNonce: BSKY.data.dpopNonce,
		dpopNonceUsed: BSKY.data.dpopNonceUsed,
		dpopNonceReceived: BSKY.data.dpopNonceReceived,
		wwwAuthenticate: BSKY.data.wwwAuthenticate,
		// Auth variables
		state: state,
		codeVerifier: codeVerifier,
		codeChallenge: codeChallenge,
		callbackData: callbackData,
		// Response from the access token request
		userAuthentication: userAuthentication,
		userAccessToken: userAccessToken,
		userRefreshToken: userRefreshToken,
		accessTokenHash: accessTokenHash
	};
	localStorage.setItem(LSKEYS.BSKYDATA, JSON.stringify( savedInformation ));
 	if (DEBUG) console.debug( PREFIX + "Saved data in localStorage." );

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
}

function restoreDataFromLocalStorage() {
	const PREFIX						= `[${MODULE_NAME}:restoreDataFromLocalStorage] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Restore data from localStorage.
	let dataInLocalStorage				= localStorage.getItem(LSKEYS.BSKYDATA);

	let saved = JSON.parse( dataInLocalStorage ) 
	if (DEBUG) console.debug(PREFIX + "Gathered data from localStorage, from test:", saved);
	// Bluesky Variables
	userHandle							= saved.userHandle;
	userDid								= saved.userDid;
	userDidDocument						= saved.userDidDocument;
	userPDSURL							= saved.userPDSURL;
	userPDSMetadata						= saved.userPDSMetadata;
	userAuthServerURL					= saved.userAuthServerURL;
	userAuthServerDiscovery				= saved.userAuthServerDiscovery;
	userAuthorizationEndPoint			= saved.userAuthorizationEndPoint;
	userTokenEndPoint					= saved.userTokenEndPoint;
	userPAREndPoint						= saved.userPAREndPoint;
	userRevocationEndPoint				= saved.userRevocationEndPoint;
	userAuthServerRequestURI			= saved.userAuthServerRequestURI;
	BSKY.data.dpopNonce					= saved.dpopNonce;
	BSKY.data.dpopNonceUsed				= saved.dpopNonceUsed || saved.dpopNonce;
	BSKY.data.dpopNonceReceived			= saved.dpopNonceReceived;
	BSKY.data.wwwAuthenticate			= saved.wwwAuthenticate;
	// Auth variables
	state								= saved.state;
	codeVerifier						= saved.codeVerifier;
	codeChallenge						= saved.codeChallenge;
	callbackData						= saved.callbackData;
	// Response from the access token request
	userAuthentication					= saved.userAuthentication;
	userAccessToken						= saved.userAccessToken;
	userRefreshToken					= saved.userRefreshToken;
	accessTokenHash						= saved.accessTokenHash;

	if (GROUP_DEBUG) console.groupEnd();
}


/**********************************************************
 * PRIVATE Functions
 **********************************************************/
async function retrieveUserAccessToken(code) {
	const STEP_NAME						= "retrieveUserAccessToken";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + " [code=="+code+"]" );

	// Prepare the URL..
    let url								= userTokenEndPoint;
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
		'code_verifier': codeVerifier,
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
	userAuthentication					= responseFromServer.body;
	userAccessToken						= userAuthentication.access_token;
	userRefreshToken					= userAuthentication.refresh_token;

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
	return { userAuthentication: userAuthentication, userAccessToken: userAccessToken };
}

async function refreshAccessToken() {
	const STEP_NAME						= "refreshAccessToken";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_AFTER					= `${PREFIX}[After] `;
	const PREFIX_PREFETCH				= `${PREFIX}[PREFETCH] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userHandle=="+userHandle+"]" );

 	if (DEBUG) console.debug( PREFIX + `Refreshing the access token...` );

	if (GROUP_DEBUG) console.groupCollapsed( PREFIX_PREFETCH );
	if (DEBUG) console.debug( PREFIX + "Current userRefreshToken:", userRefreshToken );
	if (DEBUG) console.debug( PREFIX + "Current userAuthentication:", userAuthentication );
	if (DEBUG) console.debug( PREFIX + "Current userAccessToken:", JWT.jwtToPrettyJSON( userAccessToken ) );

	// Prepare the URL..
    let url								= userTokenEndPoint;
 	if (DEBUG) console.debug( PREFIX + "Access Token URL:", url );

    // Create the DPoP-Proof 'body' for this request.
    // ------------------------------------------
	let dpopRequest						= new TYPES.DPoPRequest(BSKY.data.cryptoKey.privateKey, BSKY.data.jwk, APP_CLIENT_ID, userAccessToken, null, url, BSKY.data.dpopNonce, HTML_POST);
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
		'refresh_token': userRefreshToken
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

	userAuthentication					= responseFromServer.body;
	userAccessToken						= userAuthentication.access_token;
	userRefreshToken					= userAuthentication.refresh_token;
	if (DEBUG) console.debug(PREFIX_AFTER + "userAuthentication:", userAuthentication);
	if (DEBUG) console.debug(PREFIX_AFTER + "userAccessToken:", userAccessToken);
	if (DEBUG) console.debug(PREFIX_AFTER + "userRefreshToken:", userRefreshToken);

	// Let's create also the access token HASH...
	accessTokenHash					= await Crypto.createHash(userAccessToken, true);
	if (DEBUG) console.debug(PREFIX_AFTER + "accessTokenHash:", accessTokenHash);
	if (GROUP_DEBUG) console.groupEnd();

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
	return { userAuthentication: userAuthentication, userAccessToken: userAccessToken };
}

async function retrieveUnreadNotifications(renderHTMLErrors=true) {
	const STEP_NAME						= "retrieveUnreadNotifications";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_PREFETCH				= `${PREFIX}[PREFETCH] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + `[renderHTMLErrors==${renderHTMLErrors}]` );

	let endpoint						= API.bluesky.XRPC.api['app.bsky.notification.getUnreadCount'];
 	if (DEBUG) console.debug( PREFIX + "Preguntamos si hay notificaciones pendientes de leer... Invoking endpoint:", endpoint );

	let root							= userPDSURL + "/xrpc";
	let url								= root + endpoint;
	if (DEBUG) console.debug(PREFIX + "Fetching data from the (Authenticated) URL:", url);

	// Let's group the following messages
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX_PREFETCH );

    // Create the DPoP-Proof 'body' for this request.
	// We already have the cryptoKey somewhere, from previous calls...
    // ------------------------------------------
	let dpopRequest						= new TYPES.DPoPRequest(BSKY.data.cryptoKey.privateKey, BSKY.data.jwk, APP_CLIENT_ID, userAccessToken, accessTokenHash, url, BSKY.data.dpopNonce, HTML_GET);
	let dpopProof						= await DPOP.createDPoPProof(dpopRequest)
	if (DEBUG) console.debug( PREFIX_PREFETCH + "Received dpopProof:", JWT.jwtToPrettyJSON( dpopProof ) );

    // TuneUp the call
    // ------------------------------------------
    let headers							= {
		'Authorization': `DPoP ${userAccessToken}`,
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

async function retrieveNotifications(renderHTMLErrors=true) {
	const STEP_NAME						= "retrieveNotifications";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_PREFETCH				= `${PREFIX}[PREFETCH] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + `[renderHTMLErrors==${renderHTMLErrors}] [MAX ${MAX_NOTIS_TO_RETRIEVE} notifications to retrieve]` );

	let endpoint						= null;

	// TODO: Primero hay que preguntar si hay...
	//   See: https://docs.bsky.app/docs/api/app-bsky-notification-get-unread-count

	// Prepare the URL..
	endpoint							= API.bluesky.XRPC.api['app.bsky.notification.getUnreadCount'];
 	if (DEBUG) console.debug( PREFIX + "Preguntamos si hay notificaciones pendientes de leer... Invoking endpoint:", endpoint );


	// Prepare the URL..
	endpoint							= API.bluesky.XRPC.api.listNotifications;
	// let root = API.bluesky.XRPC.public;
	let root							= userPDSURL + "/xrpc";
	let url								= root + endpoint + "?limit=" + MAX_NOTIS_TO_RETRIEVE;		// Not much; it's a test!
	if (DEBUG) console.debug(PREFIX + "Fetching data from the (Authenticated) URL:", url);

	// Let's group the following messages
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX_PREFETCH );

    // Create the DPoP-Proof 'body' for this request.
	// We already have the cryptoKey somewhere, from previous calls...
    // ------------------------------------------
	let dpopRequest						= new TYPES.DPoPRequest(BSKY.data.cryptoKey.privateKey, BSKY.data.jwk, APP_CLIENT_ID, userAccessToken, accessTokenHash, url, BSKY.data.dpopNonce, HTML_GET);
	let dpopProof						= await DPOP.createDPoPProof(dpopRequest)
	if (DEBUG) console.debug( PREFIX_PREFETCH + "Received dpopProof:", JWT.jwtToPrettyJSON( dpopProof ) );

    // TuneUp the call
    // ------------------------------------------
    let headers							= {
		'Authorization': `DPoP ${userAccessToken}`,
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

async function retrieveUserProfile() {
	const STEP_NAME						= "retrieveUserProfile";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userHandle " + userHandle + "]" );

	// Prepare the URL..
	let endpoint						= API.bluesky.XRPC.api.getProfile;
	let root							= API.bluesky.XRPC.public;
	// let root = userPDSURL + "/xrpc";
	let url								= root + endpoint + "?actor=" + userHandle;
	if (DEBUG) console.debug(PREFIX + "Fetching data from the (Authenticated) URL:", url);

    // Create the DPoP-Proof 'body' for this request.
    // ------------------------------------------
	let dpopRequest						= new TYPES.DPoPRequest(BSKY.data.cryptoKey.privateKey, BSKY.data.jwk, APP_CLIENT_ID, userAccessToken, accessTokenHash, url, BSKY.data.dpopNonce, HTML_GET);
	let dpopProof						= await DPOP.createDPoPProof(dpopRequest)
	if (DEBUG) console.debug( PREFIX + "Received dpopProof:", JWT.jwtToPrettyJSON( dpopProof ) );

    // TuneUp the call
    // ------------------------------------------
    let headers							= {
		'Authorization': `DPoP ${userAccessToken}`,
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


/**********************************************************
 * LOGGED-IN PRIVATE Functions
 **********************************************************/

/* --------------------------------------------------------
 * LOGGED-IN PROCESS.
 *
 * "Business function": Retrieve notifications.
 * -------------------------------------------------------- */
async function getTheUserNotifications() {
	const STEP_NAME						= "getTheUserNotifications";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_RETRY					= `${PREFIX}[RETRY] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Clear and hide error fields and panel
	HTML.clearHTMLError();

	let apiCallResponse					= null;
	let unreadNotifications				= 0;

	// The unread user's notifications.
	try {
		// Let's retrieve first if there are unread user's notifications.
		// ------------------------------------------
		unreadNotifications				= await retrieveUnreadNotifications(false);
		if (DEBUG) console.debug( PREFIX + "Current unreadNotifications:", unreadNotifications );

		// Clear and hide error fields and panel
		HTML.clearHTMLError();
	} catch (error) {
		if (GROUP_DEBUG) console.groupEnd();

		// Check if the error is due to a different dpop-nonce in step 12...
		if ( COMMON.areEquals(error.step, "retrieveUnreadNotifications") && !COMMON.areEquals(BSKY.data.dpopNonceUsed, BSKY.data.dpopNonceReceived) ) {
			// Show the error and update the HTML fields
			HTML.updateHTMLError(error, false);

			if (DEBUG) console.debug( PREFIX + "Let's retry..." );
			if (GROUP_DEBUG) console.groupCollapsed( PREFIX_RETRY );
			try {
				unreadNotifications		= await retrieveUnreadNotifications( true );
				if (DEBUG) console.debug( PREFIX_RETRY + "Current unreadNotifications:", unreadNotifications );

				// Clear and hide error fields and panel
				HTML.clearHTMLError();
			} catch (error) {
				if (GROUP_DEBUG) console.groupEnd();
				
				// TODO: Si el error es de expiración del token [401]
				// vendrá algo así: {"error":"invalid_token","message":"\"exp\" claim timestamp check failed"}
				/*
				 */
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

			// Show the error and update the HTML fields
			HTML.updateHTMLError(error);
		}
	}

	if ( unreadNotifications > 0 ) {
		// The user's notifications.
		try {
			// Let's gather the user's notifications.
			// ------------------------------------------
			apiCallResponse				= await retrieveNotifications(false);
			if (DEBUG) console.debug( PREFIX + "Current apiCallResponse:", apiCallResponse );

			// Parse the response
			await HTML.parseNotifications( apiCallResponse, userAccessToken, APP_CLIENT_ID, accessTokenHash );
		} catch (error) {
			if (GROUP_DEBUG) console.groupEnd();

			// Check if the error is due to a different dpop-nonce in step 12...
			if ( COMMON.areEquals(error.step, "retrieveNotifications") && !COMMON.areEquals(BSKY.data.dpopNonceUsed, BSKY.data.dpopNonceReceived) ) {
				// Show the error and update the HTML fields
				HTML.updateHTMLError(error, false);

				if (DEBUG) console.debug( PREFIX + "Let's retry..." );
				if (GROUP_DEBUG) console.groupCollapsed( PREFIX_RETRY );
				try {
					apiCallResponse		= await retrieveNotifications( true );
					if (DEBUG) console.debug( PREFIX_RETRY + "Current apiCallResponse:", apiCallResponse );

					// Clear and hide error fields and panel
					HTML.clearHTMLError();

					// Parse the response
					await HTML.parseNotifications( apiCallResponse, userAccessToken, APP_CLIENT_ID, accessTokenHash );
				} catch (error) {
					if (GROUP_DEBUG) console.groupEnd();
					
					// TODO: Si el error es de expiración del token [401]
					// vendrá algo así: {"error":"invalid_token","message":"\"exp\" claim timestamp check failed"}
					/*
					 */
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

				// Show the error and update the HTML fields
				HTML.updateHTMLError(error);
			}
		}
	} else {
		if (DEBUG) console.debug( PREFIX + "No notifications to retrieve." );
	}

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * LOGGED-IN PROCESS.
 *
 * "Business function": Retrieve user Profile.
 * -------------------------------------------------------- */
async function getTheUserProfile() {
	const STEP_NAME						= "getTheUserProfile";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_ERROR					= `${PREFIX}[ERROR] `;
	const PREFIX_RETRY					= `${PREFIX}[RETRY] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Now, the user's profile.
	let apiCallResponse					= null;
	try {
		if (DEBUG) console.debug( PREFIX + `Let's retrieve the user's profile...` );

		// Retrieve user's profile to show
		// ------------------------------------------
		apiCallResponse					= await retrieveUserProfile();

		// Lo pintamos en su sitio.
		if (DEBUG) console.debug( PREFIX + "Current apiCallResponse:", apiCallResponse );
		HTML.htmlRenderUserProfile( apiCallResponse );
	} catch (error) {
		if (GROUP_DEBUG) console.groupEnd();

		// Show the error and update the HTML fields
		HTML.updateHTMLError(error);
		throw( error );
	}

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * LOGGED-IN PROCESS.
 *
 * "Business function": postProcessAccessToken.
 * -------------------------------------------------------- */
async function postProcessAccessToken() {
	const STEP_NAME						= "postProcessAccessToken";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_RAWDATA				= `${PREFIX}[RawData] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Swho some more information
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX_RAWDATA );
	if (DEBUG) console.debug( PREFIX_RAWDATA + "Current cryptoKey:", BSKY.data.cryptoKey );
	if (DEBUG) console.debug( PREFIX_RAWDATA + "Current cryptoKey:", COMMON.prettyJson( BSKY.data.cryptoKey ) );
	if (DEBUG) console.debug( PREFIX_RAWDATA + "Current jwk:", BSKY.data.jwk );
	if (DEBUG) console.debug( PREFIX_RAWDATA + "Current jwk:", COMMON.prettyJson( BSKY.data.jwk ) );
	if (DEBUG) console.debug( PREFIX_RAWDATA + "Current userAuthentication:", userAuthentication );
	if (DEBUG) console.debug( PREFIX_RAWDATA + "Current userAuthentication:", COMMON.prettyJson( userAuthentication ) );
	if (DEBUG) console.debug( PREFIX_RAWDATA + "Current userAccessToken:", userAccessToken );
	if (DEBUG) console.debug( PREFIX_RAWDATA + "Current userAccessToken:", JWT.jwtToPrettyJSON( userAccessToken ) );
	if (GROUP_DEBUG) console.groupEnd();

	// Let's backup the current data.
	saveRuntimeDataInLocalStorage();

	// Let's render the user's access token.
	// if (DEBUG) console.debug( PREFIX + "userAuthentication:", userAuthentication );
	if (DEBUG) console.debug( PREFIX + "Rendering the access token fields and panel..." );

	// Update HTML fields
	$("#notifications_json").removeAttr('data-highlighted');
	$("#access_token_jwt").removeAttr('data-highlighted');
	$("#access_token_json").removeAttr('data-highlighted');
	$("#access_token_jwt").text( userAccessToken );
	$("#access_token_json").text( JWT.jwtToPrettyJSON( userAccessToken ) );
	hljs.highlightAll();

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * LOGGED-IN PROCESS.
 *
 * "Business function": Validates the access token.
 * -------------------------------------------------------- */
async function validateAccessToken() {
	const STEP_NAME						= "validateAccessToken";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_RAWDATA				= `${PREFIX}[RawData] `;
	const PREFIX_AFTER					= `${PREFIX}[After] `;
	const PREFIX_ERROR					= `${PREFIX}[ERROR] `;
	const PREFIX_RETRY					= `${PREFIX}[Retry] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// ------------------------------------------
	// Retrieve the access_token
	let apiCallResponse					= null;
	let tokenValidationInfo				= false;
	let isAccessTokenValid				= false;
	let isTokenCloseToExpire			= false;

	if (DEBUG) console.debug( PREFIX + `Let's see whether we have a "valid" user access token...` );
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX_RAWDATA );
	if (DEBUG) console.debug( PREFIX_RAWDATA + "+ Current userAccessToken:", userAccessToken );
	if (DEBUG) console.debug( PREFIX_RAWDATA + "+ Current userAuthServerDiscovery:", userAuthServerDiscovery );
	if (DEBUG) console.debug( PREFIX_RAWDATA + "+ Current userAuthentication:", userAuthentication );
	if (GROUP_DEBUG) console.groupEnd();

	// Do we have access token?
	if (COMMON.isNullOrEmpty(userAccessToken)) {
		// NO. Let's see if this is the first time after login.

		if (DEBUG) console.debug( PREFIX + "MISS userAccessToken." );

		// Retrieve the "code"...
		if (DEBUG) console.debug( PREFIX + "Let's see if we have a code to retrieve the userAccessToken." );
		if (DEBUG) console.debug( PREFIX + "Current code:", callbackData.code );

		if (COMMON.isNullOrEmpty(callbackData.code)) {
			// NO. No token and no code. Throw an error.
			if (GROUP_DEBUG) console.groupEnd();
			throw new TYPES.AccessTokenError( OAuth2.ERROR_CODE_02 );
		} else {
			// YES. Let's retrieve the token

			// With the "code", let's retrieve the user access_token from the server.
			apiCallResponse					= await retrieveUserAccessToken(callbackData.code);
			if (DEBUG) console.debug( PREFIX + "Current apiCallResponse:", apiCallResponse );

			// Let's group log messages
			if (GROUP_DEBUG) console.groupCollapsed( PREFIX_AFTER );
			if (DEBUG) console.debug( PREFIX_AFTER + "Current apiCallResponse:", COMMON.prettyJson( apiCallResponse ) );

			// Parse the response
			userAuthentication				= apiCallResponse.userAuthentication;
			userAccessToken					= apiCallResponse.userAccessToken;
			if (DEBUG) console.debug(PREFIX_AFTER + "userAuthentication:", userAuthentication);
			if (DEBUG) console.debug(PREFIX_AFTER + "userAccessToken:", userAccessToken);

			// Let's create also the access token HASH...
			accessTokenHash					= await Crypto.createHash(userAccessToken, true);
			if (DEBUG) console.debug(PREFIX_AFTER + "accessTokenHash:", accessTokenHash);
			if (GROUP_DEBUG) console.groupEnd();
		}
	} else {
		// YES. Let's see if it's valid.

		if (DEBUG) console.debug( PREFIX + "GET userAccessToken" );

		tokenValidationInfo				= OAuth2.validateAccessToken( userAccessToken, userAuthServerDiscovery, userAuthentication, userDidDocument, userPDSMetadata );
		isAccessTokenValid				= tokenValidationInfo.isValid;
		isTokenCloseToExpire			= tokenValidationInfo.needsToRefresh;

		if ( isAccessTokenValid ) {
			if (DEBUG) console.debug( PREFIX + `We have a VALID user access token. Continue` );
		} else {
			throw new TYPES.AccessTokenError( OAuth2.ERROR_CODE_07 );
		}

		if ( isTokenCloseToExpire ) {
			if (DEBUG) console.debug( PREFIX + `We need to REFRESH the user access token.` );
			fnRefreshAccessToken();
		}
	}

	// Update some HTML fields
	// Prepare an object to pass
	HTML.updateHTMLFields(callbackData);

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
	return true;
}


/**********************************************************
 * PUBLIC Functions
 *
 * "public" == Available thru "BSKY" global variable.
 *
 * No need to declare them as "exported".
 * All of them are available thru the "window.BSKY" object.
 **********************************************************/
/* --------------------------------------------------------
 * LOGIN PROCESS.
 *
 * Function to finish "login page".
 * -------------------------------------------------------- */
function fnAnalizeCallbackURL() {
	const STEP_NAME						= "fnAnalizeCallbackURL";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Restore data from localStorage.
	restoreDataFromLocalStorage();

	// Retrieve URL information
	let thisURL							= new URL(window.location);

	// Retrieve data from the url
	let parsedSearch					= new URLSearchParams(thisURL.search);

	// Update data from the url
	callbackData						= HTML.updateHTMLFields( parsedSearch );
	if (DEBUG) console.debug( PREFIX + "callbackData:", callbackData );

	if (!COMMON.areEquals(thisURL.hostname, "localhost")) {
		// Estamos en Neocities.
		// Redirigimos a "localhost", que es donde tenemos los datos en el "localStorage".
		if (DEBUG) console.debug(PREFIX + "Processing the request in Neocities. Redirecting to localhost]...");

		// Read timeout from configuration
		let seconds						= NEOCITIES.redirect_delay;
		let $seconds					= $( "#redirectSeconds" )[0];
		$( "#redirectSeconds" ).html( seconds );
		if (DEBUG) console.debug(PREFIX + `The timeout is about ${seconds} second(s)...`);

		// Modify the URL...
		if (DEBUG) console.debug(PREFIX + "Processing the URL:", thisURL.toString());
		thisURL.protocol				= NEOCITIES.protocol;
		thisURL.hostname				= NEOCITIES.hostname;
		thisURL.pathname				= NEOCITIES.pathname;
		if (DEBUG) console.debug(PREFIX + "+ REDIRECT:", thisURL.toString());

		// Let's change the "action" of the link...
		let $link						= $( "div#redirectPanel a" );
		$link.attr("href", thisURL.href)

		// Hack: If the URL has been "typed"...
		let stop						= parsedSearch.get("stop");
		if ( COMMON.isNullOrEmpty(stop) ) {
			if (GROUP_DEBUG) console.groupEnd();
			setTimeout(() => { window.location = thisURL.href; }, seconds * 1000 );
		} else {
			if (DEBUG) console.warn(PREFIX + "Received a 'STOP' signal. Avoiding redirection.");
			if (GROUP_DEBUG) console.groupEnd();
		}
	} else {
		// Estamos en "localhost".

		// Show and hide panels
		// COMMON.show( "rootContainer" );
		// COMMON.hide( "panel-botonera" );
		COMMON.hide( "errorPanel" );

		// Redirigimos a "localhost", que es donde tenemos los datos en el "localStorage".
		if (DEBUG) console.debug(PREFIX + "Redirecting to", NEOCITIES.dashboard);

		// Cogemos los datos de la URL y nos los guardamos para redirigir a una página limpia y procesarlos ahí.
		// Guardamos toda la info y redirigimos a una "página (URL) limpia"
		if (DEBUG) console.debug( PREFIX + "Saving data in localStorage..." );
		saveRuntimeDataInLocalStorage();

		// Modify the URL...
		if (DEBUG) console.debug(PREFIX + "Processing the URL:", thisURL.toString());
		thisURL.pathname				= NEOCITIES.dashboard;
		thisURL.search					= '';
		if (DEBUG) console.debug(PREFIX + "+ REDIRECT:", thisURL.toString());

		if (GROUP_DEBUG) console.groupEnd();
		window.location					= thisURL.toString();
	}
}


/* --------------------------------------------------------
 * LOGGING PROCESS.
 *
 * "Business function": Welcome page.
 * "Landing function" after successfull login.
 * -------------------------------------------------------- */
async function fnDashboard() {
	const STEP_NAME						= "fnDashboard";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_AFTER					= `${PREFIX}[After] `;
	const PREFIX_ERROR					= `${PREFIX}[ERROR] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Show panels
	COMMON.show( "rootContainer" );
	// COMMON.show( "panel-botonera" );
	COMMON.hide( "errorPanel" );

	// Restore data from localStorage.
	restoreDataFromLocalStorage();

	// ------------------------------------------
	// Retrieve the access_token
	let apiCallResponse					= null;
	try {
		// First, let's validate the access token.
		// ------------------------------------------
		apiCallResponse					= await validateAccessToken();

		// Do something with the token information.
		// ------------------------------------------
		apiCallResponse					= await postProcessAccessToken();

		// Later, retrieve the rest of things.
		// ------------------------------------------

		// Retrieve the user's notifications.
		apiCallResponse					= await getTheUserNotifications();

		// Retrieve the user's profile to show
		apiCallResponse					= await getTheUserProfile();
	} catch (error) {
		if (GROUP_DEBUG) console.groupEnd();

		// Show the error and update the HTML fields
		HTML.updateHTMLError(error);
		throw( error );
	}

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * LOGGED-IN PROCESS.
 *
 * "Business function": Refresh Access Token.
 *
 * Refresh DPoP token sample:
 *
 *	POST /token HTTP/1.1
 *	Host: server.example.com
 *	Content-Type: application/x-www-form-urlencoded
 *	DPoP: eyJ0eXAiOiJkcG9wK2p3dCIsImFsZyI6IkVTMjU2IiwiandrIjp7Imt0eSI6Ik
 *		  VDIiwieCI6Imw4dEZyaHgtMzR0VjNoUklDUkRZOXpDa0RscEJoRjQyVVFVZldWQVdCR
 *		  nMiLCJ5IjoiOVZFNGpmX09rX282NHpiVFRsY3VOSmFqSG10NnY5VERWclUwQ2R2R1JE
 *		  QSIsImNydiI6IlAtMjU2In19.eyJqdGkiOiItQndDM0VTYzZhY2MybFRjIiwiaHRtIj
 *		  oiUE9TVCIsImh0dSI6Imh0dHBzOi8vc2VydmVyLmV4YW1wbGUuY29tL3Rva2VuIiwia
 *		  WF0IjoxNTYyMjY1Mjk2fQ.pAqut2IRDm_De6PR93SYmGBPXpwrAk90e8cP2hjiaG5Qs
 *		  GSuKDYW7_X620BxqhvYC8ynrrvZLTk41mSRroapUA
 *
 *	grant_type=refresh_token
 *	&refresh_token=Q..Zkm29lexi8VnWg2zPW1x-tgGad0Ibc3s3EwM_Ni4-g
 *
 * -------------------------------------------------------- */
async function fnRefreshAccessToken() {
	const STEP_NAME						= "fnRefreshAccessToken";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_RETRY					= `${PREFIX}[RETRY] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Clear and hide error fields and panel
	HTML.clearHTMLError();

	let apiCallResponse					= null;

	// The unread user's notifications.
	try {
		// Let's retrieve first if there are unread user's notifications.
		// ------------------------------------------
		apiCallResponse					= await refreshAccessToken();
		if (DEBUG) console.debug( PREFIX + "Current apiCallResponse:", apiCallResponse );

		// Clear and hide error fields and panel
		HTML.clearHTMLError();

		// First, let's validate the access token.
		// ------------------------------------------
		apiCallResponse					= await validateAccessToken();

		// Do something with the token information.
		// ------------------------------------------
		apiCallResponse					= await postProcessAccessToken();
	} catch (error) {
		if (GROUP_DEBUG) console.groupEnd();

		// Check if the error is due to a different dpop-nonce in step 12...
		if ( COMMON.areEquals(error.step, "refreshAccessToken") && !COMMON.areEquals(BSKY.data.dpopNonceUsed, BSKY.data.dpopNonceReceived) ) {
			// Show the error and update the HTML fields
			HTML.updateHTMLError(error, false);

			if (DEBUG) console.debug( PREFIX + "Let's retry..." );
			if (GROUP_DEBUG) console.groupCollapsed( PREFIX_RETRY );
			try {
				apiCallResponse			= await refreshAccessToken( true );
				if (DEBUG) console.debug( PREFIX_RETRY + "Current apiCallResponse:", apiCallResponse );

				// Clear and hide error fields and panel
				HTML.clearHTMLError();

				// First, let's validate the access token.
				// ------------------------------------------
				apiCallResponse					= await validateAccessToken();

				// Do something with the token information.
				// ------------------------------------------
				apiCallResponse					= await postProcessAccessToken();
			} catch (error) {
				if (GROUP_DEBUG) console.groupEnd();
				
				// TODO: Si el error es de expiración del token [401]
				// vendrá algo así: {"error":"invalid_token","message":"\"exp\" claim timestamp check failed"}
				/*
				 */
				if (   ( error.status==401 )									// authentication error
					&& ( error.isJson )											// json format
					&& ( COMMON.areEquals( error.json.error, 'invalid_token' ) ) ) {	// 'invalid token'
					// Redirigir a "logout".
					if (DEBUG) console.debug( PREFIX + "-- END" );
					if (GROUP_DEBUG) console.groupEnd();
					// await fnLogout();
				} else {
					// Show the error and update the HTML fields
					if (DEBUG) console.debug( PREFIX + "Not an 'invalid token' error." );
					HTML.updateHTMLError(error);
					throw( error );
				}
			}
			if (GROUP_DEBUG) console.groupEnd();
		} else {

			// Show the error and update the HTML fields
			HTML.updateHTMLError(error);
		}
	}

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * LOGGED-IN PROCESS.
 *
 * "Business function": Logout.
 * -------------------------------------------------------- */
async function fnLogout() {
	const STEP_NAME						= "fnLogout";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userHandle=="+userHandle+"]" );

    let body							= `token=${userAccessToken}`;
    let fetchOptions					= {
        method: HTML_POST,
        headers: {
			'Authorization': `DPoP ${userAccessToken}`,
            'Content-Type': CONTENT_TYPE_FORM_ENCODED
        },
        body: body
    }
    let url								= userRevocationEndPoint;
 	if (DEBUG) console.debug( PREFIX + "Invoking URL:", url );
 	if (DEBUG) console.debug( PREFIX + "+ with this options:", COMMON.prettyJson( fetchOptions ) );

 	let responseFromServer				= await APICall.makeAPICall( "fnLogout", url, fetchOptions );
	if (DEBUG) console.debug( PREFIX + "Received responseFromServer:", COMMON.prettyJson( responseFromServer ) );

	// Check if "logout" has been successfull
	let header							= responseFromServer.headers;
	if ( header.ok && header.status == 204 ) {
		// Remove things from localStorage
		localStorage.removeItem(LSKEYS.BSKYDATA);
		localStorage.removeItem(LSKEYS.user.profile);

		// Set, in localStorage, we come from "LOGOUT"
		localStorage.setItem(LSKEYS.LOGOUT, true);

		// Remove the crypto key from the database and the database itself.
		await DB.deleteDatabase();

		if (DEBUG) console.debug( PREFIX + "-- END" );
		if (GROUP_DEBUG) console.groupEnd();
		window.location					= CONFIGURATION.localhost.root;
	} else {
		if (DEBUG) console.warn( PREFIX + "ERROR!" );
		if (DEBUG) console.debug( PREFIX + "-- END" );
		if (GROUP_DEBUG) console.groupEnd();
	}
}




/*
https://public.api.bsky.app/xrpc/com.atproto.admin.getAccountInfo?did=did%3Dplc%3Dtjc27aje4uwxtw5ab6wwm4km
https://velvetfoot.us-east.host.bsky.network/xrpc/com.atproto.admin.getAccountInfo?did=did%3Dplc%3Dtjc27aje4uwxtw5ab6wwm4km
https://velvetfoot.us-east.host.bsky.network/xrpc/com.atproto.sync.getRepoStatus?did=did%3Dplc%3Dtjc27aje4uwxtw5ab6wwm4km%23atproto
https://velvetfoot.us-east.host.bsky.network/xrpc/com.atproto.sync.listRepos



*/
