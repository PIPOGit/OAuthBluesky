/**********************************************************
 * File Info:
 *
 * This file contains all the operative related
 * specifically with the index/login page.
 *
 **********************************************************/


/**********************************************************
 * Module imports
 **********************************************************/
// Global configuration
import CONFIGURATION					from "./data/config.json" with { type: "json" };
// Common functions
import * as COMMON						from "./modules/common.functions.js";
// Common functions
import * as TYPES						from "./modules/common.types.js";


/**********************************************************
 * Module Constants
 **********************************************************/
// Module SELF constants
const MODULE_NAME						= COMMON.getModuleName( import.meta.url );

// Inner constants
const API								= CONFIGURATION.api;
const LSKEYS							= CONFIGURATION.localStorageKeys;
const CLIENT_APP						= CONFIGURATION.clientApp;
const CALLBACK_DEBUG					= true;

// Bluesky constants
const APP_CLIENT_ID						= CLIENT_APP.client_id;
/*
 * Normal / Public
 * ------------------------
 *  [APP_CALLBACK_URL].............:	"redirect_uri": "https://oauthbluesky.onrender.com/oauth/callback.html"
 *										Here, we receive the BSKY iss/code/state, analyze and redirect to dashboard.
 *	[APP_DASHBOARD_URL]............:	"dashboard": "https://oauthbluesky.onrender.com/dashboard.html",
 *
 * Devel / Localhost
 * ------------------------
 *	[APP_LOCALHOST_CALLBACK_URL]...:	"redirect_to_localhost": "https://oauthbluesky.onrender.com/oauth/callback.localhost.html",
 *										Here, we build-up the new URL with the same query string
 *	[APP_CALLBACK_TO_LOCALHOST_URL]:	"callback_to_localhost": "http://localhost/bluesky/oauth/callback.localhost.html",
 *										Here, we receive the BSKY iss/code/state, analyze and redirect to dashboard.
 *	[APP_LOCALHOST_DASHBOARD_URL]..:	"dashboard_localhost": "http://localhost/bluesky/dashboard.html",
 *
 */
const APP_CALLBACK_URL					= CLIENT_APP.redirect_uri;
const APP_LOCALHOST_CALLBACK_URL		= CLIENT_APP.redirect_to_localhost;
const APP_CALLBACK_TO_LOCALHOST_URL		= CLIENT_APP.callback_to_localhost;
const APP_DASHBOARD_URL					= CLIENT_APP.dashboard;
const APP_LOCALHOST_DASHBOARD_URL		= CLIENT_APP.dashboard_localhost;


/**********************************************************
 * Module Variables
 **********************************************************/
let isLocalhost							= false;
let redirectURI							= APP_CALLBACK_URL;
let dashboardURI						= APP_DASHBOARD_URL;



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
	if (CALLBACK_DEBUG || window.BSKY.DEBUG) console.groupCollapsed( PREFIX );

	// ================================================================
	// Module info.
	if (CALLBACK_DEBUG || window.BSKY.DEBUG) console.debug( PREFIX + "MODULE_NAME:", MODULE_NAME, "import.meta.url:", import.meta.url );

	// ================================================================
	// Actualizamos el objeto raiz.
	// + Functions
	window.BSKY.analizeCallback			= fnAnalizeCallback;
	if (CALLBACK_DEBUG || window.BSKY.DEBUG) console.debug( PREFIX + `Updated object: [window.BSKY].`, window.BSKY );

	// ================================================================
	// Module END
	console.info( `Loaded module ${MODULE_NAME}.` );

	if (CALLBACK_DEBUG || window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (CALLBACK_DEBUG || window.BSKY.DEBUG) console.groupEnd();
}


/**********************************************************
 * PRIVATE Functions
 **********************************************************/
