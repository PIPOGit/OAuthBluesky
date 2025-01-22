/**********************************************************
 * File Info:
 *
 * This file is loaded once the user is logged in.
 *
 **********************************************************/


/**********************************************************
 * Module imports
 **********************************************************/
// Common modules
import CONFIGURATION				from "./data/config.json" with { type: "json" };


/**********************************************************
 * Module Constants
 **********************************************************/
// PreLoaded constants
const getModuleName					= url => { return url.replace( /^.*[\\/]/, '' ).replace( /\.[^.]*$/, '' ); };
const getTypeOf						= option => typeof option;
const prettyJson					= obj => JSON.stringify( obj, null, "  " );

// Module SELF constants
const MODULE_NAME					= getModuleName( import.meta.url );
const MODULE_VERSION				= "1.0.0";
const MODULE_PREFIX					= `[${MODULE_NAME}]: `;

// Inner constants
const CONST_URL						= new URL( window.location );
const DEBUG							= CONFIGURATION.global.debug;
const DEBUG_FOLDED					= CONFIGURATION.global.debug_folded;
const API							= CONFIGURATION.api;
const LSKEYS						= CONFIGURATION.localStorageKeys;

// Bluesky constants
const APP_CLIENT_ID					= "https://madrilenyer.neocities.org/bsky/oauth/client-metadata.json";
const APP_CALLBACK_URL				= "https://madrilenyer.neocities.org/bsky/oauth/callback/";
const URL_RESOLVE_HANDLE			= "https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=";
const URL_PLC_DIRECTORY				= "https://plc.directory/";
const URL_PDS_METADATA				= "/.well-known/oauth-protected-resource";
const URL_AUTH_DISCOVERY			= "/.well-known/oauth-authorization-server";


/**********************************************************
 * Module Variables
 **********************************************************/
// Module Variables
let GROUP_DEBUG						= DEBUG && DEBUG_FOLDED;
window.BSKY							= window.BSKY || {};

// Bluesky Variables
let userHandle						= null;
let userDid							= null;
let userDidDocument					= null;
let userPDSURL						= null;
let userPDSMetadata					= null;
let userAuthServerURL				= null;
let userAuthServerDiscovery			= null;
let userAuthorizationEndPoint		= null;
let userTokenEndPoint				= null;
let userPAREndPoint					= null;
let dpopNonce						= null;
let userAuthServerRequestURI		= null;

// Auth variables
let state							= null;
let codeVerifier					= null;
let codeChallenge					= null;

// Response from the access token request
let cryptoKey						= null;
let userAuthentication				= null;
let userAccessToken					= null;


/**********************************************************
 * Module Load
 **********************************************************/
