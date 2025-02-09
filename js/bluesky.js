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
// Common APIBluesky functions
import * as APIBluesky					from "./modules/APIBluesky.js";
// Common BrowserDB functions
import * as DB							from "./modules/BrowserDB.js";
// Common HTML functions
import * as HTML						from "./modules/HTML.js";
// Common OAuth2 functions
import * as OAuth2						from "./modules/OAuth2.js";
// Common Crypto functions
import * as Crypto						from "./modules/OAuth2/Crypto.js";
// Common JWT functions
import * as JWT							from "./modules/OAuth2/JWT.js";


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
// const API								= CONFIGURATION.api;
const LSKEYS							= CONFIGURATION.localStorageKeys;
const CLIENT_APP						= CONFIGURATION.clientApp;

// Bluesky constants
const APP_CLIENT_ID						= CLIENT_APP.client_id;


/**********************************************************
 * Module Variables
 **********************************************************/
let GROUP_DEBUG							= DEBUG && DEBUG_FOLDED;
let timerId								= 0;
window.BSKY								= window.BSKY || {};
window.BSKY.data						= {};
window.BSKY.user						= {};
window.BSKY.auth						= {};


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
	, startUp		// The loading function to be executed, once the page is loaded.
);


/**********************************************************
 * Module BootStrap Loader Function
 **********************************************************/
async function startUp() {
	'use strict'

	const STEP_NAME						= "startUp";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (DEBUG) console.groupCollapsed( PREFIX );

	// ================================================================
	// Module info.
	if (DEBUG) console.debug( PREFIX + "MODULE_NAME:", MODULE_NAME, "import.meta.url:", import.meta.url );
	if (DEBUG) console.debug( PREFIX + "CONST_URL:", new URL( window.location ) );
	if (DEBUG) console.debug( PREFIX + "Configuration:", CONFIGURATION );
	if (DEBUG) console.debug( PREFIX + "DEBUG:", DEBUG, "DEBUG_FOLDED:", DEBUG_FOLDED, "GROUP_DEBUG:", GROUP_DEBUG );

	if (DEBUG) console.debug( PREFIX + "CLIENT_APP:", CLIENT_APP );

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

	// ================================================================
	// Ejecutamos las acciones propias de esta página.

	// El reloj
	setInterval(() => HTML.clock(), BSKY.data.MILLISECONDS );
	if (DEBUG) console.debug( PREFIX + "Clock started" );

	// La configuración de HighlightJS
	hljs.configure({
		ignoreUnescapedHTML: true
	});

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (DEBUG) console.groupEnd();
}


/**********************************************************
 * HELPER Functions
 **********************************************************/
// Local Storage Helper functions
function saveRuntimeDataInLocalStorage() {
	const STEP_NAME						= "saveRuntimeDataInLocalStorage";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userHandle=="+BSKY.user.userHandle+"]" );

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
		// Response from the access token request
		userAuthentication:				BSKY.data.userAuthentication,
		userAccessToken:				BSKY.data.userAccessToken,
		userRefreshToken:				BSKY.data.userRefreshToken,
		accessTokenHash:				BSKY.data.accessTokenHash
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

	let saved = JSON.parse( dataInLocalStorage ) || {};
	if (DEBUG) console.debug(PREFIX + "Gathered data from localStorage["+LSKEYS.BSKYDATA+"]:", saved);
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
	// Response from the access token request
	BSKY.data.userAuthentication		= saved.userAuthentication;
	BSKY.data.userAccessToken			= saved.userAccessToken;
	BSKY.data.userRefreshToken			= saved.userRefreshToken;
	BSKY.data.accessTokenHash			= saved.accessTokenHash;

	if (GROUP_DEBUG) console.groupEnd();
}


