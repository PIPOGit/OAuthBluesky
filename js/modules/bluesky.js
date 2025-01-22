/**********************************************************
 * Module imports
 **********************************************************/
// Common modules
import * as COMMON					from "./common.functions.js";
import CONFIGURATION				from "../data/config.json" with { type: "json" };
// For PKCE generation
import * as PKCE					from "./PKCE.js";
// For OAuth2 User Token retrieval / DPoP
import * as OAuth2					from "./OAuth2.js";


/**********************************************************
 * Module Constants
 **********************************************************/
// Module SELF constants
const MODULE_NAME					= COMMON.getModuleName( import.meta.url );
const MODULE_VERSION				= "1.0.0";
const MODULE_PREFIX					= `[${MODULE_NAME}]: `;


// Inner constants
const CONTENT_TYPE_FORM_URLENCODED	= "application/x-www-form-urlencoded";
const DEBUG							= CONFIGURATION.global.debug;
const DEBUG_FOLDED					= CONFIGURATION.global.debug_folded;
const API							= CONFIGURATION.api;
const LSKEYS						= CONFIGURATION.localStorageKeys;
const NEOCITIES						= CONFIGURATION.neocities;


/**********************************************************
 * Module Variables
 **********************************************************/
let GROUP_DEBUG						= DEBUG && DEBUG_FOLDED;
let userHandle						= null;
let userDID							= null;
let userDIDDocument					= null;
let userPDSURL						= null;
let userAuthServerURL				= null;
let userAuthServerDiscovery			= null;
let userAuthServerRequestURI		= null;
let dpopNonce						= null;
let state							= null;
let code_verifier					= null;
let code_challenge					= null;


/**********************************************************
 * PRIVATE Functions
 **********************************************************/
function step00Chech() {
	const PREFIX = `[${MODULE_NAME}:step00Chech] `;
	const PREFIX_AJAX = `[${MODULE_NAME}:step00Chech:Ajax] `;
	const PREFIX_FETCH = `[${MODULE_NAME}:step00Chech][Fetch] `;
	if (GROUP_DEBUG) console.groupCollapsed(PREFIX);

	if (DEBUG) console.debug(PREFIX, "Received handle:", userHandle);
	localStorage.setItem(LSKEYS.user.handle, userHandle);
	if (DEBUG) console.debug(PREFIX, "[LOCAL STORAGE]", "[LSKEYS.user.handle=="+LSKEYS.user.handle+"]==["+userHandle+"]");

	// Preparamos la llamada.
	let root = API.bluesky.XRPC.url;
	let endpoint = API.bluesky.XRPC.api.resolveHandle;
	let url = root + endpoint + "?handle=" + userHandle;
	if (DEBUG) console.debug(PREFIX, "Fetching data from URL:", url);

	$.ajax({
			url: url,
			beforeSend: function (xhr) {
				xhr.overrideMimeType("text/plain; charset=x-user-defined");
			}
		})
		.done(function (data, textStatus, jqXHR) {
			if (GROUP_DEBUG) console.groupCollapsed(PREFIX_AJAX);
			if (DEBUG) console.debug(PREFIX, "Received data:", data);
			if (DEBUG) console.debug(PREFIX, "Received textStatus:", textStatus);
			if (DEBUG) console.debug(PREFIX, "Received jqXHR:", jqXHR);
		})
		.fail(function (jqXHR, textStatus, errorThrown) {
			if (GROUP_DEBUG) console.groupCollapsed(PREFIX_AJAX);
			if (DEBUG) console.debug(PREFIX, "Received jqXHR:", jqXHR);
			if (DEBUG) console.debug(PREFIX, "Received textStatus:", textStatus);
			if (DEBUG) console.debug(PREFIX, "Received errorThrown:", errorThrown);
		})
		.always(function (data, textStatus, jqXHR) {
			if (GROUP_DEBUG) console.groupEnd();
		});


	fetch(url, { method: 'GET' }).then(response => {
		if (GROUP_DEBUG) console.groupCollapsed(PREFIX_FETCH);
		if (response.ok) return response.json();
	}).then(json => {
		if (DEBUG) console.debug(PREFIX, "Received:", json);
		return json.did;
	}).catch(error => {
		if (GROUP_DEBUG) console.groupCollapsed(PREFIX_FETCH);
		if (DEBUG) console.error(PREFIX, "[CATCH] Received:", error);
		return error;
	}).finally(() => {
		if (GROUP_DEBUG) console.groupEnd();
	});


	console.info(`Loaded module ${MODULE_NAME}, version ${MODULE_VERSION}.`);
	if (GROUP_DEBUG) console.groupEnd();
}

function step01ResolveDIDForHandle() {
	const PREFIX = `[${MODULE_NAME}:step01ResolveDIDForHandle] `;
	const PREFIX_FETCH = `[${MODULE_NAME}:step01ResolveDIDForHandle][Fetch] `;
	const PREFIX_FETCH_HEADERS = `[${MODULE_NAME}:step01ResolveDIDForHandle][Fetch:Headers] `;
	const PREFIX_FETCH_ERROR = `[${MODULE_NAME}:step01ResolveDIDForHandle][Fetch:ERROR] `;
	if (GROUP_DEBUG) console.groupCollapsed(PREFIX);

	if (DEBUG) console.debug(PREFIX, "Received handle:", userHandle);

	// Preparamos la llamada.
	let root = API.bluesky.XRPC.url;
	let endpoint = API.bluesky.XRPC.api.resolveHandle;
	let url = root + endpoint + "?handle=" + userHandle;
	if (DEBUG) console.debug(PREFIX, "Fetching data from URL:", url);

	// COMMON.loadJSONFile(url).then(data => {
	fetch(url).then(response => {
		COMMON.printOutFetchResponse(PREFIX_FETCH_HEADERS, response);
		return response.json();
	}).then(data => {
		if (GROUP_DEBUG) console.groupCollapsed(PREFIX_FETCH);
		if (COMMON.isNull(data)) {
			// Nothing returned
			if (DEBUG) console.error(PREFIX_FETCH, "[CATCH] Nothing returned!", url);
			if (GROUP_DEBUG) console.groupEnd();
			alert(PREFIX_FETCH + "[CATCH] Nothing returned!");
		} else {
			if (DEBUG) console.debug(PREFIX_FETCH, "Received:", data);

			// Go ahead. We've got the user's DID.
			userDID = data.did;
			localStorage.setItem(LSKEYS.user.did, userDID);
			if (DEBUG) console.debug(PREFIX_FETCH, "[LOCAL STORAGE]", "[LSKEYS.user.did=="+LSKEYS.user.did+"]==["+userDID+"]");
			if (DEBUG) console.debug(PREFIX_FETCH, "Received user DID:", userDID);

			// NEXT STEP 02: Resolvemos el DID Document
			if (GROUP_DEBUG) console.groupEnd();
			step02ResolveDIDDocument();
		}
	}).catch(error => {
		if (GROUP_DEBUG) console.groupCollapsed(PREFIX_FETCH_ERROR);
		if (DEBUG) console.error(PREFIX_FETCH_ERROR, "[CATCH] Received:", error);
		if (GROUP_DEBUG) console.groupEnd();
		alert(PREFIX_FETCH_ERROR + "[CATCH] Received: " + error);
	});

	if (GROUP_DEBUG) console.groupEnd();
}

