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
// To perform API calls
import * as APICall						from "./modules/APICall.js";
// Common BrowserDB functions
import * as DB							from "./modules/BrowserDB.js";
// Common Favicon functions
import * as FAVICON						from "./modules/Favicon.js";
// Common HTML functions
import * as HTML						from "./modules/HTML.js";
// Common Keyboard Listener functions
import * as KPListener					from "./modules/KPListener.js";
// Common OAuth2 functions
import * as OAuth2						from "./modules/OAuth2.js";
// Common Crypto functions
import * as CRYPT						from "./modules/OAuth2/Crypt.js";
// Common JWT functions
import * as JWT							from "./modules/OAuth2/JWT.js";


/**********************************************************
 * Module Constants
 **********************************************************/
// Module SELF constants
const MODULE_NAME						= COMMON.getModuleName( import.meta.url );

// Inner constants
const API								= CONFIGURATION.api;
const LSKEYS							= CONFIGURATION.localStorageKeys;
const CLIENT_APP						= CONFIGURATION.clientApp;
const NSID								= API.bluesky.NSID;

// Bluesky constants
const APP_CLIENT_ID						= CLIENT_APP.client_id;

// Module constants
const MAX_ITERATIONS					= 100;


/**********************************************************
 * Module Variables
 **********************************************************/
let timerIdDynamicLoop					= 0;
let refreshDynamicSeconds				= 0;
let refreshDynamicTime					= 0;
let timerIdStaticLoop					= 0;
let refreshStaticSeconds				= 0;
let refreshStaticTime					= 0;
window.BSKY								= window.BSKY || {};
window.BSKY.data						= {};
window.BSKY.user						= {};
window.BSKY.auth						= {};
window.BSKY.path						= {};


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
	const PREFIX_MODULE_INFO			= `${PREFIX}[Module Info] `;

	// Default logging properties
	// ---------------------------------------------------------
	window.BSKY.DEBUG					= CONFIGURATION.global.debug;
	window.BSKY.DEBUG_FOLDED			= CONFIGURATION.global.debug_folded;
	window.BSKY.GROUP_DEBUG				= window.BSKY.DEBUG && window.BSKY.DEBUG_FOLDED;
	if (window.BSKY.DEBUG) console.groupCollapsed( PREFIX );

	// ================================================================
	// Module info.
	if (window.BSKY.DEBUG) console.groupCollapsed( PREFIX_MODULE_INFO );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "MODULE_NAME:", MODULE_NAME, "import.meta.url:", import.meta.url );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "CONST_URL:", new URL( window.location ) );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Configuration:", CONFIGURATION );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "DEBUG:", window.BSKY.DEBUG, "DEBUG_FOLDED:", window.BSKY.DEBUG_FOLDED, "GROUP_DEBUG:", window.BSKY.GROUP_DEBUG );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "CLIENT_APP:", CLIENT_APP );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "PERMISSION: Notification.permission:", Notification.permission );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "PERMISSION: navigator.geolocation:", navigator.geolocation );
	if (window.BSKY.DEBUG) console.debug( PREFIX + `ROOT object: [window.BSKY].`, window.BSKY );

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
	window.BSKY.faviconStandBy			= FAVICON.toStandBy;
	window.BSKY.faviconWorking			= FAVICON.toWorking;
	window.BSKY.validateAccessToken		= validateAccessToken;
	window.BSKY.getUserProfile			= getTheUserProfile;
	window.BSKY.checkUserAccessToken	= checkUserAccessToken;
	window.BSKY.saveRuntimeDataInLocalStorage	= saveRuntimeDataInLocalStorage;

	// ================================================================
	// Module END
	console.info( `Loaded module ${MODULE_NAME}.` );

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.DEBUG) console.groupEnd();


	// ================================================================
	// Ejecutamos las acciones propias de esta página.
	
	// Auto-detect the fallback URL from current...
	// ---------------------------------------------------------
	setupRootContext();

	// La configuración de KeyPress
	// ---------------------------------------------------------
	KPListener.setupKeypress();

	// La configuración de HighlightJS
	// ---------------------------------------------------------
	hljs.configure({
		ignoreUnescapedHTML: true
	});

	// La versión.
	// ---------------------------------------------------------
	$( `#${HTML.APP_NAME}` ).html( CONFIGURATION.global.appName );
	$( `#${HTML.DIV_VERSION} > #${HTML.APP_NAME}` ).html( CONFIGURATION.global.appName );
	$( `#${HTML.DIV_VERSION} > #${HTML.APP_VERSION}` ).html( CONFIGURATION.global.appVersion );

	// End of module setup
	// ---------------------------------------------------------
	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.DEBUG) console.groupEnd();
}


/**********************************************************
 * HELPER Functions
 **********************************************************/
// Context URL helper function
function setupRootContext() {
	const STEP_NAME						= "setupRootContext";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// ROOT_CONTEXT
	// localStorage.setItem(LSKEYS.ROOT_CONTEXT, url);
	// localStorage.getItem(LSKEYS.ROOT_CONTEXT);
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

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}

// Local Storage Helper functions
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
		// Response from the access token request
		userAuthentication:				BSKY.data.userAuthentication,
		userAccessToken:				BSKY.data.userAccessToken,
		userRefreshToken:				BSKY.data.userRefreshToken,
		accessTokenHash:				BSKY.data.accessTokenHash
	};
	localStorage.setItem(LSKEYS.BSKYDATA, JSON.stringify( savedInformation ));
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Saved data in localStorage." );

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}

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
	// Response from the access token request
	BSKY.data.userAuthentication		= saved.userAuthentication;
	BSKY.data.userAccessToken			= saved.userAccessToken;
	BSKY.data.userRefreshToken			= saved.userRefreshToken;
	BSKY.data.accessTokenHash			= saved.accessTokenHash;

	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/**********************************************************
 * PRIVATE Functions
 **********************************************************/
/* --------------------------------------------------------
 * Inner "Business function": Retrieve records from the
 * user's PDS (the "repo"), of a given type ("NSID").
 * -------------------------------------------------------- */