/**********************************************************
 * PRIVATE Functions
 **********************************************************/


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

	// Info step
	HTML.showStepInfo( STEP_NAME, `Retrieving the user notifications...` );

	// Clear and hide error fields and panel
	HTML.clearHTMLError();

	// The unread user's notifications.
	if (DEBUG) console.debug( PREFIX + "Let's retrieve the number of unread notifications...");
	let unreadNotifications				= await APIBluesky.tryAndCatch( "retrieveUnreadNotifications", APIBluesky.retrieveUnreadNotifications, false );
	if (DEBUG) console.debug( PREFIX + "Current unreadNotifications:", unreadNotifications );

	if ( unreadNotifications > 0 ) {
		// The user's notifications.
		if (DEBUG) console.debug( PREFIX + `Let's retrieve the ${unreadNotifications} unread notifications...`);
		let notifications				= await APIBluesky.tryAndCatch( "retrieveNotifications", APIBluesky.retrieveNotifications, false );
		if (DEBUG) console.debug( PREFIX + "Current notifications:", notifications );

		// Parse the response
		await HTML.htmlRenderNotifications( notifications, BSKY.data.userAccessToken, APP_CLIENT_ID, BSKY.data.accessTokenHash );
	} else {
		if (DEBUG) console.debug( PREFIX + "No notifications to retrieve." );
		HTML.htmlRenderNoNotifications();
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

	// Info step
	HTML.showStepInfo( STEP_NAME, `Retrieving the user's profile...` );

	// Now, the user's profile.
	if (DEBUG) console.debug( PREFIX + `Let's retrieve the user's profile...` );
	let userProfile						= await APIBluesky.tryAndCatch( "retrieveUserProfile", APIBluesky.retrieveUserProfile, null );
	if (DEBUG) console.debug( PREFIX + "Current userProfile:", userProfile );

	// Save it.
	BSKY.user.profile					= userProfile;

	// Lo pintamos en su sitio.
	HTML.htmlRenderUserProfile( userProfile );

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * LOGGED-IN PROCESS.
 *
 * "Business function": Retrieve who the user follows.
 * -------------------------------------------------------- */
async function getWhoTheUserFollows() {
	const STEP_NAME						= "getWhoTheUserFollows";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_ALL					= `${PREFIX}[ALL] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Info step
	HTML.showStepInfo( STEP_NAME, `Retrieving who the user(${BSKY.user.userHandle}) follows...` );

	// Now, the user's follows.
	if (DEBUG) console.debug( PREFIX + `Let's retrieve who the user follows...` );
	let apiCallResponse					= null;
	let cursor							= null;
	let hayCursor						= false;
	let data							= null;
	let allData							= [];
	let n								= 0;
	let acumulado						= 0;
	let subTotal						= 0;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX_ALL );
	do {
		n++;
		// Retrieve user's follows to show
		// ------------------------------------------
		apiCallResponse					= await APIBluesky.tryAndCatch( "retrieveUserFollows", APIBluesky.retrieveUserFollows, cursor );
		if (PREFIX_ALL) console.debug( PREFIX + `+ [${n}] Current apiCallResponse:`, apiCallResponse );

		// Datos. Seguimos?
		cursor							= ( apiCallResponse.hasOwnProperty("cursor") ) ? apiCallResponse.cursor : null;
		hayCursor						= !COMMON.isNullOrEmpty(cursor);
		if (DEBUG) console.debug( PREFIX + `  Detected cursor: ${cursor} [hayCursor: ${hayCursor}]` );

		data							= apiCallResponse.follows;
		subTotal						= data.length;
		if (DEBUG) console.debug( PREFIX + `  Detected sub total: ${subTotal} following`, data );
		allData.push(...data);
		acumulado						= allData.length;
		if (DEBUG) console.debug( PREFIX + `  Detected acumulado: ${acumulado} following`, allData );
	} while ( hayCursor && (n<20) );
	if (GROUP_DEBUG) console.groupEnd();

	if (DEBUG) console.debug( PREFIX + `Detected ${acumulado} following`, allData );

	// Save it.
	BSKY.user.following					= allData;

	// Lo pintamos en su sitio.
	HTML.htmlRenderUserFollows( allData );

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * LOGGED-IN PROCESS.
 *
 * "Business function": Retrieve who the user follows.
 * -------------------------------------------------------- */
async function getWhoTheUserFollowsFromTheRepo() {
	const STEP_NAME						= "getWhoTheUserFollowsFromTheRepo";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_ALL					= `${PREFIX}[ALL] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Info step
	HTML.showStepInfo( STEP_NAME, `Retrieving who the user(${BSKY.user.userHandle}) follows...` );

	// Now, the user's follows.
	if (DEBUG) console.debug( PREFIX + `Let's retrieve who the user follows...` );
	let apiCallResponse					= null;
	let cursor							= null;
	let hayCursor						= false;
	let data							= null;
	let allData							= [];
	let n								= 0;
	let acumulado						= 0;
	let subTotal						= 0;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX_ALL );
	do {
		n++;
		// Retrieve user's follows (in the repo) to show
		// ------------------------------------------
		apiCallResponse					= await APIBluesky.tryAndCatch( "retrieveRepoListRecords", APIBluesky.retrieveRepoListRecords, cursor );
		if (PREFIX_ALL) console.debug( PREFIX + `+ [${n}] Current apiCallResponse:`, apiCallResponse );

		// Datos. Seguimos?
		cursor							= ( apiCallResponse.hasOwnProperty("cursor") ) ? apiCallResponse.cursor : null;
		hayCursor						= !COMMON.isNullOrEmpty(cursor);
		if (DEBUG) console.debug( PREFIX + `  Detected cursor: ${cursor} [hayCursor: ${hayCursor}]` );

		data							= apiCallResponse.records;
		subTotal						= data.length;
		if (DEBUG) console.debug( PREFIX + `  Detected sub total: ${subTotal} following`, data );
		allData.push(...data);
		acumulado						= allData.length;
		if (DEBUG) console.debug( PREFIX + `  Detected acumulado: ${acumulado} following`, allData );
	} while ( hayCursor && (n<20) );
	if (GROUP_DEBUG) console.groupEnd();

	if (DEBUG) console.debug( PREFIX + `Detected ${acumulado} following`, allData );

	// Save it.
	BSKY.user.following_repo			= allData;

	// Lo pintamos en su sitio.
	HTML.htmlRenderUserFollows( allData );

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * LOGGED-IN PROCESS.
 *
 * "Business function": Retrieve who the user is following.
 * -------------------------------------------------------- */
async function getTheUserFollowers() {
	const STEP_NAME						= "getTheUserFollowers";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_ALL					= `${PREFIX}[ALL] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Info step
	HTML.showStepInfo( STEP_NAME, `Retrieving who follows the user(${BSKY.user.userHandle})...` );

	// Now, the user's followers.
	if (DEBUG) console.debug( PREFIX + `Let's retrieve who follows the user...` );
	let apiCallResponse					= null;
	let cursor							= null;
	let hayCursor						= false;
	let data							= null;
	let allData							= [];
	let n								= 0;
	let acumulado						= 0;
	let subTotal						= 0;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX_ALL );
	do {
		n++;
		// Retrieve user's followers to show
		// ------------------------------------------
		apiCallResponse					= await APIBluesky.tryAndCatch( "retrieveUserFollowers", APIBluesky.retrieveUserFollowers, cursor );
		if (PREFIX_ALL) console.debug( PREFIX + `+ [${n}] Current apiCallResponse:`, apiCallResponse );
		
		// Datos. Seguimos?
		cursor							= ( apiCallResponse.hasOwnProperty("cursor") ) ? apiCallResponse.cursor : null;
		hayCursor						= !COMMON.isNullOrEmpty(cursor);
		if (DEBUG) console.debug( PREFIX + `  Detected cursor: ${cursor} [hayCursor: ${hayCursor}]` );

		data							= apiCallResponse.followers;
		subTotal						= data.length;
		if (DEBUG) console.debug( PREFIX + `  Detected sub total: ${subTotal} followers`, data );
		allData.push(...data);
		acumulado						= allData.length;
		if (DEBUG) console.debug( PREFIX + `  Detected acumulado: ${acumulado} followers`, allData );
		
	} while ( hayCursor && (n<20) );
	if (GROUP_DEBUG) console.groupEnd();

	if (DEBUG) console.debug( PREFIX + `Detected ${acumulado} followers`, allData );

	// Save it.
	BSKY.user.followers					= allData;

	// Lo pintamos en su sitio.
	HTML.htmlRenderUserFollowers( allData );

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * LOGGED-IN PROCESS.
 *
 * "Business function": Retrieve who the user is blocking.
 * -------------------------------------------------------- */
async function getWhoTheUserIsBlocking() {
	const STEP_NAME						= "getWhoTheUserIsBlocking";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_ALL					= `${PREFIX}[ALL] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Info step
	HTML.showStepInfo( STEP_NAME, `Retrieving who the user(${BSKY.user.userHandle}) is blocking...` );

	// Now, the user's blocks.
	if (DEBUG) console.debug( PREFIX + `Let's retrieve who the user is blocking...` );
	let apiCallResponse					= null;
	let cursor							= null;
	let hayCursor						= false;
	let data							= null;
	let allData							= [];
	let n								= 0;
	let acumulado						= 0;
	let subTotal						= 0;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX_ALL );
	do {
		n++;
		// Retrieve user's blocks
		// ------------------------------------------
		apiCallResponse					= await APIBluesky.tryAndCatch( "retrieveUserBlocks", APIBluesky.retrieveUserBlocks, cursor );
		if (PREFIX_ALL) console.debug( PREFIX + `+ [${n}] Current apiCallResponse:`, apiCallResponse );
		
		// Datos. Seguimos?
		cursor							= ( apiCallResponse.hasOwnProperty("cursor") ) ? apiCallResponse.cursor : null;
		hayCursor						= !COMMON.isNullOrEmpty(cursor);
		if (DEBUG) console.debug( PREFIX + `  Detected cursor: ${cursor} [hayCursor: ${hayCursor}]` );

		data							= apiCallResponse.blocks;
		subTotal						= data.length;
		if (DEBUG) console.debug( PREFIX + `  Detected sub total: ${subTotal} blocks`, data );
		allData.push(...data);
		acumulado						= allData.length;
		if (DEBUG) console.debug( PREFIX + `  Detected acumulado: ${acumulado} blocks`, allData );
		
	} while ( hayCursor && (n<20) );
	if (GROUP_DEBUG) console.groupEnd();

	if (DEBUG) console.debug( PREFIX + `Detected ${acumulado} blocks`, allData );

	// Save it.
	BSKY.user.blocks					= allData;

	// Lo pintamos en su sitio.
	HTML.htmlRenderUserBlocks( allData );

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * LOGGED-IN PROCESS.
 *
 * "Business function": Retrieve who the user is muting.
 * -------------------------------------------------------- */
async function getWhoTheUserIsMuting() {
	const STEP_NAME						= "getWhoTheUserIsMuting";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_ALL					= `${PREFIX}[ALL] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Info step
	HTML.showStepInfo( STEP_NAME, `Retrieving who the user(${BSKY.user.userHandle}) is muting...` );

	// Now, the user's mutes.
	let apiCallResponse					= null;
	if (DEBUG) console.debug( PREFIX + `Let's retrieve who the user is muting...` );
	let cursor							= null;
	let hayCursor						= false;
	let data							= null;
	let allData							= [];
	let n								= 0;
	let acumulado						= 0;
	let subTotal						= 0;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX_ALL );
	do {
		n++;
		// Retrieve user's mutes
		// ------------------------------------------
		apiCallResponse					= await APIBluesky.tryAndCatch( "retrieveUserMutes", APIBluesky.retrieveUserMutes, cursor );
		if (PREFIX_ALL) console.debug( PREFIX + `+ [${n}] Current apiCallResponse:`, apiCallResponse );
		
		// Datos. Seguimos?
		cursor							= ( apiCallResponse.hasOwnProperty("cursor") ) ? apiCallResponse.cursor : null;
		hayCursor						= !COMMON.isNullOrEmpty(cursor);
		if (DEBUG) console.debug( PREFIX + `  Detected cursor: ${cursor} [hayCursor: ${hayCursor}]` );

		data							= apiCallResponse.mutes;
		subTotal						= data.length;
		if (DEBUG) console.debug( PREFIX + `  Detected sub total: ${subTotal} mutes`, data );
		allData.push(...data);
		acumulado						= allData.length;
		if (DEBUG) console.debug( PREFIX + `  Detected acumulado: ${acumulado} mutes`, allData );
		
	} while ( hayCursor && (n<20) );
	if (GROUP_DEBUG) console.groupEnd();

	if (DEBUG) console.debug( PREFIX + `Detected ${acumulado} mutes`, allData );

	// Save it.
	BSKY.user.mutes						= allData;

	// Lo pintamos en su sitio.
	HTML.htmlRenderUserMutes( allData );

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * LOGGED-IN PROCESS.
 *
 * "Business function": Retrieve which are the user's lists.
 * -------------------------------------------------------- */
async function getTheUserLists() {
	const STEP_NAME						= "getTheUserLists";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_ALL					= `${PREFIX}[ALL] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Info step
	HTML.showStepInfo( STEP_NAME, `Retrieving the lists of the user(${BSKY.user.userHandle})...` );

	// Now, the user's mutes.
	let apiCallResponse					= null;
	if (DEBUG) console.debug( PREFIX + `Let's retrieve the lists of the user...` );
	let cursor							= null;
	let hayCursor						= false;
	let data							= null;
	let allData							= [];
	let n								= 0;
	let acumulado						= 0;
	let subTotal						= 0;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX_ALL );
	do {
		n++;
		// Retrieve user's lists
		// ------------------------------------------
		apiCallResponse					= await APIBluesky.tryAndCatch( "retrieveUserLists", APIBluesky.retrieveUserLists, cursor );
		if (PREFIX_ALL) console.debug( PREFIX + `+ [${n}] Current apiCallResponse:`, apiCallResponse );
		
		// Datos. Seguimos?
		cursor							= ( apiCallResponse.hasOwnProperty("cursor") ) ? apiCallResponse.cursor : null;
		hayCursor						= !COMMON.isNullOrEmpty(cursor);
		if (DEBUG) console.debug( PREFIX + `  Detected cursor: ${cursor} [hayCursor: ${hayCursor}]` );

		data							= apiCallResponse.lists;
		subTotal						= data.length;
		if (DEBUG) console.debug( PREFIX + `  Detected sub total: ${subTotal} lists`, data );
		allData.push(...data);
		acumulado						= allData.length;
		if (DEBUG) console.debug( PREFIX + `  Detected acumulado: ${acumulado} lists`, allData );
		
	} while ( hayCursor && (n<20) );
	if (GROUP_DEBUG) console.groupEnd();

	if (DEBUG) console.debug( PREFIX + `Detected ${acumulado} lists`, allData );

	// Save it.
	BSKY.user.lists						= allData;

	// Lo pintamos en su sitio.
	HTML.htmlRenderUserLists( allData );

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * LOGGED-IN PROCESS.
 *
 * "Business function": Retrieve the Trending Topics.
 *
 * EndPoint: app.bsky.unspecced.getTrendingTopics
 * SRC: https://github.com/bluesky-social/atproto/blob/main/packages/api/src/client/types/app/bsky/unspecced/getTrendingTopics.ts
 * -------------------------------------------------------- */
async function getTheTrendingTopics() {
	const STEP_NAME						= "getTheTrendingTopics";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_ALL					= `${PREFIX}[ALL] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Info step
	HTML.showStepInfo( STEP_NAME, `Retrieving the Trending Topics...` );

	// Now, the user's mutes.
	let apiCallResponse					= null;
	if (DEBUG) console.debug( PREFIX + `Let's retrieve the Trending Topics...` );
	let cursor							= null;
	let hayCursor						= false;
	let data							= {};
	data.topics							= {};
	data.suggested						= {};
	let allData							= {};
	allData.topics						= [];
	allData.suggested					= [];
	let acumulado						= 0;
	let subTotal						= 0;
	let n								= 0;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX_ALL );
	do {
		n++;
		// Retrieve the Trending Topics
		// ------------------------------------------
		apiCallResponse					= await APIBluesky.tryAndCatch( "retrieveTrendingTopics", APIBluesky.retrieveTrendingTopics, cursor );
		if (PREFIX_ALL) console.debug( PREFIX + `+ [${n}] Current apiCallResponse:`, apiCallResponse );
		
		// Datos. Seguimos?
		cursor							= ( apiCallResponse.hasOwnProperty("cursor") ) ? apiCallResponse.cursor : null;
		hayCursor						= !COMMON.isNullOrEmpty(cursor);
		if (DEBUG) console.debug( PREFIX + `  Detected cursor: ${cursor} [hayCursor: ${hayCursor}]` );

		// Topics
		data.topics						= apiCallResponse.topics;
		subTotal						= data.topics.length;
		if (DEBUG) console.debug( PREFIX + `  Detected sub total: ${subTotal} Trending Topics - Topics`, data.topics );
		allData.topics.push(...data.topics);
		acumulado						= allData.topics.length;
		if (DEBUG) console.debug( PREFIX + `  Detected acumulado: ${acumulado} Trending Topics - Topics`, allData.topics );

		// Suggested
		data.suggested					= apiCallResponse.suggested;
		subTotal						= data.suggested.length;
		if (DEBUG) console.debug( PREFIX + `  Detected sub total: ${subTotal} Trending Topics - Suggested`, data.suggested );
		allData.suggested.push(...data.suggested);
		acumulado						= allData.suggested.length;
		if (DEBUG) console.debug( PREFIX + `  Detected acumulado: ${acumulado} Trending Topics - Suggested`, allData.suggested );

	} while ( hayCursor && (n<20) );
	if (GROUP_DEBUG) console.groupEnd();

	if (DEBUG) console.debug( PREFIX + `Detected Trending Topics`, allData );

	// Save it.
	BSKY.user.trendingTopics			= allData;

	// Lo pintamos en su sitio.
	HTML.htmlRenderTrendingTopics( allData );

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * LOGGED-IN PROCESS.
 *
 * "Business function": Cross-check relationships.
 * -------------------------------------------------------- */
async function getTheRelations() {
	const STEP_NAME						= "getTheRelations";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_ALL					= `${PREFIX}[ALL] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Info step
	HTML.showStepInfo( STEP_NAME, `Cross-checking relationships with the user [${BSKY.user.userHandle}]...` );

	if (DEBUG) console.warn( PREFIX + "Under Development!" );
	// TODO: Cross-check following, followers, blocks and mutes with
	// + [getKnownFollowers]	https://docs.bsky.app/docs/api/app-bsky-graph-get-known-followers
	// + [getRelationships]		https://docs.bsky.app/docs/api/app-bsky-graph-get-relationships
	// + [getProfiles]			https://docs.bsky.app/docs/api/app-bsky-actor-get-profiles

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * LOGGED-IN PROCESS.
 *
 * "Business function": postProcessAccessToken.
 * -------------------------------------------------------- */
function postProcessAccessToken() {
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
	if (DEBUG) console.debug( PREFIX_RAWDATA + "Current userAuthentication:", BSKY.data.userAuthentication );
	if (DEBUG) console.debug( PREFIX_RAWDATA + "Current userAuthentication:", COMMON.prettyJson( BSKY.data.userAuthentication ) );
	if (DEBUG) console.debug( PREFIX_RAWDATA + "Current userAccessToken:", BSKY.data.userAccessToken );
	if (DEBUG) console.debug( PREFIX_RAWDATA + "Current userAccessToken:", JWT.jwtToPrettyJSON( BSKY.data.userAccessToken ) );
	if (DEBUG) console.debug( PREFIX_RAWDATA + "Current BSKY.data.dpopNonce:", BSKY.data.dpopNonce);
	if (GROUP_DEBUG) console.groupEnd();

	// Let's backup the current data.
	saveRuntimeDataInLocalStorage();

	// Let's render the user's access token.
	// if (DEBUG) console.debug( PREFIX + "userAuthentication:", BSKY.data.userAuthentication );
	if (DEBUG) console.debug( PREFIX + "Rendering the access token fields and panel..." );

	// Update HTML fields
	HTML.updateUserAccessToken(APP_CLIENT_ID, BSKY.data.userAccessToken);
	HTML.htmlRenderHighlight();

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

	// Info step
	HTML.showStepInfo( STEP_NAME, `The access token for the user(${BSKY.user.userHandle})...` );

	// ------------------------------------------
	// Retrieve the access_token
	let apiCallResponse					= null;
	let tokenValidationInfo				= false;
	let isAccessTokenValid				= false;
	let isTokenCloseToExpire			= false;

	if (DEBUG) console.debug( PREFIX + `Let's see whether we have a "valid" user access token...` );
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX_RAWDATA );
	if (DEBUG) console.debug( PREFIX_RAWDATA + "+ Current userAccessToken:", BSKY.data.userAccessToken );
	if (DEBUG) console.debug( PREFIX_RAWDATA + "+ Current userAuthServerDiscovery:", BSKY.auth.userAuthServerDiscovery );
	if (DEBUG) console.debug( PREFIX_RAWDATA + "+ Current userAuthentication:", BSKY.data.userAuthentication );
	if (GROUP_DEBUG) console.groupEnd();

	// Do we have access token?
	if (COMMON.isNullOrEmpty(BSKY.data.userAccessToken)) {
		// NO. Let's see if this is the first time after login.

		if (DEBUG) console.debug( PREFIX + "No userAccessToken." );

		// Retrieve the "code"...
		if (DEBUG) console.debug( PREFIX + "Let's see if we have a code to retrieve the userAccessToken." );
		
		let lsCallbackData				= null;
		// Let's see if there is something in the localStorage...
		lsCallbackData					= localStorage.getItem(LSKEYS.CALLBACK_DATA) || null;
		if (COMMON.isNullOrEmpty(lsCallbackData)) {
			if (DEBUG) console.debug( PREFIX + "Nothing in the localStorage." );
		} else {
			if (DEBUG) console.debug( PREFIX + "Something in the localStorage." );
			BSKY.auth.callbackData		= JSON.parse( lsCallbackData );
			if (DEBUG) console.debug( PREFIX_AFTER + "Detected:", COMMON.prettyJson( BSKY.auth.callbackData ) );
		}

		lsCallbackData					= localStorage.getItem(LSKEYS.CALLBACK_URL) || null;
		if (COMMON.isNullOrEmpty(lsCallbackData)) {
			if (DEBUG) console.debug( PREFIX + "Nothing in the localStorage." );
		} else {
			if (DEBUG) console.debug( PREFIX + "Something in the localStorage." );
			BSKY.auth.redirectURL		= lsCallbackData;
			if (DEBUG) console.debug( PREFIX_AFTER + "Detected:", BSKY.auth.redirectURL );
		}

		if (DEBUG) console.debug( PREFIX + "Current code:", BSKY.auth.callbackData.code );

		if (COMMON.isNullOrEmpty(BSKY.auth.callbackData.code)) {
			// NO. No token and no code. Throw an error.
			if (GROUP_DEBUG) console.groupEnd();
			throw new TYPES.AccessTokenError( OAuth2.ERROR_CODE_02 );
		} else {
			// YES. Let's retrieve the token

			// With the "code", let's retrieve the user access_token from the server.
			apiCallResponse					= await APIBluesky.tryAndCatch( "retrieveUserAccessToken", APIBluesky.retrieveUserAccessToken );
			if (DEBUG) console.debug( PREFIX + "Current apiCallResponse:", apiCallResponse );

			// Let's group log messages
			if (GROUP_DEBUG) console.groupCollapsed( PREFIX_AFTER );
			if (DEBUG) console.debug( PREFIX_AFTER + "Current apiCallResponse:", COMMON.prettyJson( apiCallResponse ) );

			// Parse the response
			BSKY.data.userAuthentication	= apiCallResponse.userAuthentication;
			BSKY.data.userAccessToken		= apiCallResponse.userAccessToken;
			if (DEBUG) console.debug(PREFIX_AFTER + "userAuthentication:", BSKY.data.userAuthentication);
			if (DEBUG) console.debug(PREFIX_AFTER + "userAccessToken:", BSKY.data.userAccessToken);

			// Let's create also the access token HASH...
			BSKY.data.accessTokenHash	= await Crypto.createHash(BSKY.data.userAccessToken, true);
			if (DEBUG) console.debug(PREFIX_AFTER + "accessTokenHash:", BSKY.data.accessTokenHash);
			if (GROUP_DEBUG) console.groupEnd();
		}
	} else {
		// YES. Let's see if it's valid.

		if (DEBUG) console.debug( PREFIX + "GET userAccessToken" );

		tokenValidationInfo				= OAuth2.validateAccessToken( BSKY.data.userAccessToken, BSKY.auth.userAuthServerDiscovery, BSKY.data.userAuthentication, BSKY.auth.userDidDocument, BSKY.auth.userPDSMetadata );
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

	// Do something with the token information: Post Process the access token
	postProcessAccessToken();

	// Update some HTML fields
	// Prepare an object to pass
	HTML.updateHTMLFields(BSKY.auth.callbackData);

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

	// Let's refresh the user's access token.
	// ------------------------------------------
	let refreshedAccessToken			= await APIBluesky.tryAndCatch( "refreshAccessToken", APIBluesky.refreshAccessToken, BSKY.auth.callbackData.code );
	if (DEBUG) console.debug( PREFIX + "Current refreshedAccessToken:", refreshedAccessToken );

	// Clear and hide error fields and panel
	HTML.clearHTMLError();

	// First, let's validate the access token.
	// ------------------------------------------
	if (DEBUG) console.debug( PREFIX + "Validating the refreshed token..." );
	await validateAccessToken();

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
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userHandle=="+BSKY.user.userHandle+"]" );

	let loggedOutInfo					= await APIBluesky.tryAndCatch( "performUserLogout", APIBluesky.performUserLogout, null );
	if (DEBUG) console.debug( PREFIX + "Current loggedOutInfo:", loggedOutInfo );

	// Check if "logout" has been successfull
	let header							= loggedOutInfo.headers;
	if ( header.ok && header.status == 204 ) {
		// Remove things from localStorage
		localStorage.removeItem(LSKEYS.BSKYDATA);
		if (DEBUG) console.debug( PREFIX + "Deleted localStorage item:", LSKEYS.BSKYDATA );
		localStorage.removeItem(LSKEYS.ROOT_URL);
		if (DEBUG) console.debug( PREFIX + "Deleted localStorage item:", LSKEYS.ROOT_URL );
		localStorage.removeItem(LSKEYS.user.profile);
		if (DEBUG) console.debug( PREFIX + "Deleted localStorage item:", LSKEYS.user.profile );
		localStorage.removeItem(LSKEYS.CALLBACK_DATA);
		if (DEBUG) console.debug( PREFIX + "Deleted localStorage item:", LSKEYS.CALLBACK_DATA );
		localStorage.removeItem(LSKEYS.CALLBACK_URL);
		if (DEBUG) console.debug( PREFIX + "Deleted localStorage item:", LSKEYS.CALLBACK_URL );

		// Set, in localStorage, we come from "LOGOUT"
		localStorage.setItem(LSKEYS.LOGOUT, true);

		// Remove the crypto key from the database and the database itself.
		await DB.deleteDatabase();

		if (DEBUG) console.debug( PREFIX + "Redirecting to:", BSKY.auth.root );
		if (DEBUG) console.debug( PREFIX + "-- END" );
		if (GROUP_DEBUG) console.groupEnd();
		window.location					= BSKY.auth.root;
	} else {
		if (DEBUG) console.warn( PREFIX + "ERROR!" );
		if (DEBUG) console.debug( PREFIX + "-- END" );
		if (GROUP_DEBUG) console.groupEnd();
	}
}


