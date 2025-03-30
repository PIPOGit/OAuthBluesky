/**********************************************************
 * Module imports
 *
 * OAuth2 HELPER FUNCTIONS
 *
 **********************************************************/
// Global configuration
import CONFIGURATION					from "../../data/config.json" with { type: "json" };

// Common functions
import * as COMMON						from "../common/CommonFunctions.js";
// Common Classes and Exceptions ("Types")
import * as TYPES						from "../common/CommonTypes.js";
// Common HTML functions
import * as HTML						from "../common/HTML.js";

// Common DPOP functions
import * as DPOP						from "../auth/DPoPProof.js";
// Common JWT functions
import * as JWT							from "../auth/JWT.js";


/**********************************************************
 * Module Constants
 **********************************************************/
// Module SELF constants
const MODULE_NAME						= COMMON.getModuleName( import.meta.url );

// Inner constants
const API								= CONFIGURATION.api;
const LSKEYS							= CONFIGURATION.localStorageKeys;
const CLEARSKY							= API.clearSky;
const URLS								= CLEARSKY.url;
const ENDPOINTS							= CLEARSKY.endpoints;

// Bluesky constants
export const CLIENT_APP					= CONFIGURATION.clientApp;
export const APP_CLIENT_ID				= CLIENT_APP.client_id;

// HTTP methods
export const HTTP_GET					= "GET";
export const HTTP_POST					= "POST";

// HTTP headers
export const HTTP_HEADER_DPOP			= "DPoP";
export const HTTP_HEADER_DPOP_NONCE		= "DPoP-Nonce";
export const HTTP_HEADER_ACCEPT			= "Accept";
export const HTTP_HEADER_AUTHORIZATION	= "Authorization";
export const HTTP_HEADER_CONTENT_TYPE	= "Content-Type";
export const HTTP_HEADER_WWW_AUTHENTICATE	= "www-authenticate";

// HTML Content Type constants
export const CONTENT_TYPE_JSON			= "application/json";
export const CONTENT_TYPE_JSON_UTF8		= "application/json; charset=utf-8";
export const CONTENT_TYPE_DID_JSON		= "application/did+ld+json";
export const CONTENT_TYPE_DID_JSON_UTF8	= "application/did+ld+json; charset=utf-8";
export const CONTENT_TYPE_FORM_ENCODED	= "application/x-www-form-urlencoded";
export const JSON_CONTENT_TYPES			= [
	CONTENT_TYPE_JSON.toUpperCase(),
	CONTENT_TYPE_JSON_UTF8.toUpperCase(),
	CONTENT_TYPE_DID_JSON.toUpperCase(),
	CONTENT_TYPE_DID_JSON_UTF8.toUpperCase(),
	CONTENT_TYPE_FORM_ENCODED.toUpperCase()
];


/**********************************************************
 * Module Variables
 **********************************************************/

// Inner variables
let responseHeaders						= null;
let responseBody						= null;
let responseError						= null;


/**********************************************************
 * PRIVATE Functions
 **********************************************************/

/* --------------------------------------------------------
 * Helper function to analyze the incoming headers of an
 * HTTP response.
 *
 * The received object is of type: "TYPES.HTTPResponseHeaders".
 *
 * We'll look for some significant headers.
 * -------------------------------------------------------- */