function step02ResolveDIDDocument() {
	const PREFIX = `[${MODULE_NAME}:step02ResolveDIDDocument] `;
	const PREFIX_FETCH = `[${MODULE_NAME}:step02ResolveDIDDocument][Fetch] `;
	const PREFIX_FETCH_HEADERS = `[${MODULE_NAME}:step02ResolveDIDDocument][Fetch:Headers] `;
	const PREFIX_FETCH_ERROR = `[${MODULE_NAME}:step02ResolveDIDDocument][Fetch:ERROR] `;
	if (GROUP_DEBUG) console.groupCollapsed(PREFIX);

	if (DEBUG) console.debug(PREFIX, "Received userDID:", userDID);

	// Preparamos la llamada.
	let root = API.plc.url;
	let endpoint = API.plc.api.resolveDID;
	let url = root + endpoint + userDID;
	if (DEBUG) console.debug(PREFIX, "Fetching data from URL:", url);

	// COMMON.loadJSONFile(url).then(data => {
	fetch(url).then(response => {
		COMMON.printOutFetchResponse(PREFIX_FETCH_HEADERS, response);
		return response.json();
	}).then(data => {
		if (GROUP_DEBUG) console.groupCollapsed(PREFIX_FETCH);
		if (COMMON.isNull(data)) {
			// Nothing returned
			if (DEBUG) console.error(PREFIX_FETCH, "[CATCH] Nothing returned!", url);
			if (GROUP_DEBUG) console.groupEnd();
			alert(PREFIX_FETCH + "[CATCH] Nothing returned!");
		} else {
			if (DEBUG) console.debug(PREFIX_FETCH, "Received:", COMMON.prettyJson(data));

			// Go ahead. We've got the user's DID Document.
			userDIDDocument = data;
			localStorage.setItem(LSKEYS.user.didDoc, JSON.stringify( userDIDDocument ));
			if (DEBUG) console.debug(PREFIX_FETCH, "[LOCAL STORAGE]", "[LSKEYS.user.didDoc=="+LSKEYS.user.didDoc+"]==["+userDIDDocument+"]");

			// We've got also the user's PDS URL
			userPDSURL = userDIDDocument.service[0].serviceEndpoint
			localStorage.setItem(LSKEYS.user.pdsUrl, userPDSURL);
			if (DEBUG) console.debug(PREFIX_FETCH, "[LOCAL STORAGE]", "[LSKEYS.user.pdsUrl=="+LSKEYS.user.pdsUrl+"]==["+userPDSURL+"]");
			if (DEBUG) console.debug(PREFIX_FETCH, "Received user PDS URL:", userPDSURL);

			// NEXT STEP 03: Resolvemos la URL del Authorization Server para extraer la metadata
			if (GROUP_DEBUG) console.groupEnd();
			step03ResolveAuthorizationServerURL();
		}
	}).catch(error => {
		if (GROUP_DEBUG) console.groupCollapsed(PREFIX_FETCH_ERROR);
		if (DEBUG) console.error(PREFIX_FETCH_ERROR, "[CATCH] Received:", error);
		if (GROUP_DEBUG) console.groupEnd();
		alert(PREFIX_FETCH_ERROR + "[CATCH] Received: " + error);
	});

	if (GROUP_DEBUG) console.groupEnd();
}

function step03ResolveAuthorizationServerURL() {
	const PREFIX = `[${MODULE_NAME}:step03ResolveAuthorizationServerURL] `;
	const PREFIX_FETCH = `[${MODULE_NAME}:step03ResolveAuthorizationServerURL][Fetch] `;
	const PREFIX_FETCH_HEADERS = `[${MODULE_NAME}:step03ResolveAuthorizationServerURL][Fetch:Headers] `;
	const PREFIX_FETCH_ERROR = `[${MODULE_NAME}:step03ResolveAuthorizationServerURL][Fetch:ERROR] `;
	if (GROUP_DEBUG) console.groupCollapsed(PREFIX);

	if (DEBUG) console.debug(PREFIX, "Received userDID:", userDID);

	// Preparamos la llamada.
	let root = userPDSURL;
	let endpoint = API.pds.api.metadata;
	let url = root + endpoint;
	if (DEBUG) console.debug(PREFIX, "Fetching data from URL:", url);

	// COMMON.loadJSONFile(url).then(data => {
	fetch(url).then(response => {
		COMMON.printOutFetchResponse(PREFIX_FETCH_HEADERS, response);
		return response.json();
	}).then(data => {
		if (GROUP_DEBUG) console.groupCollapsed(PREFIX_FETCH);
		if (COMMON.isNull(data)) {
			// Nothing returned
			if (DEBUG) console.error(PREFIX_FETCH, "[CATCH] Nothing returned!", url);
			if (GROUP_DEBUG) console.groupEnd();
			alert(PREFIX_FETCH + "[CATCH] Nothing returned!");
		} else {
			if (DEBUG) console.debug(PREFIX_FETCH, "Received:", COMMON.prettyJson(data));
			// Go ahead. We've got the Authorization server URL (only one entry)
			userAuthServerURL = data.authorization_servers[0];
			localStorage.setItem(LSKEYS.user.authServerUrl, userAuthServerURL);
			if (DEBUG) console.debug(PREFIX_FETCH, "[LOCAL STORAGE]", "[LSKEYS.user.authServerUrl=="+LSKEYS.user.authServerUrl+"]==["+userAuthServerURL+"]");
			if (DEBUG) console.debug(PREFIX_FETCH, "Received user Authorization Server URL:", userAuthServerURL);

			// NEXT STEP 04: Resolvemos la metadata del Authorization Server
			if (GROUP_DEBUG) console.groupEnd();
			step04ResolveAuthorizationServerMetadata();
		}
	}).catch(error => {
		if (GROUP_DEBUG) console.groupCollapsed(PREFIX_FETCH_ERROR);
		if (DEBUG) console.error(PREFIX_FETCH_ERROR, "[CATCH] Received:", error);
		alert(PREFIX_FETCH_ERROR + "[CATCH] Received: " + error);
		if (GROUP_DEBUG) console.groupEnd();
	});

	if (GROUP_DEBUG) console.groupEnd();
}

