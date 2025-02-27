/**********************************************************
 * Module imports
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
				"keys"          		: "shift d t",
				"is_exclusive"  		: true,
				"on_keydown"    		: function() {
				},
				"on_keyup"      		: onKeyUpShiftDT,
				"this"   				: myScope
			},
			{
				"keys"          		: "shift d f",
				"is_exclusive"  		: true,
				"on_keydown"    		: function() {
				},
				"on_keyup"      		: onKeyUpShiftDF,
				"this"   				: myScope
			},
			{
				"keys"          		: "shift d space",
				"is_exclusive"  		: true,
				"on_keyup"      		: onKeyUpShiftDSpace,
				"this"          		: myScope
			}
		]);
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Registered listeners for" );
		if (window.BSKY.DEBUG) console.debug( PREFIX + "+ [shift d t] Activate DEBUG" );
		if (window.BSKY.DEBUG) console.debug( PREFIX + "+ [shift d f] Deactivate DEBUG" );
		if (window.BSKY.DEBUG) console.debug( PREFIX + "+ [shift d space] Toggle DEBUG status" );
	} else {
		console.warn( "NO KEYBOARD LISTENER DETECTED!" );
	}

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}

function onKeyUpShiftDT( event ) {
	SETTINGS.activateLogSystem();
	console.log( `Set[shift d t] window.BSKY.DEBUG to: [${window.BSKY.DEBUG}]` );
	return true
}

function onKeyUpShiftDF( event ) {
	SETTINGS.deactivateLogSystem();
	console.log( `Set[shift d f] window.BSKY.DEBUG to: [${window.BSKY.DEBUG}]` );
	return true
}

function onKeyUpShiftDSpace( event ) {
	// Normally because we have a keyup event handler,
	// event.preventDefault() would automatically be called.
	// But because we're returning true in this handler,
	// event.preventDefault() will not be called.
	SETTINGS.toggleLogSystem();
	console.log( `Set[shift d space] window.BSKY.DEBUG to: [${window.BSKY.DEBUG}]` );
	return true
}
