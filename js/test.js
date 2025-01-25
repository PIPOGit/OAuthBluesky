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
const CONTENT_TYPE_JSON				= "application/json";
const CONTENT_TYPE_JSON_UTF8		= "application/json; charset=utf-8";
const CONTENT_TYPE_FORM_ENCODED		= "application/x-www-form-urlencoded";

// Fancy CSS style for the DevTools console.
const CONSOLE_STYLE					= 'background-color: darkblue; color: yellow; padding: 1px 4px; border: 1px solid hotpink; font-size: 1em;'

// Crypto constants
const SIGNING_ALGORITM				= "ECDSA";
const KEY_ALGORITM					= "ES256";
const CURVE_ALGORITM				= "P-256";
const HASHING_ALGORITM				= "SHA-256";

// Bluesky constants
const URL_LOCALHOST					= "http://localhost/neocities/bsky/index.html";
const APP_CLIENT_ID					= "https://madrilenyer.neocities.org/bsky/oauth/client-metadata.json";
const APP_CALLBACK_URL				= "https://madrilenyer.neocities.org/bsky/oauth/callback/";
const URL_RESOLVE_HANDLE			= "https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=";
const URL_PLC_DIRECTORY				= "https://plc.directory/";
const URL_PDS_METADATA				= "/.well-known/oauth-protected-resource";
const URL_AUTH_DISCOVERY			= "/.well-known/oauth-authorization-server";
const MAX_NOTIS_TO_RETRIEVE			= 50;

// Constant functions
const getTypeOf						= option => typeof option;
const prettyJson					= obj => JSON.stringify( obj, null, "  " );
const areEquals						= (str1,str2) => ( str1.trim().toUpperCase().localeCompare( str2.trim().toUpperCase() ) == 0 );
const isEmptyOrNull					= str => ( isUndefined(str) || isNull(str) || isEmpty(str) );
const isEmpty						= str => (typeof str === "string" && str.length === 0);
const isNull						= str => (str === null);
const isUndefined					= str => (str === undefined);
const showHide						= id => { $( "#" + id ).toggleClass( "hidden" ); }
const show							= id => { $( "#" + id ).removeClass( "hidden" ).addClass( "visible" ); }
const hide							= id => { $( "#" + id ).removeClass( "visible" ).addClass( "hidden" ); }
const prettyString					= str => JSON.stringify(JSON.parse(atob(toBase64UrlString(str))), null, "    ");


/**********************************************************
 * Module Classes
 **********************************************************/

class APICallError extends Error {
	message					= null;
	step					= null;
	status					= null;
	statusText				= null;
	contentType				= null;
	ok						= false;
	bodyUsed				= null;
	redirected				= null;
	body					= null;
	type					= null;
	url						= null;
	isJson					= false;
	headers					= {};
	json					= {};
	text					= {};
	constructor( step, response, contentType ) {
		super( "Error: " + response.status );
		this.message		= "Error: " + response.status;
		this.step			= step;
		this.contentType	= contentType;
		this.status			= response.status;
		this.statusText		= response.statusText;
		this.ok				= response.ok;
		this.bodyUsed		= response.bodyUsed;
		this.redirected		= response.redirected;
		this.body			= response.body;
		this.type			= response.type;
		this.url			= response.url;
		this.isJson			= false;
		this.json			= null;
		this.text			= null;
		this.headers		= response.headers;
	};
	toString() {
		return ( this.isJson ) ? `${this.message}: ${this.json.message}` : `${this.message}: ${this.text}`;
	}
}


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
let userRevocationEndPoint			= null;
let userAuthServerRequestURI		= null;
let dpopNonce						= null;
let wwwAuthenticate					= null;
let dpopNonceUsed					= null;
let dpopNonceReceived				= null;

// Auth variables
let state							= null;
let codeVerifier					= null;
let codeChallenge					= null;

// Response from the access token request
let cryptoKey						= null;
let jwk								= null;
let userAuthentication				= null;
let userAccessToken					= null;
let accessTokenHash					= null;


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
	if (DEBUG) console.groupCollapsed( PREFIX );

	// ================================================================
	// Module info.
	if (DEBUG) console.debug( PREFIX, "MODULE_NAME:", MODULE_NAME, "import.meta.url:", import.meta.url );

	if (DEBUG) console.debug( PREFIX, "Configuration:", CONFIGURATION );
	if (DEBUG) console.debug( PREFIX, "API:", API );
	if (DEBUG) console.debug( PREFIX, "CONST_URL:", CONST_URL );


	// ================================================================
	// Actualizamos el objeto raiz.
	window.BSKY.authenticateWithBluesky = fnAuthenticateWithBluesky;
	window.BSKY.processCallback = fnProcessCallback;
	window.BSKY.retrieveUserNotifications = fnRetrieveUserNotifications;
	window.BSKY.switchViewAccessToken = fnSwitchViewAccessToken;
	window.BSKY.logout = fnLogout;
	if (DEBUG) console.debug( PREFIX, `Updated object: [window.BSKY].`, window.BSKY );

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

	console.info( `Loaded module ${MODULE_NAME}, version ${MODULE_VERSION}.` );
	if (DEBUG) console.groupEnd();
}


/**********************************************************
 * HELPER Functions
 **********************************************************/
function toBase64Url(str) {
    const base64string = btoa(String.fromCharCode.apply(0, str));
    return base64string
		.replace(/=/g, "")
		.replace(/\+/g, "-")
		.replace(/\//g, "_");
}

const toBase64UrlString				= (str) => str.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "");
const utf8ToUint8Array				= (str) => Base64UrlToUint8Array(btoa(unescape(encodeURIComponent(str))));

function Base64UrlToUint8Array(str) {
    str = str.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "");
    return new Uint8Array(
        Array.prototype.map.call(atob(str), (c) => c.charCodeAt(0))
    );
}