function step04ResolveAuthorizationServerMetadata() {
	const PREFIX = `[${MODULE_NAME}:step04ResolveAuthorizationServerMetadata] `;
	const PREFIX_FETCH = `[${MODULE_NAME}:step04ResolveAuthorizationServerMetadata][Fetch] `;
	const PREFIX_FETCH_HEADERS = `[${MODULE_NAME}:step04ResolveAuthorizationServerMetadata][Fetch:Headers] `;
	const PREFIX_FETCH_ERROR = `[${MODULE_NAME}:step04ResolveAuthorizationServerMetadata][Fetch:ERROR] `;
	if (GROUP_DEBUG) console.groupCollapsed(PREFIX);

	if (DEBUG) console.debug(PREFIX, "Received userDID:", userDID);

	// Preparamos la llamada.
	let root = userAuthServerURL;
	let endpoint = API.authServer.api.discovery;
	let url = root + endpoint;
	if (DEBUG) console.debug(PREFIX, "Fetching data from URL:", url);

	// COMMON.loadJSONFile(url).then(data => {
	fetch(url).then(response => {
		COMMON.printOutFetchResponse(PREFIX_FETCH_HEADERS, response);
		return response.json();
	}).then(data => {
		if (GROUP_DEBUG) console.groupCollapsed(PREFIX_FETCH);
		if (COMMON.isNull(data)) {
			// Nothing returned
			if (DEBUG) console.error(PREFIX_FETCH, "[CATCH] Nothing returned!", url);
			if (GROUP_DEBUG) console.groupEnd();
			alert(PREFIX_FETCH + "[CATCH] Nothing returned!");
		} else {
			if (DEBUG) console.debug(PREFIX_FETCH, "Received:", COMMON.prettyJson(data));
			// Go ahead. We've got the Authorization server URL (only one entry)
			userAuthServerDiscovery = data;
			localStorage.setItem(LSKEYS.user.authServerDiscovery, JSON.stringify( userAuthServerDiscovery ));
			if (DEBUG) console.debug(PREFIX_FETCH, "[LOCAL STORAGE]", "[LSKEYS.user.authServerDiscovery=="+LSKEYS.user.authServerDiscovery+"]==["+JSON.stringify( userAuthServerDiscovery )+"]");

			// NEXT STEP 05: PAR Authorization
			if (GROUP_DEBUG) console.groupEnd();
			step05PARAuthorization();
		}
	}).catch(error => {
		if (GROUP_DEBUG) console.groupCollapsed(PREFIX_FETCH_ERROR);
		if (DEBUG) console.error(PREFIX_FETCH_ERROR, "[CATCH] Received:", error);
		alert(PREFIX_FETCH_ERROR + "[CATCH] Received: " + error);
		if (GROUP_DEBUG) console.groupEnd();
	});

	if (GROUP_DEBUG) console.groupEnd();
}

