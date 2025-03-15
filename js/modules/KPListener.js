/**********************************************************
 * Module imports
 *
 * See: https://dmauro.github.io/Keypress/
 *
 **********************************************************/
// Global configuration
import CONFIGURATION					from "../data/config.json" with { type: "json" };
// Common functions
import * as COMMON						from "./common.functions.js";
// Common Settings functions
import * as SETTINGS					from "./Settings.js";
// Common HTML Constants
import * as HTMLConstants				from "./HTML.Constants.js";


/**********************************************************
 * Module Constants
 **********************************************************/
// Module SELF constants
const MODULE_NAME						= COMMON.getModuleName( import.meta.url );

// Inner constants
const API								= CONFIGURATION.api;

const KEYSTROKES_LOG_ON					= "shift d t";						// onKeyUpShiftDT, SETTINGS.activateLogSystem
const KEYSTROKES_LOG_OFF				= "shift d f";						// onKeyUpShiftDF, SETTINGS.deactivateLogSystem
const KEYSTROKES_LOG_TOGGLE				= "shift d space";					// onKeyUpShiftDSpace, SETTINGS.toggleLogSystem
const KEYSTROKES_DOWNLOAD_BSKY			= "up down up down ctrl shift a";	// onKeySeqDownloadBSKY, download_BSKY



/**********************************************************
 * Module Variables
 **********************************************************/
let myScope								= this;
let listener							= null;


/**********************************************************
 * PRIVATE Functions
 **********************************************************/


/**********************************************************
 * PUBLIC Functions
 **********************************************************/


/* --------------------------------------------------------
 * LOGIN PROCESS.
 *
 * Function to setup keystroke combinations.
 * -------------------------------------------------------- */
export function setupKeypress() {
	const STEP_NAME						= "setupKeypress";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Create a listener
	if ( window?.keypress?.Listener ) {
		listener						= listener || new window.keypress.Listener();
	} else {
		listener						= listener || null;
	}
	
	if ( !COMMON.isNullOrEmpty( listener ) ) {
		let myCombos					= listener.register_many([
			{
				"keys"          		: KEYSTROKES_LOG_ON,
				"is_exclusive"  		: true,
				"on_keydown"    		: function() {
				},
				"on_keyup"      		: onKeyUpShiftDT,
				"this"   				: myScope
			},
			{
				"keys"          		: KEYSTROKES_LOG_OFF,
				"is_exclusive"  		: true,
				"on_keydown"    		: function() {
				},
				"on_keyup"      		: onKeyUpShiftDF,
				"this"   				: myScope
			},
			{
				"keys"          		: KEYSTROKES_LOG_TOGGLE,
				"is_exclusive"  		: true,
				"on_keyup"      		: onKeyUpShiftDSpace,
				"this"          		: myScope
			},

			// ADMIN functionality
			{
				"keys"          		: KEYSTROKES_DOWNLOAD_BSKY,
				"is_sequence"  			: true,
				"on_keyup"      		: onKeySeqDownloadBSKY,
				"this"          		: myScope
			}
		]);
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Registered listeners for" );
		if (window.BSKY.DEBUG) console.debug( PREFIX + `+ [${KEYSTROKES_LOG_ON}] Activate DEBUG` );
		if (window.BSKY.DEBUG) console.debug( PREFIX + `+ [${KEYSTROKES_LOG_OFF}] Deactivate DEBUG` );
		if (window.BSKY.DEBUG) console.debug( PREFIX + `+ [${KEYSTROKES_LOG_TOGGLE}] Toggle DEBUG status` );
	} else {
		console.warn( "NO KEYBOARD LISTENER DETECTED!" );
	}

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}

function onKeyUpShiftDT( event ) {
	SETTINGS.activateLogSystem();
	console.log( `Set[${KEYSTROKES_LOG_ON}] window.BSKY.DEBUG to: [${window.BSKY.DEBUG}]` );
	return true
}

function onKeyUpShiftDF( event ) {
	SETTINGS.deactivateLogSystem();
	console.log( `Set[${KEYSTROKES_LOG_OFF}] window.BSKY.DEBUG to: [${window.BSKY.DEBUG}]` );
	return true
}

function onKeyUpShiftDSpace( event ) {
	// Normally because we have a keyup event handler,
	// event.preventDefault() would automatically be called.
	// But because we're returning true in this handler,
	// event.preventDefault() will not be called.
	SETTINGS.toggleLogSystem();
	console.log( `Set[${KEYSTROKES_LOG_TOGGLE}] window.BSKY.DEBUG to: [${window.BSKY.DEBUG}]` );
	return true
}

function onKeySeqDownloadBSKY( event ) {
	const STEP_NAME						= "onKeySeqDownloadBSKY";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.DEBUG) console.groupCollapsed( PREFIX );

	// Cogemos el objeto BSKY...
	const obj							= {};
	obj.auth							= BSKY.auth;
	obj.data							= BSKY.data;
	obj.git								= BSKY.git;
	obj.path							= BSKY.path;
	obj.user							= BSKY.user;
	
	// Lo pasamos a string...
	// TODO: Faltaría por incorporar lo de los emojis
	// See: https://gist.github.com/satans17/38b54d7803598b1aa83d
	const UNIFIED_EMOJI_RANGES			= [
		'\ud83c[\udf00-\udfff]', // U+1F300 to U+1F3FF
		'\ud83d[\udc00-\ude4f]', // U+1F400 to U+1F64F
		'\ud83d[\ude80-\udeff]'  // U+1F680 to U+1F6FF
	];
	const EMOJI_REGEX					= new RegExp( UNIFIED_EMOJI_RANGES.join('|'), 'g' );
	const objAsString					= COMMON.prettyJson( obj )
											.replace(EMOJI_REGEX, "")
											.replace(/\r/g, "")
											.replace(/\n/g, "")
											.replace(/[\x00-\x1F]/g, "");

	// Le damos nombre...
	const date							= new Date();
	const formattedDate					= COMMON.getDateForFile();
	const downloadedFileName			= `${formattedDate}bsky.json`;

	// ... y lo descargamos.
	const mimeType						= HTMLConstants.MIME_TYPE_JSON.mime + "; charset=utf-8";
	download( objAsString, downloadedFileName, mimeType );

	console.log( `Activated[${KEYSTROKES_DOWNLOAD_BSKY}] - BSKY Downloaded File[${mimeType}]: [${downloadedFileName}]` );

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.DEBUG) console.groupEnd();
}
