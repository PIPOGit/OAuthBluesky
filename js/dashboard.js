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
import CONFIGURATION				from "./data/config.json" with { type: "json" };
// Common functions
import * as COMMON					from "./modules/common.functions.js";
// Common BrowserDB functions
import * as DB						from "./modules/BrowserDB.js";
// Common Crypto functions
import * as Crypto					from "./modules/OAuth2/Crypto.js";


/**********************************************************
 * Module Constants
 **********************************************************/
// Module SELF constants
const MODULE_NAME					= COMMON.getModuleName( import.meta.url );
const MODULE_VERSION				= "1.0.0";
const MODULE_PREFIX					= `[${MODULE_NAME}]: `;

// Logging constants
const DEBUG							= CONFIGURATION.global.debug;
const DEBUG_FOLDED					= CONFIGURATION.global.debug_folded;

// Inner constants


/**********************************************************
 * Module Variables
 **********************************************************/
let GROUP_DEBUG						= DEBUG && DEBUG_FOLDED;


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

	const STEP_NAME = "bootstrap";
	const PREFIX = `[${MODULE_NAME}:${STEP_NAME}] `;
	if (DEBUG) console.groupCollapsed( PREFIX );

	// ================================================================
	// Module info.
	if (DEBUG) console.debug( PREFIX + "MODULE_NAME:", MODULE_NAME, "import.meta.url:", import.meta.url );

	console.info( `Loaded module ${MODULE_NAME}, version ${MODULE_VERSION}.` );
	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (DEBUG) console.groupEnd();

	// ================================================================
	// Ejecutamos las acciones propias de esta página.

	// HTML L&F
	COMMON.hide( "infoPanel" );

	// La clave criptográfica en la base de datos
	await DB.checkCryptoKeyInDB();

	// Perform dashboard operations
	BSKY.dashboard();
}

