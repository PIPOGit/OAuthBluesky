/**********************************************************
 * Module imports
 *
 * PKCE HELPER FUNCTIONS
 * See: https://gist.github.com/ahmetgeymen/a9dcd656a1527f6c73d9c712ea2d9d7e
 *
 **********************************************************/
// Global configuration
import CONFIGURATION					from "../data/config.json" with { type: "json" };
// Common functions
import * as COMMON						from "./common.functions.js";
// To perform API calls
import * as APICall						from "./APICall.js";


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
const API								= CONFIGURATION.api;


/**********************************************************
 * Module Variables
 **********************************************************/
let GROUP_DEBUG							= DEBUG && DEBUG_FOLDED;


/**********************************************************
 * PRIVATE Functions
 **********************************************************/


/**********************************************************
 * PUBLIC Functions
 **********************************************************/
// Return the Geolocation Information
export async function getGeolocationInformation() {
	const STEP_NAME						= "getGeolocationInformation";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_HEADERS				= `${PREFIX}[Headers] `;
	const PREFIX_BODY					= `${PREFIX}[Body] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

	let root							= null;
	let endpoint						= null;
	let url								= null;
	let responseFromServer				= null;
	let response						= {};

	/*
	try {
		root							= API.geo.myIPio.rootUrl;
		endpoint						= API.geo.myIPio['ip.json'];
		url								= root + endpoint;
		if (DEBUG) console.debug(PREFIX + "Fetching data from:", url);
		responseFromServer				= await APICall.makeAPICall( STEP_NAME, url );
		if (DEBUG) console.debug( PREFIX + "Received responseFromServer:", responseFromServer );
		response.myIPio					= responseFromServer.body;
	} catch (error) {
		if (DEBUG) console.debug(PREFIX + "ERROR fetching data from:", url);
		// Show the error and update the HTML fields
		// HTML.updateHTMLError(error);
	}
	*/

	try {
		root							= API.geo.bdc.rootUrl;
		endpoint						= API.geo.bdc['reverse-geocode-client'];
		url								= root + endpoint + "?localityLanguage=es";
		if (DEBUG) console.debug(PREFIX + "Fetching data from:", url);
		responseFromServer				= await APICall.makeAPICall( STEP_NAME, url );
		if (DEBUG) console.debug( PREFIX + "Received responseFromServer:", responseFromServer );
		response.bdc					= responseFromServer.body;
	} catch (error) {
		if (DEBUG) console.debug(PREFIX + "ERROR fetching data from:", url);
		// Show the error and update the HTML fields
		// HTML.updateHTMLError(error);
	}

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
	
	// return { state: state, codeVerifier: codeVerifier, codeChallenge: codeChallenge, body: body };
	return response;
}

