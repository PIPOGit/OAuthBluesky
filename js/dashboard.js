/**********************************************************
 * Module Info:
 *
 * This file contains all the operative related
 * specifically with the dashboard page.
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
// Common Classes and Exceptions ("Types")
import * as TYPES						from "./modules/common/CommonTypes.js";
// Common HTML functions
import * as HTML						from "./modules/common/HTML.js";

/* --------------------------------------------------------
 * Modules with Helper functions
 * -------------------------------------------------------- */
// To perform API calls
import * as APICall						from "./modules/utils/APICall.js";
// Common BrowserDB functions
import * as DB							from "./modules/utils/BrowserDB.js";
// Common Events functions
import * as EVENTS						from "./modules/utils/Events.js";
// Common Keyboard Listener functions
import * as KPListener					from "./modules/utils/KPListener.js";
// Common Settings functions
import * as SETTINGS					from "./modules/utils/Settings.js";

/* --------------------------------------------------------
 * Modules with external, concrete API calls functions
 * -------------------------------------------------------- */
// Common APIBluesky functions
import * as APIBluesky					from "./modules/api/APIBluesky.js";
// Common ClearSky functions
import * as APIClearSky					from "./modules/api/APIClearSky.js";
// Common PLC Direvtory functions
import * as APIPLCDirectory				from "./modules/api/APIPLCDirectory.js";

/* --------------------------------------------------------
 * Modules with Crypto and authentication functions
 * -------------------------------------------------------- */
// Common OAuth2 functions
import * as OAuth2						from "./modules/auth/OAuth2.js";
// Common Crypto functions
import * as CRYPT						from "./modules/auth/Crypt.js";
// Common JWT functions
import * as JWT							from "./modules/auth/JWT.js";
// Common Token Management functions
import * as TOKEN						from "./modules/auth/TokenManagement.js";

/* --------------------------------------------------------
 * Modules with external functionalities functions
 * -------------------------------------------------------- */
// Common GEO functions
import * as GEO							from "./modules/external/GEO.js";
// Common GitHub functions
import * as GitHub						from "./modules/external/GitHub.js";


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
const NSID								= BLUESKY.NSID;

// Module constants
const MAX_ITERATIONS					= 100;
const MAX_LOADING_STEPS					= CONFIGURATION.global.loading_steps;


/**********************************************************
 * Module Variables
 **********************************************************/
let timerIdDynamicLoop					= 0;
let refreshDynamicSeconds				= 0;
let refreshDynamicTime					= 0;
let timerIdStaticLoop					= 0;
let refreshStaticSeconds				= 0;
let refreshStaticTime					= 0;
let timerIdLoader						= 0;


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
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// ================================================================
	// Module INFO INI

	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_MODULE_INFO );
	if (window.BSKY.DEBUG) console.debug( PREFIX_MODULE_INFO + "MODULE_NAME:", MODULE_NAME, "import.meta.url:", import.meta.url );

	// Root Object update.
	// ---------------------------------------------------------
	// + Properties
	// + Logging Properties
	window.BSKY.refreshStaticSeconds	= CONFIGURATION.global.refresh_static;
	window.BSKY.refreshDynamicSeconds	= CONFIGURATION.global.refresh_dynamic;
	window.BSKY.steps					= {};
	window.BSKY.steps.firstTime			= true;
	window.BSKY.steps.total				= 0;
	// + Functions
	window.BSKY.searchUser				= fnSearchUser;
	window.BSKY.updateDebug				= SETTINGS.fnUpdateDebug;
	window.BSKY.updateCurrentRefresh	= SETTINGS.fnUpdateCurrentRefreshTime;
	window.BSKY.filterFollowing			= HTML.fnFilterTable;
	window.BSKY.filterFollowers			= HTML.fnFilterTable;
	window.BSKY.showProfile				= EVENTS.showUserProfile;
	window.BSKY.dashboard				= fnDashboard;
	window.BSKY.logout					= fnLogout;
	window.BSKY.refreshAccessToken		= TOKEN.refreshAccessToken;
	window.BSKY.getUserProfile			= getTheUserProfile;
	window.BSKY.showError				= fnShowError;

	// Module INFO END
	// ================================================================
	if (window.BSKY.DEBUG) console.debug( PREFIX_MODULE_INFO + `Updated object: [window.BSKY].`, window.BSKY );
	console.info( `Loaded module ${MODULE_NAME}.` );

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX_MODULE_INFO + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();

	// Page setup concrete actions.
	// ---------------------------------------------------------

	// KeyPress configuration
	KPListener.setupKeypress();

	// Crypto Key to Database
	await DB.checkCryptoKeyInDB();

	// The clock
	setInterval(() => HTML.clock(), BSKY.data.MILLISECONDS );

	// GitHub Information
	BSKY.git							= await GitHub.getRepositoryInformation();

	// Geolocation Information
	let geolocationInfo					= await GEO.getGeolocationInformation();

	// Save the info
	BSKY.user.geolocation				= geolocationInfo;

	// Geolocation Update
	let where							= BSKY.user.geolocation.bdc.localityInfo.administrative;
	let place							= where[where.length-1];
	$( `#${HTML.DIV_GEOLOCATION}` ).val( place.name );

	// Bootstrap Modals events
	COMMON.getById(HTML.DIV_MODAL_SEARCH_USER ).addEventListener( 'show.bs.modal',		EVENTS.modalEventForSearchUsersWhenInvoked );
	COMMON.getById(HTML.DIV_MODAL_SEARCH_USER ).addEventListener( 'hidden.bs.modal',	EVENTS.modalEventForSearchUsersWhenClosed );
	COMMON.getById(HTML.DIV_MODAL_SETTINGS    ).addEventListener( 'show.bs.modal',		EVENTS.modalEventForSettingsWhenInvoked );
	COMMON.getById(HTML.DIV_MODAL_SETTINGS    ).addEventListener( 'hidden.bs.modal',	EVENTS.modalEventForSettingsWhenClosed );
	COMMON.getById(HTML.DIV_MODAL_VERSION     ).addEventListener( 'show.bs.modal',		EVENTS.modalEventForVersionWhenInvoked );
	COMMON.getById(HTML.DIV_MODAL_USER_PROFILE).addEventListener( 'show.bs.modal',		EVENTS.modalEventForUserProfileWhenInvoked );
	COMMON.getById(HTML.DIV_MODAL_USER_PROFILE).addEventListener( 'hidden.bs.modal',	EVENTS.modalEventForUserProfileWhenClosed );

	// "User Profile" events
	COMMON.getById( HTML.RELATION_FOLLOW  ).addEventListener( 'click',  EVENTS.eventRelationFollow );
	COMMON.getById( HTML.RELATION_BLOCKED ).addEventListener( 'click',  EVENTS.eventRelationBlock );
	COMMON.getById( HTML.RELATION_MUTED   ).addEventListener( 'click',  EVENTS.eventRelationMute );

	// Bootstrap OffCanvas events
	const bsOffcanvas					= new bootstrap.Offcanvas('#offCanvasMenu')
	const $buttons						= $( "#offCanvasMenu .nav-link" );
	if ( $buttons ) {
		$buttons.each( n => {
			$buttons[n].addEventListener( 'click', event => {
				bsOffcanvas.hide();
			});
		});
	}

	// ---------------------------------------------------------
	// End of module setup
	// ---------------------------------------------------------
	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();

	// Perform latest operations
	// ---------------------------------------------------------
	BSKY.dashboard();
}


