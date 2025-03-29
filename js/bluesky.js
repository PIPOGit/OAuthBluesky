/**********************************************************
 * Module Info:
 *
 * This file contains all shared operative to work
 * against the Bluesky servers, under OAuth2.
 *
 * This module serves as a "common place" for:
 * + "login.js"
 * + "dashboard.js", and
 * + the "callback" pages and scripts.
 **********************************************************/


/**********************************************************
 * Module imports
 **********************************************************/
/* --------------------------------------------------------
 * Modules for Global configuration
 * -------------------------------------------------------- */
// The application configuration
import CONFIGURATION					from "./data/config.json" with { type: "json" };

/* --------------------------------------------------------
 * Modules with Base functions
 * -------------------------------------------------------- */
// Common functions
import * as COMMON						from "./modules/common/CommonFunctions.js";
// Common HTML functions
import * as HTML						from "./modules/common/HTML.js";

/* --------------------------------------------------------
 * Modules with Helper functions
 * -------------------------------------------------------- */
// Common Favicon functions
import * as FAVICON						from "./modules/utils/Favicon.js";
// Common Keyboard Listener functions
import * as KPListener					from "./modules/utils/KPListener.js";

/* --------------------------------------------------------
 * Modules with Crypto and authentication functions
 * -------------------------------------------------------- */
// Common OAuth2 functions
import * as OAuth2						from "./modules/auth/OAuth2.js";


/**********************************************************
 * Module Constants
 **********************************************************/
// Module SELF constants
const MODULE_NAME						= COMMON.getModuleName( import.meta.url );

// Inner constants
const API								= CONFIGURATION.api;
const LSKEYS							= CONFIGURATION.localStorageKeys;
const CLIENT_APP						= CONFIGURATION.clientApp;

// Bluesky constants
const APP_CLIENT_ID						= CLIENT_APP.client_id;


/**********************************************************
 * Module Variables
 **********************************************************/
window.BSKY								= window.BSKY || {};
window.BSKY.data						= {};
window.BSKY.user						= {};
window.BSKY.auth						= {};
window.BSKY.path						= {};


/**********************************************************
 * BOOTSTRAP Functions
 **********************************************************/
/* --------------------------------------------------------
 * Module Load
 * -------------------------------------------------------- */
( ( parent, argument ) => {
	if ( COMMON.getTypeOf( argument ) === 'function' ) {
		parent.addEventListener( "DOMContentLoaded", argument );
		return;
	};
}).call(
	this			// The reference object (as per protocol).
	, window		// The first argument for the constructor; the top-most object in the DOM hierarchy.
	, startUp		// The loading function to be executed, once the page is loaded.
);


/* --------------------------------------------------------
 * Module BootStrap Loader Function
 * -------------------------------------------------------- */
async function startUp() {
	'use strict'

	const STEP_NAME						= "startUp";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_MODULE_INFO			= `${PREFIX}[Module Info] `;

	// ---------------------------------------------------------
	// General default logging properties
	// ---------------------------------------------------------
	window.BSKY.DEBUG					= CONFIGURATION.global.debug;
	window.BSKY.DEBUG_FOLDED			= CONFIGURATION.global.debug_folded;
	window.BSKY.GROUP_DEBUG				= window.BSKY.DEBUG && window.BSKY.DEBUG_FOLDED;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// ================================================================
	// Module INFO INI

	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_MODULE_INFO );
	if (window.BSKY.DEBUG) console.debug( PREFIX_MODULE_INFO + "MODULE_NAME:", MODULE_NAME, "import.meta.url:", import.meta.url );
	if (window.BSKY.DEBUG) console.debug( PREFIX_MODULE_INFO + "CONST_URL:", new URL( window.location ) );
	if (window.BSKY.DEBUG) console.debug( PREFIX_MODULE_INFO + "Configuration:", CONFIGURATION );
	if (window.BSKY.DEBUG) console.debug( PREFIX_MODULE_INFO + "DEBUG:", window.BSKY.DEBUG, "DEBUG_FOLDED:", window.BSKY.DEBUG_FOLDED, "GROUP_DEBUG:", window.BSKY.GROUP_DEBUG );
	if (window.BSKY.DEBUG) console.debug( PREFIX_MODULE_INFO + "CLIENT_APP:", CLIENT_APP );
	if (window.BSKY.DEBUG) console.debug( PREFIX_MODULE_INFO + "PERMISSION: Notification.permission:", Notification.permission );
	if (window.BSKY.DEBUG) console.debug( PREFIX_MODULE_INFO + "PERMISSION: navigator.geolocation:", navigator.geolocation );
	if (window.BSKY.DEBUG) console.debug( PREFIX_MODULE_INFO + `Auto Logout: [${CONFIGURATION.global.autoLogout}]` );

	// Root Object setup.
	// ---------------------------------------------------------
	// + Properties
	window.BSKY.data.MILLISECONDS		= 250;
	window.BSKY.data.cryptoKey			= null;
	window.BSKY.data.jwk				= null;
	window.BSKY.data.dpopNonce			= null;
	window.BSKY.data.dpopNonceUsed		= null;
	window.BSKY.data.dpopNonceReceived	= null;
	window.BSKY.data.wwwAuthenticate	= null;
	// + Functions
	window.BSKY.saveRuntimeDataInLocalStorage	= saveRuntimeDataInLocalStorage;
	window.BSKY.restoreDataFromLocalStorage	= restoreDataFromLocalStorage;
	window.BSKY.checkIfWeAreInLocalhost	= checkIfWeAreInLocalhost;
	window.BSKY.checkUserAccessToken	= checkUserAccessToken;
	window.BSKY.faviconStandBy			= FAVICON.toStandBy;
	window.BSKY.faviconWorking			= FAVICON.toWorking;

	// Module INFO END
	// ================================================================
	if (window.BSKY.DEBUG) console.debug( PREFIX_MODULE_INFO + `ROOT object: [window.BSKY].`, window.BSKY );
	console.info( `Loaded module ${MODULE_NAME}.` );

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX_MODULE_INFO + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();

	// Page setup concrete actions.
	// ---------------------------------------------------------

	// Auto-detect the fallback URL from current...
	setupRootContext();

	// KeyPress configuration
	KPListener.setupKeypress();

	// HighlightJS configuration
	hljs.configure({ ignoreUnescapedHTML: true });

	// The App version.
	// ---------------------------------------------------------
	$( `#${HTML.APP_NAME}` ).html( CONFIGURATION.global.appName );
	$( `#${HTML.DIV_VERSION} > #${HTML.APP_NAME}` ).html( CONFIGURATION.global.appName );
	$( `#${HTML.DIV_VERSION} > #${HTML.APP_VERSION}` ).html( CONFIGURATION.global.appVersion );

	// ---------------------------------------------------------
	// End of module setup
	// ---------------------------------------------------------
	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/**********************************************************
 * PRIVATE Functions
 **********************************************************/