function checkIfWeAreInLocalhost() {
	const STEP_NAME						= "checkIfWeAreInLocalhost";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (CALLBACK_DEBUG || window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Set, in localStorage, we come from "LOGOUT"
	let thisURL							= new URL(window.location);
	isLocalhost							= COMMON.areEquals(thisURL.host, "localhost");
	if (CALLBACK_DEBUG || window.BSKY.DEBUG) console.debug( PREFIX + `Are we in localhost:`, isLocalhost );

	if (CALLBACK_DEBUG || window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (CALLBACK_DEBUG || window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/**********************************************************
 * PUBLIC Functions
 **********************************************************/

/* --------------------------------------------------------
 * LOGIN PROCESS.
 *
 * Function to finish "login page".
 * -------------------------------------------------------- */
function fnAnalizeCallback(toLocalhost=false) {
	const STEP_NAME						= "fnAnalizeCallback";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (CALLBACK_DEBUG || window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// By default...
	redirectURI							= APP_DASHBOARD_URL;

	// Let's pickup the incoming data from the query string.
	// ---------------------------------------------------------
	// Retrieve URL information
	let thisURL							= new URL(window.location);

	// Retrieve data from the url
	let parsedSearch					= new URLSearchParams(thisURL.search);

	// The fields
	let iss								= null;
	let state							= null;
	let code							= null;
	let dpopNonce						= null;

	// Check whether we are in localhost or in the public website
	// and going or not to localhost.
	// ---------------------------------------------------------
	checkIfWeAreInLocalhost();
	if (CALLBACK_DEBUG || window.BSKY.DEBUG) console.debug( PREFIX + "isLocalhost:", isLocalhost );
	if (CALLBACK_DEBUG || window.BSKY.DEBUG) console.debug( PREFIX + "toLocalhost:", toLocalhost );
	if (isLocalhost) {
		// We are in localhost.
		// ---------------------------------------------------------
		if (CALLBACK_DEBUG || window.BSKY.DEBUG) console.debug( PREFIX + "We are in LOCALHOST." );

		// Going to localhost.
		// + isLocalhost==true
		// + toLocalhost==true
		// Current URL: [APP_CALLBACK_TO_LOCALHOST_URL]
		if (CALLBACK_DEBUG || window.BSKY.DEBUG) console.debug( PREFIX + "We has been CALLED FROM the PUBLIC WEBSITE." );

		// Retrieve the data from the query string.
		iss							= parsedSearch.get("iss");
		state						= parsedSearch.get("state");
		code						= parsedSearch.get("code");

		// Prepare the object.
		let callbackData			= new TYPES.CallbackData( iss, state, code, dpopNonce );
		if (CALLBACK_DEBUG || window.BSKY.DEBUG) console.debug( PREFIX + "callbackData:", COMMON.prettyJson( callbackData ) );

		// Save the data in the localStorage.
		localStorage.setItem(LSKEYS.CALLBACK_DATA, JSON.stringify( callbackData ));
		if (CALLBACK_DEBUG || window.BSKY.DEBUG) console.debug( PREFIX + "Saved callbackData into Local Storage:", LSKEYS.CALLBACK_DATA );

		redirectURI					= APP_LOCALHOST_DASHBOARD_URL;
	} else {
		// We are in the public website.
		// ---------------------------------------------------------
		if (CALLBACK_DEBUG || window.BSKY.DEBUG) console.debug( PREFIX + "We are in the PUBLIC WEBSITE." );

		if (toLocalhost) {
			// Going to localhost.
			// + isLocalhost==false
			// + toLocalhost==true
			// Current URL: [APP_LOCALHOST_CALLBACK_URL]
			if (CALLBACK_DEBUG || window.BSKY.DEBUG) console.debug( PREFIX + "We have to REDIRECT to CALLBACK @ LOCALHOST." );

			if (CALLBACK_DEBUG || window.BSKY.DEBUG) console.debug( PREFIX + "Preparing the target URL.." );
			let url						= new URL( APP_CALLBACK_TO_LOCALHOST_URL );
			url.search					= thisURL.search;
			redirectURI					= url.toString();
		} else {
			// [SAME SITE] Staying into public website.
			// + isLocalhost==false
			// + toLocalhost==false
			// Current URL: [APP_CALLBACK_URL]
			if (CALLBACK_DEBUG || window.BSKY.DEBUG) console.debug( PREFIX + "We STAY in the PUBLIC WEBSITE." );

			// Retrieve the data from the query string.
			iss							= parsedSearch.get("iss");
			state						= parsedSearch.get("state");
			code						= parsedSearch.get("code");

			// Prepare the object.
			let callbackData			= new TYPES.CallbackData( iss, state, code, dpopNonce );
			if (CALLBACK_DEBUG || window.BSKY.DEBUG) console.debug( PREFIX + "callbackData:", COMMON.prettyJson( callbackData ) );

			// Save the data in the localStorage.
			localStorage.setItem(LSKEYS.CALLBACK_DATA, JSON.stringify( callbackData ));
			if (CALLBACK_DEBUG || window.BSKY.DEBUG) console.debug( PREFIX + "Saved callbackData into Local Storage:", LSKEYS.CALLBACK_DATA );
		}

	}
	if (CALLBACK_DEBUG || window.BSKY.DEBUG) console.debug(PREFIX + "Redirecting to", redirectURI);

	if (CALLBACK_DEBUG || window.BSKY.GROUP_DEBUG) console.groupEnd();
	window.location						= redirectURI;
}