async function getRepoRecordsOfNSIDType( nsid ) {
	const STEP_NAME						= "getRepoRecordsOfNSIDType";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[nsid=${nsid}]` );

	let n								= 0;
	let apiCallResponse					= null;
	let cursor							= null;
	let hayCursor						= false;
	let data							= [];
	let allData							= [];
	let subTotal						= 0;
	let acumulado						= 0;

	do {
		n++;
		// Retrieve the user's repo records of type 'NSID'
		// ---------------------------------------------------------
		// Received an array of objects of this type:
		//
		//		{
		//		    "uri": "at://did:plc:tjc27aje4uwxtw5ab6wwm4km/app.bsky.graph.follow/3lifiak24z423",
		//		    "cid": "bafyreigg5f77n57bdm24ufu3xgeqex5wgnb4fruwufwoe54bb5uhvuemje",
		//		    "value": {
		//		        "$type": "app.bsky.graph.follow",
		//		        "subject": "did:plc:rfdm4kde7l4uic6opx6bqcy2",
		//		        "createdAt": "2025-02-17T19:30:03.108Z"
		//		    }
		//		}
		//
		apiCallResponse					= await APIBluesky.tryAndCatch( "retrieveRepoListRecords", APIBluesky.retrieveRepoListRecords, { cursor: cursor, nsid: nsid } );
		if (window.BSKY.DEBUG) console.debug( PREFIX + `+ [${n}] Current apiCallResponse:`, apiCallResponse );

		// Datos. Seguimos?
		cursor							= ( apiCallResponse.hasOwnProperty("cursor") ) ? apiCallResponse.cursor : null;
		hayCursor						= !COMMON.isNullOrEmpty(cursor);
		if (window.BSKY.DEBUG) console.debug( PREFIX + `  Detected cursor: ${cursor} [hayCursor: ${hayCursor}]` );

		data							= apiCallResponse.records;
		subTotal						= data.length;
		if (window.BSKY.DEBUG) console.debug( PREFIX + `  Detected sub total: ${subTotal} following`, data );
		allData.push(...data);
		acumulado						= allData.length;
		if (window.BSKY.DEBUG) console.debug( PREFIX + `  Detected acumulado: ${acumulado} following`, allData );

		// Update the info panel
		HTML.showStepInfo( STEP_NAME, `Retrieving who the user follows (${acumulado})...` );
	} while ( hayCursor && (n<MAX_ITERATIONS) );

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return allData;
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
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Info step
	HTML.showStepInfo( STEP_NAME, `Retrieving the user notifications...` );

	// Clear and hide error fields and panel
	HTML.clearHTMLError();

	// The unread user's notifications.
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Let's retrieve the number of unread notifications...");
	let unreadNotifications				= await APIBluesky.tryAndCatch( "retrieveUnreadNotifications", APIBluesky.retrieveUnreadNotifications, false );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Current unreadNotifications:", unreadNotifications );

	if ( unreadNotifications > 0 ) {
		// The user's notifications.
		if (window.BSKY.DEBUG) console.debug( PREFIX + `Let's retrieve the ${unreadNotifications} unread notifications...`);
		let notifications				= await APIBluesky.tryAndCatch( "retrieveNotifications", APIBluesky.retrieveNotifications, false );
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Current notifications:", notifications );

		// Parse the response
		await HTML.htmlRenderNotifications( notifications, BSKY.data.userAccessToken, APP_CLIENT_ID, BSKY.data.accessTokenHash );
	} else {
		if (window.BSKY.DEBUG) console.debug( PREFIX + "No notifications to retrieve." );
		HTML.htmlRenderNoNotifications();
	}

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * LOGGED-IN PROCESS.
 *
 * "Business function": Retrieve user Profile from the PDS.
 * -------------------------------------------------------- */
async function getTheUserProfile( handle = BSKY.user.userHandle ) {
	const STEP_NAME						= "getTheUserProfile";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_ERROR					= `${PREFIX}[ERROR] `;
	const PREFIX_RETRY					= `${PREFIX}[RETRY] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[handle==${handle}]` );

	// Info step
	HTML.showStepInfo( STEP_NAME, `Retrieving the user's profile...` );

	// Now, the user's profile.
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Let's retrieve the user's profile[${handle}]...` );
	let userProfile						= await APIBluesky.tryAndCatch( "retrieveUserProfile", APIBluesky.retrieveUserProfile, handle );
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Current userProfile[${handle}]:`, userProfile );

	// Save it.
	if ( COMMON.areEquals( handle, BSKY.user.userHandle ) ) {
		BSKY.user.profile				= userProfile;

		// Lo pintamos en su sitio.
		HTML.htmlRenderUserProfile( userProfile );
	}

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return userProfile;
}


/* --------------------------------------------------------
 * LOGGED-IN PROCESS.
 *
 * "Business function": Retrieve who the user follows.
 *
 * This functions handles three steps:
 * 1.- Retrieve a list of items (following users), with the id's
 * 2.- Retrieve the profile of each "cid".
 * 3.- Retrieve the info about "not found" profiles.
 * -------------------------------------------------------- */
