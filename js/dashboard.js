/**********************************************************
 * File Info:
 *
 * This file contains all the operative related
 * specifically with the dashboard page.
 *
 **********************************************************/


/**********************************************************
 * Module imports
 **********************************************************/
// Global configuration
import CONFIGURATION					from "./data/config.json" with { type: "json" };
// Common functions
import * as COMMON						from "./modules/common.functions.js";
// To perform API calls
import * as APICall						from "./modules/APICall.js";
// Common BrowserDB functions
import * as DB							from "./modules/BrowserDB.js";
// Common GEO functions
import * as GEO							from "./modules/GEO.js";
// Common GitHub functions
import * as GitHub						from "./modules/GitHub.js";
// Common HTML functions
import * as HTML						from "./modules/HTML.js";


/**********************************************************
 * Module Constants
 **********************************************************/
// Module SELF constants
const MODULE_NAME						= COMMON.getModuleName( import.meta.url );

// Inner constants
const LSKEYS							= CONFIGURATION.localStorageKeys;
const CLIENT_APP						= CONFIGURATION.clientApp;

// Bluesky constants
const APP_CLIENT_ID						= CLIENT_APP.client_id;


/**********************************************************
 * Module Variables
 **********************************************************/


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
	const PREFIX_INNER					= `${PREFIX}[INTERNAL] `;
	if (window.BSKY.DEBUG) console.groupCollapsed( PREFIX );

	// ================================================================
	// Actualizamos el objeto raiz.
	// + Logging Properties
	window.BSKY.DEBUG					= CONFIGURATION.global.debug;
	window.BSKY.DEBUG_FOLDED			= CONFIGURATION.global.debug_folded;
	window.BSKY.refreshStaticSeconds	= CONFIGURATION.global.refresh_static;
	window.BSKY.refreshDynamicSeconds	= CONFIGURATION.global.refresh_dynamic;
	// + Functions
	window.BSKY.searchUser				= fnSearchUser;
	window.BSKY.updateDebug				= fnUpdateDebug;
	window.BSKY.showCurrent				= fnUpdateCurrentRefreshTime;

	// ================================================================
	// Module info.
	if (window.BSKY.DEBUG) console.debug( PREFIX + "MODULE_NAME:", MODULE_NAME, "import.meta.url:", import.meta.url );

	// ================================================================
	// Module END
	console.info( `Loaded module ${MODULE_NAME}.` );

	// ================================================================
	// Ejecutamos las acciones propias de esta página.
	if (window.BSKY.DEBUG) console.groupCollapsed( PREFIX_INNER );

	// La clave criptográfica en la base de datos
	await DB.checkCryptoKeyInDB();

	// Perform dashboard operations
	// ------------------------------------

	// El reloj
	// ------------------------------------
	setInterval(() => HTML.clock(), BSKY.data.MILLISECONDS );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Clock started" );

	// GitHub Information
	// ------------------------------------
	let githubInfo						= await GitHub.getRepositoryInformation();
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received githubInfo:", githubInfo );

	// Save the info
	BSKY.git							= githubInfo;

	// Geolocation Information
	// ------------------------------------
	let geolocationInfo					= await GEO.getGeolocationInformation();
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received geolocationInfo:", geolocationInfo );

	// Save the info
	BSKY.user.geolocation				= geolocationInfo;

	// Geolocation Update
	let where							= BSKY.user.geolocation.bdc.localityInfo.administrative;
	let place							= where[where.length-1];
	$( "#currentGeolocation" ).val( place.name );

	// The "context".
	// ------------------------------------
	BSKY.auth.root						= localStorage.getItem(LSKEYS.ROOT_URL);

	// Los eventos de los modales Bootstrap
	// ------------------------------------
	COMMON.fnGetById('modal-settings').addEventListener( 'show.bs.modal', modalEventForSettingsWhenInvoked );
	COMMON.fnGetById('modal-settings').addEventListener( 'hidden.bs.modal', modalEventForSettingsWhenClosed );
	COMMON.fnGetById('modal-search-user').addEventListener( 'show.bs.modal', modalEventForSearchUsersWhenInvoked );

	if (window.BSKY.DEBUG) console.groupEnd();

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.DEBUG) console.groupEnd();
	BSKY.dashboard();
}


/**********************************************************
 * MODAL Events Functions
 **********************************************************/

function modalEventForSearchUsersWhenInvoked( event ) {

	// Clear "Search user" field
	// ---------------------------------------------------------
	$( '#search-profile-pattern' ).val( '' );
	$( `#search-profile-results` ).empty();
}