function step05PARAuthorization() {
	const PREFIX = `[${MODULE_NAME}:step05PARAuthorization] `;
	const PREFIX_FETCH = `[${MODULE_NAME}:step05PARAuthorization][Fetch] `;
	const PREFIX_FETCH_CFV = `[${MODULE_NAME}:step05PARAuthorization][Fetch:CFV] `;
	const PREFIX_FETCH_CFV_ERROR = `[${MODULE_NAME}:step05PARAuthorization][Fetch:CFV:ERROR] `;
	const PREFIX_FETCH_PAR = `[${MODULE_NAME}:step05PARAuthorization][Fetch:PAR] `;
	const PREFIX_FETCH_PAR_HEADERS = `[${MODULE_NAME}:step05PARAuthorization][Fetch:PAR:Headers] `;
	const PREFIX_FETCH_PAR_ERROR = `[${MODULE_NAME}:step05PARAuthorization][Fetch:PAR:ERROR] `;
	if (GROUP_DEBUG) console.groupCollapsed(PREFIX);

	if (DEBUG) console.debug(PREFIX, "Received userDID:", userDID);

	// Preparamos la llamada.
	let key = API.authServer.key.par;
	let url = userAuthServerDiscovery[key];
	if (DEBUG) console.debug(PREFIX, "Fetching data from URL:", url);

	// Create and store a random "state" value
	state = PKCE.generateRandomString();
	localStorage.setItem(LSKEYS.pkce.state, state);
	if (DEBUG) console.debug(PREFIX, "[LOCAL STORAGE]", "[LSKEYS.pkce.state=="+LSKEYS.pkce.state+"]==["+state+"]");
	if (DEBUG) console.debug(PREFIX, "Generated [(pkce_state)state]:", state);

	// Create and store a new PKCE code_verifier (the plaintext random secret)
	code_verifier = PKCE.generateRandomString();
	localStorage.setItem(LSKEYS.pkce.code_verifier, code_verifier);
	if (DEBUG) console.debug(PREFIX, "[LOCAL STORAGE]", "[LSKEYS.pkce.code_verifier=="+LSKEYS.pkce.code_verifier+"]==["+code_verifier+"]");
	if (DEBUG) console.debug(PREFIX, "Generated [(pkce_code_verifier)code_verifier]:", code_verifier);

	// Hash and base64-urlencode the secret to use as the challenge
	PKCE.pkceChallengeFromVerifier(code_verifier).then(data => {
		if (GROUP_DEBUG) console.groupCollapsed(PREFIX_FETCH_CFV);
		code_challenge = data;
		localStorage.setItem(LSKEYS.pkce.code_challenge, code_challenge);
		if (DEBUG) console.debug(PREFIX_FETCH_CFV, "[LOCAL STORAGE]", "[LSKEYS.pkce.code_challenge=="+LSKEYS.pkce.code_challenge+"]==["+code_challenge+"]");
		if (DEBUG) console.debug(PREFIX_FETCH_CFV, "Generated [(pkce_code_challenge)code_challenge]:", code_challenge);

		let urlData = new URLSearchParams({
			// Fixed values
			'response_type': 'code',
			'code_challenge_method': 'S256',
			'scope': 'atproto transition:generic',
			// Neocities values
			'client_id': NEOCITIES.client_id,
			'redirect_uri': NEOCITIES.redirect_uri,
			// Variable values
			'code_challenge': code_challenge,
			'state': state,
			'login_hint': userHandle
		});
		if (DEBUG) console.debug(PREFIX_FETCH_CFV, "Generated [urlData]:", urlData.toString());

		let fetchOptions = {
			method: 'POST',
			headers: {
				'Content-Type': CONTENT_TYPE_FORM_URLENCODED
			},
			body: urlData.toString()
		};
		if (DEBUG) console.debug(PREFIX_FETCH_CFV, "Generated [fetchOptions]:", COMMON.prettyJson(fetchOptions));

		fetch(url, fetchOptions).then(response => {
			if (GROUP_DEBUG) console.groupCollapsed(PREFIX_FETCH_PAR_HEADERS);
			COMMON.printOutFetchResponse(PREFIX_FETCH_PAR_HEADERS, response);
			if (COMMON.isNull(response)) {
				// Nothing returned
				if (DEBUG) console.error(PREFIX_FETCH_PAR_HEADERS, "[CATCH] Nothing returned!", url);
				alert(PREFIX_FETCH_PAR_HEADERS + "[CATCH] Nothing returned!");
			} else if (response.status !== 201) {
				// Not created
				if (DEBUG) console.error(PREFIX_FETCH_PAR_HEADERS, "[CATCH] Not created!", url);
				alert(PREFIX_FETCH_PAR_HEADERS + "[CATCH] Not created!");
			} else if (!response.ok) {
				// Error
				if (DEBUG) console.error(PREFIX_FETCH_PAR_HEADERS, "[CATCH] Error!", url);
				alert(PREFIX_FETCH_PAR_HEADERS + "[CATCH] Error!");
			} else {
				// Let's check the "dpop-nonce" header.
				dpopNonce = response.headers.get( "dpop-nonce" );
				if (DEBUG) console.debug(PREFIX_FETCH_PAR_HEADERS, "Received dpopNonce:", dpopNonce);
				if ( dpopNonce ) {
					localStorage.setItem(LSKEYS.request.dpop_nonce, dpopNonce);
					if (DEBUG) console.debug(PREFIX_FETCH_PAR_HEADERS, "[LOCAL STORAGE]", "[LSKEYS.request.dpop_nonce=="+LSKEYS.request.dpop_nonce+"]==["+dpopNonce+"]");
				}
				if (GROUP_DEBUG) console.groupEnd();
				return response.json();
			}
			if (GROUP_DEBUG) console.groupEnd();
		}).then(data => {
			if (GROUP_DEBUG) console.groupCollapsed(PREFIX_FETCH_PAR);
			if (DEBUG) console.debug(PREFIX_FETCH_PAR, "Received:", COMMON.prettyJson(data));
			userAuthServerRequestURI = data.request_uri;
			if (DEBUG) console.debug(PREFIX_FETCH_PAR, "Received request_uri:", userAuthServerRequestURI);
			localStorage.setItem(LSKEYS.user.authServerRequestURI, userAuthServerRequestURI);
			if (DEBUG) console.debug(PREFIX_FETCH_PAR, "[LOCAL STORAGE]", "[LSKEYS.user.authServerRequestURI=="+LSKEYS.user.authServerRequestURI+"]==["+userAuthServerRequestURI+"]");
			// Go ahead. We've got the PAR Authorization

			// NEXT STEP 06: AS Token Authorization
			if (GROUP_DEBUG) console.groupEnd();
			step06AuthorizationServerRequest();
		}).catch(error => {
			if (GROUP_DEBUG) console.groupCollapsed(PREFIX_FETCH_PAR_ERROR);
			if (DEBUG) console.error(PREFIX_FETCH_PAR_ERROR, "[CATCH] Received:", error);
			alert(PREFIX_FETCH_PAR_ERROR + "[CATCH] Received: " + error);
			if (GROUP_DEBUG) console.groupEnd();
		});
		if (GROUP_DEBUG) console.groupEnd();
	}).catch(error => {
		if (GROUP_DEBUG) console.groupCollapsed(PREFIX_FETCH_CFV_ERROR);
		if (DEBUG) console.error(PREFIX_FETCH_CFV_ERROR, "[CATCH] Received:", error);
		alert(PREFIX_FETCH_CFV_ERROR + "[CATCH] Received: " + error);
		if (GROUP_DEBUG) console.groupEnd();
	});

	if (GROUP_DEBUG) console.groupEnd();
}

