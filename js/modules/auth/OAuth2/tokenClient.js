/**********************************************************
 * Module imports
 *
 * See: https://github.com/udelt/dpop_js_test/blob/main/modules/tokenClient.js
 **********************************************************/
// Common modules
import * as COMMON						from "../CommonFunctions.js";
import CONFIGURATION					from "../../data/config.json" with { type: "json" };

// For OAuth2 User Token retrieval / DPoP
import * as JWT         				from "./JWT.js";

// To perform API calls
import * as APICall						from "../../utils/APICall.js";


/**********************************************************
 * Module Constants
 **********************************************************/
// Module SELF constants
const MODULE_NAME					= COMMON.getModuleName( import.meta.url );


// Inner constants
const LSKEYS						= CONFIGURATION.localStorageKeys;


/**********************************************************
 * Module Variables
 **********************************************************/
let dpopNonce						= null;
let wwwAuthenticate					= null;


/**********************************************************
 * PRIVATE Functions
 **********************************************************/


/**********************************************************
 * PUBLIC Functions
 **********************************************************/
export async function getAccessToken(url, dpopProof, body, dpopNonce) {
	const PREFIX = `[${MODULE_NAME}:getAccessToken] `;
	const PREFIX_FETCH_HEAD = `[${MODULE_NAME}:getAccessToken][HEAD] `;
	const PREFIX_FETCH_BODY = `[${MODULE_NAME}:getAccessToken][BODY] `;
	const PREFIX_FETCH_ERROR = `[${MODULE_NAME}:getAccessToken][ERROR] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed(PREFIX);
	if (window.BSKY.DEBUG) console.debug(PREFIX + "url:", url);
	if (window.BSKY.DEBUG) console.debug(PREFIX + "dpopProof:", dpopProof);
	if (window.BSKY.DEBUG) console.debug(PREFIX + "dpopProof (pretty):", JWT.jwtToPrettyJSON( dpopProof ));
	if (window.BSKY.DEBUG) console.debug(PREFIX + "body:", body);
	if (window.BSKY.DEBUG) console.debug(PREFIX + "dpopNonce:", dpopNonce);

	let headers = {
		'DPOP': dpopProof,
		"Content-Type": 'application/x-www-form-urlencoded'
	};
	if ( dpopNonce ) {
		headers[ APICall.HTTP_HEADER_DPOP_NONCE.toUpperCase() ] = dpopNonce;
	}

	if (window.BSKY.DEBUG) console.debug(PREFIX + "----------------------------------------------------------------------------");
	if (window.BSKY.DEBUG) console.debug(PREFIX + "Calling url..........:", url);
	if (window.BSKY.DEBUG) console.debug(PREFIX + "+ with this 'headers':", COMMON.prettyJson( headers ));
	if (window.BSKY.DEBUG) console.debug(PREFIX + "+ and this 'body'....:", body);
 	if (window.BSKY.DEBUG) console.debug(PREFIX + "----------------------------------------------------------------------------");
    var result = await fetch(url, {
		method: 'POST',
		headers: headers,
		body: body
	}).then(response => {
		if (window.BSKY.GROUP_DEBUG) console.groupCollapsed(PREFIX_FETCH_HEAD);
		COMMON.printOutFetchResponse(PREFIX_FETCH_HEAD + response);
		if ( response.headers.get( APICall.HTTP_HEADER_DPOP_NONCE.toUpperCase() ) ) {
			dpopNonce = response.headers.get( APICall.HTTP_HEADER_DPOP_NONCE.toUpperCase() );
			if (window.BSKY.DEBUG) console.debug(PREFIX_FETCH_HEAD + "dpopNonce:", dpopNonce);
			localStorage.setItem(LSKEYS.request.dpop_nonce, dpopNonce);
			if (window.BSKY.DEBUG) console.debug(PREFIX_FETCH_HEAD + "[LOCAL STORAGE]", "[LSKEYS.request.dpop_nonce=="+LSKEYS.request.dpop_nonce+"]==["+dpopNonce+"]");
		}
		wwwAuthenticate = response.headers.get( "WWW-Authenticate" );
		if (window.BSKY.DEBUG) console.debug(PREFIX_FETCH_HEAD + "wwwAuthenticate:", wwwAuthenticate);
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		return response.json();
	}).then(json => {
		if (window.BSKY.GROUP_DEBUG) console.groupCollapsed(PREFIX_FETCH_BODY);
		if (window.BSKY.DEBUG) console.debug(PREFIX_FETCH_BODY + "json:", COMMON.prettyJson(json));

		// Checks
		let token						= json.access_token;
		let reqError					= json.error;
		let reqErrorDesc				= json.error_description;
		if ( !token ) {
			if (window.BSKY.DEBUG) console.warn(PREFIX_FETCH_BODY + "No token received!" );
			if ( reqError ) {
				if (window.BSKY.DEBUG) console.debug(PREFIX_FETCH_BODY + "Server Error received!", reqError, reqErrorDesc );
				// Como vamos a devolver "json", ya está en la respuesta
			} else {
				if (window.BSKY.DEBUG) console.warn(PREFIX_FETCH_BODY + "No Server Error received" );
			}
			if ( dpopNonce ) {
				if (window.BSKY.DEBUG) console.debug(PREFIX_FETCH_BODY + "DPoP-Nonce received!", dpopNonce );
				// Lo agregamos a la respuesta
				json.dpopNonce = dpopNonce;
			} else {
				if (window.BSKY.DEBUG) console.warn(PREFIX_FETCH_BODY + "No DPoP-Nonce received" );
			}
			if ( wwwAuthenticate ) {
				if (window.BSKY.DEBUG) console.debug(PREFIX_FETCH_BODY + "WWW-Authenticate received!", wwwAuthenticate );
				// Lo agregamos a la respuesta
				json.wwwAuthenticate = wwwAuthenticate;
			} else {
				if (window.BSKY.DEBUG) console.warn(PREFIX_FETCH_BODY + "No WWW-Authenticate received" );
			}
		} else {
			if (window.BSKY.DEBUG) console.debug(PREFIX_FETCH_BODY + "Received token:", token );
		}

		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		return json;
	}).catch(function(error) {
		if (window.BSKY.GROUP_DEBUG) console.groupCollapsed(PREFIX_FETCH_ERROR);
		if (window.BSKY.DEBUG) console.error(PREFIX_FETCH_ERROR + "[CATCH] Token retrieval error!", error);
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		throw(error);
	});
	result.dpopNonce = dpopNonce;
	if (window.BSKY.DEBUG) console.debug(PREFIX + "result:", COMMON.prettyJson(result));

	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return result;
}