function base64urlencode(str) {
	const uint8ByteArray = new Uint8Array(str);
	const data = String.fromCharCode.apply(null, uint8ByteArray);
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
    let hashedCodeVerifier = await window.crypto.subtle.digest(HASHING_ALGORITM, data);
	return base64urlencode(hashedCodeVerifier);
}

async function createHash(accessToken, noPadding = false) {
    var encodedAT = new TextEncoder().encode(accessToken);
    var atHash = await crypto.subtle.digest(HASHING_ALGORITM, encodedAT)
    .then(function(hash) {        
        var base = toBase64Url(new Uint8Array(hash));
        if (noPadding) {
            base = base.replace(/\=+$/, '');
        }    
        return base;
    })
    .catch(function(err) {
        console.log(err);
        throw err;
    });
    return atHash;
}


// JWT Helper functions
function jwtToPrettyJSON( jwt ) {
    let partsAsString = getJWTAsString(jwt);
    return `${partsAsString.header}.${partsAsString.payload}.${partsAsString.signature}`;
}

function getJWTAsString(accessToken) {
    var parts = getParts(accessToken);
    var headerString = prettyString(parts.header);
    var payloadString = prettyString(parts.payload);
    var signatureBase64Url = toBase64UrlString(parts.signature);
    return {header: headerString, payload: payloadString, signature: signatureBase64Url}
}

export function getParts(accessToken) {    
    var parts = accessToken.split(".");
    return { header: parts[0], payload: parts[1], signature: parts[2] };
}


// HTML Helper functions
function printOutFetchResponse(data) {
	const PREFIX = `[${MODULE_NAME}:printOutFetchResponse] `;
	if (DEBUG) console.groupCollapsed(PREFIX + "[RESPONSE=="+(data.ok?"OK":"ERROR")+" ("+data.status+")]");
	if (DEBUG) console.debug(PREFIX, "Received response:", prettyJson(data));

	let response = {};
	response.body = data.body;
	if (DEBUG) console.debug(PREFIX, "+ Response[body]:", data.body);
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

	// Analize the received data

	// "dpop-nonce" header
	if ( response.headers["dpop-nonce"] ) {
		// Here, we gather the "dpop-nonce" header.
		dpopNonceUsed				= dpopNonce;
		dpopNonce					= response.headers["dpop-nonce"];
		dpopNonceReceived			= dpopNonce;
		$("#dpopNonce").val(dpopNonce);
		localStorage.setItem(LSKEYS.request.dpop_nonce, dpopNonce);
		if (DEBUG) console.info( PREFIX + "%cReceived dpop-nonce header: [" + dpopNonce + "]", CONSOLE_STYLE );
	}

	// "dpop-nonce" header
	if ( response.headers["www-authenticate"] ) {
		// Here, we gather the "www-authenticate" header.
		wwwAuthenticate = response.headers["www-authenticate"];
		localStorage.setItem(LSKEYS.request.www_authenticate, wwwAuthenticate);
		if (DEBUG) console.info( PREFIX + "%cReceived www-authenticate header: [" + wwwAuthenticate + "]", CONSOLE_STYLE );
	}

	if (DEBUG) console.debug( PREFIX, "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
	
	return response;
}

function updateHTMLError(error) {
	const PREFIX = `[${MODULE_NAME}:updateHTMLError] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

	if (DEBUG) console.debug(PREFIX, "Received error:", error.toString());
	if (DEBUG) console.debug(PREFIX, "+ message.....:", error.message);
	if (DEBUG) console.debug(PREFIX, "+ step........:", error.step);
	if (DEBUG) console.debug(PREFIX, "+ status......:", error.status);
	if (DEBUG) console.debug(PREFIX, "+ statusText..:", error.statusText);
	if (DEBUG) console.debug(PREFIX, "+ contentType.:", error.contentType);
	if (DEBUG) console.debug(PREFIX, "+ ok..........:", error.ok);
	if (DEBUG) console.debug(PREFIX, "+ bodyUsed....:", error.bodyUsed);
	if (DEBUG) console.debug(PREFIX, "+ redirected..:", error.redirected);
	if (DEBUG) console.debug(PREFIX, "+ body........:", error.body);
	if (DEBUG) console.debug(PREFIX, "+ type........:", error.type);
	if (DEBUG) console.debug(PREFIX, "+ url.........:", error.url);
	if (DEBUG) console.debug(PREFIX, "+ isJson......:", error.isJson);
	if (DEBUG) console.debug(PREFIX, "+ json........:", error.json);
	if (DEBUG) console.debug(PREFIX, "+ text........:", error.text);
	if (DEBUG) console.debug(PREFIX, "+ stack.......:", error.stack);

	let idErrorPanel = "errorPanel";
	$("#" + idErrorPanel).removeClass("hidden");
	$("#" + idErrorPanel).addClass("visible");

	$("#error").html(error.message);
	if ( error.isJson ) {
		let msg = ( error.json.error ) ? error.json.error + ": " : "";
		msg += ( error.json.message ) ? error.json.message : "";
		msg += ( error.json.error_description ) ? error.json.error_description : "";
		$("#errorDescription").val(msg);
	} else {
		let msg = `[${error.step}] Error invocando a: [${error.url}]`;
		$("#errorDescription").val(msg);
	}

	if (DEBUG) console.groupEnd(PREFIX);
}

function clearHTMLError() {
	const PREFIX = `[${MODULE_NAME}:clearHTMLError] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Clear and hide error fields and panel
	$("#error").html("");
	$("#errorDescription").val("");
	hide("errorPanel");

	if (DEBUG) console.groupEnd(PREFIX);
}

function updateHTMLFields(parsedSearch) {
	const PREFIX = `[${MODULE_NAME}:updateHTMLFields] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Hide panels.
	hide("accessTokenPanel");
	hide("btnNotifications");

	let iss = parsedSearch.get("iss");
	let state = parsedSearch.get("state");
	let code = parsedSearch.get("code");

	if (DEBUG) console.debug(PREFIX, "Updating HTML Elements:");
	if (DEBUG) console.debug(PREFIX, "+ iss:", iss);
	if (DEBUG) console.debug(PREFIX, "+ state:", state);
	if (DEBUG) console.debug(PREFIX, "+ code:", code);

	// Update HTML page element values.
	// CSS Classes.
	$("#iss").val(iss);
	$("#state").val(state);
	$("#code").val(code);
	$("#dpopNonce").val(dpopNonce);

	if (DEBUG) console.groupEnd(PREFIX);
}

function parseNotifications( notifications ) {
	const PREFIX = `[${MODULE_NAME}:parseNotifications] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

	if (DEBUG) console.debug( PREFIX, "Current notifications:", notifications );
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + "[Response data]" );
	if (DEBUG) console.debug( PREFIX, "Current notifications:", prettyJson( notifications ) );
	if (GROUP_DEBUG) console.groupEnd();

	// Parse the notifications
	let notification					= null;
	let unreadNotifications				= [];

	// Detect ONLY the "unread" notifications...
	for ( let key in notifications ) {
		notification					= notifications[key];
		if ( !notification.isRead ) {
			unreadNotifications.push( notification );
		}
	}

	// Show only info about the "unread"...
	if ( unreadNotifications.length == 0) {
		if (DEBUG) console.debug( PREFIX, "Currently, no UNREAD notifications." );
	} else {
		if (DEBUG) console.debug( PREFIX + "%cCurrently, " + unreadNotifications.length + " UNREAD notifications:", CONSOLE_STYLE );
		if (DEBUG) console.debug( PREFIX, "+ unread notifications:", unreadNotifications );
		for ( let key in unreadNotifications ) {
			htmlRenderNotification( unreadNotifications[key] );
		}
	}

	// Clear and hide error fields and panel
	clearHTMLError();

	// Update the HTML fields
	$("#notifications_json").removeAttr('data-highlighted');
	$("#access_token_jwt").removeAttr('data-highlighted');
	$("#access_token_json").removeAttr('data-highlighted');
	$("#notifications_json").removeAttr('data-highlighted');
	$("#notifications_json").removeAttr('data-highlighted');
	$("#notificationsNumber").text( "Pendientes de leer: " + unreadNotifications.length );
	$("#notifications_json").text( prettyJson( notifications ) );

	// Update the highlight
	hljs.highlightAll();

	// Hide "notificationsPanel" panel
	show("notificationsPanel");
	show("btnAccessToken");

	if (DEBUG) console.groupEnd(PREFIX);
}