/**********************************************************
 * PRIVATE Functions
 **********************************************************/

/* --------------------------------------------------------
 * "User Status"
 *
 * Retrieves the "user status", from the user PDS Repo.
 * This value comes from the "StatuSphere" application.
 * -------------------------------------------------------- */
async function getUserStatuSphere( handle ) {
	const STEP_NAME						= "getUserStatuSphere";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[handle==${handle}]` );

	// Retrieve the list of records of a given type from the repo.
	// ---------------------------------------------------------
	const nsid							= NSID.status;

	// The records.
	let allData							= null;
	try {
		allData							= await getRepoRecordsOfNSIDType( nsid, false );
		if ( COMMON.isNullOrEmpty( allData ) ) {
			if (window.BSKY.DEBUG) console.debug( PREFIX + `No data received.` );
		} else {
			if (window.BSKY.DEBUG) console.debug( PREFIX + `Received:`, allData );
		}
	} catch( error ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR[${error?.error}==${error?.error}]` );
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR[${error?.error?.json}==${error?.error?.json}]` );
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR[${error?.error?.json?.error}==${error?.error?.json?.message}]` );
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR:`, COMMON.prettyJson( error ) );
	}

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return COMMON.isNullOrEmpty( allData ) ? null : allData[0];
}


/* --------------------------------------------------------
 * "Searchs for an user"
 *
 *   Requires a: "data-bsky-target" to complete.
 *   This is the "output" field where to display the results list.
 *
 *		/xrpc/app.bsky.actor.searchActorsTypeahead
 *		endpoint: BLUESKY.XRPC.api.public.searchActorsTypeahead
 *
 *		https://bsky.social/xrpc/app.bsky.actor.searchActorsTypeahead?q=madri
 *		https://public.api.bsky.app/xrpc/app.bsky.actor.searchActorsTypeahead?q=madri
 *
 *		https://bsky.social/xrpc/app.bsky.actor.searchActorsTypeahead?q=madri
 *		https://public.api.bsky.app/xrpc/app.bsky.actor.searchActorsTypeahead?q=madri
 *
 * -------------------------------------------------------- */
async function fnSearchUser( source ) {
	const STEP_NAME						= "fnSearchUser";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;

	// Veamos qué trae...
	let searchString					= source.value;

	// El "target" field...
	let targetField						= source.dataset.bskyTarget;

	// LOG Head.
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[searching for: ${source.value}] [output:${targetField}]` );

	if ( !COMMON.isNullOrEmpty( searchString ) && ( searchString.length>0 ) ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Searching for:", searchString );
		let received					= await APIBluesky.getProfile( searchString );
		let actors						= received.actors;
		if (window.BSKY.DEBUG) console.debug( PREFIX + `Received ${actors.length} actor(s):`, actors );

		// Borramos lo que hubiera
		let $list						= $( `#${targetField}` );
		$list.empty();
		if ( actors && actors.length>0 ) {
			// Agregamos los encontrados.
			let html					= null;
			actors.forEach( actor => {
				html					= `<li class="list-group-item">`;

				// La imagen de perfil...
				html					+= `<a href="javascript:void(0)" onClick="BSKY.showProfile('${actor.handle}', '${actor.did}')" data-bsky-handle="${actor.handle}" data-bsky-did="${actor.did}" data-bs-toggle="modal" data-bs-target="#${HTML.DIV_MODAL_SEARCH_USER}" data-bs-dismiss="modal">`;
				html					+= (actor.avatar) ? `<img src="${actor.avatar}" height="24">` : `<i class="bi bi-person"></i>`;
				html					+= `</a>&nbsp;`;

				// El enlace al perfil...
				html					+= `<a href="${BLUESKY.profile.url}${actor.handle || actor.did}" target="_blank">`;
				html					+= `${actor.displayName || actor.handle || actor.did}</a> [${actor.handle}]`;

				html					+= `</li>`;
				$list.append( html );
			});
		} else {
			if (window.BSKY.DEBUG) console.debug( PREFIX + `Found(${actors.length}): Nothing` );
			$list.append( `No profiles found for: [${searchString}]` );
		}
	}

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * Inner "Business function": Retrieve records from the
 * user's PDS (the "repo"), of a given type ("NSID").
 * -------------------------------------------------------- */
async function getRepoRecordsOfNSIDType( nsid, renderHTMLErrors=true ) {
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

	try {
		do {
			n++;
			// Retrieve the user's repo records of type 'NSID'
			// ---------------------------------------------------------
			apiCallResponse					= await APIBluesky.getRecords( { cursor: cursor, nsid: nsid, renderHTMLErrors: renderHTMLErrors } );

			// Datos. Seguimos?
			cursor							= ( apiCallResponse.hasOwnProperty("cursor") ) ? apiCallResponse.cursor : null;
			hayCursor						= !COMMON.isNullOrEmpty(cursor);

			data							= apiCallResponse.records;
			subTotal						= data.length;
			allData.push(...data);
			acumulado						= allData.length;

			// Update the info panel
			HTML.showStepInfo( STEP_NAME, `Retrieving who the user follows (${acumulado})...` );
		} while ( hayCursor && (n<MAX_ITERATIONS) );
	} catch ( error ) {
		if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		throw( error );
	}

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return allData;
}