( ( parent, argument ) => {
	if ( getTypeOf( argument ) === 'function' ) {
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
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// ================================================================
	// Module info.
	if (DEBUG) console.debug( PREFIX, "import.meta.url:", import.meta.url );
	if (DEBUG) console.debug( PREFIX, "MODULE_NAME:", MODULE_NAME );

	if (DEBUG) console.debug( PREFIX, "Configuration:", CONFIGURATION );
	if (DEBUG) console.debug( PREFIX, "API:", API );
	if (DEBUG) console.debug( PREFIX, "CONST_URL:", CONST_URL );


	// ================================================================
	// Actualizamos el objeto raiz.
	window.BSKY.testAuthenticateWithBluesky = testAuthenticateWithBluesky;
	window.BSKY.testProcessCallback = testProcessCallback;
	if (DEBUG) console.debug( PREFIX, `Updated object: [window.BSKY].` );
	if (DEBUG) console.debug( PREFIX, "window.BSKY object:", window.BSKY );

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

	if (GROUP_DEBUG) console.groupEnd();
	console.info( `Loaded module ${MODULE_NAME}, version ${MODULE_VERSION}.` );
}


/**********************************************************
 * HELPER Functions
 **********************************************************/
function toBase64Url(str) {
    const base64string = btoa(String.fromCharCode.apply(0, str));
    return base64string.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function toBase64UrlString(str){
    return str.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "")
}

function Base64UrlToUint8Array(str) {
    str = str.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "");
    return new Uint8Array(
        Array.prototype.map.call(atob(str), (c) => c.charCodeAt(0))
    );
}

const utf8ToUint8Array = (str) => Base64UrlToUint8Array(btoa(unescape(encodeURIComponent(str))));

function base64urlencode(str) {
	let uint8ByteArray = new Uint8Array(str);
	let data = String.fromCharCode.apply(null, uint8ByteArray);
    return btoa(data)
        .replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

function generateRandomUUID() {
    let randomData = new Uint32Array(28);
    window.crypto.getRandomValues(randomData);
    return Array.from(randomData, dec => ('0' + dec.toString(16)).substr(-2)).join('');
}

async function generateCodeVerifierChallengeFromVerifier( codeVerifier ) {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    let hashedCodeVerifier = await window.crypto.subtle.digest('SHA-256', data);
	return base64urlencode(hashedCodeVerifier);
}

const CONSOLE_STYLE					= 'background-color: darkblue; color: yellow; padding: 1px 4px; border: 1px solid hotpink; font-size: 1em;'
function analizeParsedResponse( parsedResponse ) {
	const PREFIX = `[${MODULE_NAME}:analizeParsedResponse] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

	if (DEBUG) console.debug( PREFIX, "Received parsedResponse:", prettyJson( parsedResponse ) );

	let headers = parsedResponse.headers;
	if ( headers["dpop-nonce"] ) {
		// Here, we gather the "dpop-nonce" header.
		dpopNonce = headers["dpop-nonce"];
		localStorage.setItem(LSKEYS.request.dpop_nonce, dpopNonce);
		if (DEBUG) console.info( PREFIX + "%cReceived dpop-nonce header: [" + dpopNonce + "]", CONSOLE_STYLE );
	}

	if (DEBUG) console.debug( PREFIX, "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
}


// JWT Helper functions
function jwtToPrettyJSON( jwt ) {
    let partsAsString = getJWTAsString(jwt);
    let jwtAsString = `${partsAsString.header}.${partsAsString.payload}.${partsAsString.signature}`;
	return jwtAsString;
}
function getJWTAsString(accessToken){
    var parts = getParts(accessToken);

    var headerString = prettyString(parts.header);
    var payloadString = prettyString(parts.payload);
    var signatureBase64Url = toBase64UrlString(parts.signature);

    return {header: headerString, payload: payloadString, signature: signatureBase64Url}
}
export function getParts(accessToken){    
    var parts = accessToken.split(".");

    var header = parts[0];
    var payload = parts[1];
    var signature = parts[2];

    return {header, payload, signature};
}
function prettyString(section){
    var b64 = toBase64UrlString(section);
    var str = atob(b64);
    var json = JSON.parse(str);
    var pretty = JSON.stringify(json, null, "    ");
    return pretty;
}


function printOutFetchResponse(prefix, data) {
	let PREFIX = prefix + "[RESPONSE=="+(data.ok?"OK":"ERROR")+" ("+data.status+")]";
	if (DEBUG) console.groupCollapsed(PREFIX);
	if (DEBUG) console.debug(PREFIX, "Received response:", prettyJson(data));

	let response = {};
	response.bodyUsed = data.bodyUsed;
	if (DEBUG) console.debug(PREFIX, "+ Response[bodyUsed]:", data.bodyUsed);
	response.ok = data.ok;
	if (DEBUG) console.debug(PREFIX, "+ Response[ok]:", data.ok);
	response.redirected = data.redirected;
	if (DEBUG) console.debug(PREFIX, "+ Response[redirected]:", data.redirected);
	response.status = data.status;
	if (DEBUG) console.debug(PREFIX, "+ Response[status]:", data.status);
	response.statusText = data.statusText;
	if (DEBUG) console.debug(PREFIX, "+ Response[statusText]:", data.statusText);
	response.type = data.type;
	if (DEBUG) console.debug(PREFIX, "+ Response[type]:", data.type);
	response.url = data.url;
	if (DEBUG) console.debug(PREFIX, "+ Response[url]:", data.url);
	response.headers = {};
	if (DEBUG) console.debug(PREFIX, "+ Response Headers:");
	for (var pair of data.headers.entries()) {
		response.headers[pair[0]] = pair[1];
		if (DEBUG) console.debug(PREFIX, "  + Header["+pair[0]+"]:", pair[1]);
	}
	if (DEBUG) console.groupEnd(PREFIX);
	return response;
}



/**********************************************************
 * PRIVATE Functions
 **********************************************************/
async function test01RetrieveUserDID() {
	const PREFIX = `[${MODULE_NAME}:test01] `;
	const PREFIX_FETCH = `${PREFIX}[Fetch] `;
	const PREFIX_FETCH_HEADERS = `${PREFIX_FETCH}[Headers] `;
	const PREFIX_FETCH_BODY = `${PREFIX_FETCH}[Body] `;
	const PREFIX_FETCH_ERROR = `${PREFIX_FETCH}[ERROR] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + " [test01RetrieveUserDID]" );

	if (DEBUG) console.debug( PREFIX, "Using handle:", userHandle );

    let url = URL_RESOLVE_HANDLE + userHandle;
 	if (DEBUG) console.debug( PREFIX, "Invoking URL:", url );
 	let responseFromServer = await fetch( url ).then( response => {
        // Process the HTTP Response
		if (GROUP_DEBUG) console.groupCollapsed( PREFIX_FETCH );
		let parsedResponse = printOutFetchResponse( PREFIX_FETCH_HEADERS, response );
		analizeParsedResponse( parsedResponse );
		if ( !response.ok ) {
			return response.json().then( data => {
				throw new Error( `Error ${response.status}`, { cause: { status: response.status, statusText: response.statusText, payload: data } } )
			});
		}
        return response.json();
    }).then( data => {
        // Process the HTTP Response Body
		if (DEBUG) console.debug( PREFIX_FETCH_BODY, "Data:", prettyJson( data ) );
        // Here, we gather the "did" item in the received json.
		userDid = data.did;
        // Return something
		return data.did;
    }).catch( error => {
		if (DEBUG) console.debug( PREFIX_FETCH_ERROR, "ERROR:", error.message );
		if (DEBUG) console.debug( PREFIX_FETCH_ERROR, "ERROR Cause:", prettyJson( error.cause ) );
		throw( error );
    }).finally( () => {
		if (DEBUG) console.debug( PREFIX_FETCH, "-- FINALLY" );
		if (GROUP_DEBUG) console.groupEnd();
    });
	if (DEBUG) console.debug( PREFIX, "Received responseFromServer:", prettyJson( responseFromServer ) );

	if (DEBUG) console.debug( PREFIX, "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
	return userDid;
}

async function test02RetrieveUserDIDDocument() {
	const PREFIX = `[${MODULE_NAME}:test02] `;
	const PREFIX_FETCH = `${PREFIX}[Fetch] `;
	const PREFIX_FETCH_HEADERS = `${PREFIX_FETCH}[Headers] `;
	const PREFIX_FETCH_BODY = `${PREFIX_FETCH}[Body] `;
	const PREFIX_FETCH_ERROR = `${PREFIX_FETCH}[ERROR] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + " [test02RetrieveUserDIDDocument]" );

	if (DEBUG) console.debug( PREFIX, "Using did:", userDid );

    let url = URL_PLC_DIRECTORY + userDid;
 	if (DEBUG) console.debug( PREFIX, "Invoking URL:", url );
    let responseFromServer = await fetch( url ).then( response => {
        // Process the HTTP Response
		if (GROUP_DEBUG) console.groupCollapsed( PREFIX_FETCH );
		let parsedResponse = printOutFetchResponse( PREFIX_FETCH_HEADERS, response );
		analizeParsedResponse( parsedResponse );
		if ( !response.ok ) {
			return response.json().then( data => {
				throw new Error( `Error ${response.status}`, { cause: { status: response.status, statusText: response.statusText, payload: data } } )
			});
		}
        return response.json();
    }).then( data => {
        // Process the HTTP Response Body
		if (DEBUG) console.debug( PREFIX_FETCH_BODY, "Data:", prettyJson( data ) );
        // Here, we gather the "did" item in the received json.
        userDidDocument = data;
        userPDSURL = userDidDocument.service[0].serviceEndpoint;
        // Return something
		return data;
    }).catch( error => {
		if (DEBUG) console.debug( PREFIX_FETCH_ERROR, "ERROR:", error.message );
		if (DEBUG) console.debug( PREFIX_FETCH_ERROR, "ERROR Cause:", prettyJson( error.cause ) );
		throw( error );
    }).finally( () => {
		if (DEBUG) console.debug( PREFIX_FETCH, "-- FINALLY" );
		if (GROUP_DEBUG) console.groupEnd();
    });
	if (DEBUG) console.debug( PREFIX, "Received responseFromServer:", prettyJson( responseFromServer ) );
	if (DEBUG) console.debug( PREFIX, "Received userDidDocument:", userDidDocument );
	if (DEBUG) console.debug( PREFIX, "Received userPDSURL:", userPDSURL );

	if (DEBUG) console.debug( PREFIX_FETCH, "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
	return { userDidDocument: userDidDocument, userPDSURL: userPDSURL };
}

async function test03RetrievePDSServerMetadata() {
	const PREFIX = `[${MODULE_NAME}:test03] `;
	const PREFIX_FETCH = `${PREFIX}[Fetch] `;
	const PREFIX_FETCH_HEADERS = `${PREFIX_FETCH}[Headers] `;
	const PREFIX_FETCH_BODY = `${PREFIX_FETCH}[Body] `;
	const PREFIX_FETCH_ERROR = `${PREFIX_FETCH}[ERROR] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + " [test03RetrievePDSServerMetadata]" );

	if (DEBUG) console.debug( PREFIX, "Using userPDSURL:", userPDSURL );

    let url = userPDSURL + URL_PDS_METADATA;
 	if (DEBUG) console.debug( PREFIX, "Invoking URL:", url );
    let responseFromServer = await fetch( url ).then( response => {
        // Process the HTTP Response
		if (GROUP_DEBUG) console.groupCollapsed( PREFIX_FETCH );
		let parsedResponse = printOutFetchResponse( PREFIX_FETCH_HEADERS, response );
		analizeParsedResponse( parsedResponse );
		if ( !response.ok ) {
			return response.json().then( data => {
				throw new Error( `Error ${response.status}`, { cause: { status: response.status, statusText: response.statusText, payload: data } } )
			});
		}
        return response.json();
    }).then( data => {
        // Process the HTTP Response Body
		if (DEBUG) console.debug( PREFIX_FETCH_BODY, "Data:", prettyJson( data ) );
        // Here, we gather the "did" item in the received json.
        userPDSMetadata = data;
        userAuthServerURL = userPDSMetadata.authorization_servers[0];
        // Return something
		return data;
    }).catch( error => {
		if (DEBUG) console.debug( PREFIX_FETCH_ERROR, "ERROR:", error.message );
		if (DEBUG) console.debug( PREFIX_FETCH_ERROR, "ERROR Cause:", prettyJson( error.cause ) );
		throw( error );
    }).finally( () => {
		if (DEBUG) console.debug( PREFIX_FETCH, "-- FINALLY" );
		if (GROUP_DEBUG) console.groupEnd();
    });
	if (DEBUG) console.debug( PREFIX, "Received responseFromServer:", prettyJson( responseFromServer ) );
	if (DEBUG) console.debug( PREFIX, "Received userPDSMetadata:", userPDSMetadata );
	if (DEBUG) console.debug( PREFIX, "Received userAuthServerURL:", userAuthServerURL );

	if (DEBUG) console.debug( PREFIX_FETCH, "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
	return { userPDSMetadata: userPDSMetadata, userAuthServerURL: userAuthServerURL };
}

async function test04RetrieveAuthServerDiscoveryMetadata() {
	const PREFIX = `[${MODULE_NAME}:test04] `;
	const PREFIX_FETCH = `${PREFIX}[Fetch] `;
	const PREFIX_FETCH_HEADERS = `${PREFIX_FETCH}[Headers] `;
	const PREFIX_FETCH_BODY = `${PREFIX_FETCH}[Body] `;
	const PREFIX_FETCH_ERROR = `${PREFIX_FETCH}[ERROR] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + " [test04RetrieveAuthServerDiscoveryMetadata]" );

	if (DEBUG) console.debug( PREFIX, "Using userAuthServerURL:", userAuthServerURL );

    let url = userAuthServerURL + URL_AUTH_DISCOVERY;
 	if (DEBUG) console.debug( PREFIX, "Invoking URL:", url );
    let responseFromServer = await fetch( url ).then( response => {
        // Process the HTTP Response
		if (GROUP_DEBUG) console.groupCollapsed( PREFIX_FETCH );
		let parsedResponse = printOutFetchResponse( PREFIX_FETCH_HEADERS, response );
		analizeParsedResponse( parsedResponse );
		if ( !response.ok ) {
			return response.json().then( data => {
				throw new Error( `Error ${response.status}`, { cause: { status: response.status, statusText: response.statusText, payload: data } } )
			});
		}
        return response.json();
    }).then( data => {
        // Process the HTTP Response Body
		if (DEBUG) console.debug( PREFIX_FETCH_BODY, "Data:", prettyJson( data ) );
        // Here, we gather the "did" item in the received json.
        userAuthServerDiscovery   = data;
        userAuthorizationEndPoint = data.authorization_endpoint;
        userTokenEndPoint         = data.token_endpoint;
        userPAREndPoint           = data.pushed_authorization_request_endpoint;
        // Return something
		return data;
    }).catch( error => {
		if (DEBUG) console.debug( PREFIX_FETCH_ERROR, "ERROR:", error.message );
		if (DEBUG) console.debug( PREFIX_FETCH_ERROR, "ERROR Cause:", prettyJson( error.cause ) );
		throw( error );
    }).finally( () => {
		if (DEBUG) console.debug( PREFIX_FETCH, "-- FINALLY" );
		if (GROUP_DEBUG) console.groupEnd();
    });
	if (DEBUG) console.debug( PREFIX, "Received responseFromServer:", prettyJson( responseFromServer ) );
	if (DEBUG) console.debug( PREFIX, "Received userAuthServerDiscovery:", userAuthServerDiscovery );
	if (DEBUG) console.debug( PREFIX, "Received userAuthorizationEndPoint:", userAuthorizationEndPoint );
	if (DEBUG) console.debug( PREFIX, "Received userTokenEndPoint:", userTokenEndPoint );
	if (DEBUG) console.debug( PREFIX, "Received userPAREndPoint:", userPAREndPoint );

	if (DEBUG) console.debug( PREFIX_FETCH, "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
	return {
		userAuthServerDiscovery: userAuthServerDiscovery
		, userAuthorizationEndPoint: userAuthorizationEndPoint
		, userTokenEndPoint: userTokenEndPoint
		, userPAREndPoint: userPAREndPoint
	};
}

async function test05PARRequest() {
	const PREFIX = `[${MODULE_NAME}:test05] `;
	const PREFIX_FETCH = `${PREFIX}[Fetch] `;
	const PREFIX_FETCH_HEADERS = `${PREFIX_FETCH}[Headers] `;
	const PREFIX_FETCH_BODY = `${PREFIX_FETCH}[Body] `;
	const PREFIX_FETCH_ERROR = `${PREFIX_FETCH}[ERROR] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + " [test05PARRequest]" );


    // The state & code verifier
    // ------------------------------------------
    state = generateRandomUUID();
    codeVerifier = generateRandomUUID();
	if (DEBUG) console.debug( PREFIX, "Generated state:", state );
	if (DEBUG) console.debug( PREFIX, "Generated codeVerifier:", codeVerifier );

    // The code verifier challenge
    // ------------------------------------------
    codeChallenge = await generateCodeVerifierChallengeFromVerifier(codeVerifier);
	if (DEBUG) console.debug( PREFIX, "Generated codeChallenge:", codeChallenge );

    // Build up the URL.
    // Just, to make it simple! I know there are better ways to do this, BUT...
    // ------------------------------------------
    let body = "response_type=code";
    body += "&code_challenge_method=S256";
    body += "&scope=atproto+transition:generic"; // MUST match the scopes in the client-metadata.json
    body += "&client_id=" + encodeURIComponent( APP_CLIENT_ID );
    body += "&redirect_uri=" + encodeURIComponent( APP_CALLBACK_URL );
    body += "&code_challenge=" + codeChallenge;
    body += "&state=" + state;
    body += "&login_hint=" + userHandle;
	if (DEBUG) console.debug( PREFIX, "Generated body:", body );


    // TuneUp and perform the call
    // ------------------------------------------
    let url = userPAREndPoint;
 	if (DEBUG) console.debug( PREFIX, "Invoking URL:", url );
    let fetchOptions = {
        method: 'POST',
        headers: {
            'Content-Type': "application/x-www-form-urlencoded"
        },
        body: body
    }
 	if (DEBUG) console.debug( PREFIX, "+ with this options:", prettyJson( fetchOptions ) );
 	let responseFromServer = await fetch( url, fetchOptions ).then( response => {
        // Process the HTTP Response
		if (GROUP_DEBUG) console.groupCollapsed( PREFIX_FETCH );
		let parsedResponse = printOutFetchResponse( PREFIX_FETCH_HEADERS, response );
		analizeParsedResponse( parsedResponse );
		if ( !response.ok ) {
			return response.json().then( data => {
				throw new Error( `Error ${response.status}`, { cause: { status: response.status, statusText: response.statusText, payload: data } } )
			});
		}
        // Here, we gather the "dpop-nonce" header.
        dpopNonce = response.headers.get( "dpop-nonce" );
		if (DEBUG) console.debug( PREFIX, "Received dpop-nonce header:", dpopNonce );
        return response.json();
    }).then( data => {
        // Process the HTTP Response Body
		if (DEBUG) console.debug( PREFIX_FETCH_BODY, "Data:", prettyJson( data ) );
        // Here, we gather the "request_uri" item in the received json.
        userAuthServerRequestURI = data.request_uri;
        // Return something
		return data;
    }).catch( error => {
		if (DEBUG) console.debug( PREFIX_FETCH_ERROR, "ERROR:", error.message );
		if (DEBUG) console.debug( PREFIX_FETCH_ERROR, "ERROR Cause:", prettyJson( error.cause ) );
		throw( error );
    }).finally( () => {
		if (DEBUG) console.debug( PREFIX_FETCH, "-- FINALLY" );
		if (GROUP_DEBUG) console.groupEnd();
    });
	if (DEBUG) console.debug( PREFIX, "Received responseFromServer:", prettyJson( responseFromServer ) );
	if (DEBUG) console.debug( PREFIX, "Received dpopNonce:", dpopNonce );
	if (DEBUG) console.debug( PREFIX, "Received userAuthServerRequestURI:", userAuthServerRequestURI );

	if (DEBUG) console.debug( PREFIX_FETCH, "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
	return { dpopNonce: dpopNonce, userAuthServerRequestURI: userAuthServerRequestURI };
}

function test06RedirectUserToBlueskyAuthPage() {
	const PREFIX = `[${MODULE_NAME}:test06] `;
	const PREFIX_FETCH = `${PREFIX}[Fetch] `;
	const PREFIX_FETCH_HEADERS = `${PREFIX_FETCH}[Headers] `;
	const PREFIX_FETCH_BODY = `${PREFIX_FETCH}[Body] `;
	const PREFIX_FETCH_ERROR = `${PREFIX_FETCH}[ERROR] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + " [test06RedirectUserToBlueskyAuthPage]" );

    // Buld up the URL.
    // ------------------------------------------
    let url = userAuthorizationEndPoint;
    url += "?client_id=" + encodeURIComponent( APP_CLIENT_ID );
    url += "&request_uri=" + encodeURIComponent( userAuthServerRequestURI );
 	if (DEBUG) console.debug( PREFIX, "Redirecting the user to URL:", url );

	if (DEBUG) console.debug( PREFIX, "-- END" );
	if (GROUP_DEBUG) console.groupEnd();

    // ------------------------------------------
    // SAVE ALL RECEIVED DATA
	// IN localStorage BEFORE LEAVING!!!
    // ------------------------------------------

	localStorage.setItem(LSKEYS.user.handle, userHandle);
	localStorage.setItem(LSKEYS.user.did, userDid);
	localStorage.setItem(LSKEYS.user.didDoc, JSON.stringify( userDidDocument ));
	localStorage.setItem(LSKEYS.user.pdsUrl, userPDSURL);
	localStorage.setItem(LSKEYS.user.authServerUrl, userAuthServerURL);
	localStorage.setItem(LSKEYS.user.authServerDiscovery, JSON.stringify( userAuthServerDiscovery ));
	localStorage.setItem(LSKEYS.pkce.state, state);
	localStorage.setItem(LSKEYS.pkce.code_verifier, codeVerifier);
	localStorage.setItem(LSKEYS.pkce.code_challenge, codeChallenge);
	localStorage.setItem(LSKEYS.request.dpop_nonce, dpopNonce);
	localStorage.setItem(LSKEYS.user.authServerRequestURI, userAuthServerRequestURI);
	
	let savedInformation = {
		userHandle: userHandle,
		userDid: userDid,
		userDidDocument: userDidDocument,
		userPDSURL: userPDSURL,
		userPDSMetadata: userPDSMetadata,
		userAuthServerURL: userAuthServerURL,
		userAuthServerDiscovery: userAuthServerDiscovery,
		userAuthorizationEndPoint: userAuthorizationEndPoint,
		userTokenEndPoint: userTokenEndPoint,
		userPAREndPoint: userPAREndPoint,
		dpopNonce: dpopNonce,
		userAuthServerRequestURI: userAuthServerRequestURI,
		state: state,
		codeVerifier: codeVerifier,
		codeChallenge: codeChallenge
	};
	localStorage.setItem( "BSKYDATA", JSON.stringify( savedInformation ) );

    // Redirect the user to the Bluesky Auth Page
    // ------------------------------------------
    window.location = url;
}

function test10RestoreDataFromLocalStorage() {
	const PREFIX = `[${MODULE_NAME}:test10] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + " [test10RestoreDataFromLocalStorage]" );

	// Restore data from localStorage.
	let dataInLocalStorage = localStorage.getItem( "BSKYDATA" );

	let saved = JSON.parse( dataInLocalStorage ) 
	if (DEBUG) console.debug(PREFIX, "Gathered data from localStorage, from test:", saved);
	userHandle = saved.userHandle;
	userDid = saved.userDid;
	userDidDocument = saved.userDidDocument;
	userPDSURL = saved.userPDSURL;
	userAuthServerURL = saved.userAuthServerURL;
	userAuthServerDiscovery = saved.userAuthServerDiscovery;
	userAuthorizationEndPoint = saved.userAuthorizationEndPoint;
	userTokenEndPoint = saved.userTokenEndPoint;
	userPAREndPoint = saved.userPAREndPoint;
	dpopNonce = saved.dpopNonce;
	userAuthServerRequestURI = saved.userAuthServerRequestURI;
	state = saved.state;
	codeVerifier = saved.codeVerifier;
	codeChallenge = saved.codeChallenge;

	if (GROUP_DEBUG) console.groupEnd();
}

async function test11RetrieveTheUserAccessToken(code) {
	const PREFIX = `[${MODULE_NAME}:test11] `;
	const PREFIX_FETCH = `${PREFIX}[Fetch] `;
	const PREFIX_FETCH_HEADERS = `${PREFIX_FETCH}[Headers] `;
	const PREFIX_FETCH_BODY = `${PREFIX_FETCH}[Body] `;
	const PREFIX_FETCH_ERROR = `${PREFIX_FETCH}[ERROR] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + " [test11RetrieveTheUserAccessToken]" );

	/*
	 * Let's make a POST request to 
	 */

	// Preparamos la llamada.
    let url = userTokenEndPoint;
 	if (DEBUG) console.debug( PREFIX, "Access Token URL:", url );

    // Create the crypto key.
    // Must save it, 'cause we'll reuse it later.
    // ------------------------------------------
    let cryptoKeyOptions = {
        name: "ECDSA",
        namedCurve: "P-256"
    };
    let cryptoKeyPurposes = ["sign", "verify"];
    let cryptoKey = await crypto.subtle.generateKey(cryptoKeyOptions, false, cryptoKeyPurposes).then(function(eckey) {
        return eckey;
    });
    let jwk = await crypto.subtle.exportKey("jwk", cryptoKey.publicKey).then(function(keydata) {
        return keydata;
    });
    delete jwk.ext;
    delete jwk.key_ops;


    // Create the DPoP-Proof 'body' for this request.
    // ------------------------------------------
    let uuid = self.crypto.randomUUID();
    let dpop_proof_header = {
        typ: "dpop+jwt",
        alg: "ES256",
        jwk: jwk
    };
    let dpop_proof_payload = {
        iss: APP_CLIENT_ID, // Added
        jti: uuid,
        htm: "POST",
        htu: url,
        iat: Math.floor(Date.now() / 1000),
        nonce: dpopNonce
    };
	if (DEBUG) console.debug( PREFIX, "dpop_proof_header:", prettyJson( dpop_proof_header ) );
	if (DEBUG) console.debug( PREFIX, "dpop_proof_payload:", prettyJson( dpop_proof_payload ) );


    // Crypt and sign the DPoP-Proof header+body
    // ------------------------------------------
    // + Prepare
    const h = JSON.stringify(dpop_proof_header);
    const p = JSON.stringify(dpop_proof_payload);
    const partialToken = [
        toBase64Url(utf8ToUint8Array(h)),
        toBase64Url(utf8ToUint8Array(p)),
    ].join(".");
    const messageAsUint8Array = utf8ToUint8Array(partialToken);

    // + Sign
    let signOptions = {
        name: "ECDSA",
        hash: { name: "SHA-256" },
    };
    let signatureAsBase64 = await crypto.subtle.sign(signOptions, cryptoKey.privateKey, messageAsUint8Array)
    .then(function(signature) {
		const signatureAsBase64 = toBase64Url(new Uint8Array(signature));
		return signatureAsBase64;
    });


    // The DPoP-Proof
    // ------------------------------------------
    let dpopProof = `${partialToken}.${signatureAsBase64}`;
	if (DEBUG) console.debug( PREFIX, "dpopProof:", dpopProof );
	if (DEBUG) console.debug( PREFIX, "dpopProof:", jwtToPrettyJSON( dpopProof ) );

	// Preparamos los datos a enviar
	let body = new URLSearchParams({
		// Fixed values
		'grant_type': 'authorization_code',
		// Variable values
		'code': code,
		'code_verifier': codeVerifier,
		// Neocities values
		'client_id': APP_CLIENT_ID,
		'redirect_uri': APP_CALLBACK_URL
	});
	// if (DEBUG) console.debug(PREFIX, "Generated [body]:", body.toString());
	if (DEBUG) console.debug(PREFIX, "Generated [body]:", prettyJson( Object.fromEntries( body ) ));


    // TuneUp the call
    // ------------------------------------------
    let headers = {
        'DPOP': dpopProof,
        'Content-Type': 'application/x-www-form-urlencoded',
        'DPoP-Nonce': dpopNonce
    }
    let fetchOptions = {
        method: 'POST',
        headers: headers,
        body: body.toString()
    }
	if (DEBUG) console.debug( PREFIX, "headers:", prettyJson( headers ) );
	if (DEBUG) console.debug( PREFIX, "fetchOptions:", prettyJson( fetchOptions ) );

    // Finally, perform the call
    // ------------------------------------------
 	if (DEBUG) console.debug( PREFIX, "Invoking URL:", url );
 	let responseFromServer = await fetch( url, fetchOptions ).then( response => {
        // Process the HTTP Response
		if (GROUP_DEBUG) console.groupCollapsed( PREFIX_FETCH );
		let parsedResponse = printOutFetchResponse( PREFIX_FETCH_HEADERS, response );
		analizeParsedResponse( parsedResponse );
		if ( !response.ok ) {
			return response.json().then( data => {
				throw new Error( `Error ${response.status}`, { cause: { status: response.status, statusText: response.statusText, payload: data } } )
			});
		}
		if ( !response.ok ) {
			return response.json().then( data => {
				throw new Error( `Error ${response.status}`, { cause: { status: response.status, statusText: response.statusText, payload: data } } )
			});
		}
        return response.json();
    }).then( data => {
        // Process the HTTP Response Body
		if (DEBUG) console.debug( PREFIX_FETCH_BODY, "Data:", prettyJson( data ) );
        // Here, we gather the "access_token" item in the received json.
        userAccessToken = data.access_token;
        // Return something
		return data;
    }).catch( error => {
		if (DEBUG) console.debug( PREFIX_FETCH_ERROR, "ERROR:", error.message );
		if (DEBUG) console.debug( PREFIX_FETCH_ERROR, "ERROR Cause:", prettyJson( error.cause ) );
		throw( error );
    }).finally( () => {
		if (DEBUG) console.debug( PREFIX_FETCH, "-- FINALLY" );
		if (GROUP_DEBUG) console.groupEnd();
    });
	if (DEBUG) console.debug( PREFIX, "Received responseFromServer:", prettyJson( responseFromServer ) );

	if (DEBUG) console.debug( PREFIX_FETCH, "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
	return { cryptoKey: cryptoKey, userAuthentication: responseFromServer, userAccessToken: userAccessToken };
}


/**********************************************************
 * PUBLIC Functions
 **********************************************************/
async function testAuthenticateWithBluesky( handle ) {
	const PREFIX = `[${MODULE_NAME}:testAuthenticateWithBluesky] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

	let variable = null;

	if (DEBUG) console.debug( PREFIX, "Current handle:", handle );
	userHandle = handle;

	variable = await test01RetrieveUserDID();
	// if (DEBUG) console.debug( PREFIX, "Received variable:", prettyJson( variable ) );
	if (DEBUG) console.debug( PREFIX, "Current userDid:", userDid );

	variable = await test02RetrieveUserDIDDocument();
	// if (DEBUG) console.debug( PREFIX, "Received variable:", prettyJson( variable ) );
	if (DEBUG) console.debug( PREFIX, "Current userDidDocument:", prettyJson( userDidDocument ) );
	if (DEBUG) console.debug( PREFIX, "Current userPDSURL:", userPDSURL );

	variable = await test03RetrievePDSServerMetadata();
	// if (DEBUG) console.debug( PREFIX, "Received variable:", prettyJson( variable ) );
	if (DEBUG) console.debug( PREFIX, "Current userPDSMetadata:", prettyJson( userPDSMetadata ) );
	if (DEBUG) console.debug( PREFIX, "Current userAuthServerURL:", userAuthServerURL );

	variable = await test04RetrieveAuthServerDiscoveryMetadata();
	// if (DEBUG) console.debug( PREFIX, "Received variable:", prettyJson( variable ) );
	if (DEBUG) console.debug( PREFIX, "Current userAuthServerDiscovery:", prettyJson( userAuthServerDiscovery ) );
	if (DEBUG) console.debug( PREFIX, "Current userAuthorizationEndPoint:", userAuthorizationEndPoint );
	if (DEBUG) console.debug( PREFIX, "Current userTokenEndPoint:", userTokenEndPoint );
	if (DEBUG) console.debug( PREFIX, "Current userPAREndPoint:", userPAREndPoint );

	variable = await test05PARRequest();
	// if (DEBUG) console.debug( PREFIX, "Received variable:", prettyJson( variable ) );
	if (DEBUG) console.debug( PREFIX, "Current userAuthServerRequestURI:", userAuthServerRequestURI );

	if (DEBUG) console.debug( PREFIX, "Redirecting user to the Bluesky Authorization Server page..." );
	test06RedirectUserToBlueskyAuthPage();

	if (GROUP_DEBUG) console.groupEnd();
}


async function testProcessCallback(parsedSearch) {
	const PREFIX = `[${MODULE_NAME}:testProcessCallback] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Retrieve the "code"...
	let iss = parsedSearch.get("iss");
	let state = parsedSearch.get("state");
	let code = parsedSearch.get("code");
	let error = parsedSearch.get("error");
	let errorDescription = parsedSearch.get("error_description");

	if (DEBUG) console.debug(PREFIX, "Updating HTML Elements:");
	if (DEBUG) console.debug(PREFIX, "+ iss:", iss);
	if (DEBUG) console.debug(PREFIX, "+ state:", state);
	if (DEBUG) console.debug(PREFIX, "+ code:", code);
	if (DEBUG) console.debug(PREFIX, "+ error:", error);
	if (DEBUG) console.debug(PREFIX, "+ errorDescription:", errorDescription);

	// Update HTML page element values.
	// CSS Classes.
	$("#rootPanel").removeClass("hidden");
	$("#rootPanel").addClass("visible");

	$("#iss").val(iss);
	$("#state").val(state);
	$("#code").val(code);
	$("#error").val(error);
	$("#errorDescription").val(errorDescription);

	// Restore data from localStorage.
	test10RestoreDataFromLocalStorage();

	// Retrieve the "code"...
	if (DEBUG) console.debug( PREFIX, "Current code:", code );

	// Retrieve the access_token
	let authServerResponse = null;
	try {
		authServerResponse					= await test11RetrieveTheUserAccessToken(code);
		if (DEBUG) console.debug( PREFIX, "Current authServerResponse:", prettyJson( authServerResponse ) );
		let cryptoKey						= authServerResponse.cryptoKey;
		let userAuthentication				= authServerResponse.userAuthentication;
		let userAccessToken					= authServerResponse.userAccessToken;
		if (DEBUG) console.debug( PREFIX, "Current cryptoKey:", cryptoKey );
		if (DEBUG) console.debug( PREFIX, "Current cryptoKey:", prettyJson( cryptoKey ) );
		if (DEBUG) console.debug( PREFIX, "Current userAuthentication:", userAuthentication );
		if (DEBUG) console.debug( PREFIX, "Current userAuthentication:", prettyJson( userAuthentication ) );
		if (DEBUG) console.debug( PREFIX, "Current userAccessToken:", userAccessToken );
		if (DEBUG) console.debug( PREFIX, "Current userAccessToken:", jwtToPrettyJSON( userAccessToken ) );
		$("#access_token_jwt").removeAttr('data-highlighted');
		$("#access_token_json").removeAttr('data-highlighted');
		$("#access_token_jwt").text( userAccessToken );
		$("#access_token_json").text( jwtToPrettyJSON( userAccessToken ) );
		hljs.highlightAll();
	} catch (error) {
		if (DEBUG) console.warn( PREFIX, "ERROR:", error.message );
		if (DEBUG) console.warn( PREFIX, "ERROR Cause:", prettyJson( error.cause ) );
	}

	if (GROUP_DEBUG) console.groupEnd();
}

