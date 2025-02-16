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
	COMMON.fnGetById('modal-settings').addEventListener( 'show.bs.modal', modalEventForSettings );
	COMMON.fnGetById('modal-search-user').addEventListener( 'show.bs.modal', modalEventForSearchUsers );

	if (window.BSKY.DEBUG) console.groupEnd();

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.DEBUG) console.groupEnd();
	BSKY.dashboard();
}

function modalEventForSettings( event ) {
	const STEP_NAME						= "modalEventForSettings";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.DEBUG) console.groupCollapsed( PREFIX );

	if (window.BSKY.DEBUG) console.debug( PREFIX + "Launched modal, with", event );
	$( '#flexSwitchCheckDebug' ).prop( 'checked', window.BSKY.DEBUG );
	$( '#flexSwitchCheckGroupedDebug' ).prop( 'checked', window.BSKY.DEBUG_FOLDED );
	if (window.BSKY.DEBUG) console.debug( PREFIX + `+ window.BSKY.DEBUG: [${window.BSKY.DEBUG}]` );
	if (window.BSKY.DEBUG) console.debug( PREFIX + `+ window.BSKY.DEBUG_FOLDED: [${window.BSKY.DEBUG_FOLDED}]` );

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.DEBUG) console.groupEnd();
}

function modalEventForSearchUsers( event ) {
	const STEP_NAME						= "modalEventForSearchUsers";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.DEBUG) console.groupCollapsed( PREFIX );

	if (window.BSKY.DEBUG) console.debug( PREFIX + "Launched modal, with", event );
	$( '#search-profile-pattern' ).val( '' );
	$( `#search-profile-results` ).empty();

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.DEBUG) console.groupEnd();
}