/* --------------------------------------------------------
 * LOGGING PROCESS.
 *
 * "Business function": Welcome page.
 * "Landing function" after successfull login.
 *
 * Performs all the needed steps to create/update the page.
 * -------------------------------------------------------- */
async function fnDashboard() {
	const STEP_NAME						= "fnDashboard";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

	let apiCallResponse					= null;

	// Restore data from localStorage.
	restoreDataFromLocalStorage();

	// Los botones del userDid y el clientId Metadata
	HTML.updateUserDIDInfo();

	// "Constant data".
	apiCallResponse						= await updateStaticInfo();

	// Update the page.
	apiCallResponse						= await updateDashboard();

	// "Constant data".
	const refreshStaticSeconds			= CONFIGURATION.global.refresh_static;
	const refreshStaticTime				= refreshStaticSeconds * 1000;
	if (DEBUG) console.debug(PREFIX + `TIMED Update the 'static' info every ${refreshStaticSeconds} second(s)` );
	// timerId								= setInterval(() => updateStaticInfo(), refreshStaticTime);
	(function staticLoop() {
		setTimeout(() => {
			// Your logic here
			updateStaticInfo();
			staticLoop();
		}, refreshStaticTime);
	})();

	// Update the page.
	const refreshDashboardSeconds		= CONFIGURATION.global.refresh_dashboard;
	const refreshDashboardTime			= refreshDashboardSeconds * 1000;
	if (DEBUG) console.debug(PREFIX + `TIMED Update the dashboard every ${refreshDashboardSeconds} second(s)` );
	// timerId								= setInterval(() => updateDashboard(), refreshDashboardTime);
	(function dynamicLoop() {
		setTimeout(() => {
			// Your logic here
			updateDashboard();
			dynamicLoop();
		}, refreshDashboardTime);
	})();

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
}