function modalEventForSettingsWhenInvoked( event ) {

	// Logging options
	// ---------------------------------------------------------
	$( '#flexSwitchCheckDebug' ).prop( 'checked', window.BSKY.DEBUG );
	$( '#flexSwitchCheckGroupedDebug' ).prop( 'checked', window.BSKY.DEBUG_FOLDED );

	// Refresh time options
	// ---------------------------------------------------------
	$( '#refreshStaticSeconds' ).val( window.BSKY.refreshStaticSeconds );
	$( '#refreshDynamicSeconds' ).val( window.BSKY.refreshDynamicSeconds );
}

function modalEventForSettingsWhenClosed( event ) {
	updateSettings( event.target.querySelectorAll( "input" ) );
}


/**********************************************************
 * BUSINESS Functions
 **********************************************************/

/* --------------------------------------------------------
 * LOGGED-IN PROCESS.
 *
 * "Search an user"
 *
 *		/xrpc/app.bsky.actor.searchActorsTypeahead
 *		endpoint: API.bluesky.XRPC.api.public.searchActorsTypeahead
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
	if (window.BSKY.DEBUG) console.groupCollapsed( PREFIX );
	if (window.BSKY.DEBUG) console.warn( PREFIX + "Under development yet!" );

	// Veamos qué trae...
	let searchString					= source.value;
	if ( !COMMON.isNullOrEmpty( searchString ) && ( searchString.length>0 ) ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Searching for:", searchString );
		let received					= await APIBluesky.tryAndCatch( "searchProfile", APIBluesky.searchProfile, searchString );
		let actors						= received.actors;
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Received actors:", actors );

		if ( actors ) {
			// Borramos lo que hubiera
			let $list					= $( `#search-profile-results` );
			$list.empty();
			// Agregamos los encontrados.
			let html					= null;
			actors.forEach( actor => {
				html					= `<li class="list-group-item">`;
				if (actor.avatar) {
					html				+= `<a href="${API.bluesky.profile.url}${actor.handle || actor.did}" target="_blank">`;
					html				+= `<img src="${actor.avatar}" height="24"></a>&nbsp;`;
				}
				html					+= `<a href="${API.bluesky.profile.url}${actor.handle || actor.did}" target="_blank">`;
				html					+= `${actor.displayName || actor.handle || actor.did}</a> [${actor.handle}]`;
				html					+= `</li>`;
				$list.append( html );
			});
		}
	}

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.DEBUG) console.groupEnd();
}

function fnUpdateDebug( form ) {
	updateSettings( form.querySelectorAll( "input" ) );
}

function updateSettings( inputs ) {
	const STEP_NAME						= "updateSettings";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.DEBUG) console.groupCollapsed( PREFIX );

	inputs.forEach( item => {
		switch( item.id ) {
			case "refreshStaticSeconds":
				window.BSKY.refreshStaticSeconds	= item.value;
				break;
			case "refreshDynamicSeconds":
				window.BSKY.refreshDynamicSeconds	= item.value;
				break;
			case "flexSwitchCheckDebug":
				window.BSKY.DEBUG					= item.checked;
				break;
			case "flexSwitchCheckGroupedDebug":
				window.BSKY.DEBUG_FOLDED			= item.checked;
				break;
		}
	});

	// Logging options
	// ---------------------------------------------------------
	window.BSKY.GROUP_DEBUG				= window.BSKY.DEBUG && window.BSKY.DEBUG_FOLDED;
	if (window.BSKY.DEBUG) console.debug( PREFIX + `+ DEBUG[${window.BSKY.DEBUG}]: [${window.BSKY.DEBUG}]` );
	if (window.BSKY.DEBUG) console.debug( PREFIX + `+ DEBUG_FOLDED[${window.BSKY.DEBUG_FOLDED}]: [${window.BSKY.DEBUG_FOLDED}]` );
	if (window.BSKY.DEBUG) console.debug( PREFIX + `+ GROUP_DEBUG[${window.BSKY.GROUP_DEBUG}]: [${window.BSKY.GROUP_DEBUG}]` );

	// Refresh time options
	// ---------------------------------------------------------
	if (window.BSKY.DEBUG) console.debug( PREFIX + `+ refreshStaticSeconds[${window.BSKY.refreshStaticSeconds}]: [${window.BSKY.refreshStaticSeconds}]` );
	if (window.BSKY.DEBUG) console.debug( PREFIX + `+ refreshDynamicSeconds[${window.BSKY.refreshDynamicSeconds}]: [${window.BSKY.refreshDynamicSeconds}]` );

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.DEBUG) console.groupEnd();
}

function fnUpdateCurrentRefreshTime( item ) {
	$( `#${item.id}Current` ).html( item.value );
}