async function getWhoTheUserFollows() {
	const STEP_NAME						= "getWhoTheUserFollows";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_PDS_PROFILES			= `${PREFIX}[PDS REPO Profiles] `;
	const PREFIX_PDS_MISSING			= `${PREFIX}[PDS REPO MISSING Profiles] `;
	const PREFIX_MISSING				= `${PREFIX}[MISSING] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Info step
	HTML.showStepInfo( STEP_NAME, `Retrieving who the user follows...` );
	BSKY.user.following					= BSKY.user.following || {};

	// Retrieve the list of records of a given type from the repo.
	// ---------------------------------------------------------
	const nsid							= NSID.follow;

	// The records.
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Let's retrieve repo records...` );
	let allData							= await getRepoRecordsOfNSIDType( nsid );

	if ( COMMON.isNullOrEmpty( allData ) ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `No following detected.` );

		if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		return;
	}

	// Save it.
	BSKY.user.following.raw				= allData;
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Detected ${allData.length} records of type[${nsid}] in the repo`, allData );


	// Now, retrieve the profiles information for each cid.
	// ---------------------------------------------------------
	// Prepare the responses with the profiles
	BSKY.user.following.profiles		= [];
	let search							= [];
	let searched						= [];
	let missing							= [];
	let missingProfiles					= [];
	let missed							= {};
	let startAt							= 0;
	let startCurrent					= 0;
	let finishAt						= allData.length;
	let blockOfProfiles					= null;
	let bunch							= null;
	let userDid							= null;
	let profile							= null;
	let allProfiles						= [];
	const MAX_PROFILES					= 25;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_PDS_PROFILES );
	do {
		// Prepare the bunch
		search							= []
		searched						= []
		for ( let n=0; n<MAX_PROFILES; n++ ) {
			startCurrent				= MAX_PROFILES * startAt + n;
			if ( allData[startCurrent]?.value?.subject ) {
				userDid					= allData[startCurrent].value.subject;
				searched.push( userDid );
				search.push( "&actors[]=" + encodeURIComponent( userDid ) );
			}
		}
		startAt++;
		let queryString					= "?" + search.join("").substring(1);

		// Update the info panel
		HTML.showStepInfo( STEP_NAME, `Retrieving who the user follows (${MAX_PROFILES * startAt}/${finishAt})...` );

		// Now, retrieve the block of profiles.
		// ---------------------------------------------------------
		// Received an array of profiles of this type:
		//
		//		{
		//		    "did": "did:plc:rfdm4kde7l4uic6opx6bqcy2",
		//		    "handle": "fumatron.bsky.social",
		//		    "displayName": "FUMATRÓN",
		//		    "avatar": "https://cdn.bsky.app/img/avatar/plain/did:plc:rfdm4kde7l4uic6opx6bqcy2/bafkreibi3hk7dstj5mg4o63a5ucjunl2zc2uf4udoy5d5aiitosu5dmsvu@jpeg",
		//		    "associated": {
		//		        "lists": 0,
		//		        "feedgens": 0,
		//		        "starterPacks": 0,
		//		        "labeler": false
		//		    },
		//		    "viewer": {
		//		        "muted": false,
		//		        "blockedBy": false,
		//		        "following": "at://did:plc:tjc27aje4uwxtw5ab6wwm4km/app.bsky.graph.follow/3lifiak24z423",
		//		        "knownFollowers": {
		//		            "count": 19,
		//		            "followers": [...]
		//		        }
		//		    },
		//		    "labels": [],
		//		    "createdAt": "2025-02-14T18:42:47.014Z",
		//		    "indexedAt": "2025-02-14T18:45:11.112Z",
		//		    "followersCount": 456,
		//		    "followsCount": 70,
		//		    "postsCount": 4
		//		}
		//
		// if (window.BSKY.DEBUG) console.debug( PREFIX_PDS_PROFILES + `Let's retrieve the user's profile...` );
		blockOfProfiles					= await APIBluesky.tryAndCatch( "retrieveRepoBlockOfRecords", APIBluesky.retrieveRepoBlockOfRecords, queryString );
		// if (window.BSKY.DEBUG) console.debug( PREFIX_PDS_PROFILES + "Block of profiles:", blockOfProfiles );
		
		// Add to global var
		if ( blockOfProfiles && blockOfProfiles.profiles ) {
			bunch						= blockOfProfiles.profiles;
			allProfiles.push(...bunch);
			
			// Sanity check: Detect which profiles have not been retrieved...
			let position				= 0;
			for ( let idx=0; idx<bunch.length; idx++ ) {
				profile					= bunch[idx];
				userDid					= profile.did;
				position				= searched.indexOf( userDid );
				if (position>=0) {
					searched.splice( position, 1 );
				}
				if (profile.labels && profile.labels.length>0) {
					profile.labels.forEach( label => {
						if (label.val && !COMMON.areEquals( label.val, "!no-unauthenticated" ) ) {
							if (window.BSKY.DEBUG) console.debug( PREFIX_PDS_PROFILES + `Profile[${profile.displayName}/${profile.handle}/${profile.did}] | label(s)[${profile.labels.length}] | label:`, label.val );
						}
					});
				}
			}
			if (searched.length>0) {
				if (window.BSKY.DEBUG) console.debug( PREFIX_PDS_PROFILES + `Missed ${searched.length} profile(s)...`, searched );
				missing.push(...searched);
			}
		}
	} while ( startCurrent <= finishAt );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();

	// Save it.
	BSKY.user.following.profiles		= allProfiles;


	// Now, retrieve the missed profiles information.
	// ---------------------------------------------------------
	if ( missing.length>=0 ) {
		if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_PDS_MISSING + `[Missing: ${missing.length}]` );
		if (window.BSKY.DEBUG) console.debug( PREFIX_PDS_MISSING + `Missed profiles...`, missing );
		// Para ver el didDoc(JSON) de cada uno de ellos: https://plc.directory/[did]
		// Para ver el profile de cada uno de ellos: https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=[did]

		let urlOfMissing					= "";
		let didDocForMissing				= "";
		let profileForMissing				= "";
		for ( let idx=0; idx<missing.length; idx++ ) {
			userDid							= missing[ idx ];

			if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_MISSING + `Missed profile[${idx}] with did:`, userDid );
			missingProfiles[userDid]		= {};
			missed							= {};
			missed.did						= userDid;
			missed.missed					= true;

			// The didDoc of the missing account
			try {
				missed.didDoc				= {};
				urlOfMissing				= `https://plc.directory/${userDid}`;
				didDocForMissing			= await fetch( urlOfMissing ).then( response => {
					let head				= APICall.showResponseHeaders( response, false );
					// if (window.BSKY.DEBUG) console.debug( PREFIX_MISSING + `+ Response headers:`, head );
					missed.didDoc.head	= head;
					return response.json();
				}).then( data => {
					missed.didDoc.body	= data;
					// if (window.BSKY.DEBUG) console.debug( PREFIX_MISSING + `+ Response body...:`, data );
				}).catch( error => {
					missed.didDoc.error	= error;
					// if (window.BSKY.DEBUG) console.debug( PREFIX_MISSING + `+ Response error..:`, error );
				});
			} catch ( error ) {
				missed.didDoc.fetchError	= error;
				// if (window.BSKY.DEBUG) console.debug( PREFIX_MISSING + `+ FETCH error..:`, error );
			}

			// The public profile of the missing account
			try {
				missed.profile				= {};
				urlOfMissing				= `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${userDid}`;
				profileForMissing			= await fetch( urlOfMissing ).then( response => {
					let head				= APICall.showResponseHeaders( response, false );
					// if (window.BSKY.DEBUG) console.debug( PREFIX_MISSING + `+ Response headers:`, head );
					missed.profile.head	= head;
					return response.json();
				}).then( data => {
					missed.profile.body	= data;
					// if (window.BSKY.DEBUG) console.debug( PREFIX_MISSING + `+ Response body...:`, data );
				}).catch( error => {
					missed.profile.error	= error;
					// if (window.BSKY.DEBUG) console.debug( PREFIX_MISSING + `+ Response error..:`, error );
				});
			} catch ( error ) {
				missed.profile.fetchError	= error;
				// if (window.BSKY.DEBUG) console.debug( PREFIX_MISSING + `+ FETCH error..:`, error );
			}

			// Recap
			missingProfiles.push( missed );
			if (window.BSKY.DEBUG) console.debug( PREFIX_MISSING + `+ Info for missed profile[${idx}]:`, missingProfiles[userDid] );

			if (window.BSKY.DEBUG) console.debug( PREFIX_MISSING + "-- END" );
			if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		}
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	} else {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `No missed profiles found.` );
	}

	// Save it.
	BSKY.user.following.missingProfiles	= missingProfiles;

	// Lo pintamos todo en su sitio.
	HTML.htmlRenderUserFollows( BSKY.user.following );

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * LOGGED-IN PROCESS.
 *
 * "Business function": Retrieve who the user is following.
 * -------------------------------------------------------- */
