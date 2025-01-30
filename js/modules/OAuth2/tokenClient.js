/**********************************************************
 * Module imports
 *
 * See: https://github.com/udelt/dpop_js_test/blob/main/modules/tokenClient.js
 **********************************************************/
// Common modules
import * as COMMON					from "../common.functions.js";
import CONFIGURATION				from "../../data/config.json" with { type: "json" };
// For OAuth2 User Token retrieval / DPoP
import * as JWT         			from "./JWT.js";


/**********************************************************
 * Module Constants
 **********************************************************/
// Module SELF constants
const MODULE_NAME					= COMMON.getModuleName( import.meta.url );
const MODULE_VERSION				= "1.0.0";
const MODULE_PREFIX					= `[${MODULE_NAME}]: `;


// Inner constants
const DEBUG							= CONFIGURATION.global.debug;
const DEBUG_FOLDED					= CONFIGURATION.global.debug_folded;
const LSKEYS						= CONFIGURATION.localStorageKeys;


/**********************************************************
 * Module Variables
 **********************************************************/
let GROUP_DEBUG						= DEBUG && DEBUG_FOLDED;
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
	if (GROUP_DEBUG) console.groupCollapsed(PREFIX);
	if (DEBUG) console.debug(PREFIX + "url:", url);
	if (DEBUG) console.debug(PREFIX + "dpopProof:", dpopProof);
	if (DEBUG) console.debug(PREFIX + "dpopProof (pretty):", JWT.jwtToPrettyJSON( dpopProof ));
	if (DEBUG) console.debug(PREFIX + "body:", body);
	if (DEBUG) console.debug(PREFIX + "dpopNonce:", dpopNonce);

	let headers = {
		'DPOP': dpopProof,
		'Content-Type': 'application/x-www-form-urlencoded'
	};
	if ( dpopNonce ) {
		headers[ "DPoP-Nonce" ] = dpopNonce;
	}

	if (DEBUG) console.debug(PREFIX + "----------------------------------------------------------------------------");
	if (DEBUG) console.debug(PREFIX + "Calling url..........:", url);
	if (DEBUG) console.debug(PREFIX + "+ with this 'headers':", COMMON.prettyJson( headers ));
	if (DEBUG) console.debug(PREFIX + "+ and this 'body'....:", body);
 	if (DEBUG) console.debug(PREFIX + "----------------------------------------------------------------------------");
    var result = await fetch(url, {
		method: 'POST',
		headers: headers,
		body: body
	}).then(response => {
		if (GROUP_DEBUG) console.groupCollapsed(PREFIX_FETCH_HEAD);
		COMMON.printOutFetchResponse(PREFIX_FETCH_HEAD + response);
		if ( response.headers.get( "dpop-nonce" ) ) {
			dpopNonce = response.headers.get( "dpop-nonce" );
			if (DEBUG) console.debug(PREFIX_FETCH_HEAD + "dpopNonce:", dpopNonce);
			localStorage.setItem(LSKEYS.request.dpop_nonce, dpopNonce);
			if (DEBUG) console.debug(PREFIX_FETCH_HEAD + "[LOCAL STORAGE]", "[LSKEYS.request.dpop_nonce=="+LSKEYS.request.dpop_nonce+"]==["+dpopNonce+"]");
		}
		wwwAuthenticate = response.headers.get( "WWW-Authenticate" );
		if (DEBUG) console.debug(PREFIX_FETCH_HEAD + "wwwAuthenticate:", wwwAuthenticate);
		if (GROUP_DEBUG) console.groupEnd();
		return response.json();
	}).then(json => {
		if (GROUP_DEBUG) console.groupCollapsed(PREFIX_FETCH_BODY);
		if (DEBUG) console.debug(PREFIX_FETCH_BODY + "json:", COMMON.prettyJson(json));

		// Checks
		let token = json.access_token;        
		let reqError = json.error;        
		let reqErrorDesc = json.error_description;        
		if ( !token ) {
			if (DEBUG) console.warn(PREFIX_FETCH_BODY + "No token received!" );
			if ( reqError ) {
				if (DEBUG) console.debug(PREFIX_FETCH_BODY + "Server Error received!", reqError, reqErrorDesc );
				// Como vamos a devolver "json", ya está en la respuesta
			} else {
				if (DEBUG) console.warn(PREFIX_FETCH_BODY + "No Server Error received" );
			}
			if ( dpopNonce ) {
				if (DEBUG) console.debug(PREFIX_FETCH_BODY + "DPoP-Nonce received!", dpopNonce );
				// Lo agregamos a la respuesta
				json.dpopNonce = dpopNonce;
			} else {
				if (DEBUG) console.warn(PREFIX_FETCH_BODY + "No DPoP-Nonce received" );
			}
			if ( wwwAuthenticate ) {
				if (DEBUG) console.debug(PREFIX_FETCH_BODY + "WWW-Authenticate received!", wwwAuthenticate );
				// Lo agregamos a la respuesta
				json.wwwAuthenticate = wwwAuthenticate;
			} else {
				if (DEBUG) console.warn(PREFIX_FETCH_BODY + "No WWW-Authenticate received" );
			}
		} else {
			if (DEBUG) console.debug(PREFIX_FETCH_BODY + "Received token:", token );
		}

		if (GROUP_DEBUG) console.groupEnd();
		return json;
	}).catch(function(error) {
		if (GROUP_DEBUG) console.groupCollapsed(PREFIX_FETCH_ERROR);
		if (DEBUG) console.error(PREFIX_FETCH_ERROR + "[CATCH] Token retrieval error!", error);
		if (GROUP_DEBUG) console.groupEnd();
		throw(error);
	});
	result.dpopNonce = dpopNonce;
	if (DEBUG) console.debug(PREFIX + "result:", COMMON.prettyJson(result));

	if (GROUP_DEBUG) console.groupEnd();
	return result;
}