function step06AuthorizationServerRequest() {
	const PREFIX = `[${MODULE_NAME}:step06AuthorizationServerRequest] `;
	if (GROUP_DEBUG) console.groupCollapsed(PREFIX);

	// Preparamos la llamada.
	let key = API.authServer.key.auth;
	let url = userAuthServerDiscovery[key];
	let client_id_encoded = encodeURIComponent(NEOCITIES.client_id);
	let request_uri_encoded = encodeURIComponent(userAuthServerRequestURI);
	if (DEBUG) console.debug(PREFIX, "client_id:", NEOCITIES.client_id);
	if (DEBUG) console.debug(PREFIX, "client_id (encoded):", client_id_encoded);
	if (DEBUG) console.debug(PREFIX, "request_uri:", userAuthServerRequestURI);
	if (DEBUG) console.debug(PREFIX, "request_uri (encoded):", request_uri_encoded);
	url += "?client_id=" + client_id_encoded;
	url += "&request_uri=" + request_uri_encoded;
	if (DEBUG) console.debug(PREFIX, "Redirecting to URL:", url);

	// Avoid "testing page".
	localStorage.removeItem( "BSKYDATA" );
	if (DEBUG) console.debug( PREFIX, `Deleted localStorage item: [BSKYDATA].` );

	if (GROUP_DEBUG) console.groupEnd();
	window.location = url;

	/*
	   In this point, the Bluesky authserver will ask us for auth authorization.
	   Later we will be redirected to the "redirect_url" page.
	   As an example:
		 https://madrilenyer.neocities.org/bsky/oauth/callback/?iss=https%3A%2F%2Fbsky.social&state=2a99fbad39e94d1074215a8d79c9e995496fcc82c43d9cbba3f62dc2&code=cod-43e8c329bca1f2c2c2b5c9e554dbcd8d9617ff7a89eadc1f66bad428360219cb
	  
	   Splitted:
		 https://madrilenyer.neocities.org/bsky/oauth/callback/
		   ?iss=https%3A%2F%2Fbsky.social
		   &state=2a99fbad39e94d1074215a8d79c9e995496fcc82c43d9cbba3f62dc2
		   &code=cod-43e8c329bca1f2c2c2b5c9e554dbcd8d9617ff7a89eadc1f66bad428360219cb

	   Where:
	   + iss..: El Issuer
	   + state: El mismo que se ha pasado
	   + code.: El código para solicitar el token
	*/
}

function retrieveDataFromLocalStorage() {
	const PREFIX = `[${MODULE_NAME}:retrieveDataFromLocalStorage] `;
	if (DEBUG) console.groupCollapsed(PREFIX);

	userHandle = localStorage.getItem(LSKEYS.user.handle);
	userDID = localStorage.getItem(LSKEYS.user.did);
	userDIDDocument = JSON.parse( localStorage.getItem(LSKEYS.user.didDoc) );
	userPDSURL = localStorage.getItem(LSKEYS.user.pdsUrl);
	userAuthServerURL = localStorage.getItem(LSKEYS.user.authServerUrl);
	userAuthServerDiscovery = JSON.parse( localStorage.getItem(LSKEYS.user.authServerDiscovery) );
	userAuthServerRequestURI = localStorage.getItem(LSKEYS.user.authServerRequestURI);
	code_verifier = localStorage.getItem(LSKEYS.pkce.code_verifier);
	dpopNonce = localStorage.getItem(LSKEYS.request.dpop_nonce);

	if (DEBUG) console.debug(PREFIX, "Retrieved saved values from Local Storage:");
	if (DEBUG) console.debug(PREFIX, "+ userHandle:", userHandle);
	if (DEBUG) console.debug(PREFIX, "+ userDID:", userDID);
	if (DEBUG) console.debug(PREFIX, "+ userDIDDocument:", userDIDDocument);
	if (DEBUG) console.debug(PREFIX, "+ userPDSURL:", userPDSURL);
	if (DEBUG) console.debug(PREFIX, "+ userAuthServerURL:", userAuthServerURL);
	if (DEBUG) console.debug(PREFIX, "+ userAuthServerDiscovery:", userAuthServerDiscovery);
	if (DEBUG) console.debug(PREFIX, "+ userAuthServerRequestURI:", userAuthServerRequestURI);
	if (DEBUG) console.debug(PREFIX, "+ code_verifier:", code_verifier);
	if (DEBUG) console.debug(PREFIX, "+ dpopNonce:", dpopNonce);

	if (DEBUG) console.groupEnd();
}

function retrieveUserTokenFromAuthServer(parsedSearch) {
	const PREFIX = `[${MODULE_NAME}:retrieveUserTokenFromAuthServer] `;
	const PREFIX_FETCH = `[${MODULE_NAME}:retrieveUserTokenFromAuthServer][Fetch] `;
	const PREFIX_FETCH_ERROR = `[${MODULE_NAME}:retrieveUserTokenFromAuthServer][Fetch:ERROR] `;
	if (GROUP_DEBUG) console.groupCollapsed(PREFIX);
	
	// Update HTML page element values.
	COMMON.renderHTMLElements(parsedSearch);

	// Retrieve data from Local Storage
	retrieveDataFromLocalStorage();

	/*
	 * Let's make a POST request to 
	 */
	// Retrieve the "code"...
	let code = parsedSearch.get("code");

	// Preparamos la llamada.
	let key = API.authServer.key.token;
	let url = userAuthServerDiscovery[key];
	if (DEBUG) console.debug(PREFIX, "Authentication Server - User Token URL:", url);

	// Preparamos los datos a enviar
	let urlData = new URLSearchParams({
		// Fixed values
		'grant_type': 'authorization_code',
		// Variable values
		'code': code,
		'code_verifier': code_verifier,
		// Neocities values
		'client_id': NEOCITIES.client_id,
		'redirect_uri': NEOCITIES.redirect_uri
	});
	// if (DEBUG) console.debug(PREFIX, "Generated [urlData]:", urlData.toString());
	if (DEBUG) console.debug(PREFIX, "Generated [urlData]:", COMMON.prettyJson( Object.fromEntries( urlData ) ));

	// El DPoP para coger el User Token
	OAuth2.retrieveUserTokenFromAS( url, urlData, NEOCITIES.client_id ).then( dpop => {
		if (GROUP_DEBUG) console.groupCollapsed(PREFIX_FETCH);
		if (COMMON.isNull(dpop)) {
			// Nothing returned
			if (DEBUG) console.error(PREFIX_FETCH, "[CATCH] DPoP is null!", url);
			if (GROUP_DEBUG) console.groupEnd();
			alert(PREFIX_FETCH + "[CATCH] DPoP is null!");
			throw(data);
		} else {
			if (DEBUG) console.debug(PREFIX_FETCH, "Received dpop:", COMMON.prettyJson(dpop));
			// Ejecutar una llamada de ejemplo
			if (GROUP_DEBUG) console.groupEnd();
			tokenIntrospection(dpop);
		}
	}).catch(error => {
		if (GROUP_DEBUG) console.groupCollapsed(PREFIX_FETCH_ERROR);
		if (DEBUG) console.error(PREFIX_FETCH_ERROR, "[CATCH] Received:", error);
		COMMON.renderHTMLErrorElements(error);
		// alert(PREFIX_FETCH_ERROR + "[CATCH] Received: " + error);
		if (GROUP_DEBUG) console.groupEnd();
	});

	if (GROUP_DEBUG) console.groupEnd();
}

