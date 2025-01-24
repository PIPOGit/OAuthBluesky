/**********************************************************
 * File Info:
 *
 * This file is needed for login and oauth2 callback operations.
 *
 **********************************************************/


/**********************************************************
 * Module imports
 **********************************************************/
// Common modules
import * as COMMON					from "./modules/common.functions.js";
import CONFIGURATION				from "./data/config.json" with { type: "json" };
import * as BLUESKY					from "./modules/bluesky.js";


/**********************************************************
 * Module Constants
 **********************************************************/
// Module SELF constants
const MODULE_NAME					= COMMON.getModuleName( import.meta.url );
const MODULE_VERSION				= "1.0.0";
const MODULE_PREFIX					= `[${MODULE_NAME}]: `;


// Inner constants
const CONST_URL						= new URL( window.location );
const DEBUG							= CONFIGURATION.global.debug;
const DEBUG_FOLDED					= CONFIGURATION.global.debug_folded;
const API							= CONFIGURATION.api;
const LSKEYS						= CONFIGURATION.localStorageKeys;


/**********************************************************
 * Module Variables
 **********************************************************/
let GROUP_DEBUG						= DEBUG && DEBUG_FOLDED;
window.BSKY							= window.BSKY || {};


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
function bootstrap() {
	'use strict'

	const PREFIX = `[${MODULE_NAME}:bootstrap] `;
	if (DEBUG) console.groupCollapsed( PREFIX );

	// ================================================================
	// Module info.
	if (DEBUG) console.debug( PREFIX, "import.meta.url:", import.meta.url );
	if (DEBUG) console.debug( PREFIX, "MODULE_NAME:", MODULE_NAME );

	if (DEBUG) console.debug( PREFIX, "Configuration:", CONFIGURATION );
	if (DEBUG) console.debug( PREFIX, "API:", API );
	if (DEBUG) console.debug( PREFIX, "CONST_URL:", CONST_URL );

	if (DEBUG) console.debug( PREFIX, "DEBUG:", DEBUG );
	if (DEBUG) console.debug( PREFIX, "DEBUG_FOLDED:", DEBUG_FOLDED );
	if (DEBUG) console.debug( PREFIX, "GROUP_DEBUG:", GROUP_DEBUG );


	// ================================================================
	// Creamos el objeto raiz.
	window.BSKY = {
		// loginWithGoogle : loginWithGoogle
		authenticateWithBluesky: BLUESKY.authenticateWithBluesky,
		analizeCallbackURL: BLUESKY.analizeCallbackURL
	};
	if (DEBUG) console.debug( PREFIX, `Created object: [window.BSKY].` );
	if (DEBUG) console.debug( PREFIX, "window.BSKY object:", window.BSKY );

	// ================================================================
	// Page Tune-Up
	
	// Highlight.JS
	hljs.highlightAll();

	// ================================================================
	// Page Events

	// JQuery Events
	/*
	$( window ).on( "load", function(jqEvent) {
		if (DEBUG) console.debug( PREFIX, `[$(window).on("load")] window is loaded` );
	});
	$( window ).on( "load", postBootstrap );
	*/

	
	// Vanilla Javascript Events
	/*
	window.onload = (event) => {
		// executes when complete page is fully loaded, including all frames, objects and images
		if (DEBUG) console.debug( PREFIX, `[window.onload] window is loaded` );
		let userHandle = localStorage.getItem(LSKEYS.user.handle);
		if ( userHandle ) {
			let $input = $( "#handle" );
			$input.val( userHandle );
			if (DEBUG) console.debug( PREFIX, `[window.onload] window is loaded` );
		}
	};
	*/

	let userHandle = localStorage.getItem(LSKEYS.user.handle);
	if ( userHandle ) {
		let $input = $( "#userHandle" );
		if (DEBUG) console.debug( PREFIX, "$input.length", $input.length );
		if ( $input.length ) {
			$input.val( userHandle );
			if (DEBUG) console.debug( PREFIX, `Updated "${$input[0].id}" with "${userHandle}"` );
		}
	}

	console.info( `Loaded module ${MODULE_NAME}, version ${MODULE_VERSION}.` );
	if (DEBUG) console.groupEnd();
}