/* --------------------------------------------------------
 * Retrieve notifications.
 * -------------------------------------------------------- */
async function getTheUserNotifications() {
	const STEP_NAME						= "getTheUserNotifications";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_RETRY					= `${PREFIX}[RETRY] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Info step
	// ---------------------------------------------------------
	HTML.showStepInfo( STEP_NAME, `Retrieving the user notifications...` );

	// Clear and hide error fields and panel
	HTML.clearHTMLError();

	// The unread user's notifications.
	// ---------------------------------------------------------
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Let's retrieve the number of unread notifications...");
	let unreadNotifications				= await APIBluesky.getUnreadNotifications( false );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Current unreadNotifications:", unreadNotifications.count );

	if ( unreadNotifications.count > 0 ) {
		// The user's notifications.
		if (window.BSKY.DEBUG) console.debug( PREFIX + `Let's retrieve the ${unreadNotifications.count} unread notifications...`);
		let notifications				= await APIBluesky.getNotifications( false );
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Current notifications:", notifications );

		// Parse the response
		await HTML.htmlRenderNotifications( notifications, BSKY.data.userAccessToken, APP_CLIENT_ID, BSKY.data.accessTokenHash );

		// First time step
		// ---------------------------------------------------------
		if ( window.BSKY.steps.firstTime ) window.BSKY.steps.total++;
	} else {
		HTML.htmlRenderNoNotifications();
	}

	// First time step
	// ---------------------------------------------------------
	if ( window.BSKY.steps.firstTime ) window.BSKY.steps.total++;

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * Retrieve user Profile from the PDS.
 * -------------------------------------------------------- */
async function getTheUserProfile( handle = BSKY.user.userHandle ) {
	const STEP_NAME						= "getTheUserProfile";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_ERROR					= `${PREFIX}[ERROR] `;
	const PREFIX_RETRY					= `${PREFIX}[RETRY] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[handle==${handle}]` );

	// Info step
	// ---------------------------------------------------------
	HTML.showStepInfo( STEP_NAME, `Retrieving the user's profile...` );

	// Now, the user's profile.
	// ---------------------------------------------------------
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Let's retrieve the user's profile[${handle}]...` );
	let userProfile						= await APIBluesky.getUserProfile( handle );

	// Save it.
	if ( COMMON.areEquals( handle, BSKY.user.userHandle ) ) {
		// The "statusPhere".
		const userStatus				= await getUserStatuSphere( handle );
		userProfile.statuSphere			= COMMON.isNullOrEmpty( userStatus ) ? null : userStatus;

		BSKY.user.profile				= userProfile;

		// Lo pintamos en su sitio.
		HTML.htmlRenderUserProfile( userProfile );
	}

	// First time step
	// ---------------------------------------------------------
	if ( window.BSKY.steps.firstTime ) window.BSKY.steps.total++;

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return userProfile;
}


/* --------------------------------------------------------
 * Retrieve who the user follows.
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
	// ---------------------------------------------------------
	HTML.showStepInfo( STEP_NAME, `Retrieving who the user follows...` );
	BSKY.user.following					= BSKY.user.following || {};

	// Retrieve the list of records of a given type from the repo.
	// ---------------------------------------------------------
	const nsid							= NSID.follow;

	// The records.
	let allData							= await getRepoRecordsOfNSIDType( nsid );

	// First time step
	// ---------------------------------------------------------
	if ( window.BSKY.steps.firstTime ) window.BSKY.steps.total++;

	if ( COMMON.isNullOrEmpty( allData ) ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `No following detected.` );

		if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		return;
	}

	// Save it.
	BSKY.user.following.raw				= allData;
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Detected ${allData.length} records of type[${nsid}] in the repo` );

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

		// Sanity Check
		if ( search.length==0 ) {
			break;
		}

		let queryString					= "?" + search.join("").substring(1);

		// Update the info panel
		HTML.showStepInfo( STEP_NAME, `Retrieving who the user follows (${MAX_PROFILES * startAt}/${finishAt})...` );

		// Now, retrieve the block of profiles.
		// ---------------------------------------------------------

		blockOfProfiles					= await APIBluesky.getBlockOfRecords( queryString );

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
							if (window.BSKY.DEBUG) console.debug( PREFIX_PDS_PROFILES + `[LABEL ] Profile[${profile.displayName}/${profile.handle}/${profile.did}] | label(s)[${profile.labels.length}] | label:`, label.val );
						}
					});
				}
			}
			if (searched.length>0) {
				if (window.BSKY.DEBUG) console.debug( PREFIX_PDS_PROFILES + `[MISSED] Missed ${searched.length} profile(s)...`, searched );
				missing.push(...searched);
			}
		}
	} while ( startCurrent <= finishAt );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();

	// Save it.
	BSKY.user.following.profiles		= allProfiles;

	// First time step
	// ---------------------------------------------------------
	if ( window.BSKY.steps.firstTime ) window.BSKY.steps.total++;


	// Now, retrieve the missed profiles information.
	// ---------------------------------------------------------
	if ( missing.length>=0 ) {
		if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_PDS_MISSING + `[Missing: ${missing.length}]` );
		if (window.BSKY.DEBUG) console.debug( PREFIX_PDS_MISSING + `Missed profiles...`, missing );
		// Para ver el didDoc(JSON) de cada uno de ellos: https://plc.directory/[did]
		// Para ver el profile de cada uno de ellos: https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=[did]

		let urlOfMissing				= "";
		let didDocForMissing			= "";
		let profileForMissing			= "";
		for ( let idx=0; idx<missing.length; idx++ ) {
			userDid						= missing[ idx ];

			if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_MISSING + `Missed profile[${idx}] with did: [${userDid}]` );
			missingProfiles[userDid]	= {};
			missed						= {};
			missed.did					= userDid;
			missed.missed				= true;

			// The didDoc of the missing account
			try {
				missed.didDoc			= {};
				urlOfMissing			= `${BLUESKY.profile.pld}${userDid}`;
				if (window.BSKY.GROUP_DEBUG) console.debug( "Requesting DIDDOC url:", urlOfMissing );
				didDocForMissing		= await APIPLCDirectory.resolveDid( userDid );
				missed.didDoc.body		= didDocForMissing;
				if (window.BSKY.GROUP_DEBUG) console.warn( "Examinar didDocForMissing:", didDocForMissing );
			} catch ( error ) {
				missed.didDoc.fetchError	= error;
			}

			// The public profile of the missing account
			try {
				missed.profile			= {};
				urlOfMissing			= `${XRPC.public}/app.bsky.actor.getProfile?actor=${userDid}`;
				if (window.BSKY.GROUP_DEBUG) console.debug( "Requesting PROFILE url:", urlOfMissing );
				profileForMissing		= await APICall.call( STEP_NAME, urlOfMissing );
				missed.profile.profile	= profileForMissing;
				if (window.BSKY.GROUP_DEBUG) console.warn( "Examinar profileForMissing:", profileForMissing );
			} catch ( error ) {
				missed.profile.fetchError	= error;
			}

			// Recap
			missingProfiles.push( missed );

			if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX_MISSING + "-- END" );
			if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		}
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	} else {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `No missed profiles found.` );
	}

	// Save it.
	BSKY.user.missingProfiles			= missingProfiles;

	// First time step
	// ---------------------------------------------------------
	if ( window.BSKY.steps.firstTime ) window.BSKY.steps.total++;

	// Lo pintamos todo en su sitio.
	HTML.htmlRenderUserFollows( BSKY.user.following, BSKY.user.missingProfiles );

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * Retrieve who the user is following.
 * -------------------------------------------------------- */
