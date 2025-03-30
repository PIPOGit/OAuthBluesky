/**********************************************************
 * Module imports
 *
 * See: https://dmauro.github.io/Keypress/
 *
 **********************************************************/
// Global configuration
import CONFIGURATION					from "../../data/config.json" with { type: "json" };

// Common functions
import * as COMMON						from "../common/CommonFunctions.js";
// Common HTML Constants
import * as HTMLConstants				from "../common/HTML.Constants.js";

// Common Settings functions
import * as SETTINGS					from "./Settings.js";


/**********************************************************
 * Module Constants
 **********************************************************/
// Module SELF constants
const MODULE_NAME						= COMMON.getModuleName( import.meta.url );

// Inner constants
const KEYSTROKES						= CONFIGURATION.keystrokes;

const KEYSTROKES_LOG_ON					= KEYSTROKES.log_on;			// onKeyUpShiftDT, SETTINGS.activateLogSystem
const KEYSTROKES_LOG_OFF				= KEYSTROKES.log_off;			// onKeyUpShiftDF, SETTINGS.deactivateLogSystem
const KEYSTROKES_LOG_TOGGLE				= KEYSTROKES.log_toggle;		// onKeyUpShiftDSpace, SETTINGS.toggleLogSystem
const KEYSTROKES_DOWNLOAD_BSKY			= KEYSTROKES.download_bsky;		// onKeySeqDownloadBSKY, download_BSKY
const KEYSTROKES_SHOW_ERROR				= KEYSTROKES.show_error;		// onKeySeqShowError, show_error
const KEYSTROKES_CUSTOM_FUNCTION		= KEYSTROKES.custom_function;	// onKeySeqCustomFunction, BSKY.customFunction

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
				// KEYSTROKES_LOG_ON => Activates LOG
				"keys"          		: KEYSTROKES_LOG_ON,
				"is_exclusive"  		: true,
				"on_keydown"    		: function() {
				},
				"on_keyup"      		: onKeyUpShiftDT,
				"this"   				: myScope
			},
				// KEYSTROKES_LOG_OFF => Deactivates LOG
			{
				"keys"          		: KEYSTROKES_LOG_OFF,
				"is_exclusive"  		: true,
				"on_keydown"    		: function() {
				},
				"on_keyup"      		: onKeyUpShiftDF,
				"this"   				: myScope
			},
			{
				// KEYSTROKES_LOG_TOGGLE => Toggle LOG activation
				"keys"          		: KEYSTROKES_LOG_TOGGLE,
				"is_exclusive"  		: true,
				"on_keyup"      		: onKeyUpShiftDSpace,
				"this"          		: myScope
			},

			// ADMIN functionality
			{
				// KEYSTROKES_DOWNLOAD_BSKY => Download a JSON file with the contents of the BSKY.data object.
				"keys"          		: KEYSTROKES_DOWNLOAD_BSKY,
				"is_sequence"  			: true,
				"on_keyup"      		: onKeySeqDownloadBSKY,
				"this"          		: myScope
			},
			{
				// KEYSTROKES_SHOW_ERROR => Shows the error modal.
				"keys"          		: KEYSTROKES_SHOW_ERROR,
				"is_sequence"  			: true,
				"on_keyup"      		: onKeySeqShowError,
				"this"          		: myScope
			},
			{
				// KEYSTROKES_CUSTOM_FUNCTION => Launches a custom function.
				"keys"          		: KEYSTROKES_CUSTOM_FUNCTION,
				"is_sequence"  			: true,
				"on_keyup"      		: onKeySeqCustomFunction,
				"this"          		: myScope
			}
		]);
	/*
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Registered listeners for" );
		if (window.BSKY.DEBUG) console.debug( PREFIX + `+ [${KEYSTROKES_LOG_ON}] Activate DEBUG` );
		if (window.BSKY.DEBUG) console.debug( PREFIX + `+ [${KEYSTROKES_LOG_OFF}] Deactivate DEBUG` );
		if (window.BSKY.DEBUG) console.debug( PREFIX + `+ [${KEYSTROKES_LOG_TOGGLE}] Toggle DEBUG status` );
		if (window.BSKY.DEBUG) console.debug( PREFIX + `+ [${KEYSTROKES_SHOW_ERROR}] Show Error Modal` );
	 */
		console.info( PREFIX + "Registered listeners for" );
		console.info( PREFIX + `+ [${KEYSTROKES_LOG_ON}] Activate DEBUG` );
		console.info( PREFIX + `+ [${KEYSTROKES_LOG_OFF}] Deactivate DEBUG` );
		console.info( PREFIX + `+ [${KEYSTROKES_LOG_TOGGLE}] Toggle DEBUG status` );
		console.info( PREFIX + `+ [${KEYSTROKES_SHOW_ERROR}] Show Error Modal` );
	} else {
		console.warn( "NO KEYBOARD LISTENER DETECTED!" );
	}

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
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
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Cogemos el objeto BSKY...
	const obj							= {};
	obj.auth							= BSKY.auth;
	obj.data							= BSKY.data;
	obj.git								= BSKY.git;
	obj.path							= BSKY.path;
	obj.user							= BSKY.user;

	// Lo pasamos a string...
	// See: https://edvins.io/how-to-strip-emojis-from-string-in-java-script
	const REGEX_NON_PRINTABLE_CHARS		= /(\r|\n|\r\n|\R)/g;
	const REGEX_CTRL_CHARS				= /[\x00-\x1F]/g;
	const REGEX_HARD_SPACE_1			= /&zwj;/gi;
	const REGEX_HARD_SPACE_2			= /\u{200D}/giu;
	const REGEX_EMOJI					= /\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji_Presentation}|\p{Emoji}\u{FE0F}/giu;
	const objAsString					= COMMON.escapeUnicode( COMMON.prettyJson( obj ) )
											// .replace( REGEX_CTRL_CHARS, "" )
											.replace( REGEX_EMOJI, "" )
											.replace( REGEX_HARD_SPACE_1, "" )
											.replace( REGEX_HARD_SPACE_2, "" )
											.replace( REGEX_NON_PRINTABLE_CHARS, "" )
											.replace( /\r/g, "" )
											.replace( /\n/g, "" );

	// Le damos nombre...
	const date							= new Date();
	const formattedDate					= COMMON.getDateForFile();
	const downloadedFileName			= `${formattedDate}bsky.json`;

	// ... y lo descargamos.
	const mimeType						= HTMLConstants.MIME_TYPE_JSON.mime + "; charset=utf-8";
	console.log( `Activated[${KEYSTROKES_DOWNLOAD_BSKY}] - BSKY Downloaded File[${mimeType}]: [${downloadedFileName}]` );

	download( objAsString, downloadedFileName, mimeType );

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}

function onKeySeqShowError( event ) {
	BSKY.showError();
	return true
}

function onKeySeqCustomFunction( event ) {
	BSKY.customFunction( event );
}