async function updateDashboard() {
	const STEP_NAME						= "updateDashboard";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// ------------------------------------------
	// Steps.
	let apiCallResponse					= null;
	try {
		// First, let's validate the access token.
		// ------------------------------------------
		apiCallResponse					= await validateAccessToken();

		// Later, retrieve the rest of things.
		// ------------------------------------------

		// Retrieve the user's notifications.
		apiCallResponse					= await getTheUserNotifications();

		// Retrieve the Trending Topics
		apiCallResponse					= await getTheTrendingTopics();
	} catch (error) {
		if (GROUP_DEBUG) console.groupEnd();

		// Show the error and update the HTML fields
		HTML.updateHTMLError(error);
		throw( error );
	}

	// Info step
	HTML.showStepInfo( STEP_NAME, null );

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
}


async function updateStaticInfo() {
	const STEP_NAME						= "updateStaticInfo";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// ------------------------------------------
	// Steps.
	let apiCallResponse					= null;
	try {
		// First, let's validate the access token.
		// ------------------------------------------
		apiCallResponse					= await validateAccessToken();

		// Later, retrieve the rest of things.
		// ------------------------------------------

		// Retrieve the user's profile to show
		apiCallResponse					= await getTheUserProfile();

		// Retrieve who the user is following
		apiCallResponse					= await getWhoTheUserFollows();

		// Retrieve who the user is following FROM THE PDS Repository
		apiCallResponse					= await getWhoTheUserFollowsFromTheRepo();

		// Retrieve the user's followers
		apiCallResponse					= await getTheUserFollowers();

		// Retrieve who the user is blocking
		apiCallResponse					= await getWhoTheUserIsBlocking();

		// Retrieve who the user is muting
		apiCallResponse					= await getWhoTheUserIsMuting();

		// Retrieve the user's lists
		apiCallResponse					= await getTheUserLists();

		// Now, check relationships...
		apiCallResponse					= await getTheRelations();
	} catch (error) {
		if (GROUP_DEBUG) console.groupEnd();

		// Show the error and update the HTML fields
		HTML.updateHTMLError(error);
		throw( error );
	}

	// Info step
	HTML.showStepInfo( STEP_NAME, null );

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
}