async function getWhoAreTheUserFollowers() {
	const STEP_NAME						= "getWhoAreTheUserFollowers";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_ALL					= `${PREFIX}[ALL] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Info step
	// ---------------------------------------------------------
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
	do {
		n++;
		// Retrieve user's followers to show
		// ---------------------------------------------------------
		apiCallResponse					= await APIBluesky.getFollowers( cursor );

		// Datos. Seguimos?
		cursor							= ( apiCallResponse.hasOwnProperty("cursor") ) ? apiCallResponse.cursor : null;
		hayCursor						= !COMMON.isNullOrEmpty(cursor);

		data							= apiCallResponse.followers;
		subTotal						= data.length;
		allData.push(...data);
		acumulado						= allData.length;

		// Info step
		HTML.showStepInfo( STEP_NAME, `Retrieving who follows the user (${acumulado})...` );

	} while ( hayCursor && (n<MAX_ITERATIONS) );

	if (window.BSKY.DEBUG) console.debug( PREFIX + `Detected ${acumulado} records in the repo of the user` );

	// Save it.
	BSKY.user.followers					= allData;

	// First time step
	// ---------------------------------------------------------
	if ( window.BSKY.steps.firstTime ) window.BSKY.steps.total++;

	// Lo pintamos en su sitio.
	HTML.htmlRenderUserFollowers( allData );

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * Retrieve who the user is blocking.
 * -------------------------------------------------------- */
async function getWhoTheUserIsBlocking() {
	const STEP_NAME						= "getWhoTheUserIsBlocking";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_ALL					= `${PREFIX}[ALL] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Info step
	// ---------------------------------------------------------
	HTML.showStepInfo( STEP_NAME, `Retrieving who the user is blocking...` );

	// Now, the user's blocks.
	// ---------------------------------------------------------
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Let's retrieve who the user is blocking...` );
	let apiCallResponse					= null;
	let cursor							= null;
	let hayCursor						= false;
	let data							= null;
	let allData							= [];
	let n								= 0;
	let acumulado						= 0;
	let subTotal						= 0;
	
	// Retrieve first the list of blocks from ClearSky
	const dataFromClearSky				= !COMMON.isNullOrEmpty( BSKY.user?.clearSky?.userInfo?.blockedBy?.data?.found );
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Data from ClearSky? [${dataFromClearSky}]` );
	if ( dataFromClearSky ) {
		allData.push(...BSKY.user.clearSky.userInfo.blockedBy.data.found);
	}

	do {
		n++;
		// Retrieve user's blocks
		// ---------------------------------------------------------
		apiCallResponse					= await APIBluesky.getBlocks( cursor );

		// Datos. Seguimos?
		cursor							= ( apiCallResponse.hasOwnProperty("cursor") ) ? apiCallResponse.cursor : null;
		hayCursor						= !COMMON.isNullOrEmpty(cursor);

		data							= apiCallResponse.blocks;
		subTotal						= data.length;
		allData.push(...data);
		acumulado						= allData.length;

	} while ( hayCursor && (n<MAX_ITERATIONS) );

	// As we previously added the blocks from ClearSky, we must make it unique.
	const uniqueArray					= allData
		.filter((value, index, self) =>
			index === self.findIndex( b => ( COMMON.areEquals( b.did, value.did ) ))
		)
		.sort( (a,b) => a.handle.localeCompare( b.handle ) );
	acumulado							= uniqueArray.length;

	if (window.BSKY.DEBUG) console.debug( PREFIX + `Detected ${acumulado} blocks`, uniqueArray );

	// Save it.
	BSKY.user.blocks					= uniqueArray;

	// First time step
	// ---------------------------------------------------------
	if ( window.BSKY.steps.firstTime ) window.BSKY.steps.total++;

	// Lo pintamos en su sitio.
	HTML.htmlRenderUserBlocks( uniqueArray );

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * Retrieve who the user is muting.
 * -------------------------------------------------------- */
async function getWhoTheUserIsMuting() {
	const STEP_NAME						= "getWhoTheUserIsMuting";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_ALL					= `${PREFIX}[ALL] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Info step
	// ---------------------------------------------------------
	HTML.showStepInfo( STEP_NAME, `Retrieving who the user is muting...` );

	// Now, the user's mutes.
	// ---------------------------------------------------------
	let apiCallResponse					= null;
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Let's retrieve who the user is muting...` );
	let cursor							= null;
	let hayCursor						= false;
	let data							= null;
	let allData							= [];
	let n								= 0;
	let acumulado						= 0;
	let subTotal						= 0;
	do {
		n++;
		// Retrieve user's mutes
		// ---------------------------------------------------------
		apiCallResponse					= await APIBluesky.getMutes( cursor );

		// Datos. Seguimos?
		cursor							= ( apiCallResponse.hasOwnProperty("cursor") ) ? apiCallResponse.cursor : null;
		hayCursor						= !COMMON.isNullOrEmpty(cursor);

		data							= apiCallResponse.mutes;
		subTotal						= data.length;
		allData.push(...data);
		acumulado						= allData.length;

	} while ( hayCursor && (n<MAX_ITERATIONS) );

	if (window.BSKY.DEBUG) console.debug( PREFIX + `Detected ${acumulado} mutes`, allData );

	// Save it.
	BSKY.user.mutes						= allData;

	// First time step
	// ---------------------------------------------------------
	if ( window.BSKY.steps.firstTime ) window.BSKY.steps.total++;

	// Lo pintamos en su sitio.
	HTML.htmlRenderUserMutes( allData );

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * Retrieve which are the user's lists.
 * -------------------------------------------------------- */
async function getTheUserLists() {
	const STEP_NAME						= "getTheUserLists";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_ALL					= `${PREFIX}[ALL] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Info step
	// ---------------------------------------------------------
	HTML.showStepInfo( STEP_NAME, `Retrieving the lists of the user...` );

	// Now, the user's lists.
	// ---------------------------------------------------------
	let apiCallResponse					= null;
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Let's retrieve the lists of the user...` );
	let cursor							= null;
	let hayCursor						= false;
	let data							= null;
	let allData							= [];
	let n								= 0;
	let acumulado						= 0;
	let subTotal						= 0;
	do {
		n++;
		// Retrieve user's lists
		// ---------------------------------------------------------
		apiCallResponse					= await APIBluesky.getUserLists( cursor );

		// Datos. Seguimos?
		cursor							= ( apiCallResponse.hasOwnProperty("cursor") ) ? apiCallResponse.cursor : null;
		hayCursor						= !COMMON.isNullOrEmpty(cursor);

		data							= apiCallResponse.lists;
		subTotal						= data.length;
		allData.push(...data);
		acumulado						= allData.length;

	} while ( hayCursor && (n<MAX_ITERATIONS) );

	if (window.BSKY.DEBUG) console.debug( PREFIX + `Detected ${acumulado} lists`, allData );

	// Save it.
	BSKY.user.lists						= allData;

	// First time step
	// ---------------------------------------------------------
	if ( window.BSKY.steps.firstTime ) window.BSKY.steps.total++;

	// Lo pintamos en su sitio.
	if ( allData && ( allData.length>0 ) ) HTML.htmlRenderUserLists( allData );

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * Retrieve which are the user's lists.
 * -------------------------------------------------------- */
async function getTheUserMutingModerationLists() {
	const STEP_NAME						= "getTheUserMutingModerationLists";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_ALL					= `${PREFIX}[ALL] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Info step
	// ---------------------------------------------------------
	HTML.showStepInfo( STEP_NAME, `Retrieving the blocking moderation lists of the user...` );

	// Now, the user's blocking mod lists.
	// ---------------------------------------------------------
	let apiCallResponse					= null;
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Let's retrieve the blocking moderation lists of the user...` );
	let cursor							= null;
	let hayCursor						= false;
	let data							= null;
	let allData							= [];
	let n								= 0;
	let acumulado						= 0;
	let subTotal						= 0;
	do {
		n++;
		// Retrieve user's lists
		// ---------------------------------------------------------
		apiCallResponse					= await APIBluesky.getUserModLists( cursor );

		// Datos. Seguimos?
		cursor							= ( apiCallResponse.hasOwnProperty("cursor") ) ? apiCallResponse.cursor : null;
		hayCursor						= !COMMON.isNullOrEmpty(cursor);

		data							= apiCallResponse.lists;
		subTotal						= data.length;
		allData.push(...data);
		acumulado						= allData.length;

	} while ( hayCursor && (n<MAX_ITERATIONS) );

	if (window.BSKY.DEBUG) console.debug( PREFIX + `Detected ${acumulado} lists`, allData );

	// Save it.
	BSKY.user.moderation				= BSKY.user.moderation || {};
	BSKY.user.moderation.muting			= allData;

	// First time step
	// ---------------------------------------------------------
	if ( window.BSKY.steps.firstTime ) window.BSKY.steps.total++;

	// Lo pintamos en su sitio.
	if ( allData && ( allData.length>0 ) ) HTML.htmlRenderUserModerationList( allData, HTML.DIV_TABLE_MY_MOD_M_LISTS );

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * Retrieve which are the user's lists.
 * -------------------------------------------------------- */
async function getTheUserBlockingModerationLists() {
	const STEP_NAME						= "getTheUserBlockingModerationLists";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_ALL					= `${PREFIX}[ALL] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Info step
	// ---------------------------------------------------------
	HTML.showStepInfo( STEP_NAME, `Retrieving the muting moderation lists of the user...` );

	// Now, the user's mute mod lists.
	// ---------------------------------------------------------
	let apiCallResponse					= null;
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Let's retrieve the muting moderation lists of the user...` );
	let cursor							= null;
	let hayCursor						= false;
	let data							= null;
	let allData							= [];
	let n								= 0;
	let acumulado						= 0;
	let subTotal						= 0;
	do {
		n++;
		// Retrieve user's lists
		// ---------------------------------------------------------
		apiCallResponse					= await APIBluesky.getUserBlockModLists( cursor );

		// Datos. Seguimos?
		cursor							= ( apiCallResponse.hasOwnProperty("cursor") ) ? apiCallResponse.cursor : null;
		hayCursor						= !COMMON.isNullOrEmpty(cursor);

		data							= apiCallResponse.lists;
		subTotal						= data.length;
		allData.push(...data);
		acumulado						= allData.length;
	} while ( hayCursor && (n<MAX_ITERATIONS) );

	if (window.BSKY.DEBUG) console.debug( PREFIX + `Detected ${acumulado} lists`, allData );

	// Save it.
	BSKY.user.moderation				= BSKY.user.moderation || {};
	BSKY.user.moderation.blocking		= allData;

	// First time step
	// ---------------------------------------------------------
	if ( window.BSKY.steps.firstTime ) window.BSKY.steps.total++;

	// Lo pintamos en su sitio.
	HTML.htmlRenderUserModerationList( allData, HTML.DIV_TABLE_MY_MOD_B_LISTS, true );

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * Retrieve which are the user's feeds.
 * -------------------------------------------------------- */
async function getTheUserFeeds() {
	const STEP_NAME						= "getTheUserFeeds";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_ALL					= `${PREFIX}[ALL] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Info step
	// ---------------------------------------------------------
	HTML.showStepInfo( STEP_NAME, `Retrieving the user feeds...` );

	// Now, the user's feeds.
	// ---------------------------------------------------------
	let apiCallResponse					= null;
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Let's retrieve the user feeds...` );
	let cursor							= null;
	let hayCursor						= false;
	let data							= null;
	let allData							= [];
	let n								= 0;
	let acumulado						= 0;
	let subTotal						= 0;
	do {
		n++;
		// Retrieve user's lists
		// ---------------------------------------------------------
		apiCallResponse					= await APIBluesky.getUserFeeds( cursor );

		// Datos. Seguimos?
		cursor							= ( apiCallResponse.hasOwnProperty("cursor") ) ? apiCallResponse.cursor : null;
		hayCursor						= !COMMON.isNullOrEmpty(cursor);

		data							= apiCallResponse.feeds;
		subTotal						= data.length;
		allData.push(...data);
		acumulado						= allData.length;
	} while ( hayCursor && (n<MAX_ITERATIONS) );

	if (window.BSKY.DEBUG) console.debug( PREFIX + `Detected ${acumulado} lists`, allData );

	// Save it.
	BSKY.user.feeds						= allData;

	// First time step
	// ---------------------------------------------------------
	if ( window.BSKY.steps.firstTime ) window.BSKY.steps.total++;

	// Lo pintamos en su sitio.
	HTML.htmlRenderUserFeeds( allData );

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * Retrieve the Trending Topics.
 *
 * EndPoint: app.bsky.unspecced.getTrendingTopics
 * SRC: https://github.com/bluesky-social/atproto/blob/main/packages/api/src/client/types/app/bsky/unspecced/getTrendingTopics.ts
 * -------------------------------------------------------- */
async function getTheTrendingTopics() {
	const STEP_NAME						= "getTheTrendingTopics";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Info step
	// ---------------------------------------------------------
	HTML.showStepInfo( STEP_NAME, `Retrieving the Trending Topics...` );

	// Now, the basic data.
	// ---------------------------------------------------------
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
		data								= await APIBluesky.getTrendingTopics( cursor );

		// if ( !COMMON.isNullOrEmpty( data ) ) {
		if ( data && ( data?.topics || data?.suggested ) ) {
			// Save it.
			BSKY.user.trendingTopics		= data;

			// Lo pintamos en su sitio.
			if (window.BSKY.DEBUG) console.debug( PREFIX + `${data.topics.length} topics and ${data.suggested.length} suggested...` );
			HTML.htmlRenderTrendingTopics( data );
		}
	} catch ( error ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR retrieving the Trending Topics:`, error );

		// Show the error and update the HTML fields
		HTML.updateHTMLError(error);

		// if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
		// if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		// throw( error );
	}

	// First time step
	// ---------------------------------------------------------
	if ( window.BSKY.steps.firstTime ) window.BSKY.steps.total++;

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * Retrieve ClearSky information.
 * -------------------------------------------------------- */
async function getTheClearSkyInfo() {
	const STEP_NAME						= "getTheClearSkyInfo";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Info step
	// ---------------------------------------------------------
	HTML.showStepInfo( STEP_NAME, `Retrieving ClearSky info...` );

	try {
		const clearSky					= await APIClearSky.getClearSkyInfo();

		// Save it.
		BSKY.user.clearSky				= clearSky;

		// Lo pintamos en su sitio.
		HTML.htmlRenderClearSkyInformation( clearSky );
	} catch (error) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Errors found.", error );

		// Show the error and update the HTML fields
		HTML.updateHTMLError(error);
	} finally {
		// window.BSKY.faviconStandBy();
	}

	// First time step
	// ---------------------------------------------------------
	if ( window.BSKY.steps.firstTime ) window.BSKY.steps.total++;

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * Cross-check relationships.
 * -------------------------------------------------------- */
async function getTheRelations() {
	const STEP_NAME						= "getTheRelations";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Info step
	// ---------------------------------------------------------
	HTML.showStepInfo( STEP_NAME, `Cross-checking relationships with the user...` );

	if (window.BSKY.DEBUG) console.warn( PREFIX + "Under Development!" );
	// TODO: Cross-check following, followers, blocks and mutes with
	// + [getKnownFollowers]	https://docs.bsky.app/docs/api/app-bsky-graph-get-known-followers
	// + [getRelationships]		https://docs.bsky.app/docs/api/app-bsky-graph-get-relationships
	// + [getProfiles]			https://docs.bsky.app/docs/api/app-bsky-actor-get-profiles


	// Now, the relations.
	// ---------------------------------------------------------
	let apiCallResponse					= null;
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Let's retrieve the relationships...` );
	let cursor							= null;
	let hayCursor						= false;
	let cursorDate						= null;
	let outOfScope						= false;
	let data							= null;
	let authorFeed						= [];
	let n								= 0;
	let acumulado						= 0;
	let subTotal						= 0;

	const today							= new Date();
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Date of TODAY:`, today );
	let oneMonthAgo					= new Date();
	oneMonthAgo.setDate(0);
	oneMonthAgo.setDate( today.getDate() );
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Date of Month:`, oneMonthAgo );

	// Retrieve the User's Author Feed
	// ---------------------------------------------------------
	do {
		n++;
		apiCallResponse					= await APIBluesky.getAuthorFeed( cursor );

		// Datos. Seguimos?
		// De haber cursos, es la fecha.
		cursor							= apiCallResponse?.cursor || null;
		hayCursor						= !COMMON.isNullOrEmpty(cursor);
		// if (window.BSKY.DEBUG) console.debug( PREFIX + `  Detected(?) cursor: ${cursor} [hayCursor: ${hayCursor}]` );
		// cursor							= ( apiCallResponse.hasOwnProperty("cursor") ) ? apiCallResponse.cursor : null;
		// hayCursor						= !COMMON.isNullOrEmpty(cursor);
		// if (window.BSKY.DEBUG) console.debug( PREFIX + `  Detected cursor: ${cursor} [hayCursor: ${hayCursor}]` );
		cursorDate						= new Date( cursor );
		outOfScope						= COMMON.isBefore( cursorDate, oneMonthAgo );

		data							= apiCallResponse.feed;
		subTotal						= data.length;
		authorFeed.push(...data);
		acumulado						= authorFeed.length;
	} while ( !outOfScope && hayCursor && (n<MAX_ITERATIONS) );
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Last[${n}] cursor date[${outOfScope}]:`, cursorDate );

	/* ****************************************************************************
	 * Tenemos que coger:
	 *
	 * + [POST] Del propio post
	 *   item.post.author.did && item.post.author.handle
	 *
	 * + [REASON] Si hay un "reason" ( item?.reason ), es un "repost". POR MI.
	 *
	 * + [REPLY] Si hay un "reply" ( item?.reply ), es una "respuesta" a un post. POR MI.
	 *   Cogemos:
	 *
	 *   + El autor del primer post: item.reply.root.author.did && item.reply.root.author.handle
	 *   + El autor del post anterior al mio: item.reply.parent.author.did && item.reply.parent.author.handle
	 *   + El autor del post anterior al anterior al mio: item.reply.grandparentAuthor.author.did && item.reply.grandparentAuthor.author.handle
	 *
	**************************************************************************** */

	/*
	n									= 1;
	authorFeed.forEach(item => {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `+ Post[${n++}] [${item.post.indexedAt}] [${item.post.author.handle}]:`, item );
	});
	*/

	/* ****************************************************************************
		// TODO:
		También hay que coger los "getActorLikes"
		https://docs.bsky.app/docs/api/app-bsky-feed-get-actor-likes
		y coger los "creadores" del post.

		Y, finalmente, los likes a mis posts: "getLikes" por cada post (de la primera llamada).
		https://docs.bsky.app/docs/api/app-bsky-feed-get-likes
		y coger los usuarios a quienes les ha gustado cada post

		Con todo esto, podríamos establecer el snapshot de las burbujitas
		o un mapa de relaciones por haber habido una relación.

		A parte de esto, podríamos crear otro mapa con las relaciones follow/follower
		entre todas las cuentas que se tienen.
	**************************************************************************** */

	// First time step
	// ---------------------------------------------------------
	if ( window.BSKY.steps.firstTime ) window.BSKY.steps.total++;

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/**********************************************************
 * PUBLIC Functions
 **********************************************************/
/* --------------------------------------------------------
 * To display the errors modal.
 * -------------------------------------------------------- */
function fnShowError() {
	const errorModal					= bootstrap.Modal.getOrCreateInstance( `#${HTML.DIV_MODAL_ERROR}` );
	errorModal.show();
}