function analizeReceivedHeaders(response) {
	const STEP_NAME						= "analizeReceivedHeaders";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// "dpop-nonce" header
	if ( response.headers[ HTTP_HEADER_DPOP_NONCE.toUpperCase() ] ) {
		// Here, we gather the "dpop-nonce" header.
		BSKY.data.dpopNonceUsed			= BSKY.data.dpopNonce || null;
		BSKY.data.dpopNonce				= response.headers[ HTTP_HEADER_DPOP_NONCE.toUpperCase() ] || null;
		BSKY.data.dpopNonceReceived		= BSKY.data.dpopNonce;
		$( `#${HTML.DIV_DPOP_NONCE}` ).val(BSKY.data.dpopNonce);
		if (   !COMMON.isNullOrEmpty(BSKY.data.dpopNonceUsed)
			&& !COMMON.isNullOrEmpty(BSKY.data.dpopNonceReceived)
			&& !COMMON.areEquals( BSKY.data.dpopNonceUsed, BSKY.data.dpopNonceReceived ) ) {
			if (window.BSKY.DEBUG) console.info( PREFIX + "%cReceived dpop-nonce header: [" + BSKY.data.dpopNonce + "]", COMMON.CONSOLE_STYLE );
		}
	}

	// "www-authenticate" header
	if ( response.headers[ HTTP_HEADER_WWW_AUTHENTICATE.toUpperCase() ] ) {
		// Here, we gather the "www-authenticate" header.
		BSKY.data.wwwAuthenticate		= response.headers[ HTTP_HEADER_WWW_AUTHENTICATE.toUpperCase() ];
		if (window.BSKY.DEBUG) console.info( PREFIX + "%cReceived www-authenticate header: [" + BSKY.data.wwwAuthenticate + "]", COMMON.CONSOLE_STYLE );
	}

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * Helper function to analyze an HTTP response, at first sight.
 *
 * Returns an object of type: "TYPES.HTTPResponseHeaders".
 * -------------------------------------------------------- */
function analizeHTTPResponseHeaders(data, show=true ) {
	const STEP_NAME						= "analizeHTTPResponseHeaders";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (show && window.BSKY.GROUP_DEBUG) console.groupCollapsed(PREFIX + "[RESPONSE=="+(data.ok?"OK":"ERROR")+" ("+data.status+")]");
	// if (show && window.BSKY.DEBUG) console.debug(PREFIX + "Received response:", COMMON.prettyJson(data));

	// Basic response information
	let response						= new TYPES.HTTPResponseHeaders();
	response.bodyUsed					= data.bodyUsed;
	response.ok							= data.ok;
	response.redirected					= data.redirected;
	response.status						= data.status;
	response.statusText					= data.statusText;
	response.type						= data.type;
	response.url						= data.url;
	response.headers					= {};

	// HTTP headers.
	for ( var pair of data.headers.entries() ) {
		response.headers[ pair[0].toUpperCase() ]	= pair[ 1 ];
	}

	if (show && window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (show && window.BSKY.GROUP_DEBUG) console.groupEnd();
	return response;
}


/* --------------------------------------------------------
 * Helper function to analyze an HTTP response, at first sight.
 * Also, sets the "responseHeaders" variable.
 *
 * Returns an object of type: "TYPES.HTTPResponse".
 * -------------------------------------------------------- */
async function processHTTPResponse( params, response ) {
	const STEP_NAME						= "processHTTPResponse";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Prepare the object to return ( "TYPES.HTTPResponse" )
	const httpResponse					= new TYPES.HTTPResponse();

	// Process the HTTP Response ( "TYPES.HTTPResponseHeaders" )
	const responseHeaders				= analizeHTTPResponseHeaders( response );
	httpResponse.headers				= responseHeaders;
	const contentType					= responseHeaders.headers[ HTTP_HEADER_CONTENT_TYPE.toUpperCase() ];
	httpResponse.contentType			= contentType;

	// Update the response with the incoming data.
	httpResponse.step					= params.step;
	httpResponse.url					= params.url;
	httpResponse.fetchOptions			= params.fetchOptions;

	// Analyze the HTTP Response HEADERs.
	analizeReceivedHeaders( responseHeaders );

	// If the response is wrong...
	if ( !response.ok ) {
		httpResponse.isError			= true;
	}

	// The response body
	await response.text().then( data => {
		httpResponse.body				= data;

		// If the response is a JSON object-type...
		if ( !COMMON.isNullOrEmpty( data ) && !COMMON.isNullOrEmpty( contentType ) && JSON_CONTENT_TYPES.includes( contentType.toUpperCase() ) ) {
			httpResponse.isJson			= true;
			httpResponse.json			= JSON.parse( data );
		}

	});

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	if ( httpResponse.isError ) { throw new TYPES.HTTPResponseError( httpResponse ); } else { return httpResponse; }
}


/**********************************************************
 * PUBLIC Functions
 *
 * Exported functions; visible from outside.
 **********************************************************/
/* --------------------------------------------------------
 * Helper function to perform a call to an API/Url
 * in a controlled manner.
 *
 * The "params" parameter is an instance of: "Types.HTTPRequest".
 *
 * Returns an object of type: "TYPES.HTTPResponse".
 * -------------------------------------------------------- */
export async function call( step, url, fetchOptions=null, renderHTMLErrors=true ) {
	const STEP_NAME						= "call";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[From=${step}] [URL=${url}] [renderHTMLErrors=${renderHTMLErrors}]` );

 	const httpResponse					= await fetch( url, fetchOptions )
		.then( response => {
			// Process the HTTP Response itself
			return processHTTPResponse( { step: step, url: url, fetchOptions: fetchOptions }, response );
		}).then( response => {
			return response;
		}).catch( error => {
			// Errors while parsing the HTTP Response!
			if (window.BSKY.DEBUG) console.error( PREFIX + "Errors while parsing the HTTP Response!", error.toString() );
			// HTML.updateHTMLError( error, renderHTMLErrors );
			return error;
		});

	// Update the response with the incoming data.
	if ( COMMON.isNullOrEmpty( httpResponse ) ) {
		if (window.BSKY.DEBUG) console.error( PREFIX + "HTTP Response is null" );
	}

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	if ( httpResponse.isError ) {
		throw new TYPES.HTTPResponseError( httpResponse );
	} else {
		return httpResponse;
	}
}


/* --------------------------------------------------------
 * Helper function to perform a call to an API/Url
 * in a controlled manner.
 *
 * The "params" parameter is an instance of: "Types.HTTPRequest".
 *
 * Returns an object of type: "TYPES.HTTPResponse".
 * -------------------------------------------------------- */
export async function apiCall( params, renderHTMLErrors=true ) {
	const STEP_NAME						= "apiCall";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[From=${params.step}] [URL=${params.url}] [renderHTMLErrors=${renderHTMLErrors}]` );

 	const httpResponse					= await fetch( params.url, params.fetchOptions )
		.then( response => {
			// Process the HTTP Response itself
			return processHTTPResponse( params, response );
		}).then( response => {
			return response;
		}).catch( error => {
			// Errors while parsing the HTTP Response!
			if (window.BSKY.DEBUG) console.error( PREFIX + "Errors while parsing the HTTP Response!", error.toString() );
			// HTML.updateHTMLError( error, renderHTMLErrors );
			return error;
		});

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	if ( httpResponse.isError ) {
		if ( httpResponse instanceof TYPES.HTTPResponseError )
			throw httpResponse
		else
			throw new TYPES.HTTPResponseError( httpResponse );
	} else {
		return httpResponse;
	}
}


/* --------------------------------------------------------
 * UNDER DEVELOPMENT.
 *
 * "Wrapper function" to perform authenticated calls.
 *
 * The "params" parameter is an instance of: "Types.HTTPRequest".
 *
 * Returns an object of type: "TYPES.HTTPResponse".
 * -------------------------------------------------------- */
// export async function authenticatedCall( step, method, url, headers, body=null ) {
export async function authenticatedCall( params, renderHTMLErrors=true ) {
	const STEP_NAME						= "authenticatedCall";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;

	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + " [step=="+params.step+"]" );

    // Perform the call
	// ---------------------------------------------------------
	let responseFromServer					= null;

	try {
		responseFromServer					= await apiCall( params, renderHTMLErrors );
	} catch( error ) {
		// Errors while parsing the HTTP Response!

		// Let's see if it's an "use_dpop_nonce" error...
		if ( error.isDPoPNonceError ) {
			// Let's try again...

			const currentJwtPayload		= DPOP.getPayload( params.fetchOptions.headers.DPoP );
			if (window.BSKY.DEBUG) console.debug( PREFIX + "Current DPoPProof(payload):", COMMON.prettyJson( currentJwtPayload ) );

			// The new DPoPProof.
			// ---------------------------------------------------------
			const dpopRequest			= ( COMMON.isNullOrEmpty( currentJwtPayload?.ath ) )
				? TYPES.DPoPRequest.getInstanceWithoutATH( params.url, params.fetchOptions.method )
				: TYPES.DPoPRequest.getInstance( params.url, params.fetchOptions.method );
			let dpopProof				= await DPOP.createDPoPProof( dpopRequest )

			// Update the call headers.
			// ---------------------------------------------------------
			params.fetchOptions.headers[ HTTP_HEADER_DPOP ] = dpopProof;
			params.fetchOptions.headers[ HTTP_HEADER_DPOP_NONCE ] = BSKY.data.dpopNonce;

			try {
				responseFromServer					= await apiCall( params, renderHTMLErrors );
			} catch( error2 ) {
				if (window.BSKY.DEBUG) console.error( PREFIX + "Errors while parsing, per second time, the HTTP Response!", error2 );
				HTML.updateHTMLError( error2, renderHTMLErrors );
				responseFromServer				= error2;
			}


		} else {
			if (window.BSKY.DEBUG) console.error( PREFIX + "Errors while parsing the HTTP Response!", error );
			HTML.updateHTMLError( error, renderHTMLErrors );
			if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
			if (window.BSKY.GROUP_DEBUG) console.groupEnd();
			throw error;
		}
	}

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return responseFromServer;
}