async function getWhoAreTheUserFollowers() {
	const STEP_NAME						= "getWhoAreTheUserFollowers";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_ALL					= `${PREFIX}[ALL] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Info step
	HTML.showStepInfo( STEP_NAME, `Retrieving who follows the user...` );

	// Now, the user's followers.
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Let's retrieve who follows the user...` );
	let apiCallResponse					= null;
	let cursor							= null;
	let hayCursor						= false;
	let data							= null;
	let allData							= [];
	let n								= 0;
	let acumulado						= 0;
	let subTotal						= 0;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_ALL );
	do {
		n++;
		// Retrieve user's followers to show
		// ---------------------------------------------------------
		apiCallResponse					= await APIBluesky.tryAndCatch( "retrieveUserFollowers", APIBluesky.retrieveUserFollowers, cursor );
		if (window.BSKY.DEBUG) console.debug( PREFIX + `+ [${n}] Current apiCallResponse:`, apiCallResponse );
		
		// Datos. Seguimos?
		cursor							= ( apiCallResponse.hasOwnProperty("cursor") ) ? apiCallResponse.cursor : null;
		hayCursor						= !COMMON.isNullOrEmpty(cursor);
		if (window.BSKY.DEBUG) console.debug( PREFIX + `  Detected cursor: ${cursor} [hayCursor: ${hayCursor}]` );

		data							= apiCallResponse.followers;
		subTotal						= data.length;
		if (window.BSKY.DEBUG) console.debug( PREFIX + `  Detected sub total: ${subTotal} followers`, data );
		allData.push(...data);
		acumulado						= allData.length;
		if (window.BSKY.DEBUG) console.debug( PREFIX + `  Detected acumulado: ${acumulado} followers`, allData );

		// Info step
		HTML.showStepInfo( STEP_NAME, `Retrieving who follows the user (${acumulado})...` );
		
	} while ( hayCursor && (n<MAX_ITERATIONS) );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();

	if (window.BSKY.DEBUG) console.debug( PREFIX + `Detected ${acumulado} records in the repo of the user` );

	// Save it.
	BSKY.user.followers					= allData;

	// Lo pintamos en su sitio.
	HTML.htmlRenderUserFollowers( allData );

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
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
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Info step
	HTML.showStepInfo( STEP_NAME, `Retrieving who the user is blocking...` );

	// Now, the user's blocks.
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Let's retrieve who the user is blocking...` );
	let apiCallResponse					= null;
	let cursor							= null;
	let hayCursor						= false;
	let data							= null;
	let allData							= [];
	let n								= 0;
	let acumulado						= 0;
	let subTotal						= 0;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_ALL );
	do {
		n++;
		// Retrieve user's blocks
		// ---------------------------------------------------------
		apiCallResponse					= await APIBluesky.tryAndCatch( "retrieveUserBlocks", APIBluesky.retrieveUserBlocks, cursor );
		if (window.BSKY.DEBUG) console.debug( PREFIX + `+ [${n}] Current apiCallResponse:`, apiCallResponse );
		
		// Datos. Seguimos?
		cursor							= ( apiCallResponse.hasOwnProperty("cursor") ) ? apiCallResponse.cursor : null;
		hayCursor						= !COMMON.isNullOrEmpty(cursor);
		if (window.BSKY.DEBUG) console.debug( PREFIX + `  Detected cursor: ${cursor} [hayCursor: ${hayCursor}]` );

		data							= apiCallResponse.blocks;
		subTotal						= data.length;
		if (window.BSKY.DEBUG) console.debug( PREFIX + `  Detected sub total: ${subTotal} blocks`, data );
		allData.push(...data);
		acumulado						= allData.length;
		if (window.BSKY.DEBUG) console.debug( PREFIX + `  Detected acumulado: ${acumulado} blocks`, allData );
		
	} while ( hayCursor && (n<MAX_ITERATIONS) );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();

	if (window.BSKY.DEBUG) console.debug( PREFIX + `Detected ${acumulado} blocks`, allData );

	// Save it.
	BSKY.user.blocks					= allData;

	// Lo pintamos en su sitio.
	HTML.htmlRenderUserBlocks( allData );

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
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
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Info step
	HTML.showStepInfo( STEP_NAME, `Retrieving who the user is muting...` );

	// Now, the user's mutes.
	let apiCallResponse					= null;
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Let's retrieve who the user is muting...` );
	let cursor							= null;
	let hayCursor						= false;
	let data							= null;
	let allData							= [];
	let n								= 0;
	let acumulado						= 0;
	let subTotal						= 0;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_ALL );
	do {
		n++;
		// Retrieve user's mutes
		// ---------------------------------------------------------
		apiCallResponse					= await APIBluesky.tryAndCatch( "retrieveUserMutes", APIBluesky.retrieveUserMutes, cursor );
		if (window.BSKY.DEBUG) console.debug( PREFIX + `+ [${n}] Current apiCallResponse:`, apiCallResponse );
		
		// Datos. Seguimos?
		cursor							= ( apiCallResponse.hasOwnProperty("cursor") ) ? apiCallResponse.cursor : null;
		hayCursor						= !COMMON.isNullOrEmpty(cursor);
		if (window.BSKY.DEBUG) console.debug( PREFIX + `  Detected cursor: ${cursor} [hayCursor: ${hayCursor}]` );

		data							= apiCallResponse.mutes;
		subTotal						= data.length;
		if (window.BSKY.DEBUG) console.debug( PREFIX + `  Detected sub total: ${subTotal} mutes`, data );
		allData.push(...data);
		acumulado						= allData.length;
		if (window.BSKY.DEBUG) console.debug( PREFIX + `  Detected acumulado: ${acumulado} mutes`, allData );
		
	} while ( hayCursor && (n<MAX_ITERATIONS) );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();

	if (window.BSKY.DEBUG) console.debug( PREFIX + `Detected ${acumulado} mutes`, allData );

	// Save it.
	BSKY.user.mutes						= allData;

	// Lo pintamos en su sitio.
	HTML.htmlRenderUserMutes( allData );

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
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
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Info step
	HTML.showStepInfo( STEP_NAME, `Retrieving the lists of the user...` );

	// Now, the user's mutes.
	let apiCallResponse					= null;
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Let's retrieve the lists of the user...` );
	let cursor							= null;
	let hayCursor						= false;
	let data							= null;
	let allData							= [];
	let n								= 0;
	let acumulado						= 0;
	let subTotal						= 0;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_ALL );
	do {
		n++;
		// Retrieve user's lists
		// ---------------------------------------------------------
		apiCallResponse					= await APIBluesky.tryAndCatch( "retrieveUserLists", APIBluesky.retrieveUserLists, cursor );
		if (window.BSKY.DEBUG) console.debug( PREFIX + `+ [${n}] Current apiCallResponse:`, apiCallResponse );
		
		// Datos. Seguimos?
		cursor							= ( apiCallResponse.hasOwnProperty("cursor") ) ? apiCallResponse.cursor : null;
		hayCursor						= !COMMON.isNullOrEmpty(cursor);
		if (window.BSKY.DEBUG) console.debug( PREFIX + `  Detected cursor: ${cursor} [hayCursor: ${hayCursor}]` );

		data							= apiCallResponse.lists;
		subTotal						= data.length;
		if (window.BSKY.DEBUG) console.debug( PREFIX + `  Detected sub total: ${subTotal} lists`, data );
		allData.push(...data);
		acumulado						= allData.length;
		if (window.BSKY.DEBUG) console.debug( PREFIX + `  Detected acumulado: ${acumulado} lists`, allData );
		
	} while ( hayCursor && (n<MAX_ITERATIONS) );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();

	if (window.BSKY.DEBUG) console.debug( PREFIX + `Detected ${acumulado} lists`, allData );

	// Save it.
	BSKY.user.lists						= allData;

	// Lo pintamos en su sitio.
	if ( allData && ( allData.length>0 ) ) HTML.htmlRenderUserLists( allData );

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * LOGGED-IN PROCESS.
 *
 * "Business function": Retrieve which are the user's lists.
 * -------------------------------------------------------- */
