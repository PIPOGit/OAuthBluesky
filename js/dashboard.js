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
// Common Crypto functions
import * as Crypto						from "./modules/OAuth2/Crypto.js";


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


/**********************************************************
 * Module Variables
 **********************************************************/
let GROUP_DEBUG							= DEBUG && DEBUG_FOLDED;
let timerId								= 0;


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
	if (DEBUG) console.groupCollapsed( PREFIX );

	// ================================================================
	// Module info.
	if (DEBUG) console.debug( PREFIX + "MODULE_NAME:", MODULE_NAME, "import.meta.url:", import.meta.url );

	// ================================================================
	// Module END
	console.info( `Loaded module ${MODULE_NAME}, version ${MODULE_VERSION}.` );

	// ================================================================
	// Ejecutamos las acciones propias de esta página.
	if (DEBUG) console.groupCollapsed( PREFIX_INNER );

	// La clave criptográfica en la base de datos
	await DB.checkCryptoKeyInDB();

	// Perform dashboard operations
	// + Call first.
	const refreshSeconds				= CONFIGURATION.global.refresh_dashboard;
	const refreshTime					= refreshSeconds * 1000;
	if (DEBUG) console.debug( PREFIX_INNER + `Refreshing data every ${refreshSeconds} second(s)` );

	// Geolocation Information
	let geolocationInfo					= await GEO.getGeolocationInformation();
	if (DEBUG) console.debug( PREFIX + "Received geolocationInfo:", geolocationInfo );

	// Save the info
	BSKY.user.geolocation				= geolocationInfo;

	// The "context".
	BSKY.auth.root						= localStorage.getItem(LSKEYS.ROOT_URL);

	if (DEBUG) console.groupEnd();

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (DEBUG) console.groupEnd();

	// + Call every "refreshTime" seconds.
	BSKY.dashboard();
	timerId								= setInterval(() => BSKY.dashboard(), refreshTime);
}