function htmlRenderNotification( notification ) {
	const PREFIX = `[${MODULE_NAME}:htmlRenderNotification] `;

	// Vamos preparando el HTML para la notificación.
	let jqRoot						= $( "#notifications" );

	let cid							= notification.cid;
	let isRead						= notification.isRead;
	let notiReason					= notification.reason;
	let when						= new Date( notification.indexedAt );

	let author						= notification.author;
	let authorHandle				= author.handle;
	let authorName					= author.displayName || author.handle;
	let authorDid					= author.did;
	let authorDescription			= author.description;
	let authorAvatar				= author.avatar;
	let authorURL					= "https://bsky.app/profile/" + authorHandle;

	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + "["+authorName+"]" + " ["+notiReason+"]" + " ["+when.toLocaleString()+"]" );

	// Actualizamos el HTML con el autor.
	let html						= `<div id="notification-${cid}" name="notification${cid}" class="notification">`;
	html							+= `<div class="header">`;
	html							+= `  <a href="${authorURL}"><img src="${authorAvatar}" height="24"/></a> `;
	html							+= `  <a href="${authorURL}"><strong>${authorName}</strong></a>`;
	html							+= `</div>`;
	html							+= `<ul style="margin: 0px 0px 8px 0px">`;
	html							+= `  <li class="notificacion-data">Handle: <strong>${authorHandle}</strong></li>`;
	html							+= `  <li class="notificacion-data">Did: <strong>${authorDid}</strong></li>`;
	html							+= `  <li class="notificacion-data">Description: <strong>${authorDescription}</strong></li>`;

	if (DEBUG) console.debug(PREFIX, "Updating Notification:");
	if (DEBUG) console.debug(PREFIX, "+ notification:", notification);
	if (DEBUG) console.debug(PREFIX, "+ isRead:", isRead);
	if (DEBUG) console.debug(PREFIX, "+ when:", when.toLocaleString() );
	if (DEBUG) console.debug(PREFIX, "+ Author:", authorName);
	if (DEBUG) console.debug(PREFIX, "  > handle:", authorHandle);
	if (DEBUG) console.debug(PREFIX, "  > did:", authorDid);
	if (DEBUG) console.debug(PREFIX, "  > description:", authorDescription);
	if (DEBUG) console.debug(PREFIX, "  > avatar:", authorAvatar);
	if (DEBUG) console.debug(PREFIX, "  > URL:", authorURL);

	/*
	 * Possible reasons:
		"reason": "follow",
		"reason": "like",
		"reason": "reply",
		"reason": "repost",
	*/
	if (DEBUG) console.debug(PREFIX, "+ Reason:", notiReason);

	if ( areEquals( notiReason, "follow" ) ) {
		// It's a "follow" notification.
		html						+= `  <li class="notificacion-data"><strong>${notiReason} you</strong></li>`;
	} else {
		// It's about an action on a post.
		let notiURI					= "";
		if ( areEquals( notiReason, "reply" ) ) {
			notiURI					= notification.record.reply.parent.uri;
		} else {
			notiURI					= notification.record.subject.uri;
		}
		let notiURISplitted			= notiURI.substring(5).split("/")
		let notiDID					= notiURISplitted[0];
		let notiBluitID				= notiURISplitted[2];
		let finalURL				= "https://bsky.app/profile/" + notiDID + "/post/" + notiBluitID;
		if (DEBUG) console.debug(PREFIX, "+ finalURL:", finalURL);
		html						+= `  <li class="notificacion-data">${notiReason} <a href="${finalURL}">this post</a></li>`;
	}
	html							+= `</ul>`;

	// Pintamos el HTML.
	html							+= '</div>';
	jqRoot.append( html );

	if (DEBUG) console.groupEnd(PREFIX);
}