function tokenIntrospection(dpop) {
	const PREFIX = `[${MODULE_NAME}:tokenIntrospection] `;
	const PREFIX_FETCH_DPoP = `[${MODULE_NAME}:tokenIntrospection][Fetch:DPoP] `;
	const PREFIX_FETCH = `[${MODULE_NAME}:tokenIntrospection][Fetch] `;
	const PREFIX_FETCH_HEADERS = `[${MODULE_NAME}:tokenIntrospection][Fetch:Headers] `;
	const PREFIX_FETCH_ERROR = `[${MODULE_NAME}:tokenIntrospection][Fetch:ERROR] `;

	let key = API.authServer.key.introspection;
	let endpoint = userAuthServerDiscovery[key];
	if (GROUP_DEBUG) console.groupCollapsed(PREFIX + "[Resource=="+endpoint+"]");

	if (DEBUG) console.debug(PREFIX, "Received dpop:", COMMON.prettyJson(dpop));

	// Recuperamos cosas del dpop.
	let accessToken = dpop.access_token;
	let dpopProof = dpop.dpopProofForAS.dpopProof;

	// Preparamos la llamada.
	if (DEBUG) console.debug(PREFIX, "Introspection URL:", endpoint);

	// Generamos el nuevo DPoP para la petición a una URL("Resource") distinta.
	/*
	 * Llamamos a OAuth.generateDpopProofForResource(accessTokenHash, dpopProofForAS, resourceUrl, clientId, nonce, method) {
	 * Necesitamos:
	 * + accessToken......: Lo cogemos del "dpop.access_token"
	 * + accessTokenHash..: Lo cogemos del "dpop.atHash"
	 * + dpopProofForAS...: Lo cogemos del "dpop.dpopProofForAS"
	 * + resourceUrl......: Será la URL a la que vamos a llamar.
	 * + clientId.........: Lo cogemos de la configuración: "NEOCITIES.client_id". La ruta al client metadata.
	 * + nonce............: Lo cogemos del "dpop.nonce"
	 * + method...........: Será "GET", en este caso.
	*/
	OAuth2.generateDpopProofForResource(dpop.atHash, dpop.dpopProofForAS, endpoint, NEOCITIES.client_id, dpop.nonce, "GET")
	.then( dpopProofForResource => {
		if (GROUP_DEBUG) console.groupCollapsed(PREFIX_FETCH_DPoP);
		if (DEBUG) console.debug(PREFIX_FETCH_DPoP, "Received [dpopProofForResource]:", dpopProofForResource);
		if (DEBUG) console.debug(PREFIX_FETCH_DPoP, "Received [dpopProofForResource] (pretty):", COMMON.prettyJson(dpopProofForResource));
		if (DEBUG) console.debug(PREFIX_FETCH_DPoP, "Received dpopProofForResource.dpopProof:", OAuth2.jwtToPrettyJSON( dpopProofForResource.dpopProof ));

		// With the "dpopProofForResource", then call introspection endpoint.
		let urlData = new URLSearchParams({
			// Fixed values
			// token=<token-value>&client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer&client_assertion=<client-assertion-jwt>

			'token': accessToken
			// , 'token_type_hint': 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer'
		});
		if (DEBUG) console.debug(PREFIX_FETCH_DPoP, "Generated [urlData]:", urlData.toString());

		let fetchOptions = {
			method: 'POST',
			headers: {
				'Content-Type': CONTENT_TYPE_FORM_URLENCODED,
				'Authorization': `DPoP ${accessToken}`,
				'DPoP': dpopProofForResource.dpopProof,
				'Accept': 'application/json'
			},
			body: urlData.toString()
		};
		if (DEBUG) console.debug(PREFIX_FETCH_DPoP, "Generated [fetchOptions]:", fetchOptions);
		if (DEBUG) console.debug(PREFIX_FETCH_DPoP, "Generated [fetchOptions] (pretty):", COMMON.prettyJson(fetchOptions));

		fetch(endpoint, fetchOptions).then(response => {
			COMMON.printOutFetchResponse(PREFIX_FETCH_HEADERS, response);
			return response.json();
		}).then(data => {
			if (GROUP_DEBUG) console.groupCollapsed(PREFIX_FETCH);
			if (DEBUG) console.debug(PREFIX_FETCH, "Received:", COMMON.prettyJson(data));
			if (GROUP_DEBUG) console.groupEnd();
		}).catch(error => {
			if (GROUP_DEBUG) console.groupCollapsed(PREFIX_FETCH_ERROR);
			if (DEBUG) console.error(PREFIX_FETCH_ERROR, "[CATCH] Received:", COMMON.prettyJson(error));
			COMMON.renderHTMLErrorElements(error);
			alert(PREFIX_FETCH_ERROR + "[CATCH] Received: " + error);
			if (GROUP_DEBUG) console.groupEnd();
		}).finally(() => {
			// NEXT STEP
			retrieveFollowers(dpop);
		});
		if (GROUP_DEBUG) console.groupEnd();

	});

	if (GROUP_DEBUG) console.groupEnd();
}