/* --------------------------------------------------------
 * Logout.
 * -------------------------------------------------------- */
async function fnLogout() {
	const STEP_NAME						= "fnLogout";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_LOCALSTORAGE			= `${PREFIX}[Local Storage] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userHandle=="+BSKY.user.userHandle+"]" );

	window.BSKY.faviconWorking();

	if (window.BSKY.DEBUG) console.debug( PREFIX + "Stopping the timers..." );
	if ( timerIdDynamicLoop )	clearTimeout( timerIdDynamicLoop );
	if ( timerIdStaticLoop )	clearTimeout( timerIdStaticLoop );
	if ( timerIdLoader )		clearTimeout( timerIdLoader );

	if (window.BSKY.DEBUG) console.debug( PREFIX + "Logging out from Bluesky..." );
	let loggedOutInfo					= await APIBluesky.logout();
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Current loggedOutInfo:", loggedOutInfo );

	// Remove things from localStorage
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_LOCALSTORAGE + "Deleting localStorage items:" );
	localStorage.removeItem(LSKEYS.BSKYDATA);
	if (window.BSKY.DEBUG) console.debug( PREFIX_LOCALSTORAGE + "+ Deleted:", LSKEYS.BSKYDATA );
	localStorage.removeItem(LSKEYS.ROOT_URL);
	if (window.BSKY.DEBUG) console.debug( PREFIX_LOCALSTORAGE + "+ Deleted:", LSKEYS.ROOT_URL );
	localStorage.removeItem(LSKEYS.user.profile);
	if (window.BSKY.DEBUG) console.debug( PREFIX_LOCALSTORAGE + "+ Deleted:", LSKEYS.user.profile );
	localStorage.removeItem(LSKEYS.CALLBACK_DATA);
	if (window.BSKY.DEBUG) console.debug( PREFIX_LOCALSTORAGE + "+ Deleted:", LSKEYS.CALLBACK_DATA );
	localStorage.removeItem(LSKEYS.CALLBACK_URL);
	if (window.BSKY.DEBUG) console.debug( PREFIX_LOCALSTORAGE + "+ Deleted:", LSKEYS.CALLBACK_URL );

	// Set, in localStorage, we come from "LOGOUT"
	localStorage.setItem(LSKEYS.LOGOUT, true);

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX_LOCALSTORAGE + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();

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
		if ( header.ok && ( header.status == 200 || header.status == 204 ) ) {
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
	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	window.location						= fallBackURL;
}


/* --------------------------------------------------------
 * Welcome page.
 * "Landing function" after successfull login.
 *
 * Performs all the needed steps to create/update the page.
 * -------------------------------------------------------- */
async function fnDashboard() {
	const STEP_NAME						= "fnDashboard";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[time==${new Date().toLocaleString( COMMON.DEFAULT_LOCALE, COMMON.DEFAULT_DATEFORMAT )}]` );

	let apiCallResponse					= null;

	// Info step
	HTML.showStepInfo( STEP_NAME );

	// The favicon
	window.BSKY.faviconWorking();

	// Restore data from localStorage.
	BSKY.restoreDataFromLocalStorage();

	// Los botones del userDid y el clientId Metadata
	HTML.updateUserDIDInfo();

	// For the first time
	timerIdLoader						= setInterval( updateLoaderBar, 250 );

	try {
		// First, let's validate the access token.
		// ---------------------------------------------------------
		apiCallResponse					= await TOKEN.validateAccessToken();

		// Dynamic update
		// ---------------------------------------------------------

		// First load: Retrieve the dynamic data.
		apiCallResponse					= await updateDynamicInfo();

		// Static update
		// ---------------------------------------------------------

		// First load: Retrieve the static data.
		apiCallResponse					= await updateStaticInfo();

		// RELOAD Dynamic update
		// ---------------------------------------------------------

		// Timed load: Retrieve the dynamic data.
		refreshDynamicSeconds			= window.BSKY.refreshDynamicSeconds;
		refreshDynamicTime				= refreshDynamicSeconds * 1000;
		if (window.BSKY.DEBUG) console.debug(PREFIX + `TIMED Update the dashboard every ${refreshDynamicSeconds} second(s)` );
		timerIdDynamicLoop				= setInterval( updateDynamicData, refreshDynamicTime );

		// RELOAD Static update
		// ---------------------------------------------------------

		// Timed load: Retrieve the static data.
		refreshStaticSeconds			= window.BSKY.refreshStaticSeconds;
		refreshStaticTime				= refreshStaticSeconds * 1000;
		if (window.BSKY.DEBUG) console.debug(PREFIX + `TIMED Update the 'static' info every ${refreshStaticSeconds} second(s)` );
		timerIdStaticLoop				= setInterval( updateStaticData, refreshStaticTime );
	} catch (error) {
		// Show the error and update the HTML fields
		window.BSKY.faviconStandBy();

		// Info on the error in the pane
		HTML.updateHTMLError(error);

		// Info step
		HTML.showStepInfo( STEP_NAME );

		// Errors? Put the error in the localStorage.
		localStorage.setItem( LSKEYS.ERROR_DATA, COMMON.prettyJson( error?.toJSON ? error.toJSON() : COMMON.prettyJson( error ) ) );
		if (window.BSKY.DEBUG) console.debug( PREFIX + `Kept this error in the local storage[${LSKEYS.ERROR_DATA}]:`, COMMON.prettyJson( error?.toJSON ? error.toJSON() : error ) );

		// Errors? LOGOUT?
		// ---------------------------------------------------------

		// Let's see whether it is an invalid grant
		let goAutoLogout				= false;
		let isAccessTokenError			= error instanceof TYPES.AccessTokenError;
		let isHTTPResponseError			= error instanceof TYPES.HTTPResponseError;
		let isHTMLError					= error instanceof TYPES.HTMLError;
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR TYPE: [isAccessTokenError==${isAccessTokenError}] [isHTTPResponseError==${isHTTPResponseError}] [isHTMLError==${isHTMLError}]` );
		if ( isAccessTokenError ) {
			goAutoLogout				= true;
		} else if ( error.isJson && ( error.code==400 ) ) {
			const json					= error.json;
			if ( COMMON.areEquals( json.error.toUpperCase(), HTML.HTTP_ERROR_INVALID_GRANT.toUpperCase() ) ) {
				if ( COMMON.areEquals( json.error_description.toUpperCase(), "Invalid code".toUpperCase() ) ) {
					goAutoLogout		= true;
				}
			}
		}

		if ( goAutoLogout || CONFIGURATION.global.autoLogout ) {
			if (window.BSKY.DEBUG) console.debug( PREFIX + "Errors found. Performing the auto-logout." );
			if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
			if (window.BSKY.GROUP_DEBUG) console.groupEnd();
			await fnLogout();
		}
	} finally {

		// Steps
		// ---------------------------------------------------------
		window.BSKY.steps.firstTime		= false;
		if (window.BSKY.DEBUG) console.debug(PREFIX + `Total steps for first time: ${window.BSKY.steps.total}.` );

		// Stop the execution of the refreshing function: ("updateLoaderBar")
		clearTimeout( timerIdLoader );

		// Hide the loader pane.
		$( `#${HTML.DIV_LOADER_PANEL}` ).addClass( "hidden" );

		// Show the main content
		$( `#${HTML.DIV_MAIN_PANEL}` ).removeClass( "hidden" ).addClass( "fade-in" );

		// The favicon to normal
		window.BSKY.faviconStandBy();
	}

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