async function getTheUserMutingModerationLists() {
	const STEP_NAME						= "getTheUserMutingModerationLists";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_ALL					= `${PREFIX}[ALL] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Info step
	HTML.showStepInfo( STEP_NAME, `Retrieving the blocking moderation lists of the user...` );

	// Now, the user's blocking mod lists.
	let apiCallResponse					= null;
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Let's retrieve the blocking moderation lists of the user...` );
	let cursor							= null;
	let hayCursor						= false;
	let data							= null;
	let allData							= [];
	let n								= 0;
	let acumulado						= 0;
	let subTotal						= 0;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_ALL );
	do {
		n++;
		// Retrieve user's lists
		// ---------------------------------------------------------
		apiCallResponse					= await APIBluesky.tryAndCatch( "retrieveUserMutingModerationLists", APIBluesky.retrieveUserMutingModerationLists, cursor );
		if (window.BSKY.DEBUG) console.debug( PREFIX + `+ [${n}] Current apiCallResponse:`, apiCallResponse );
		
		// Datos. Seguimos?
		cursor							= ( apiCallResponse.hasOwnProperty("cursor") ) ? apiCallResponse.cursor : null;
		hayCursor						= !COMMON.isNullOrEmpty(cursor);
		if (window.BSKY.DEBUG) console.debug( PREFIX + `  Detected cursor: ${cursor} [hayCursor: ${hayCursor}]` );

		data							= apiCallResponse.lists;
		subTotal						= data.length;
		if (window.BSKY.DEBUG) console.debug( PREFIX + `  Detected sub total: ${subTotal} lists`, data );
		allData.push(...data);
		acumulado						= allData.length;
		if (window.BSKY.DEBUG) console.debug( PREFIX + `  Detected acumulado: ${acumulado} lists`, allData );
		
	} while ( hayCursor && (n<MAX_ITERATIONS) );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();

	if (window.BSKY.DEBUG) console.debug( PREFIX + `Detected ${acumulado} lists`, allData );

	// Save it.
	BSKY.user.moderation				= BSKY.user.moderation || {};
	BSKY.user.moderation.muting			= allData;

	// Lo pintamos en su sitio.
	if ( allData && ( allData.length>0 ) ) HTML.htmlRenderUserModerationLists( allData, true );

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * LOGGED-IN PROCESS.
 *
 * "Business function": Retrieve which are the user's lists.
 * -------------------------------------------------------- */