function retrieveFollowers(dpop) {
	const PREFIX = `[${MODULE_NAME}:retrieveFollowers] `;
	const PREFIX_FETCH = `[${MODULE_NAME}:retrieveFollowers][Fetch] `;
	const PREFIX_FETCH_HEADERS = `[${MODULE_NAME}:retrieveFollowers][Fetch:Headers] `;
	const PREFIX_FETCH_ERROR = `[${MODULE_NAME}:retrieveFollowers][Fetch:ERROR] `;
	const PREFIX_FETCH_DPoP = `[${MODULE_NAME}:retrieveFollowers][Fetch:DPoP] `;
	const PREFIX_FETCH_CALL = `[${MODULE_NAME}:retrieveFollowers][Fetch:callAPI] `;
	const PREFIX_FETCH_CALL_ERROR = `[${MODULE_NAME}:retrieveFollowers][Fetch:callAPI:ERROR] `;

	let endpoint = API.bluesky.XRPC.api.getFollowers;
	if (GROUP_DEBUG) console.groupCollapsed(PREFIX + "[Resource=="+endpoint+"]");

	// Preparamos la llamada.
	let root = API.bluesky.XRPC.public;
	let url = root + endpoint + "?actor=" + userDID + "&limit=5";
	if (DEBUG) console.debug(PREFIX, "Fetching data from (PUBLIC) URL:", url);

	let fetchOptions = {
		method: "GET",
		// mode: "no-cors",
		mode: "cors",
		headers: {
			"Accept": "application/json",
			"Content-Type": "application/json"
		}
	};
	let followers = fetch(url, fetchOptions).then(response => {
		COMMON.printOutFetchResponse(PREFIX_FETCH_HEADERS, response);
		return response.json();
	}).then(data => {
		if (GROUP_DEBUG) console.groupCollapsed(PREFIX_FETCH);
		if (DEBUG) console.debug(PREFIX_FETCH, "Received:", COMMON.prettyJson(data));
		if (DEBUG) console.debug(PREFIX, "followers:", data.followers);
		if (GROUP_DEBUG) console.groupEnd();
		return data;
	}).catch(error => {
		if (GROUP_DEBUG) console.groupCollapsed(PREFIX_FETCH_ERROR);
		if (DEBUG) console.error(PREFIX_FETCH_ERROR, "[CATCH] Received:", COMMON.prettyJson(error));
		alert(PREFIX_FETCH_ERROR + "[CATCH] Received: " + error);
		if (GROUP_DEBUG) console.groupEnd();
	}).finally(() => {
		// NEXT STEP
		callAuthenticatedResource(dpop);
	});

	if (GROUP_DEBUG) console.groupEnd();
}

function callAuthenticatedResource(dpop) {
	const PREFIX = `[${MODULE_NAME}:callAuthenticatedResource] `;
	const PREFIX_FETCH_DPoP = `[${MODULE_NAME}:callAuthenticatedResource][Fetch:DPoP] `;
	const PREFIX_FETCH_CALL = `[${MODULE_NAME}:callAuthenticatedResource][Fetch:callAPI] `;
	const PREFIX_FETCH_CALL_ERROR = `[${MODULE_NAME}:callAuthenticatedResource][Fetch:callAPI:ERROR] `;

	const PREFIX_FETCH = `[${MODULE_NAME}:callAuthenticatedResource][Fetch] `;
	const PREFIX_FETCH_HEADERS = `[${MODULE_NAME}:callAuthenticatedResource][Fetch:Headers] `;
	const PREFIX_FETCH_ERROR = `[${MODULE_NAME}:callAuthenticatedResource][Fetch:ERROR] `;

	// let endpoint = API.bluesky.XRPC.api.getAccountInfo;
	// let endpoint = API.bluesky.XRPC.api.describeRepo;
	let endpoint = API.bluesky.XRPC.api.getProfile;
	if (GROUP_DEBUG) console.groupCollapsed(PREFIX + "[Resource=="+endpoint+"]");

	// Preparamos la llamada.
	let accessToken = dpop.access_token;
	// let root = userPDSURL + "/xrpc";
	let root = API.bluesky.XRPC.public;
	let baseUrl = root + endpoint;
	// let url = baseUrl + "?did=" + userDID;		// param for: [getAccountInfo]
	// let url = baseUrl + "?repo=" + userDID;		// param for: [describeRepo]
	let url = baseUrl + "?actor=" + userDID;		// param for: [describeRepo]


	// Probamos primero con una llamada sin autenticar...
	if (DEBUG) console.debug(PREFIX, "Fetching data from the (NON Authenticated) URL:", url);
	let fetchOptions = {
		method: "GET",
		// mode: "no-cors",
		mode: "cors",
		headers: {
			"Accept": "application/json",
			"Content-Type": "application/json"
		}
	};
	let followers = fetch(url).then(response => {
		COMMON.printOutFetchResponse(PREFIX_FETCH_HEADERS, response);
		return response.json();
	}).then(data => {
		if (GROUP_DEBUG) console.groupCollapsed(PREFIX_FETCH);
		if (DEBUG) console.debug(PREFIX_FETCH, "Received:", COMMON.prettyJson(data));
		if (DEBUG) console.debug(PREFIX, "followers:", data.followers);
		if (GROUP_DEBUG) console.groupEnd();
		return data;
	}).catch(error => {
		if (GROUP_DEBUG) console.groupCollapsed(PREFIX_FETCH_ERROR);
		if (DEBUG) console.error(PREFIX_FETCH_ERROR, "[CATCH] Received:", COMMON.prettyJson(error));
		alert(PREFIX_FETCH_ERROR + "[CATCH] Received: " + error);
		if (GROUP_DEBUG) console.groupEnd();
	});


	// Generamos el nuevo DPoP para la petición a una URL("Resource") distinta.
	/*
	 * Llamamos a OAuth.generateDpopProofForResource(accessTokenHash, dpopProofForAS, resourceUrl, clientId, nonce, method) {
	 * Necesitamos:
	 * + accessToken......: Lo cogemos del "dpop.access_token"
	 * + accessTokenHash..: Lo cogemos del "dpop.atHash"
	 * + dpopProofForAS...: Lo cogemos del "dpop.dpopProofForAS"
	 * + resourceUrl......: Será la URL a la que vamos a llamar.
	 * + clientId.........: Lo cogemos de la configuración: "NEOCITIES.client_id". La ruta al client metadata.
	 * + nonce............: Lo cogemos del "dpop.nonce"
	 * + method...........: Será "GET", en este caso.
	*/
	if (DEBUG) console.debug(PREFIX, "Fetching data from the (Authenticated) URL:", url);
	OAuth2.generateDpopProofForResource(dpop.atHash, dpop.dpopProofForAS, url, NEOCITIES.client_id, dpop.nonce, "GET")
	.then( dpopProofForResource => {
		if (GROUP_DEBUG) console.groupCollapsed(PREFIX_FETCH_DPoP);
		if (DEBUG) console.debug(PREFIX_FETCH_DPoP, "Received dpopProofForResource:", dpopProofForResource);
		if (DEBUG) console.debug(PREFIX_FETCH_DPoP, "Received dpopProofForResource (pretty):", OAuth2.jwtToPrettyJSON( dpopProofForResource.dpopProof ));

		OAuth2.callAPI(dpop.access_token, dpopProofForResource.dpopProof, url).then(data => {
			if (GROUP_DEBUG) console.groupCollapsed(PREFIX_FETCH_CALL);
			if (DEBUG) console.debug(PREFIX_FETCH_CALL, "Received:", COMMON.prettyJson(data));
			if (COMMON.isNull(data)) {
				// Nothing returned
				if (DEBUG) console.error(PREFIX_FETCH_CALL, "[CATCH] Nothing returned!", url);
				if (GROUP_DEBUG) console.groupEnd();
				alert(PREFIX_FETCH_CALL, "[CATCH] Nothing returned!");
				throw(data);
			} else if (data.error) {
				// Error
				if (DEBUG) console.error(PREFIX_FETCH_CALL, "[CATCH] BAD Response!", data);
				if (GROUP_DEBUG) console.groupEnd();
				// alert(PREFIX_FETCH_CALL + "[CATCH] BAD Response!" + JSON.stringify( data ));
				throw(data);
			} else {
				if (DEBUG) console.debug(PREFIX_FETCH_CALL, "No errors! ;^)");
				if (DEBUG) console.debug(PREFIX_FETCH_CALL, "Received data:", COMMON.prettyJson(data));
				if (GROUP_DEBUG) console.groupEnd();
			}
		}).catch(error => {
			if (GROUP_DEBUG) console.groupCollapsed(PREFIX_FETCH_CALL_ERROR);
			if (DEBUG) console.error(PREFIX_FETCH_CALL_ERROR, "[CATCH] Received:", COMMON.prettyJson(error));
			// Renderizamos los datos en pantalla...
			COMMON.renderHTMLErrorElements(error);
			// alert(PREFIX_FETCH_CALL_ERROR + "[CATCH] Received: " + JSON.stringify( error ));
			if (GROUP_DEBUG) console.groupEnd();
		});

		if (GROUP_DEBUG) console.groupEnd();
	});

	if (GROUP_DEBUG) console.groupEnd();
}