function updateLoaderBar() {
	
	// Number of current completed steps
	const percent						= 100 * window.BSKY.steps.total / MAX_LOADING_STEPS;
	
	// Hide the loader pane.
	$( `#${HTML.DIV_LOADER_PANEL} .progress-bar` )
		.css(  'width', parseInt( percent ) + "%")
		.data( 'width', parseInt( percent ) )
		.text( percent.toFixed(0) + "%" );
}


/* --------------------------------------------------------
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
	await TOKEN.validateAccessToken();

	// Later, perform the data update.
	// ---------------------------------------------------------
	await updateDynamicInfo();

	// Finally, set back the favicon.
	// ---------------------------------------------------------
	window.BSKY.faviconStandBy();

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
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
	await TOKEN.validateAccessToken();

	// Later, perform the data update.
	// ---------------------------------------------------------
	await updateStaticInfo();

	// Finally, set back the favicon.
	// ---------------------------------------------------------
	window.BSKY.faviconStandBy();

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * HIGH frequency data update.
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

		if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		throw( error );
	} finally {

		// Info step
		HTML.showStepInfo( STEP_NAME );
	}

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * LOW frequency data update.
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

		// Retrieve the info from ClearSky...
		apiCallResponse					= await getTheClearSkyInfo();

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

		// Retrieve the user's lists
		apiCallResponse					= await getTheUserFeeds();

		// Now, check relationships...
		apiCallResponse					= await getTheRelations();
	} catch (error) {
		// Show the error and update the HTML fields
		HTML.updateHTMLError(error);

		if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		throw( error );
	} finally {

		// Info step
		HTML.showStepInfo( STEP_NAME );
	}

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}