/* --------------------------------------------------------
 * Function to check whether we are in the "local environment".
 * -------------------------------------------------------- */
function checkIfWeAreInLocalhost() {
	const STEP_NAME						= "checkIfWeAreInLocalhost";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Guess where we are.
	let thisURL							= new URL(window.location);
	let isLocalhost						= COMMON.areEquals(thisURL.host, "localhost");
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Are we in localhost:`, isLocalhost );

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return isLocalhost;
}


/* --------------------------------------------------------
 * Context URL helper function
 * -------------------------------------------------------- */
function setupRootContext() {
	const STEP_NAME						= "setupRootContext";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// ROOT_CONTEXT
	// ---------------------------------------------------------
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Examining [${window.location}]...` );
	let currentURL						= new URL( window.location );
	let origin							= currentURL.origin;
	let path							= currentURL.pathname;
	let lastChar						= path.lastIndexOf( '/' );
	let rootContextPath					= path.substring( 0, lastChar );
	let rootContextURLFromCurrent		= new URL( currentURL.origin + rootContextPath );
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Detected ROOT URL: [${rootContextURLFromCurrent}]...` );

	// The "context".
	// ---------------------------------------------------------
	localStorage.setItem(LSKEYS.ROOT_URL, rootContextURLFromCurrent);
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Saved ROOT URL in localStorage: [${LSKEYS.ROOT_URL}==${rootContextURLFromCurrent}]...` );
	BSKY.path.root						= localStorage.getItem(LSKEYS.ROOT_URL);

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}

/* --------------------------------------------------------
 * Local Storage Helper functions: Save data
 * -------------------------------------------------------- */
function saveRuntimeDataInLocalStorage() {
	const STEP_NAME						= "saveRuntimeDataInLocalStorage";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userHandle=="+BSKY.user.userHandle+"]" );

	localStorage.setItem(LSKEYS.user.handle, BSKY.user.userHandle);
	let savedInformation				= {
		// Bluesky Variables
		userHandle:						BSKY.user.userHandle,
		userDid:						BSKY.user.userDid,
		userDidDocument:				BSKY.auth.userDidDocument,
		userPDSURL:						BSKY.auth.userPDSURL,
		userPDSMetadata:				BSKY.auth.userPDSMetadata,
		userAuthServerURL:				BSKY.auth.userAuthServerURL,
		userAuthServerDiscovery:		BSKY.auth.userAuthServerDiscovery,
		userAuthorizationEndPoint:		BSKY.auth.userAuthorizationEndPoint,
		userTokenEndPoint:				BSKY.auth.userTokenEndPoint,
		userPAREndPoint:				BSKY.auth.userPAREndPoint,
		userRevocationEndPoint:			BSKY.auth.userRevocationEndPoint,
		userAuthServerRequestURI:		BSKY.auth.userAuthServerRequestURI,
		dpopNonce:						BSKY.data.dpopNonce,
		dpopNonceUsed:					BSKY.data.dpopNonceUsed,
		dpopNonceReceived:				BSKY.data.dpopNonceReceived,
		wwwAuthenticate:				BSKY.data.wwwAuthenticate,
		// Auth variables
		state:							BSKY.auth.state,
		codeVerifier:					BSKY.auth.codeVerifier,
		codeChallenge:					BSKY.auth.codeChallenge,
		callbackData:					BSKY.auth.callbackData,
		redirectURL:					BSKY.auth.redirectURL,
		// Response from the access token request
		userAuthentication:				BSKY.data.userAuthentication,
		userAccessToken:				BSKY.data.userAccessToken,
		userRefreshToken:				BSKY.data.userRefreshToken,
		accessTokenHash:				BSKY.data.accessTokenHash
	};
	localStorage.setItem(LSKEYS.BSKYDATA, JSON.stringify( savedInformation ));
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Saved data in localStorage." );

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}

