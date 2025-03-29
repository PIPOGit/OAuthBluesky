/**********************************************************
 * Module imports
 *
 * See: https://github.com/udelt/dpop_js_test/blob/main/modules/uuid.js
 **********************************************************/
// Common modules
import * as COMMON					from "../CommonFunctions.js";
import CONFIGURATION				from "../../data/config.json" with { type: "json" };
// For OAuth2 User Token retrieval / DPoP
import * as JWT         			from "./JWT.js";


/**********************************************************
 * Module Constants
 **********************************************************/
// Module SELF constants
const MODULE_NAME					= COMMON.getModuleName( import.meta.url );


// Inner constants


/**********************************************************
 * Module Variables
 **********************************************************/


/**********************************************************
 * PRIVATE Functions
 **********************************************************/


/**********************************************************
 * PUBLIC Functions
 **********************************************************/
export async function callAPI(accessToken, dpopProof, resourceUrl) {    
	const PREFIX = `[${MODULE_NAME}:callAPI] `;
	const PREFIX_FETCH = `[${MODULE_NAME}:callAPI][Fetch] `;
	const PREFIX_FETCH_HEADERS = `[${MODULE_NAME}:callAPI][Fetch:Headers] `;
	const PREFIX_FETCH_ERROR = `[${MODULE_NAME}:callAPI][Fetch:ERROR] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed(PREFIX);

	if (window.BSKY.DEBUG) console.debug(PREFIX + "+ resourceUrl:", resourceUrl);
	if (window.BSKY.DEBUG) console.debug(PREFIX + "+ accessToken:", accessToken);
	if (window.BSKY.DEBUG) console.debug(PREFIX + "+ accessToken (pretty):", JWT.jwtToPrettyJSON( accessToken ));
	if (window.BSKY.DEBUG) console.debug(PREFIX + "+ dpopProof:", dpopProof);
	if (window.BSKY.DEBUG) console.debug(PREFIX + "+ dpopProof (pretty):", JWT.jwtToPrettyJSON( dpopProof ));

	let headers = {
		'Authorization': `DPoP ${accessToken}`,
		'DPoP': dpopProof,
		'Accept': 'application/json'
	};
	let fetchOptions = {
		method: 'GET',
		headers: headers,            
	};

	if (window.BSKY.DEBUG) console.debug(PREFIX + "----------------------------------------------------------------------------");
	if (window.BSKY.DEBUG) console.debug(PREFIX + "Calling url..........:", resourceUrl);
	if (window.BSKY.DEBUG) console.debug(PREFIX + "+ with this 'headers':", COMMON.prettyJson(headers));
	if (window.BSKY.DEBUG) console.debug(PREFIX + "----------------------------------------------------------------------------");
	var response = await fetch(resourceUrl, fetchOptions).then(response => {
		COMMON.printOutFetchResponse(PREFIX_FETCH_HEADERS, response);
		return response.json();
	}).then(json => {
		if (window.BSKY.GROUP_DEBUG) console.groupCollapsed(PREFIX_FETCH);
		if (window.BSKY.DEBUG) console.debug(PREFIX_FETCH + "Received data:", COMMON.prettyJson(json));
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		return json;
	}).catch(function(error){
		if (window.BSKY.GROUP_DEBUG) console.groupCollapsed(PREFIX_FETCH_ERROR);
		if (window.BSKY.DEBUG) console.error(PREFIX_FETCH_ERROR + "[CATCH] API Call error!", COMMON.prettyJson(error));
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		throw(error);
	});
	if (window.BSKY.DEBUG) console.debug(PREFIX + "Received response:", response);

	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return response;
}

