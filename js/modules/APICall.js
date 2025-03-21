/**********************************************************
 * Module imports
 *
 * OAuth2 HELPER FUNCTIONS
 *
 **********************************************************/
// Global configuration
import CONFIGURATION					from "../data/config.json" with { type: "json" };
// Common functions
import * as COMMON						from "./common.functions.js";
// Common Classes and Exceptions ("Types")
import * as TYPES						from "./common.types.js";
// Common HTML functions
import * as HTML						from "./HTML.js";
// Common JWT functions
import * as JWT							from "./OAuth2/JWT.js";


/**********************************************************
 * Module Constants
 **********************************************************/
// Module SELF constants
const MODULE_NAME						= COMMON.getModuleName( import.meta.url );

// HTML methods
export const HTML_GET					= "GET";
export const HTML_POST					= "POST";

// HTML Content Type constants
export const CONTENT_TYPE_JSON			= "application/json";
export const CONTENT_TYPE_JSON_UTF8		= "application/json; charset=utf-8";
export const CONTENT_TYPE_FORM_ENCODED	= "application/x-www-form-urlencoded";

// Inner constants


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

// HTML Helper functions
export function showResponseHeaders(data, show=true ) {
	const STEP_NAME						= "showResponseHeaders";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (show && window.BSKY.GROUP_DEBUG) console.groupCollapsed(PREFIX + "[RESPONSE=="+(data.ok?"OK":"ERROR")+" ("+data.status+")]");
	if (show && window.BSKY.DEBUG) console.debug(PREFIX + "Received response:", COMMON.prettyJson(data));

	let response = {};
	response.bodyUsed					= data.bodyUsed;
	response.ok							= data.ok;
	response.redirected					= data.redirected;
	response.status						= data.status;
	response.statusText					= data.statusText;
	response.type						= data.type;
	response.url						= data.url;
	response.headers					= {};
	if (show && window.BSKY.DEBUG) console.debug(PREFIX + "+ Response[bodyUsed]:", data.bodyUsed);
	if (show && window.BSKY.DEBUG) console.debug(PREFIX + "+ Response[ok]:", data.ok);
	if (show && window.BSKY.DEBUG) console.debug(PREFIX + "+ Response[redirected]:", data.redirected);
	if (show && window.BSKY.DEBUG) console.debug(PREFIX + "+ Response[status]:", data.status);
	if (show && window.BSKY.DEBUG) console.debug(PREFIX + "+ Response[statusText]:", data.statusText);
	if (show && window.BSKY.DEBUG) console.debug(PREFIX + "+ Response[type]:", data.type);
	if (show && window.BSKY.DEBUG) console.debug(PREFIX + "+ Response[url]:", data.url);
	if (show && window.BSKY.DEBUG) console.debug(PREFIX + "+ Response Headers:");
	for (var pair of data.headers.entries()) {
		response.headers[pair[0]]		= pair[1];
		if (show && window.BSKY.DEBUG) console.debug(PREFIX + "  + Header["+pair[0]+"]:", pair[1]);
	}
	if (show && window.BSKY.DEBUG) console.debug(PREFIX + "Returning response:", COMMON.prettyJson(response));

	if (show && window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (show && window.BSKY.GROUP_DEBUG) console.groupEnd();
	
	return response;
}

// APICall response & error Helper functions
function analizeResponseHeaders(response) {
	const STEP_NAME						= "analizeResponseHeaders";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Analize the received data
	// "content-type" header
	if ( response.headers["content-type"] ) {
		const contentType				= response.headers["content-type"];
		if (window.BSKY.DEBUG) console.debug( PREFIX + "contentType:", contentType );
	}

	// "dpop-nonce" header
	if ( response.headers["dpop-nonce"] ) {
		// Here, we gather the "dpop-nonce" header.
		BSKY.data.dpopNonceUsed			= BSKY.data.dpopNonce;
		BSKY.data.dpopNonce				= response.headers["dpop-nonce"];
		BSKY.data.dpopNonceReceived		= BSKY.data.dpopNonce;
		$("#dpopNonce").val(BSKY.data.dpopNonce);
		if (window.BSKY.DEBUG) console.info( PREFIX + "%cReceived dpop-nonce header: [" + BSKY.data.dpopNonce + "]", COMMON.CONSOLE_STYLE );
	}

	// "www-authenticate" header
	if ( response.headers["www-authenticate"] ) {
		// Here, we gather the "www-authenticate" header.
		BSKY.data.wwwAuthenticate		= response.headers["www-authenticate"];
		if (window.BSKY.DEBUG) console.info( PREFIX + "%cReceived www-authenticate header: [" + BSKY.data.wwwAuthenticate + "]", COMMON.CONSOLE_STYLE );
	}

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	
	return response;
}


// APICall response & error Helper functions
// Sets the "responseHeaders" variable.
async function processAPICallResponse(step, response) {
	const STEP_NAME						= "processAPICallResponse";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Process the HTTP Response
	if ( response.ok ) {
		responseHeaders					= showResponseHeaders( response );
		if (window.BSKY.DEBUG) console.debug( PREFIX + "responseHeaders:", responseHeaders );
		analizeResponseHeaders( responseHeaders );
		if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		return ( response.status == 204 ) ? response.text() : response.json();
	} else {
		let errorObject					= null;
		if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		return response.text().then( data => {
			responseHeaders				= showResponseHeaders( response );
			analizeResponseHeaders( responseHeaders );
			const contentType			= responseHeaders.headers["content-type"];
			let errorObject				= new TYPES.APICallError( step, responseHeaders, contentType );
			errorObject.text			= data;
			errorObject.headers			= responseHeaders;
			if ( !COMMON.isNullOrEmpty(data) && !COMMON.isNullOrEmpty(contentType) && ( COMMON.areEquals( contentType, CONTENT_TYPE_JSON ) || COMMON.areEquals( contentType, CONTENT_TYPE_JSON_UTF8 ) ) ) {
				errorObject.isJson		= true;
				errorObject.json		= JSON.parse( data );
			}
			throw errorObject;
		});
	}
}


/**********************************************************
 * PUBLIC Functions
 **********************************************************/
// APICall function
export async function makeAPICall( step, url, fetchOptions=null, renderHTMLErrors=true ) {
	const STEP_NAME						= "makeAPICall";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;

	// Clear data.
	responseHeaders						= null;
	responseBody						= null;
	responseError						= null;

 	let responseFromServer				= await fetch( url, fetchOptions ).then( response => {
        // Process the HTTP Response
		if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[From=${step}] [URL=${url}] [renderHTMLErrors=${renderHTMLErrors}]` );
		let processedResponse			= processAPICallResponse( step, response );
		return processedResponse;
    }).then( data => {
        // Process the HTTP Response Body
		responseBody					= data;
		if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
        // Return something
		return data;
    }).catch( error => {
		responseError					= error;
		if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		HTML.processAPICallErrorResponse( error, renderHTMLErrors );
    });
	
	return { headers: responseHeaders, body: responseBody, error: responseError };
}