/* --------------------------------------------------------
 * Local Storage Helper functions: Load data
 * -------------------------------------------------------- */
function restoreDataFromLocalStorage() {
	const PREFIX						= `[${MODULE_NAME}:restoreDataFromLocalStorage] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Restore data from localStorage.
	let dataInLocalStorage				= localStorage.getItem(LSKEYS.BSKYDATA);

	let saved							= JSON.parse( dataInLocalStorage ) || {};
	if (window.BSKY.DEBUG) console.debug(PREFIX + "Gathered data from localStorage["+LSKEYS.BSKYDATA+"]:", saved);
	// Bluesky Variables
	BSKY.user.userHandle				= saved.userHandle;
	BSKY.user.userDid					= saved.userDid;
	// Auth Login variables
	BSKY.auth.userDidDocument			= saved.userDidDocument;
	BSKY.auth.userPDSURL				= saved.userPDSURL;
	BSKY.auth.userPDSMetadata			= saved.userPDSMetadata;
	BSKY.auth.userAuthServerURL			= saved.userAuthServerURL;
	BSKY.auth.userAuthServerDiscovery	= saved.userAuthServerDiscovery;
	BSKY.auth.userAuthorizationEndPoint	= saved.userAuthorizationEndPoint;
	BSKY.auth.userTokenEndPoint			= saved.userTokenEndPoint;
	BSKY.auth.userPAREndPoint			= saved.userPAREndPoint;
	BSKY.auth.userRevocationEndPoint	= saved.userRevocationEndPoint;
	BSKY.auth.userAuthServerRequestURI	= saved.userAuthServerRequestURI;
	BSKY.data.dpopNonce					= saved.dpopNonce;
	BSKY.data.dpopNonceUsed				= saved.dpopNonceUsed || saved.dpopNonce;
	BSKY.data.dpopNonceReceived			= saved.dpopNonceReceived;
	BSKY.data.wwwAuthenticate			= saved.wwwAuthenticate;
	// Auth variables
	BSKY.auth.state						= saved.state;
	BSKY.auth.codeVerifier				= saved.codeVerifier;
	BSKY.auth.codeChallenge				= saved.codeChallenge;
	BSKY.auth.callbackData				= saved.callbackData;
	BSKY.auth.redirectURL				= saved.redirectURL,
	// Response from the access token request
	BSKY.data.userAuthentication		= saved.userAuthentication;
	BSKY.data.userAccessToken			= saved.userAccessToken;
	BSKY.data.userRefreshToken			= saved.userRefreshToken;
	BSKY.data.accessTokenHash			= saved.accessTokenHash;

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END-" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * LOGIN PROCESS.
 *
 * Function to check whether we already have a
 * valid user access token.
 * -------------------------------------------------------- */
async function checkUserAccessToken() {
	const STEP_NAME						= "checkUserAccessToken";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// First step: Retrieve data from local storage, if any.
	// ---------------------------------------------------------
	restoreDataFromLocalStorage();

	// Second step: Retrieve, if any, the token.
	// ---------------------------------------------------------
	let valid							= false;
	if ( !COMMON.isNullOrEmpty( BSKY.data.userAccessToken ) ) {
		try {
			let tokenValidationInfo		= OAuth2.validateAccessToken( BSKY.data.userAccessToken, BSKY.auth.userAuthServerDiscovery, BSKY.data.userAuthentication, BSKY.auth.userDidDocument, BSKY.auth.userPDSMetadata );
			let isAccessTokenValid		= tokenValidationInfo.isValid;

			if ( isAccessTokenValid ) {
				if (window.BSKY.DEBUG) console.debug( PREFIX + `We have a VALID user access token. Continue.` );
				valid					= true;
			} else {
				if (window.BSKY.DEBUG) console.debug( PREFIX + `We have an INVALID user access token. Stop.` );
			}
		} catch ( error ) {
			if (window.BSKY.DEBUG) console.debug( PREFIX + `We have no user access token. Stop.` );
		}
	} else {
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Nothing restored." );
	}
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Valid token?:", valid );

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END-" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return valid;
}