// APICall response & error Helper functions
function processAPICallResponse(step, response) {
	const PREFIX = `[${MODULE_NAME}:processAPICallResponse] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Process the HTTP Response
	if ( response.ok ) {
		const parsedResponse = printOutFetchResponse( response );
		if (DEBUG) console.debug( PREFIX, "parsedResponse:", parsedResponse );
		const contentType = parsedResponse.headers["content-type"];
		if (DEBUG) console.debug( PREFIX, "contentType:", contentType );
		return ( response.status == 204 ) ? response.text() : response.json();
	} else {
		let errorObject = null;
		return response.text().then( data => {
			const parsedResponse = printOutFetchResponse( response );
			const contentType = parsedResponse.headers["content-type"];
			let errorObject = new APICallError( step, parsedResponse, contentType );
			errorObject.text = data;
			if ( areEquals( contentType, CONTENT_TYPE_JSON ) || areEquals( contentType, CONTENT_TYPE_JSON_UTF8 ) ) {
				errorObject.isJson = true;
				errorObject.json = JSON.parse( data );
			}
			throw errorObject;
		});
	}

	if (DEBUG) console.debug( PREFIX, "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
}

function processAPICallErrorResponse( error ) {
	const PREFIX = `[${MODULE_NAME}:processAPICallErrorResponse] `;
	if (GROUP_DEBUG) console.groupEnd();
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

	if (DEBUG) console.debug( PREFIX, "ERROR:", error.message );
	updateHTMLError(error);

	if (DEBUG) console.debug( PREFIX, "-- END" );
	if (GROUP_DEBUG) console.groupEnd();

	// Finally, throw the error
	throw( error );
}


/**********************************************************
 * PRIVATE Functions
 **********************************************************/
async function step01RetrieveUserDID() {
	const PREFIX = `[${MODULE_NAME}:test01] `;
	const PREFIX_FETCH = `${PREFIX}[Fetch] `;
	const PREFIX_FETCH_HEADERS = `${PREFIX_FETCH}[Headers] `;
	const PREFIX_FETCH_BODY = `${PREFIX_FETCH}[Body] `;
	const PREFIX_FETCH_ERROR = `${PREFIX_FETCH}[ERROR] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + " [step01RetrieveUserDID]" );

	if (DEBUG) console.debug( PREFIX, "Using handle:", userHandle );

    let url = URL_RESOLVE_HANDLE + userHandle;
 	if (DEBUG) console.debug( PREFIX, "Invoking URL:", url );
 	let responseFromServer = await fetch( url ).then( response => {
        // Process the HTTP Response
		return processAPICallResponse( "step01RetrieveUserDID", response );
    }).then( data => {
        // Process the HTTP Response Body
		if (DEBUG) console.debug( PREFIX_FETCH_BODY, "Data:", prettyJson( data ) );
        // Here, we gather the "did" item in the received json.
		userDid = data.did;
        // Return something
		return data.did;
    }).catch( error => {
		processAPICallErrorResponse( error );
    }).finally( () => {
		if (DEBUG) console.debug( PREFIX_FETCH, "-- FINALLY" );
		if (GROUP_DEBUG) console.groupEnd();
    });
	if (DEBUG) console.debug( PREFIX, "Received responseFromServer:", prettyJson( responseFromServer ) );

	if (DEBUG) console.debug( PREFIX, "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
	return userDid;
}