/**********************************************************
 * PUBLIC Functions
 **********************************************************/
export function authenticateWithBluesky(handle) {
	const PREFIX = `[${MODULE_NAME}:authenticateWithBluesky] `;
	if (GROUP_DEBUG) console.groupCollapsed(PREFIX);

	if (COMMON.isEmptyOrNull(handle)) {
		if (DEBUG) console.warn(PREFIX, "Received NO handle!");
		if (GROUP_DEBUG) console.groupEnd();
		alert(PREFIX + "Received NO handle!");
	} else {
		if (DEBUG) console.debug(PREFIX, "Received handle:", handle);
		// Guardamos el handle
		userHandle = handle;

		localStorage.setItem(LSKEYS.user.handle, userHandle);
		if (DEBUG) console.debug(PREFIX, "[LOCAL STORAGE]", "[LSKEYS.user.handle=="+LSKEYS.user.handle+"]==["+handle+"]");

		// STEP 01: Resolvemos el DID
		// step00Chech();
		if (GROUP_DEBUG) console.groupEnd();
		step01ResolveDIDForHandle();
	}
}

export function analizeCallbackURL() {
	const PREFIX = `[${MODULE_NAME}:analizeCallbackURL] `;
	if (GROUP_DEBUG) console.groupCollapsed(PREFIX);

	// Retrieve URL information
	let thisURL = new URL(window.location);

	// Retrieve data from the url
	let parsedSearch = new URLSearchParams(thisURL.search);

	if (!COMMON.areEquals(thisURL.hostname, "localhost")) {
		// Redirigimos a "localhost", que es donde tenemos los datos en el "localStorage".
		if (DEBUG) console.debug(PREFIX, "Redirecting to:", thisURL.hostname);

		// Copy the received "search" parameters
		// thisURL.search = parsedSearch.toString();
		if (DEBUG) console.debug(PREFIX, "Processing 'this' URL...");
		if (DEBUG) console.debug(PREFIX, "+ thisURL:", thisURL);
		if (DEBUG) console.debug(PREFIX, "+ thisURL.href:", thisURL.href);
		if (DEBUG) console.debug(PREFIX, "+ thisURL.toString():", thisURL.toString());

		if (DEBUG) console.debug(PREFIX, "Preparing the 'new' URL...");
		thisURL.protocol = "http";
		thisURL.hostname = "localhost";
		thisURL.pathname = "/neocities/bsky/oauth/callback/";
		if (DEBUG) console.debug(PREFIX, "+ thisURL:", thisURL);
		if (DEBUG) console.debug(PREFIX, "+ thisURL.href:", thisURL.href);
		if (DEBUG) console.debug(PREFIX, "+ thisURL.toString():", thisURL.toString());
		
		if (DEBUG) console.debug(PREFIX, "The timeout of "+(NEOCITIES.redirect_delay/1000)+" second(s)...");
		setTimeout(() => { window.location = thisURL.href; }, NEOCITIES.redirect_delay );

		if (GROUP_DEBUG) console.groupEnd();
	} else {
		// Estamos en "localhost".
		if (DEBUG) console.debug(PREFIX, "Processing the request in localhost...");
		
		// Primero veamos si venimos de la página "NORMAL" o de la de "TEST"...
		let bskyData = localStorage.getItem( "BSKYDATA" );
		if ( bskyData ) {
			// Estamos en la de "TEST".
			if (DEBUG) console.debug(PREFIX, "Processing the TEST: [testProcessCallback] ");
			if (GROUP_DEBUG) console.groupEnd();
			// BSKY.callback();
			BSKY.testProcessCallback(parsedSearch);
		} else {
			// Estamos en la "NORMAL".
			// Recuperamos el token de usuario del Authorization Server
			if (DEBUG) console.debug(PREFIX, "Processing the NORMAL: [retrieveUserTokenFromAuthServer] ");
			if (GROUP_DEBUG) console.groupEnd();
			retrieveUserTokenFromAuthServer(parsedSearch);
		}
	}
}


/**********************************************************
 * TESTING Functions / Part #2
 **********************************************************/


