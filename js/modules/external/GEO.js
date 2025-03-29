/**********************************************************
 * Module imports
 *
 * PKCE HELPER FUNCTIONS
 * See: https://gist.github.com/ahmetgeymen/a9dcd656a1527f6c73d9c712ea2d9d7e
 *
 **********************************************************/
// Global configuration
import CONFIGURATION					from "../../data/config.json" with { type: "json" };

// Common functions
import * as COMMON						from "../common/CommonFunctions.js";

// To perform API calls
import * as APICall						from "../utils/APICall.js";


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


/**********************************************************
 * PRIVATE Functions
 **********************************************************/
async function externalCall(  position=null ) {
	const STEP_NAME						= "externalCall";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

    // API Geolocation
	// ---------------------------------------------------------
	let root							= null;
	let endpoint						= null;
	let url								= null;
	let responseFromServer				= null;
	let response						= {};

	try {
		root							= API.geo.bdc.rootUrl;
		endpoint						= API.geo.bdc.reverseGeocodeClient;
		url								= root + endpoint + "?localityLanguage=es";

		if ( position ) {
			const latitude				= position.coords.latitude;
			const longitude				= position.coords.longitude;
			url							+= `&latitude=${latitude}&longitude=${longitude}`;
		}

		if (window.BSKY.DEBUG) console.debug(PREFIX + "Fetching data from:", url);
		responseFromServer				= await APICall.call( STEP_NAME, url );
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Received responseFromServer:", responseFromServer );
		response.bdc					= responseFromServer.json;
	} catch (error) {
		if (window.BSKY.DEBUG) console.debug(PREFIX + "ERROR fetching data from:", url);
		// Show the error and update the HTML fields
		// HTML.updateHTMLError(error);
	}
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received geolocationInfo:", response );

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return response;
}

async function browserGeolocation() {
	const STEP_NAME						= "browserGeolocation";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_SUCCESS				= `${PREFIX}[SUCCESS] `;
	const PREFIX_ERROR					= `${PREFIX}[ERROR] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

    // Browser Geolocation information
	// ---------------------------------------------------------
	async function success( position ) {
		const latitude					= position.coords.latitude;
		const longitude					= position.coords.longitude;
		if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_SUCCESS );
		if (window.BSKY.DEBUG) console.debug( PREFIX_SUCCESS + "Geolocation coordinates:", position );

		const externalResponse			= await externalCall( position );
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Received geolocationInfo:", externalResponse );

		if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX_SUCCESS + "-- END" );
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		return externalResponse;

		// status.textContent = "";
		// mapLink.href = `https://www.openstreetmap.org/#map=18/${latitude}/${longitude}`;
		// mapLink.textContent = `Latitude: ${latitude} °, Longitude: ${longitude} °`;
	}

    // Browser Geolocation information
	// ---------------------------------------------------------
	function error() {
		response.available				= false;
		response.message				= "Unable to retrieve your location";
		if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_ERROR );
		if (window.BSKY.DEBUG) console.debug( PREFIX_ERROR + response.message );

		if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX_ERROR + "-- END" );
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		return null;
	}

	const response						= {};
	response.available					= true;
	response.message					= "";

	if (!navigator.geolocation) {
		response.available				= false;
		response.message				= "Geolocation is not supported by your browser";
	} else {
		response.message				= "Locating...";
		response.position				= navigator.geolocation.getCurrentPosition( success, error );
	}

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return response;
}


/**********************************************************
 * PUBLIC Functions
 **********************************************************/
// Return the Geolocation Information
export async function getGeolocationInformation() {
	const STEP_NAME						= "getGeolocationInformation";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

    // Browser Geolocation information
	// ---------------------------------------------------------
	// const browserResponse				= await browserGeolocation();
	// if (window.BSKY.DEBUG) console.debug( PREFIX + "Received Browser Geolocation information:", browserResponse );

    // API Geolocation
	// ---------------------------------------------------------
	const externalResponse				= await externalCall();
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received geolocationInfo:", externalResponse );

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return externalResponse;
}