async function stop02RetrieveUserDIDDocument() {
	const PREFIX = `[${MODULE_NAME}:test02] `;
	const PREFIX_FETCH = `${PREFIX}[Fetch] `;
	const PREFIX_FETCH_HEADERS = `${PREFIX_FETCH}[Headers] `;
	const PREFIX_FETCH_BODY = `${PREFIX_FETCH}[Body] `;
	const PREFIX_FETCH_ERROR = `${PREFIX_FETCH}[ERROR] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + " [stop02RetrieveUserDIDDocument]" );

	if (DEBUG) console.debug( PREFIX, "Using did:", userDid );

    let url = URL_PLC_DIRECTORY + userDid;
 	if (DEBUG) console.debug( PREFIX, "Invoking URL:", url );
    let responseFromServer = await fetch( url ).then( response => {
        // Process the HTTP Response
		return processAPICallResponse( "stop02RetrieveUserDIDDocument", response );
    }).then( data => {
        // Process the HTTP Response Body
		if (DEBUG) console.debug( PREFIX_FETCH_BODY, "Data:", prettyJson( data ) );
        // Here, we gather the "did" item in the received json.
        userDidDocument = data;
        userPDSURL = userDidDocument.service[0].serviceEndpoint;
        // Return something
		return data;
    }).catch( error => {
		processAPICallErrorResponse( error );
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

async function step03RetrievePDSServerMetadata() {
	const PREFIX = `[${MODULE_NAME}:test03] `;
	const PREFIX_FETCH = `${PREFIX}[Fetch] `;
	const PREFIX_FETCH_HEADERS = `${PREFIX_FETCH}[Headers] `;
	const PREFIX_FETCH_BODY = `${PREFIX_FETCH}[Body] `;
	const PREFIX_FETCH_ERROR = `${PREFIX_FETCH}[ERROR] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + " [step03RetrievePDSServerMetadata]" );

	if (DEBUG) console.debug( PREFIX, "Using userPDSURL:", userPDSURL );

    let url = userPDSURL + URL_PDS_METADATA;
 	if (DEBUG) console.debug( PREFIX, "Invoking URL:", url );
    let responseFromServer = await fetch( url ).then( response => {
        // Process the HTTP Response
		return processAPICallResponse( "step03RetrievePDSServerMetadata", response );
    }).then( data => {
        // Process the HTTP Response Body
		if (DEBUG) console.debug( PREFIX_FETCH_BODY, "Data:", prettyJson( data ) );
        // Here, we gather the "did" item in the received json.
        userPDSMetadata = data;
        userAuthServerURL = userPDSMetadata.authorization_servers[0];
        // Return something
		return data;
    }).catch( error => {
		processAPICallErrorResponse( error );
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

async function step04RetrieveAuthServerDiscoveryMetadata() {
	const PREFIX = `[${MODULE_NAME}:test04] `;
	const PREFIX_FETCH = `${PREFIX}[Fetch] `;
	const PREFIX_FETCH_HEADERS = `${PREFIX_FETCH}[Headers] `;
	const PREFIX_FETCH_BODY = `${PREFIX_FETCH}[Body] `;
	const PREFIX_FETCH_ERROR = `${PREFIX_FETCH}[ERROR] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + " [step04RetrieveAuthServerDiscoveryMetadata]" );

	if (DEBUG) console.debug( PREFIX, "Using userAuthServerURL:", userAuthServerURL );

    let url = userAuthServerURL + URL_AUTH_DISCOVERY;
 	if (DEBUG) console.debug( PREFIX, "Invoking URL:", url );
    let responseFromServer = await fetch( url ).then( response => {
        // Process the HTTP Response
		return processAPICallResponse( "step04RetrieveAuthServerDiscoveryMetadata", response );
    }).then( data => {
        // Process the HTTP Response Body
		if (DEBUG) console.debug( PREFIX_FETCH_BODY, "Data:", prettyJson( data ) );
        // Here, we gather the "did" item in the received json.
        userAuthServerDiscovery		= data;
        userAuthorizationEndPoint	= data.authorization_endpoint;
        userTokenEndPoint			= data.token_endpoint;
        userPAREndPoint				= data.pushed_authorization_request_endpoint;
        userRevocationEndPoint		= data.revocation_endpoint;
        // Return something
		return data;
    }).catch( error => {
		processAPICallErrorResponse( error );
    }).finally( () => {
		if (DEBUG) console.debug( PREFIX_FETCH, "-- FINALLY" );
		if (GROUP_DEBUG) console.groupEnd();
    });
	if (DEBUG) console.debug( PREFIX, "Received responseFromServer:", prettyJson( responseFromServer ) );
	if (DEBUG) console.debug( PREFIX, "Received userAuthServerDiscovery:", userAuthServerDiscovery );
	if (DEBUG) console.debug( PREFIX, "Received userAuthorizationEndPoint:", userAuthorizationEndPoint );
	if (DEBUG) console.debug( PREFIX, "Received userTokenEndPoint:", userTokenEndPoint );
	if (DEBUG) console.debug( PREFIX, "Received userPAREndPoint:", userPAREndPoint );
	if (DEBUG) console.debug( PREFIX, "Received userRevocationEndPoint:", userRevocationEndPoint );

	if (DEBUG) console.debug( PREFIX_FETCH, "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
	return {
		userAuthServerDiscovery: userAuthServerDiscovery
		, userAuthorizationEndPoint: userAuthorizationEndPoint
		, userTokenEndPoint: userTokenEndPoint
		, userPAREndPoint: userPAREndPoint
		, userRevocationEndPoint: userRevocationEndPoint
	};
}

async function step05PARRequest() {
	const PREFIX = `[${MODULE_NAME}:test05] `;
	const PREFIX_FETCH = `${PREFIX}[Fetch] `;
	const PREFIX_FETCH_HEADERS = `${PREFIX_FETCH}[Headers] `;
	const PREFIX_FETCH_BODY = `${PREFIX_FETCH}[Body] `;
	const PREFIX_FETCH_ERROR = `${PREFIX_FETCH}[ERROR] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + " [step05PARRequest]" );


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
    body += "&prompt=login";
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
            'Content-Type': CONTENT_TYPE_FORM_ENCODED
        },
        body: body
    }
 	if (DEBUG) console.debug( PREFIX, "+ with this options:", prettyJson( fetchOptions ) );
 	let responseFromServer = await fetch( url, fetchOptions ).then( response => {
        // Process the HTTP Response
		return processAPICallResponse( "step05PARRequest", response );
    }).then( data => {
        // Process the HTTP Response Body
		if (DEBUG) console.debug( PREFIX_FETCH_BODY, "Data:", prettyJson( data ) );
        // Here, we gather the "request_uri" item in the received json.
        userAuthServerRequestURI = data.request_uri;
        // Return something
		return data;
    }).catch( error => {
		processAPICallErrorResponse( error );
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

function step06RedirectUserToBlueskyAuthPage() {
	const PREFIX = `[${MODULE_NAME}:test06] `;
	const PREFIX_FETCH = `${PREFIX}[Fetch] `;
	const PREFIX_FETCH_HEADERS = `${PREFIX_FETCH}[Headers] `;
	const PREFIX_FETCH_BODY = `${PREFIX_FETCH}[Body] `;
	const PREFIX_FETCH_ERROR = `${PREFIX_FETCH}[ERROR] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + " [step06RedirectUserToBlueskyAuthPage]" );

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
		userRevocationEndPoint: userRevocationEndPoint,
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

function restoreDataFromLocalStorage() {
	const PREFIX = `[${MODULE_NAME}:test10] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

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
	userRevocationEndPoint = saved.userRevocationEndPoint;
	dpopNonce = saved.dpopNonce;
	userAuthServerRequestURI = saved.userAuthServerRequestURI;
	state = saved.state;
	codeVerifier = saved.codeVerifier;
	codeChallenge = saved.codeChallenge;

	if (GROUP_DEBUG) console.groupEnd();
}

async function retrieveTheUserAccessToken(code) {
	const PREFIX = `[${MODULE_NAME}:retrieveTheUserAccessToken] `;
	const PREFIX_FETCH = `${PREFIX}[Fetch] `;
	const PREFIX_FETCH_HEADERS = `${PREFIX_FETCH}[Headers] `;
	const PREFIX_FETCH_BODY = `${PREFIX_FETCH}[Body] `;
	const PREFIX_FETCH_ERROR = `${PREFIX_FETCH}[ERROR] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

	/*
	 * Let's make a POST request to 
	 */

	// Preparamos la llamada.
    let url = userTokenEndPoint;
 	if (DEBUG) console.debug( PREFIX, "Access Token URL:", url );

    // Create the crypto key.
    // Must save it, 'cause we'll reuse it later.
    // ------------------------------------------
    let cryptoKeyOptions = { name: SIGNING_ALGORITM, namedCurve: CURVE_ALGORITM };
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
        alg: KEY_ALGORITM,
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
        name: SIGNING_ALGORITM,
        hash: { name: HASHING_ALGORITM },
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
        'Content-Type': CONTENT_TYPE_FORM_ENCODED,
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
		return processAPICallResponse( "retrieveTheUserAccessToken", response );
    }).then( data => {
        // Process the HTTP Response Body
		if (DEBUG) console.debug( PREFIX_FETCH_BODY, "Data:", prettyJson( data ) );
        // Here, we gather the "access_token" item in the received json.
        userAccessToken = data.access_token;
        // Return something
		return data;
    }).catch( error => {
		processAPICallErrorResponse( error );
    }).finally( () => {
		if (DEBUG) console.debug( PREFIX_FETCH, "-- FINALLY" );
		if (GROUP_DEBUG) console.groupEnd();
    });
	if (DEBUG) console.debug( PREFIX, "Received responseFromServer:", prettyJson( responseFromServer ) );

	if (DEBUG) console.debug( PREFIX_FETCH, "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
	return { cryptoKey: cryptoKey, jwk: jwk, userAuthentication: responseFromServer, userAccessToken: userAccessToken };
}

async function retrieveNotifications(code) {
	const PREFIX = `[${MODULE_NAME}:retrieveNotifications] `;
	const PREFIX_FETCH = `${PREFIX}[Fetch] `;
	const PREFIX_FETCH_HEADERS = `${PREFIX_FETCH}[Headers] `;
	const PREFIX_FETCH_BODY = `${PREFIX_FETCH}[Body] `;
	const PREFIX_FETCH_ERROR = `${PREFIX_FETCH}[ERROR] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + " [MAX " + MAX_NOTIS_TO_RETRIEVE + " notifications to retrieve]" );

	let endpoint = API.bluesky.XRPC.api.listNotifications;
	let root = userPDSURL + "/xrpc";
	// let root = API.bluesky.XRPC.public;
	let url = root + endpoint + "?limit=" + MAX_NOTIS_TO_RETRIEVE;		// Not much; it's a test!
	if (DEBUG) console.debug(PREFIX, "Fetching data from the (Authenticated) URL:", url);

	// Let's group the following messages
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + "[PREFETCH]" );

	// We already have the cryptoKey somewhere, from previous calls...
	// + cryptoKey
	// + userAuthentication
	// + userAccessToken

    // Create the DPoP-Proof 'body' for this request.
    // ------------------------------------------
    let uuid = self.crypto.randomUUID();
    let dpop_proof_header = {
        typ: "dpop+jwt",
        alg: KEY_ALGORITM,
        jwk: jwk
    };
    let dpop_proof_payload = {
        iss: APP_CLIENT_ID, // Added
        ath: accessTokenHash,
        jti: uuid,
        htm: "GET",
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
        name: SIGNING_ALGORITM,
        hash: { name: HASHING_ALGORITM },
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


    // TuneUp the call
    // ------------------------------------------
    let headers = {
		'Authorization': `DPoP ${userAccessToken}`,
		'DPoP': dpopProof,
		'Accept': CONTENT_TYPE_JSON,
        'DPoP-Nonce': dpopNonce
    }
    let fetchOptions = {
        method: 'GET',
        headers: headers
    }
	if (DEBUG) console.debug( PREFIX, "headers:", prettyJson( headers ) );
	if (DEBUG) console.debug( PREFIX, "fetchOptions:", prettyJson( fetchOptions ) );

	if (GROUP_DEBUG) console.groupEnd();

    // Finally, perform the call
    // ------------------------------------------
 	if (DEBUG) console.debug( PREFIX, "Invoking URL:", url );
 	let responseFromServer = await fetch( url, fetchOptions ).then( response => {
        // Process the HTTP Response
		return processAPICallResponse( "retrieveNotifications", response );
    }).then( data => {
        // Process the HTTP Response Body
		if (DEBUG) console.debug( PREFIX_FETCH_BODY, "Data:", prettyJson( data ) );
        // Here, we gather the "access_token" item in the received json.
        let notifications = data.notifications;
        // Return something
		return notifications;
    }).catch( error => {
		processAPICallErrorResponse( error );
    }).finally( () => {
		if (DEBUG) console.debug( PREFIX_FETCH, "-- FINALLY" );
		if (GROUP_DEBUG) console.groupEnd();
    });
	if (DEBUG) console.debug( PREFIX, "Received responseFromServer:", prettyJson( responseFromServer ) );

	if (DEBUG) console.debug( PREFIX_FETCH, "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
	return responseFromServer;
}


/**********************************************************
 * PUBLIC Functions
 **********************************************************/
async function fnAuthenticateWithBluesky( form, handle ) {
	const PREFIX = `[${MODULE_NAME}:fnAuthenticateWithBluesky] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Avoid form to be submitted.
	event.preventDefault();

	// Hide error panel.
	hide( "errorPanel" );

	let variable = null;

	if (DEBUG) console.debug( PREFIX, "Current handle:", handle );
	userHandle = handle;

	variable = await step01RetrieveUserDID();
	// if (DEBUG) console.debug( PREFIX, "Received variable:", prettyJson( variable ) );
	if (DEBUG) console.debug( PREFIX, "Current userDid:", userDid );

	variable = await stop02RetrieveUserDIDDocument();
	// if (DEBUG) console.debug( PREFIX, "Received variable:", prettyJson( variable ) );
	if (DEBUG) console.debug( PREFIX, "Current userDidDocument:", prettyJson( userDidDocument ) );
	if (DEBUG) console.debug( PREFIX, "Current userPDSURL:", userPDSURL );

	variable = await step03RetrievePDSServerMetadata();
	// if (DEBUG) console.debug( PREFIX, "Received variable:", prettyJson( variable ) );
	if (DEBUG) console.debug( PREFIX, "Current userPDSMetadata:", prettyJson( userPDSMetadata ) );
	if (DEBUG) console.debug( PREFIX, "Current userAuthServerURL:", userAuthServerURL );

	variable = await step04RetrieveAuthServerDiscoveryMetadata();
	// if (DEBUG) console.debug( PREFIX, "Received variable:", prettyJson( variable ) );
	if (DEBUG) console.debug( PREFIX, "Current userAuthServerDiscovery:", prettyJson( userAuthServerDiscovery ) );
	if (DEBUG) console.debug( PREFIX, "Current userAuthorizationEndPoint:", userAuthorizationEndPoint );
	if (DEBUG) console.debug( PREFIX, "Current userTokenEndPoint:", userTokenEndPoint );
	if (DEBUG) console.debug( PREFIX, "Current userPAREndPoint:", userPAREndPoint );
	if (DEBUG) console.debug( PREFIX, "Current userRevocationEndPoint:", userRevocationEndPoint );

	variable = await step05PARRequest();
	// if (DEBUG) console.debug( PREFIX, "Received variable:", prettyJson( variable ) );
	if (DEBUG) console.debug( PREFIX, "Current userAuthServerRequestURI:", userAuthServerRequestURI );

	if (DEBUG) console.debug( PREFIX, "Redirecting user to the Bluesky Authorization Server page..." );
	step06RedirectUserToBlueskyAuthPage();

	if (DEBUG) console.debug( PREFIX, "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
}

function fnSwitchViewAccessToken() {
	const div = document.getElementById("notificationsPanel");
	if ( div.checkVisibility() ) {
		hide("notificationsPanel");
		show("accessTokenPanel");
	} else {
		hide("accessTokenPanel");
		show("notificationsPanel");
	}
}

async function fnProcessCallback(parsedSearch) {
	const PREFIX = `[${MODULE_NAME}:fnProcessCallback] `;
	const PREFIX_AFTER = `${PREFIX}[After] `;
	const PREFIX_ERROR = `${PREFIX}[ERROR] `;
	const PREFIX_RETRY = `${PREFIX}[RETRY] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Show panels
	show( "rootContainer" );
	show( "botoneraPanel" );
	hide( "errorPanel" );

	// Update some HTML fields
	updateHTMLFields(parsedSearch);

	// Restore data from localStorage.
	restoreDataFromLocalStorage();

	// Retrieve the "code"...
	let code = parsedSearch.get("code");
	if (DEBUG) console.debug( PREFIX, "Current code:", code );

	// Retrieve the access_token
	let authServerResponse = null;
	try {
		// With the "code", let's retrieve the user access_token from the server.
		authServerResponse					= await retrieveTheUserAccessToken(code);
		if (DEBUG) console.debug( PREFIX, "Current authServerResponse:", authServerResponse );

		// Let's group the following messages
		if (GROUP_DEBUG) console.groupCollapsed( PREFIX_AFTER );
		if (DEBUG) console.debug( PREFIX, "Current authServerResponse:", prettyJson( authServerResponse ) );

		// Parse the response
		cryptoKey							= authServerResponse.cryptoKey;
		jwk									= authServerResponse.jwk;
		userAuthentication					= authServerResponse.userAuthentication;
		userAccessToken						= authServerResponse.userAccessToken;

		// Let's create also the access token HASH...
		accessTokenHash = await createHash(userAccessToken, true);
		if (DEBUG) console.debug(PREFIX, "accessTokenHash:", accessTokenHash);

		// Some information
		if (DEBUG) console.debug( PREFIX, "Current cryptoKey:", cryptoKey );
		if (DEBUG) console.debug( PREFIX, "Current cryptoKey:", prettyJson( cryptoKey ) );
		if (DEBUG) console.debug( PREFIX, "Current jwk:", jwk );
		if (DEBUG) console.debug( PREFIX, "Current jwk:", prettyJson( jwk ) );
		if (DEBUG) console.debug( PREFIX, "Current userAuthentication:", userAuthentication );
		if (DEBUG) console.debug( PREFIX, "Current userAuthentication:", prettyJson( userAuthentication ) );
		if (DEBUG) console.debug( PREFIX, "Current userAccessToken:", userAccessToken );
		if (DEBUG) console.debug( PREFIX, "Current userAccessToken:", jwtToPrettyJSON( userAccessToken ) );
		if (GROUP_DEBUG) console.groupEnd();

		// Update HTML fields
		if (DEBUG) console.debug( PREFIX, "Filling-in access token fields and panel..." );
		$("#notifications_json").removeAttr('data-highlighted');
		$("#access_token_jwt").removeAttr('data-highlighted');
		$("#access_token_json").removeAttr('data-highlighted');
		$("#access_token_jwt").text( userAccessToken );
		$("#access_token_json").text( jwtToPrettyJSON( userAccessToken ) );
		hljs.highlightAll();

		// Show "accessTokenPanel" panel
		show("accessTokenPanel");

		// Also show "btnNotifications" button
		show("btnNotifications");
	} catch (error) {
		if (GROUP_DEBUG) console.groupEnd();

		if (GROUP_DEBUG) console.groupCollapsed( PREFIX_ERROR );
		if (DEBUG) console.warn( PREFIX, "ERROR:", error.toString() );
		if (DEBUG) console.warn( PREFIX, "ERROR dpopNonceUsed:", dpopNonceUsed );
		if (DEBUG) console.warn( PREFIX, "ERROR dpopNonceReceived:", dpopNonceReceived );
		if (GROUP_DEBUG) console.groupEnd();

		// Update the HTML fields
		updateHTMLError(error);
		throw( error );
	}

	if (DEBUG) console.debug( PREFIX, "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
}

async function fnRetrieveUserNotifications() {
	const PREFIX = `[${MODULE_NAME}:fnRetrieveUserNotifications] `;
	const PREFIX_ERROR = `${PREFIX}[ERROR] `;
	const PREFIX_RETRY = `${PREFIX}[RETRY] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Clear and hide error fields and panel
	clearHTMLError();

	// Hide panels
	hide("accessTokenPanel");
	hide("notificationsPanel");

	// Retrieve the access_token
	let authServerResponse = null;
	try {
		// Now, let's try to call a "protected" EndPoint.
		authServerResponse				= await retrieveNotifications();
		if (DEBUG) console.debug( PREFIX, "Current authServerResponse:", authServerResponse );
		// if (DEBUG) console.debug( PREFIX, "Current authServerResponse:", prettyJson( authServerResponse ) );

		// Parse the response
		parseNotifications( authServerResponse );
	} catch (error) {
		if (GROUP_DEBUG) console.groupEnd();

		if (GROUP_DEBUG) console.groupCollapsed( PREFIX_ERROR );
		if (DEBUG) console.warn( PREFIX, "ERROR:", error.toString() );
		if (DEBUG) console.warn( PREFIX, "ERROR dpopNonceUsed:", dpopNonceUsed );
		if (DEBUG) console.warn( PREFIX, "ERROR dpopNonceReceived:", dpopNonceReceived );
		if (GROUP_DEBUG) console.groupEnd();

		// Check if the error is due to a different dpop-nonce in step 12...
		if ( areEquals(error.step, "retrieveNotifications") && !areEquals(dpopNonceUsed, dpopNonceReceived) ) {
			if (DEBUG) console.debug( PREFIX, "Let's retry..." );
			if (GROUP_DEBUG) console.groupCollapsed( PREFIX_RETRY );
			try {
				authServerResponse					= await retrieveNotifications();
				if (DEBUG) console.debug( PREFIX, "Current authServerResponse:", authServerResponse );
				// if (DEBUG) console.debug( PREFIX, "Current authServerResponse:", prettyJson( authServerResponse ) );

				// Clear and hide error fields and panel
				clearHTMLError();

				// Parse the response
				parseNotifications( authServerResponse );
			} catch (error) {
				if (GROUP_DEBUG) console.groupEnd();

				if (GROUP_DEBUG) console.groupCollapsed( PREFIX_ERROR );
				if (DEBUG) console.warn( PREFIX, "ERROR:", error.toString() );
				if (DEBUG) console.warn( PREFIX, "ERROR dpopNonceUsed:", dpopNonceUsed );
				if (DEBUG) console.warn( PREFIX, "ERROR dpopNonceReceived:", dpopNonceReceived );

				// Update the HTML fields
				// $("#error").val(error.cause.payload.error);
				// $("#errorDescription").val(error.cause.payload.message);
				// TODO: Cambiar el error a APICallError
				updateHTMLError(error);

				// Check if the error is due to a different dpop-nonce in step 12...
				if (GROUP_DEBUG) console.groupEnd();
			}
			if (GROUP_DEBUG) console.groupEnd();
		}
	}

	if (DEBUG) console.debug( PREFIX, "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
}

async function fnLogout() {
	const PREFIX = `[${MODULE_NAME}:fnLogout] `;
	const PREFIX_FETCH = `${PREFIX}[Fetch] `;
	const PREFIX_FETCH_HEADERS = `${PREFIX_FETCH}[Headers] `;
	const PREFIX_FETCH_BODY = `${PREFIX_FETCH}[Body] `;
	const PREFIX_FETCH_ERROR = `${PREFIX_FETCH}[ERROR] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

    let body = `token=${userAccessToken}`;
    let fetchOptions = {
        method: 'POST',
        headers: {
			'Authorization': `DPoP ${userAccessToken}`,
            'Content-Type': CONTENT_TYPE_FORM_ENCODED
        },
        body: body
    }
    let url = userRevocationEndPoint;
 	if (DEBUG) console.debug( PREFIX, "Invoking URL:", url );
 	if (DEBUG) console.debug( PREFIX, "+ with this options:", prettyJson( fetchOptions ) );

 	let responseFromServer = await fetch( url, fetchOptions ).then( response => {
        // Process the HTTP Response
		return processAPICallResponse( "step05PARRequest", response );
    }).then( data => {
        // Process the HTTP Response Body
		if (DEBUG) console.debug( PREFIX_FETCH_BODY, "Data:", prettyJson( data ) );
        // Return something
		return ( data ) ? data : { logout: true };
    }).catch( error => {
		processAPICallErrorResponse( error );
    }).finally( () => {
		if (DEBUG) console.debug( PREFIX_FETCH, "-- FINALLY" );
		if (GROUP_DEBUG) console.groupEnd();
    });
	if (DEBUG) console.debug( PREFIX, "Received responseFromServer:", prettyJson( responseFromServer ) );

	if ( responseFromServer.logout ) {
		if (DEBUG) console.debug( PREFIX, "-- END" );
		if (GROUP_DEBUG) console.groupEnd();
		window.location = URL_LOCALHOST;
	} else {
		if (DEBUG) console.warn( PREFIX, "ERROR!" );
		if (DEBUG) console.debug( PREFIX, "-- END" );
		if (GROUP_DEBUG) console.groupEnd();
	}
}