async function getTheUserBlockingModerationLists() {
	const STEP_NAME						= "getTheUserBlockingModerationLists";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_ALL					= `${PREFIX}[ALL] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Info step
	HTML.showStepInfo( STEP_NAME, `Retrieving the muting moderation lists of the user...` );

	// Now, the user's mute mod lists.
	let apiCallResponse					= null;
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Let's retrieve the muting moderation lists of the user...` );
	let cursor							= null;
	let hayCursor						= false;
	let data							= null;
	let allData							= [];
	let n								= 0;
	let acumulado						= 0;
	let subTotal						= 0;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_ALL );
	do {
		n++;
		// Retrieve user's lists
		// ---------------------------------------------------------
		apiCallResponse					= await APIBluesky.tryAndCatch( "retrieveUserBlockingModerationLists", APIBluesky.retrieveUserBlockingModerationLists, cursor );
		if (window.BSKY.DEBUG) console.debug( PREFIX + `+ [${n}] Current apiCallResponse:`, apiCallResponse );
		
		// Datos. Seguimos?
		cursor							= ( apiCallResponse.hasOwnProperty("cursor") ) ? apiCallResponse.cursor : null;
		hayCursor						= !COMMON.isNullOrEmpty(cursor);
		if (window.BSKY.DEBUG) console.debug( PREFIX + `  Detected cursor: ${cursor} [hayCursor: ${hayCursor}]` );

		data							= apiCallResponse.lists;
		subTotal						= data.length;
		if (window.BSKY.DEBUG) console.debug( PREFIX + `  Detected sub total: ${subTotal} lists`, data );
		allData.push(...data);
		acumulado						= allData.length;
		if (window.BSKY.DEBUG) console.debug( PREFIX + `  Detected acumulado: ${acumulado} lists`, allData );
		
	} while ( hayCursor && (n<MAX_ITERATIONS) );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();

	if (window.BSKY.DEBUG) console.debug( PREFIX + `Detected ${acumulado} lists`, allData );

	// Save it.
	BSKY.user.moderation				= BSKY.user.moderation || {};
	BSKY.user.moderation.blocking		= allData;

	// Lo pintamos en su sitio.
	HTML.htmlRenderUserModerationLists( allData );

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
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
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Info step
	HTML.showStepInfo( STEP_NAME, `Retrieving the Trending Topics...` );

	// Now, the basic data.
	let apiCallResponse					= null;
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Let's retrieve the Trending Topics...` );
	let cursor							= null;
	let hayCursor						= false;
	let data							= {};
	data.topics							= {};
	data.suggested						= {};
	let subTotal						= 0;

	// Retrieve the Trending Topics
	// ---------------------------------------------------------
	try {
		data								= await APIBluesky.tryAndCatch( "retrieveTrendingTopics", APIBluesky.retrieveTrendingTopics, cursor );
		if (window.BSKY.DEBUG) console.debug( PREFIX + `+ Current data:`, data );

		// if ( !COMMON.isNullOrEmpty( data ) ) {
		if ( data && ( data?.topics || data?.suggested ) ) {
			// Topics
			subTotal						= data.topics.length;
			if (window.BSKY.DEBUG) console.debug( PREFIX + `  Detected sub total: ${subTotal} Trending Topics - Topics`, data.topics );

			// Suggested
			subTotal						= data.suggested.length;
			if (window.BSKY.DEBUG) console.debug( PREFIX + `  Detected sub total: ${subTotal} Trending Topics - Suggested`, data.suggested );

			// Save it.
			BSKY.user.trendingTopics		= data;

			// Lo pintamos en su sitio.
			HTML.htmlRenderTrendingTopics( data );
		}
	} catch ( error ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR retrieving the Trending Topics:`, error );

		// Show the error and update the HTML fields
		HTML.updateHTMLError(error);

		if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		// throw( error );
	}

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * LOGGED-IN PROCESS.
 *
 * "Business function": Cross-check relationships.
 * -------------------------------------------------------- */
async function getTheRelations() {
	const STEP_NAME						= "getTheRelations";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Info step
	HTML.showStepInfo( STEP_NAME, `Cross-checking relationships with the user...` );

	if (window.BSKY.DEBUG) console.warn( PREFIX + "Under Development!" );
	// TODO: Cross-check following, followers, blocks and mutes with
	// + [getKnownFollowers]	https://docs.bsky.app/docs/api/app-bsky-graph-get-known-followers
	// + [getRelationships]		https://docs.bsky.app/docs/api/app-bsky-graph-get-relationships
	// + [getProfiles]			https://docs.bsky.app/docs/api/app-bsky-actor-get-profiles

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
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
	restoreDataFromLocalStorage();

	// Second step: Retrieve, if any, the token.
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
	}

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return valid;
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
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Swho some more information
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_RAWDATA );
	if (window.BSKY.DEBUG) console.debug( PREFIX_RAWDATA + "Current cryptoKey:", BSKY.data.cryptoKey );
	if (window.BSKY.DEBUG) console.debug( PREFIX_RAWDATA + "Current cryptoKey:", COMMON.prettyJson( BSKY.data.cryptoKey ) );
	if (window.BSKY.DEBUG) console.debug( PREFIX_RAWDATA + "Current jwk:", BSKY.data.jwk );
	if (window.BSKY.DEBUG) console.debug( PREFIX_RAWDATA + "Current jwk:", COMMON.prettyJson( BSKY.data.jwk ) );
	if (window.BSKY.DEBUG) console.debug( PREFIX_RAWDATA + "Current userAuthentication:", BSKY.data.userAuthentication );
	if (window.BSKY.DEBUG) console.debug( PREFIX_RAWDATA + "Current userAuthentication:", COMMON.prettyJson( BSKY.data.userAuthentication ) );
	if (window.BSKY.DEBUG) console.debug( PREFIX_RAWDATA + "Current userAccessToken:", BSKY.data.userAccessToken );
	if (window.BSKY.DEBUG) console.debug( PREFIX_RAWDATA + "Current userAccessToken:", JWT.jwtToPrettyJSON( BSKY.data.userAccessToken ) );
	if (window.BSKY.DEBUG) console.debug( PREFIX_RAWDATA + "Current BSKY.data.dpopNonce:", BSKY.data.dpopNonce);
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();

	// Let's backup the current data.
	saveRuntimeDataInLocalStorage();

	// Let's render the user's access token.
	// if (window.BSKY.DEBUG) console.debug( PREFIX + "userAuthentication:", BSKY.data.userAuthentication );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Rendering the access token fields and panel..." );

	// Update HTML fields
	HTML.updateUserAccessToken(APP_CLIENT_ID, BSKY.data.userAccessToken);
	HTML.updateHighlight();

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
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
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Info step
	HTML.showStepInfo( STEP_NAME, `The access token of the user...` );

	// ---------------------------------------------------------
	// Retrieve the access_token
	let apiCallResponse					= null;
	let tokenValidationInfo				= false;
	let isAccessTokenValid				= false;
	let isTokenCloseToExpire			= false;

	if (window.BSKY.DEBUG) console.debug( PREFIX + `Let's see whether we have a "valid" user access token...` );
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_RAWDATA );
	if (window.BSKY.DEBUG) console.debug( PREFIX_RAWDATA + "+ Current userAccessToken:", BSKY.data.userAccessToken );
	if (window.BSKY.DEBUG) console.debug( PREFIX_RAWDATA + "+ Current userAuthServerDiscovery:", BSKY.auth.userAuthServerDiscovery );
	if (window.BSKY.DEBUG) console.debug( PREFIX_RAWDATA + "+ Current userAuthentication:", BSKY.data.userAuthentication );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();

	// Do we have access token?
	if ( COMMON.isNullOrEmpty( BSKY.data.userAccessToken ) ) {
		// NO. Let's see if this is the first time after login.

		if (window.BSKY.DEBUG) console.debug( PREFIX + "No userAccessToken." );

		// Retrieve the "code"...
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Let's see if we have a code to retrieve the userAccessToken." );
		
		let lsCallbackData				= null;
		// Let's see if there is something in the localStorage...
		lsCallbackData					= localStorage.getItem(LSKEYS.CALLBACK_DATA) || null;
		if (COMMON.isNullOrEmpty(lsCallbackData)) {
			if (window.BSKY.DEBUG) console.debug( PREFIX + `Nothing[${LSKEYS.CALLBACK_DATA}] in the localStorage.` );
		} else {
			if (window.BSKY.DEBUG) console.debug( PREFIX + "Something in the localStorage." );
			BSKY.auth.callbackData		= JSON.parse( lsCallbackData );
			if (window.BSKY.DEBUG) console.debug( PREFIX_AFTER + "Detected:", COMMON.prettyJson( BSKY.auth.callbackData ) );
		}

		lsCallbackData					= localStorage.getItem(LSKEYS.CALLBACK_URL) || null;
		if (COMMON.isNullOrEmpty(lsCallbackData)) {
			if (window.BSKY.DEBUG) console.debug( PREFIX + `Nothing[${LSKEYS.CALLBACK_URL}] in the localStorage.` );
		} else {
			if (window.BSKY.DEBUG) console.debug( PREFIX + "Something in the localStorage." );
			BSKY.auth.redirectURL		= lsCallbackData;
			if (window.BSKY.DEBUG) console.debug( PREFIX_AFTER + "Detected:", BSKY.auth.redirectURL );
		}

		if ( !BSKY?.auth?.callbackData?.code || COMMON.isNullOrEmpty( BSKY.auth.callbackData.code ) ) {
			if (window.BSKY.DEBUG) console.debug( PREFIX + `No "code" detected.` );
			// NO. No token and no code. Throw an error.
			if (window.BSKY.GROUP_DEBUG) console.groupEnd();
			throw new TYPES.AccessTokenError( OAuth2.ERROR_CODE_02 );
		} else {
			// YES. Let's retrieve the token
			if (window.BSKY.DEBUG) console.debug( PREFIX + "Current code:", BSKY.auth.callbackData.code );

			// With the "code", let's retrieve the user access_token from the server.
			apiCallResponse					= await APIBluesky.tryAndCatch( "retrieveUserAccessToken", APIBluesky.retrieveUserAccessToken );
			if (window.BSKY.DEBUG) console.debug( PREFIX + "Current apiCallResponse:", apiCallResponse );

			// Let's group log messages
			if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_AFTER );
			if (window.BSKY.DEBUG) console.debug( PREFIX_AFTER + "Current apiCallResponse:", COMMON.prettyJson( apiCallResponse ) );

			// Parse the response
			BSKY.data.userAuthentication	= apiCallResponse.userAuthentication;
			BSKY.data.userAccessToken		= apiCallResponse.userAccessToken;
			if (window.BSKY.DEBUG) console.debug(PREFIX_AFTER + "userAuthentication:", BSKY.data.userAuthentication);
			if (window.BSKY.DEBUG) console.debug(PREFIX_AFTER + "userAccessToken:", BSKY.data.userAccessToken);

			// Let's create also the access token HASH...
			BSKY.data.accessTokenHash	= await CRYPT.createHash(BSKY.data.userAccessToken, true);
			if (window.BSKY.DEBUG) console.debug(PREFIX_AFTER + "accessTokenHash:", BSKY.data.accessTokenHash);
			if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		}
	} else {
		// YES. Let's see if it's valid.

		if (window.BSKY.DEBUG) console.debug( PREFIX + "GET userAccessToken" );

		tokenValidationInfo				= OAuth2.validateAccessToken( BSKY.data.userAccessToken, BSKY.auth.userAuthServerDiscovery, BSKY.data.userAuthentication, BSKY.auth.userDidDocument, BSKY.auth.userPDSMetadata );
		isAccessTokenValid				= tokenValidationInfo.isValid;
		isTokenCloseToExpire			= tokenValidationInfo.needsToRefresh;

		if ( isAccessTokenValid ) {
			if (window.BSKY.DEBUG) console.debug( PREFIX + `We have a VALID user access token. Continue` );
		} else {
			throw new TYPES.AccessTokenError( OAuth2.ERROR_CODE_07 );
		}

		if ( isTokenCloseToExpire ) {
			if (window.BSKY.DEBUG) console.debug( PREFIX + `We need to REFRESH the user access token.` );
			fnRefreshAccessToken();
		}
	}

	// Do something with the token information: Post Process the access token
	postProcessAccessToken();

	// Update some HTML fields
	// Prepare an object to pass
	HTML.updateHTMLFields(BSKY.auth.callbackData);

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
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
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Clear and hide error fields and panel
	HTML.clearHTMLError();

	// Info step
	HTML.showStepInfo( STEP_NAME, `Refreshing the user Access Token...` );

	// Let's refresh the user's access token.
	// ---------------------------------------------------------
	let refreshedAccessToken			= await APIBluesky.tryAndCatch( "refreshAccessToken", APIBluesky.refreshAccessToken, BSKY.auth.callbackData.code );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Current refreshedAccessToken:", refreshedAccessToken );

	// Clear and hide error fields and panel
	HTML.clearHTMLError();

	// First, let's validate the access token.
	// ---------------------------------------------------------
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Validating the refreshed token..." );
	await validateAccessToken();

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * LOGGED-IN PROCESS.
 *
 * "Business function": Logout.
 * -------------------------------------------------------- */
async function fnLogout() {
	const STEP_NAME						= "fnLogout";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userHandle=="+BSKY.user.userHandle+"]" );

	window.BSKY.faviconWorking();

	if (window.BSKY.DEBUG) console.debug( PREFIX + "Stopping the timers..." );
	clearTimeout( timerIdDynamicLoop );
	clearTimeout( timerIdStaticLoop );

	if (window.BSKY.DEBUG) console.debug( PREFIX + "Logging out from Bluesky..." );
	let loggedOutInfo					= await APIBluesky.tryAndCatch( "performUserLogout", APIBluesky.performUserLogout, null );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Current loggedOutInfo:", loggedOutInfo );

	// Remove things from localStorage
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Deleting localStorage items:" );
	localStorage.removeItem(LSKEYS.BSKYDATA);
	if (window.BSKY.DEBUG) console.debug( PREFIX + "+ Deleted:", LSKEYS.BSKYDATA );
	localStorage.removeItem(LSKEYS.ROOT_URL);
	if (window.BSKY.DEBUG) console.debug( PREFIX + "+ Deleted:", LSKEYS.ROOT_URL );
	localStorage.removeItem(LSKEYS.user.profile);
	if (window.BSKY.DEBUG) console.debug( PREFIX + "+ Deleted:", LSKEYS.user.profile );
	localStorage.removeItem(LSKEYS.CALLBACK_DATA);
	if (window.BSKY.DEBUG) console.debug( PREFIX + "+ Deleted:", LSKEYS.CALLBACK_DATA );
	localStorage.removeItem(LSKEYS.CALLBACK_URL);
	if (window.BSKY.DEBUG) console.debug( PREFIX + "+ Deleted:", LSKEYS.CALLBACK_URL );

	// Set, in localStorage, we come from "LOGOUT"
	localStorage.setItem(LSKEYS.LOGOUT, true);

	// Remove the crypto key from the database and the database itself.
	await DB.deleteDatabase();
	
	// Auto-detect the fallback URL from current...
	let currentURL						= new URL( window.location );
	let origin							= currentURL.origin;
	let path							= currentURL.pathname;
	let lastChar						= path.lastIndexOf( '/' );
	let fallBackPath					= path.substring( 0, lastChar );
	let fallBackURLFromCurrent			= new URL( currentURL.origin + fallBackPath );
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Detected:` );
	if (window.BSKY.DEBUG) console.debug( PREFIX + `+ [currentURL==${currentURL}]` );
	if (window.BSKY.DEBUG) console.debug( PREFIX + `+ [fallBackURLFromCurrent==${fallBackURLFromCurrent}]` );

	// Check if "logout" has been successfull
	// + http://localhost/bluesky/dashboard.html
	// + https://oauthbluesky.onrender.com/dashboard.html
	let fallBackURL						= null;
	if ( !COMMON.isNullOrEmpty(loggedOutInfo) ) {
		let header							= loggedOutInfo.headers;
		if ( header.ok && header.status == 204 ) {
			fallBackURL					= BSKY.path.root;
		} else {
			fallBackURL					= fallBackURLFromCurrent;
		}
	} else {
		if ( BSKY?.path?.root || !COMMON.isNullOrEmpty(BSKY.path.root) ) {
			fallBackURL					= BSKY.path.root;
		} else {
			fallBackURL					= fallBackURLFromCurrent;
		}
	}

	// Send to fallback URL.
	window.BSKY.faviconStandBy();
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Redirecting to: [${fallBackURLFromCurrent}]...` );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	window.location						= fallBackURL;
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
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[time==${new Date().toLocaleString( COMMON.DEFAULT_LOCALE, COMMON.DEFAULT_DATEFORMAT )}]` );

	let apiCallResponse					= null;

	window.BSKY.faviconWorking();

	// Restore data from localStorage.
	restoreDataFromLocalStorage();

	// Los botones del userDid y el clientId Metadata
	HTML.updateUserDIDInfo();

	try {
		// First, let's validate the access token.
		// ---------------------------------------------------------
		apiCallResponse					= await validateAccessToken();


		// Dynamic update
		// ---------------------------------------------------------

		// First load: Retrieve the dynamic data.
		apiCallResponse					= await updateDynamicInfo();

		// Timed load: Retrieve the dynamic data.
		refreshDynamicSeconds			= window.BSKY.refreshDynamicSeconds;
		refreshDynamicTime				= refreshDynamicSeconds * 1000;
		if (window.BSKY.DEBUG) console.debug(PREFIX + `TIMED Update the dashboard every ${refreshDynamicSeconds} second(s)` );
		timerIdDynamicLoop				= setInterval( updateDynamicData, refreshDynamicTime );

		// Static update
		// ---------------------------------------------------------

		// First load: Retrieve the static data.
		apiCallResponse					= await updateStaticInfo();

		// Timed load: Retrieve the dynamic data.
		refreshStaticSeconds			= window.BSKY.refreshStaticSeconds;
		refreshStaticTime				= refreshStaticSeconds * 1000;
		if (window.BSKY.DEBUG) console.debug(PREFIX + `TIMED Update the 'static' info every ${refreshStaticSeconds} second(s)` );
		timerIdStaticLoop				= setInterval( updateStaticData, refreshStaticTime );
	} catch (error) {
		// Show the error and update the HTML fields
		window.BSKY.faviconStandBy();
		HTML.updateHTMLError(error);

		// Errors? LOGOUT.
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Errors found. Performing the auto-logout." );
		if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		await fnLogout();
	} finally {
		window.BSKY.faviconStandBy();
	}

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * LOGGED-IN PROCESS.
 *
 * "Wrapper function": Update Dynamic Data.
 * Involves access token validation before.
 * -------------------------------------------------------- */
async function updateDynamicData() {
	const STEP_NAME						= "updateDynamicData";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[time==${new Date().toLocaleString( COMMON.DEFAULT_LOCALE, COMMON.DEFAULT_DATEFORMAT )}]` );

	window.BSKY.faviconWorking();

	// First, let's validate the access token.
	// ---------------------------------------------------------
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Validate the token..." );
	await validateAccessToken();

	// Later, perform the data update.
	// ---------------------------------------------------------
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Request and render dynamic data..." );
	await updateDynamicInfo();

	// Finally, set back the favicon.
	// ---------------------------------------------------------
	window.BSKY.faviconStandBy();

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * LOGGED-IN PROCESS.
 *
 * "Wrapper function": Update Static Data.
 * Involves access token validation before.
 * -------------------------------------------------------- */
async function updateStaticData() {
	const STEP_NAME						= "updateStaticData";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[time==${new Date().toLocaleString( COMMON.DEFAULT_LOCALE, COMMON.DEFAULT_DATEFORMAT )}]` );

	window.BSKY.faviconWorking();

	// First, let's validate the access token.
	// ---------------------------------------------------------
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Validate the token..." );
	await validateAccessToken();

	// Later, perform the data update.
	// ---------------------------------------------------------
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Request and render static data..." );
	await updateStaticInfo();

	// Finally, set back the favicon.
	// ---------------------------------------------------------
	window.BSKY.faviconStandBy();

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * LOGGED-IN PROCESS.
 *
 * "Business function": HIGH frequency data update.
 * Running initially every CONFIGURATION.global.refresh_dynamic seconds
 * -------------------------------------------------------- */
async function updateDynamicInfo() {
	const STEP_NAME						= "updateDynamicInfo";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// ---------------------------------------------------------
	// Steps.
	let apiCallResponse					= null;
	try {
		// Later, retrieve the rest of things.
		// ---------------------------------------------------------

		// Retrieve the user's profile to show
		apiCallResponse					= await getTheUserProfile();

		// Retrieve the user's notifications.
		apiCallResponse					= await getTheUserNotifications();

		// Retrieve the Trending Topics
		apiCallResponse					= await getTheTrendingTopics();
	} catch (error) {
		// Show the error and update the HTML fields
		HTML.updateHTMLError(error);

		if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		throw( error );
	}

	// Info step
	HTML.showStepInfo( STEP_NAME );

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * LOGGED-IN PROCESS.
 *
 * "Business function": LOW frequency data update.
 * Running initially every CONFIGURATION.global.refresh_static seconds
 * -------------------------------------------------------- */
async function updateStaticInfo() {
	const STEP_NAME						= "updateStaticInfo";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// ---------------------------------------------------------
	// Steps.
	let apiCallResponse					= null;
	try {
		// Later, retrieve the rest of things.
		// ---------------------------------------------------------

		// Retrieve the user's profile to show
		apiCallResponse					= await getTheUserProfile();

		// Retrieve who the user is following FROM THE PDS Repository
		apiCallResponse					= await getWhoTheUserFollows();

		// Retrieve the user's followers
		apiCallResponse					= await getWhoAreTheUserFollowers();

		// Retrieve who the user is blocking
		apiCallResponse					= await getWhoTheUserIsBlocking();

		// Retrieve who the user is muting
		apiCallResponse					= await getWhoTheUserIsMuting();

		// Retrieve the user's lists
		apiCallResponse					= await getTheUserLists();

		// Retrieve the user's lists
		apiCallResponse					= await getTheUserMutingModerationLists();

		// Retrieve the user's lists
		apiCallResponse					= await getTheUserBlockingModerationLists();

		// Now, check relationships...
		apiCallResponse					= await getTheRelations();
	} catch (error) {
		// Show the error and update the HTML fields
		HTML.updateHTMLError(error);

		if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		throw( error );
	}

	// Info step
	HTML.showStepInfo( STEP_NAME );

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}
