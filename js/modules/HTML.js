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
// Common Classes and Exceptions ("Types")
import * as TYPES						from "./common.types.js";
// To perform API calls
import * as APICall						from "./APICall.js";
// Common DPOP functions
import * as DPOP						from "./OAuth2/dpopProof.js";
// Common JWT functions
import * as JWT							from "./OAuth2/JWT.js";


/**********************************************************
 * Module Constants
 **********************************************************/
// Module SELF constants
const MODULE_NAME						= COMMON.getModuleName( import.meta.url );

// Inner constants
const API								= CONFIGURATION.api;
const LSKEYS							= CONFIGURATION.localStorageKeys;
const CLIENT_APP						= CONFIGURATION.clientApp;

// Bluesky constants
const APP_CLIENT_ID						= CLIENT_APP.client_id;

// IMG constants
const BLANK_IMAGE						= "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

// HTML constants
const LOCALE_SPAIN						= 'es-ES';
const LOCALE_OPTIONS					= { year: "2-digit", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true };
const DESC_MAX_CHARS					= 60;

// HTML normal DIVs/Placeholders constants
const DIV_DATE_TIME						= "currentDateTime";
const DIV_TAB_NOTIS_BADGE				= "pill-notifications-badge";
const DIV_TAB_BLOCKS_BADGE				= "pill-blocking-badge";
const DIV_TAB_FOLLOWERS_BADGE			= "pill-followers-badge";
const DIV_TAB_FOLLOWING_BADGE			= "pill-following-badge";
const DIV_TAB_MUTED_BADGE				= "pill-muting-badge";
const DIV_TAB_MY_LISTS_BADGE			= "pill-my-lists-badge";
const DIV_TOAST							= "toast-followers-change";
const DIV_PANEL_ERROR					= "panel-error";
const DIV_PANEL_INFO					= "panel-info";
const DIV_PANEL_INFO_STEP				= `${DIV_PANEL_INFO}-step`;
const DIV_BTN_CLIENT_ID					= "button-client-id";
const DIV_BTN_DID_DOCUMENT				= "button-did-document";
const DIV_TABLE_MY_LISTS				= "table-my-lists";
const DIV_TABLE_MUTING					= "table-muting";
const DIV_TABLE_BLOCKING				= "table-blocking";
const DIV_TABLE_FOLLOWING				= "table-following";
const DIV_TABLE_FOLLOWERS				= "table-followers";
const DIV_TRENDING_TOPICS				= "trending-topics";


// HTML jQuery DIVs/Placeholders constants
const DIV_JQ_ERROR						= "#error";
const DIV_JQ_ERROR_DESCRIPTION			= "#errorDescription";
const DIV_JQ_CLIENTID					= "#clientId";
const DIV_JQ_ISS						= "#iss";
const DIV_JQ_STATE						= "#state";
const DIV_JQ_CODE						= "#code";
const DIV_JQ_DPOP_NONCE					= "#dpopNonce";
const DIV_JQ_DATE_TIME					= `#${DIV_DATE_TIME}`;
const DIV_JQ_NOTIFICATIONS				= "#notifications";
const DIV_JQ_TAB_NOTIS_BADGE			= `#${DIV_TAB_NOTIS_BADGE}`;
const DIV_JQ_TAB_BLOCKS_BADGE			= `#${DIV_TAB_BLOCKS_BADGE}`;
const DIV_JQ_TAB_FOLLOWERS_BADGE		= `#${DIV_TAB_FOLLOWERS_BADGE}`;
const DIV_JQ_TAB_FOLLOWING_BADGE		= `#${DIV_TAB_FOLLOWING_BADGE}`;
const DIV_JQ_TAB_MUTED_BADGE			= `#${DIV_TAB_MUTED_BADGE}`;
const DIV_JQ_TAB_MY_LISTS_BADGE			= `#${DIV_TAB_MY_LISTS_BADGE}`;
const DIV_JQ_ACCESS_TOKEN_JWT			= "#access_token_jwt";
const DIV_JQ_ACCESS_TOKEN_JSON			= "#access_token_json";
const DIV_JQ_PROFILE_AVATAR				= "#profile-avatar";
const DIV_JQ_PROFILE_AVATAR_TOP			= "#profile-avatar-top";
const DIV_JQ_PROFILE_NAME				= "#profile-name";
const DIV_JQ_PROFILE_NAME_TOP			= "#profile-name-top";
const DIV_JQ_PROFILE_HANDLE				= "#profile-handle";
const DIV_JQ_PROFILE_HANDLE_TOP			= "#profile-handle-top";
const DIV_JQ_PROFILE_HANDLE_LINK		= "#profile-handle-link";
const DIV_JQ_PROFILE_FOLLOWERS			= "#profile-followers";
const DIV_JQ_PROFILE_FOLLOWING			= "#profile-following";
const DIV_JQ_PROFILE_POSTS				= "#profile-posts";
const DIV_JQ_PROFILE_DESCRIPTION		= "#profile-description";
const DIV_JQ_TOAST						= `#${DIV_TOAST}`;
const DIV_JQ_PANEL_INFO					= `#${DIV_PANEL_INFO}`;
const DIV_JQ_PANEL_INFO_STEP			= `#${DIV_PANEL_INFO_STEP}`;
const DIV_JQ_BTN_CLIENT_ID				= `#${DIV_BTN_CLIENT_ID}`;
const DIV_JQ_BTN_DID_DOCUMENT			= `#${DIV_BTN_DID_DOCUMENT}`;
const DIV_JQ_TABLE_MY_LISTS				= `#${DIV_TABLE_MY_LISTS}`;
const DIV_JQ_TABLE_MUTING				= `#${DIV_TABLE_MUTING}`;
const DIV_JQ_TABLE_BLOCKING				= `#${DIV_TABLE_BLOCKING}`;
const DIV_JQ_TABLE_FOLLOWING			= `#${DIV_TABLE_FOLLOWING}`;
const DIV_JQ_TABLE_FOLLOWERS			= `#${DIV_TABLE_FOLLOWERS}`;
const DIV_JQ_TRENDING_TOPICS			= `#${DIV_TRENDING_TOPICS}`;

/**********************************************************
 * Module Variables
 **********************************************************/
let momentReceivedToken					= null;
let expiration							= 0;


/**********************************************************
 * PRIVATE Functions
 **********************************************************/


/**********************************************************
 * PUBLIC Functions
 **********************************************************/

/* --------------------------------------------------------
 * General use.
 * -------------------------------------------------------- */
export function clock() {
	// La fecha y hora actual
	const now							= new Date();
	$( DIV_JQ_DATE_TIME ).val( now.toLocaleString( LOCALE_SPAIN, LOCALE_OPTIONS ) );
}

export function updateHighlight() {
	$( DIV_JQ_ACCESS_TOKEN_JSON ).removeAttr('data-highlighted');
	$( DIV_JQ_ACCESS_TOKEN_JWT ).removeAttr('data-highlighted');
	hljs.highlightAll();
}

/* --------------------------------------------------------
 * Errors management.
 * -------------------------------------------------------- */
export function updateHTMLError(error, renderHTMLErrors=true) {
	const STEP_NAME						= "makeAPICall";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[renderHTMLErrors==${renderHTMLErrors}]` );

	let isInstanceOfAccessTokenError	= error instanceof TYPES.AccessTokenError;
	let isInstanceOfAPICallError		= error instanceof TYPES.APICallError;

	if (window.BSKY.DEBUG) console.warn( PREFIX + "ERROR:", error.toString() );

	// HTML L&F
	if ( renderHTMLErrors ) {
		// COMMON.hide( DIV_PANEL_INFO );
		COMMON.show( DIV_PANEL_ERROR );
	}

	if ( isInstanceOfAccessTokenError ) {
		if (window.BSKY.DEBUG) console.debug(PREFIX + "+ code........:", error.code);
		if (window.BSKY.DEBUG) console.debug(PREFIX + "+ message.....:", error.message);

		// Update the error fields
		if ( renderHTMLErrors ) {
			$( DIV_JQ_ERROR ).html(error.title);
			$( DIV_JQ_ERROR_DESCRIPTION ).val(error.message);
		}
	} else if ( isInstanceOfAPICallError ) {
		if (window.BSKY.DEBUG) console.debug(PREFIX + "+ message.....:", error.message);
		if (window.BSKY.DEBUG) console.debug(PREFIX + "+ step........:", error.step);
		if (window.BSKY.DEBUG) console.debug(PREFIX + "+ status......:", error.status);
		if (window.BSKY.DEBUG) console.debug(PREFIX + "+ statusText..:", error.statusText);
		if (window.BSKY.DEBUG) console.debug(PREFIX + "+ contentType.:", error.contentType);
		if (window.BSKY.DEBUG) console.debug(PREFIX + "+ ok..........:", error.ok);
		if (window.BSKY.DEBUG) console.debug(PREFIX + "+ bodyUsed....:", error.bodyUsed);
		if (window.BSKY.DEBUG) console.debug(PREFIX + "+ redirected..:", error.redirected);
		if (window.BSKY.DEBUG) console.debug(PREFIX + "+ body........:", error.body);
		if (window.BSKY.DEBUG) console.debug(PREFIX + "+ type........:", error.type);
		if (window.BSKY.DEBUG) console.debug(PREFIX + "+ url.........:", error.url);
		if (window.BSKY.DEBUG) console.debug(PREFIX + "+ isJson......:", error.isJson);
		if (window.BSKY.DEBUG) console.debug(PREFIX + "+ json........:", error.json);
		if (window.BSKY.DEBUG) console.debug(PREFIX + "+ text........:", error.text);
		if (window.BSKY.DEBUG) console.debug(PREFIX + "+ stack.......:", error.stack);

		// Update the error fields
		if ( renderHTMLErrors ) {
			$( DIV_JQ_ERROR ).html(error.message);
			if ( error.isJson ) {
				let msg					= ( error.json.error ) ? error.json.error + ": " : "";
				msg						+= ( error.json.message ) ? error.json.message : "";
				msg						+= ( error.json.error_description ) ? error.json.error_description : "";
				$( DIV_JQ_ERROR_DESCRIPTION ).val(msg);
			} else {
				let msg					= `[${error.step}] Error [${error.statusText}] invocando a: [${error.url}]`;
				$( DIV_JQ_ERROR_DESCRIPTION ).val(msg);
			}
		}
	} else if ( error.error && error.message ) {
		// Puede venir también un: "{"error":"InternalServerError","message":"Internal Server Error"}"
		if (window.BSKY.DEBUG) console.debug(PREFIX + "+ error.......:", error.error);
		if (window.BSKY.DEBUG) console.debug(PREFIX + "+ message.....:", error.message);

		// Update the error fields
		if ( renderHTMLErrors ) {
			$( DIV_JQ_ERROR ).html(error.error);
			$( DIV_JQ_ERROR_DESCRIPTION ).val(error.message);
		}
	} else {
		// Unknown error type. Update the error fields
		if ( renderHTMLErrors ) {
			$( DIV_JQ_ERROR ).html("ERROR");
			$( DIV_JQ_ERROR_DESCRIPTION ).val(error.message);
		}
	}
	if (window.BSKY.DEBUG) console.debug( PREFIX + "ERROR dpopNonce........:", BSKY.data.dpopNonce );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "ERROR dpopNonceUsed....:", BSKY.data.dpopNonceUsed );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "ERROR dpopNonceReceived:", BSKY.data.dpopNonceReceived );

	if (window.BSKY.GROUP_DEBUG) console.groupEnd(PREFIX);
}

export function clearHTMLError() {
	// Clear and hide error fields and panel
	$( DIV_JQ_ERROR ).html("");
	$( DIV_JQ_ERROR_DESCRIPTION ).val("");
	COMMON.hide( DIV_PANEL_ERROR );
}

export function processAPICallErrorResponse( error, renderHTMLErrors=true ) {
	const STEP_NAME						= "processAPICallErrorResponse";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[renderHTMLErrors=${renderHTMLErrors}]` );

	if (window.BSKY.DEBUG) console.debug( PREFIX + "ERROR:", error.message );
	updateHTMLError(error, renderHTMLErrors);

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();

	// Finally, throw the error
	throw( error );
}

/* --------------------------------------------------------
 * Callback data and access token management.
 * -------------------------------------------------------- */
export function updateHTMLFields(parsedSearch) {
	const STEP_NAME						= "updateHTMLFields";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Recibido.
	let isInstanceOfCallbackData		= parsedSearch instanceof TYPES.CallbackData;
	let isInstanceOfURLSearchParams		= parsedSearch instanceof URLSearchParams;
	if (window.BSKY.DEBUG) console.debug(PREFIX + "Tipo de parsedSearch:", COMMON.getTypeOf( parsedSearch ) );
	if (window.BSKY.DEBUG) console.debug(PREFIX + "Instancia de TYPES.CallbackData:", isInstanceOfCallbackData );
	if (window.BSKY.DEBUG) console.debug(PREFIX + "Instancia de URLSearchParams:", isInstanceOfURLSearchParams );

	let iss								= null;
	let state							= null;
	let code							= null;
	let dpopNonce						= null;

	let response						= null;
	if ( isInstanceOfURLSearchParams ) {
		iss								= parsedSearch.get("iss");
		state							= parsedSearch.get("state");
		code							= parsedSearch.get("code");
		response						= new TYPES.CallbackData( iss, state, code, dpopNonce );
	} else {
		iss								= parsedSearch.iss;
		state							= parsedSearch.state;
		code							= parsedSearch.code;
		response						= parsedSearch;
	}
	dpopNonce							= BSKY.data.dpopNonce;

	if (window.BSKY.DEBUG) console.debug(PREFIX + "Updating HTML Elements:");
	if (window.BSKY.DEBUG) console.debug(PREFIX + "+ iss:", iss);
	if (window.BSKY.DEBUG) console.debug(PREFIX + "+ state:", state);
	if (window.BSKY.DEBUG) console.debug(PREFIX + "+ code:", code);
	if (window.BSKY.DEBUG) console.debug(PREFIX + "+ dpopNonce:", dpopNonce);

	// Update HTML page element values.
	// CSS Classes.
	$( DIV_JQ_ISS ).val(iss);
	$( DIV_JQ_STATE ).val(state);
	$( DIV_JQ_CODE ).val(code);
	$( DIV_JQ_DPOP_NONCE ).val(dpopNonce);

	if (window.BSKY.GROUP_DEBUG) console.groupEnd(PREFIX);
	return response;
}

export function updateUserAccessToken(clientId, userAccessToken) {
	$( DIV_JQ_CLIENTID ).val( clientId );
	$( DIV_JQ_ACCESS_TOKEN_JWT ).text( userAccessToken );
	$( DIV_JQ_ACCESS_TOKEN_JSON ).text( JWT.jwtToPrettyJSON( userAccessToken ) );
}

export function updateUserDIDInfo() {
	let $linkClientID					= $( DIV_JQ_BTN_CLIENT_ID );
	let $linkDIDDocument				= $( DIV_JQ_BTN_DID_DOCUMENT );
	$linkClientID.attr("href",  APP_CLIENT_ID);
	$linkDIDDocument.attr("href",  API.bluesky.profile.pld + BSKY.user.userDid);
}


/* --------------------------------------------------------
 * INFO Panel management.
 * -------------------------------------------------------- */
export function clearStepInfo() {
	showStepInfo();
}

export function showStepInfo( step=null, message=null ) {
	if ( !COMMON.isNullOrEmpty( message ) ) {
		if ( !COMMON.isNullOrEmpty( step ) ) {
			$( DIV_JQ_PANEL_INFO_STEP ).html( `[${step}] ${message}` );
		} else {
			$( DIV_JQ_PANEL_INFO_STEP ).html( `${message}` );
		}
	} else {
		$( DIV_JQ_PANEL_INFO_STEP ).html( "&nbsp;" );
	}
}


/* --------------------------------------------------------
 * HTML Render: Notification.
 * -------------------------------------------------------- */
async function htmlRenderSingleNotification( notification, userAccessToken, clientId, accessTokenHash ) {
	const STEP_NAME						= "htmlRenderSingleNotification";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;

	// Vamos preparando el HTML para la notificación.
	let jqRoot							= $( DIV_JQ_NOTIFICATIONS );

	let cid								= notification.cid;
	let uri								= notification.uri;
	let isRead							= notification.isRead;
	let notiReason						= notification.reason;
	let when							= new Date( notification.indexedAt );

	let author							= notification.author;
	let authorHandle					= author.handle;
	let authorName						= author.displayName || author.handle;
	let authorDid						= author.did;
	let authorDescription				= author.description;
	let authorAvatar					= author.avatar;
	let authorURL						= "https://bsky.app/profile/" + authorHandle;

	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + "["+notiReason+"] ["+authorName+"] ["+when.toLocaleString()+"]" );

	// Actualizamos el HTML con el autor.
	let html							= jqRoot.html() + `<div id="notification-${cid}" name="notification${cid}" class="notification">`;
	html								+= `<div class="header">`;
	if (authorAvatar) {
		html							+= `  <a href="${authorURL}"><img src="${authorAvatar}" height="24"/></a> `;
	} else {
		html							+= `  <a href="${authorURL}"><i class="bi bi-person-slash" height="24"></i></a> `;
	}
	html								+= `  <a href="${authorURL}"><strong>${authorName}</strong></a>`;
	html								+= `</div>`;
	html								+= `<ul style="margin: 0px 0px 8px 0px">`;
	html								+= `  <li class="notificacion-data">Handle: <strong>${authorHandle}</strong> (<i>Did: <strong>${authorDid}</strong></i>)</li>`;
	// html								+= `  <li class="notificacion-data">Description: <strong>${authorDescription}</strong></li>`;

	if (window.BSKY.DEBUG) console.debug(PREFIX + "Updating Notification:");
	if (window.BSKY.DEBUG) console.debug(PREFIX + "+ notification:", notification);
	if (window.BSKY.DEBUG) console.debug(PREFIX + "+ isRead:", isRead);
	if (window.BSKY.DEBUG) console.debug(PREFIX + "+ when:", when.toLocaleString() );
	if (window.BSKY.DEBUG) console.debug(PREFIX + "+ Author:", authorName);
	if (window.BSKY.DEBUG) console.debug(PREFIX + "  > handle:", authorHandle);
	if (window.BSKY.DEBUG) console.debug(PREFIX + "  > did:", authorDid);
	if (window.BSKY.DEBUG) console.debug(PREFIX + "  > description:", authorDescription);
	if (window.BSKY.DEBUG) console.debug(PREFIX + "  > avatar:", authorAvatar);
	if (window.BSKY.DEBUG) console.debug(PREFIX + "  > URL:", authorURL);

	/*
	 * Possible reasons:
		"reason": "follow",
		"reason": "like",
		"reason": "reply",
		"reason": "repost",
		// like, repost, follow, mention, reply, quote, starterpack-joined
	*/
	if (window.BSKY.DEBUG) console.debug(PREFIX + "+ Reason:", notiReason);

	if ( COMMON.areEquals( notiReason, "follow" ) ) {
		// It's a "follow" notification.
		html							+= `  <li class="notificacion-data"><strong>${notiReason} you</strong></li>`;
	} else {
		// It's about an action on a post.
		let notiURI						= "";
		let replyText					= null;
		if ( COMMON.areEquals( notiReason, "reply" ) ) {
			notiURI						= notification.record.reply.parent.uri;
			replyText					= notification.record.text;
		} else {
			notiURI						= notification.record.subject.uri;
		}
		let notiURISplitted				= notiURI.substring(5).split("/")
		let notiDID						= notiURISplitted[0];
		let notiBluitID					= notiURISplitted[2];
		let userProfileURL				= "https://bsky.app/profile/" + notiDID + "/post/" + notiBluitID;
		if (window.BSKY.DEBUG) console.debug(PREFIX + "+ userProfileURL:", userProfileURL);
		
		// TEST: Get post
		let bluitUrl					= API.bluesky.XRPC.public + API.bluesky.XRPC.api.public.getPosts + "?uris=" + encodeURIComponent( notiURI );
		let headers						= null;
		let fetchOptions				= null;
		let withAuthentication			= false;
		if (withAuthentication) {
			if (window.BSKY.DEBUG) console.debug(PREFIX + "Testing to retrieve the bluit:");
			if (window.BSKY.DEBUG) console.debug(PREFIX + "+ bluitUrl:", bluitUrl);

			let dpopRequest				= new TYPES.DPoPRequest(BSKY.data.cryptoKey.privateKey, BSKY.data.jwk, clientId, userAccessToken, accessTokenHash, bluitUrl, BSKY.data.dpopNonce, APICall.HTML_GET);
			let dpopProof				= await DPOP.createDPoPProof(dpopRequest)
			if (window.BSKY.DEBUG) console.debug( PREFIX + "Received dpopProof:", JWT.jwtToPrettyJSON( dpopProof ) );

			headers						= {
				'Authorization': `DPoP ${userAccessToken}`,
				'DPoP': dpopProof,
				'Accept': APICall.CONTENT_TYPE_JSON,
				'DPoP-Nonce': dpopNonce
			}
			fetchOptions				= {
				method: APICall.HTML_GET,
				headers: headers
			}
		} else {
			headers						= {
				'Accept': APICall.CONTENT_TYPE_JSON,
			}
			fetchOptions				= {
				method: APICall.HTML_GET,
				headers: headers
			}
		}
		if (window.BSKY.DEBUG) console.debug(PREFIX + "+ withAuthentication:", withAuthentication);
		if (window.BSKY.DEBUG) console.debug(PREFIX + "+ bluitUrl:", bluitUrl);
		if (window.BSKY.DEBUG) console.debug(PREFIX + "+ headers:", COMMON.prettyJson( headers ) );
		if (window.BSKY.DEBUG) console.debug(PREFIX + "+ fetchOptions:", COMMON.prettyJson( fetchOptions ) );

		let callResponse				= await APICall.makeAPICall( STEP_NAME, bluitUrl, fetchOptions )
		if (window.BSKY.DEBUG) console.debug(PREFIX + "+ callResponse:", callResponse);
		let bluits						= callResponse.body.posts;
		if (window.BSKY.DEBUG) console.debug(PREFIX + "+ bluits:", bluits);
		let bluit						= bluits[0];
		if (window.BSKY.DEBUG) console.debug(PREFIX + "+ bluit:", bluit);

		// Agregamos la info al html...
		let referredText				= `Not detected yet for ${notiReason}!`;
		switch ( notiReason.toLowerCase() ) {
			case "like":
				referredText			= ( bluit.embed && bluit.embed.record && bluit.embed.record.value && bluit.embed.record.value.text ) || bluit.record.text;
				break;
			case "reply":
				referredText			= ( bluit.embed && bluit.embed.record && bluit.embed.record.value && bluit.embed.record.value.text ) || bluit.record.text;
				break;
			case "repost":
				referredText			= `Not detected yet for ${notiReason}!`;
				break;
			default:
				referredText			= ( bluit.embed && bluit.embed.record && bluit.embed.record.value && bluit.embed.record.value.text ) || bluit.record.text;
		}
		if (window.BSKY.DEBUG) console.debug(PREFIX + "+ referredText:", referredText);
		html							+= `  <li class="notificacion-data">${notiReason} <a href="${userProfileURL}" target="post-${cid}">this post</a>: ${referredText}`;
		if (replyText) {
			html						+= `<br/><i class="text-primary">${replyText}</i>`;
		}
		html							+= `</li>`;
	}
	html								+= `</ul>`;

	// Pintamos el HTML.
	html								+= '</div>';
	jqRoot.html( html );

	if (window.BSKY.GROUP_DEBUG) console.groupEnd(PREFIX);
}

export function htmlRenderNoNotifications() {
	// Ponemos el badge a 0 y lo ocultamos
	$( DIV_JQ_TAB_NOTIS_BADGE ).html(0);
	COMMON.hide( DIV_TAB_NOTIS_BADGE );

	// Limpiamos el "DIV" de las notis.
	$( DIV_JQ_NOTIFICATIONS ).html( "No notifications found" );
}

export async function htmlRenderNotifications( notifications, userAccessToken, clientId, accessTokenHash ) {
	const STEP_NAME						= "htmlRenderNotifications";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + "[Response data]" );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Current notifications:", notifications );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Current notifications:", COMMON.prettyJson( notifications ) );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();

	// Clear and hide error fields and panel
	clearHTMLError();
	htmlRenderNoNotifications();

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
	// Vaciamos el panel, previamente.
	let jqRoot							= $( DIV_JQ_NOTIFICATIONS );
	jqRoot.html( "" );

	let totalUnread						= unreadNotifications.length;
	let currentUnread					= 0;
	if ( totalUnread > 0) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + "%cCurrently, " + totalUnread + " UNREAD notifications:", COMMON.CONSOLE_STYLE );
		if (window.BSKY.DEBUG) console.debug( PREFIX + "+ unread notifications:", unreadNotifications );

		// Actualizamos el badge y lo mostramos
		$( DIV_JQ_TAB_NOTIS_BADGE ).html(totalUnread);
		COMMON.show( DIV_TAB_NOTIS_BADGE );

		// Ponemos el badge a 0 y lo ocultamos
		for ( let key in unreadNotifications ) {
			currentUnread++;
			if (window.BSKY.DEBUG) console.groupCollapsed( PREFIX + `[Noti ${currentUnread}/${totalUnread}]` );
			await htmlRenderSingleNotification( unreadNotifications[key], userAccessToken, clientId, accessTokenHash );
			if (window.BSKY.DEBUG) console.groupEnd(PREFIX);
		}
	}

	if (window.BSKY.GROUP_DEBUG) console.groupEnd(PREFIX);
}


/* --------------------------------------------------------
 * HTML Render: User Profile.
 * -------------------------------------------------------- */
export function htmlRenderUserProfile( profile ) {
	const STEP_NAME						= "htmlRenderUserProfile";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_COMPARE				= `${PREFIX}[Compare] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	if (window.BSKY.DEBUG) console.debug( PREFIX + "User Profile:", profile );

	if (profile.avatar) {
		$( DIV_JQ_PROFILE_AVATAR ).attr( "src", profile.avatar );
		$( DIV_JQ_PROFILE_AVATAR_TOP ).attr( "src", profile.avatar );
	} else {
		$( DIV_JQ_PROFILE_AVATAR ).attr( "src", BLANK_IMAGE );
		$( DIV_JQ_PROFILE_AVATAR_TOP ).attr( "src", BLANK_IMAGE );
	}

	$( DIV_JQ_PROFILE_NAME ).html( profile.displayName || profile.handle );
	$( DIV_JQ_PROFILE_NAME_TOP ).html( profile.displayName || profile.handle );

	$( DIV_JQ_PROFILE_HANDLE ).html( profile.handle );
	$( DIV_JQ_PROFILE_HANDLE_TOP ).html( profile.handle );

	$( DIV_JQ_PROFILE_FOLLOWERS ).html( profile.followersCount );
	$( DIV_JQ_PROFILE_FOLLOWING ).html( profile.followsCount );
	$( DIV_JQ_PROFILE_POSTS ).html( profile.postsCount );
	$( DIV_JQ_PROFILE_DESCRIPTION ).html( profile.description );

	// El enlace
	let $link							= $( DIV_JQ_PROFILE_HANDLE_LINK );
	let href							= API.bluesky.profile.url + profile.handle;
	$link.attr("href",  href);
	$link.attr("alt",   `ALT: ${profile.description}`);
	$link.attr("title", `TITLE: ${profile.description}`);

	// Let's compare
	// + Retrieve the previous...
	let userProfileSaved				= localStorage.getItem(LSKEYS.user.profile);
	let userProfilePREV					= ( COMMON.isNullOrEmpty(userProfileSaved) ) ? null : JSON.parse( userProfileSaved );
	// + Save the new one
	localStorage.setItem(LSKEYS.user.profile, JSON.stringify( profile ));
	if ( userProfilePREV ) {
		// if (window.BSKY.DEBUG) console.debug( PREFIX_COMPARE + "+ PREV userProfile:", COMMON.prettyJson( userProfilePREV ) );
		// if (window.BSKY.DEBUG) console.debug( PREFIX_COMPARE + "+ NEW  userProfile:", COMMON.prettyJson( profile ) );

		let following					= profile.followsCount;
		let followers					= profile.followersCount;
		let diffFollowing				= following - userProfilePREV.followsCount;
		let diffFollowers				= followers - userProfilePREV.followersCount;

		if ( (diffFollowing>0) || (diffFollowers>0)) {
			if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_COMPARE + `Following: ${diffFollowing}[${following}] - Followers: ${diffFollowers}[${followers}]` );
			// El toast.
			let toastOptions			= {"animation": true, "autohide": true, "delay": 5000};
			let $toast					= $( DIV_JQ_TOAST, toastOptions );
			let $toastImg				= $( DIV_JQ_TOAST + " > .toast-header > img" );
			let $toastBody				= $( DIV_JQ_TOAST + " > .toast-body" );
			let html					= `Diferencia de ${diffFollowers} followers y de ${diffFollowing} following`;
			let delay					= ( window.BSKY.refreshDynamicSeconds - 1 ) * 1000;

			if (profile.avatar) {
				$toastImg.attr( "src", profile.avatar );
			} else {
				$toastImg.attr( "src", BLANK_IMAGE );
			}
			$toastBody.html( html );
			$toast.show();
			if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		} else {
			if (window.BSKY.DEBUG) console.debug( PREFIX_COMPARE + `Following: ${diffFollowing}[${following}] - Followers: ${diffFollowers}[${followers}]` );
		}
	}

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * HTML Render: User Follows.
 * -------------------------------------------------------- */
function htmlRenderSingleProfile( idx, data, flags = { follower: false, block: false, muted: false } ) {
	const STEP_NAME						= "htmlRenderSingleProfile";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[idx=${idx}]` );

	let missed							= data?.missed || false;
	let profile							= missed ? data.profile : data;
	let did								= missed ? data.did : data.did;
	let didDoc							= missed ? data.didDoc : data.didDoc;
	if (window.BSKY.DEBUG) console.debug( PREFIX + `PROFILE${missed}:`, profile );

	/*
	 * Con el "profile":
	 * + En caso de errores de perfil:
	 *   + DEACTIVATED: Puede dar un error '400 Bad Request': {"error":"AccountDeactivated","message":"Account is deactivated"}
	 *   + DELETED: Puede dar un error '400 Bad Request': {"error":"InvalidRequest","message":"Profile not found"}
	 * + En caso de datos correctos:
	 *   + FOLLOWING: viewer.following
	 *   + FOLLOWEDBY: viewer.followedBy
	 *   + MUTED: viewer.muted
	 *   + MODERATION MUTE: Puede estar muteado por una lista de moderación: viewer.mutedByList...
	 *   + BLOCKING: viewer.blocking
	 *   + BLOCKED: viewer.blockedBy
	 *   + MODERATION BLOCK: Puede estar bloqueado por una lista de moderación: viewer.blockingByList...
	 *
	 * Iconos a usar, según info:
	 *
	 *   <i class="bi bi-person-vcard"></i>&nbsp;User Profile</button>
	 *   <i class="bi bi-person-standing"></i>&nbsp;Following</button>
	 *   <i class="bi bi-person-walking"></i>&nbsp;Followers</button>
	 *   <i class="bi bi-person-dash"></i>&nbsp;Blocking</button>
	 *   <i class="bi bi-person-slash"></i>&nbsp;Muting</button>
	 *   <i class="bi bi-list-ul"></i>&nbsp;My Lists</button>
	 *
	 */

	let html							= "";
	let handle							= "";
	if ( missed ) {
		/*
		 * did: "did:plc:6dtf7qrsx4msq6wmp7h7q2xu", Un string
		 * didDoc: Un objeto de este tipo
		 *	{
		 *	    "head": {
		 *	        "bodyUsed": false,
		 *	        "ok": true,
		 *	        "redirected": false,
		 *	        "status": 200,
		 *	        "statusText": "",
		 *	        "type": "cors",
		 *	        "url": "https://plc.directory/did:plc:6dtf7qrsx4msq6wmp7h7q2xu",
		 *	        "headers": {
		 *	            "content-length": "574",
		 *	            "content-type": "application/did+ld+json; charset=utf-8"
		 *	        }
		 *	    },
		 *	    "body": {
		 *	        "@context": [
		 *	            "https://www.w3.org/ns/did/v1",
		 *	            "https://w3id.org/security/multikey/v1",
		 *	            "https://w3id.org/security/suites/secp256k1-2019/v1"
		 *	        ],
		 *	        "id": "did:plc:6dtf7qrsx4msq6wmp7h7q2xu",
		 *	        "alsoKnownAs": [
		 *	            "at://cgtaragonlarioja.bsky.social"
		 *	        ],
		 *	        "verificationMethod": [
		 *	            {
		 *	                "id": "did:plc:6dtf7qrsx4msq6wmp7h7q2xu#atproto",
		 *	                "type": "Multikey",
		 *	                "controller": "did:plc:6dtf7qrsx4msq6wmp7h7q2xu",
		 *	                "publicKeyMultibase": "zQ3shgRgACPVTXBbXGTFWfQRYyjyMuim7v47hkSv8JufEpH21"
		 *	            }
		 *	        ],
		 *	        "service": [
		 *	            {
		 *	                "id": "#atproto_pds",
		 *	                "type": "AtprotoPersonalDataServer",
		 *	                "serviceEndpoint": "https://polypore.us-west.host.bsky.network"
		 *	            }
		 *	        ]
		 *	    }
		 *	}
		 * PROFILE: Un objeto de este tipo
		 *	{
		 *		"head": {
		 *			"bodyUsed": false,
		 *			"ok": false,
		 *			"redirected": false,
		 *			"status": 400,
		 *			"statusText": "",
		 *			"type": "cors",
		 *			"url": "https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=did:plc:6dtf7qrsx4msq6wmp7h7q2xu",
		 *			"headers": {
		 *				"cache-control": "public, max-age=5",
		 *				"content-length": "56",
		 *				"content-type": "application/json; charset=utf-8"
		 *			}
		 *		},
		 *		"body": {
		 *			"error": "InvalidRequest",
		 *			"message": "Profile not found"
		 *		}
		 *	}
		 */
		handle							= didDoc.body.alsoKnownAs[0].substring(5);
		html							+= '<tr class="align-top">';
		html							+= `<td>&nbsp;</td>`;
		html							+= `<td><i class="bi bi-ban-fill text-danger" title="Profile not found"></i></td>`;
		html							+= `<td><a href="https://bsky.app/profile/${handle}" target="_blank" title="${handle}">${handle}</a></td>`;
		html							+= `<td class="text-danger fw-medium theme-smaller">${profile.body.error}: ${profile.body.message}</td>`;
		html							+= '</tr>';
	} else {
		handle							= profile.handle;
		let defaultColor				= "text-body-tertiary";
		let viewer						= profile.viewer;
		let labels						= profile.labels;
		let labelsAsStr					= "";
		if (window.BSKY.DEBUG) console.debug( PREFIX + `+ Viewer:`, viewer );
		if (!COMMON.isNullOrEmpty(labels)) {
			if (window.BSKY.DEBUG) console.debug( PREFIX + `+ Labels:`, labels );
			labelsAsStr					= labels.map(lbl => lbl.val);
		}
		html							+= '<tr class="align-top">';
		html							+= `<td>${idx}</td>`;
		// Icons: Following
		html							+= `<td>`;
		if ( flags.block || flags.muted ) {
			html						+= `<i class="bi bi-person-standing ${!COMMON.isNullOrEmpty(viewer.following) ? "text-white bg-success" : defaultColor}" title="you are ${!COMMON.isNullOrEmpty(viewer.following) ? "" : "NOT "}following this profile"></i>`;
			html						+= `&nbsp;<i class="bi bi-person-walking ${!COMMON.isNullOrEmpty(viewer.followedBy) ? "text-white bg-success" : defaultColor}" title="you are ${!COMMON.isNullOrEmpty(viewer.followedBy) ? "" : "NOT "}followed by this profile"></i>`;
		} else if ( flags.follower ) {
			html						+= `<i class="bi bi-person-standing ${!COMMON.isNullOrEmpty(viewer.following) ? "text-white bg-success" : defaultColor}" title="you are ${!COMMON.isNullOrEmpty(viewer.following) ? "" : "NOT "}following this profile"></i>`;
		} else {
			html						+= `<i class="bi bi-person-walking ${!COMMON.isNullOrEmpty(viewer.followedBy) ? "text-white bg-success" : defaultColor}" title="you are ${!COMMON.isNullOrEmpty(viewer.followedBy) ? "" : "NOT "}followed by this profile"></i>`;
		}
		html							+= `&nbsp;<i class="bi bi-person-dash ${viewer.blocking ? "text-white bg-dark" : defaultColor}" title="you are ${viewer.blocking ? "" : "NOT "}blocking this profile"></i>`;
		html							+= `&nbsp;<i class="bi bi-person-dash ${viewer.blockedBy ? "text-white bg-danger" : defaultColor}" title="you are ${viewer.blockedBy ? "" : "NOT "}blocked by this profile"></i>`;
		html							+= `&nbsp;<i class="bi bi-person-slash ${viewer.muted ? "text-white bg-primary" : defaultColor}" title="you are ${viewer.muted ? "" : "NOT "}muting this profile"></i>`;
		html							+= `&nbsp;<i class="bi bi-list-ul ${viewer?.blockingByList ? "text-white bg-dark" : defaultColor}" title="you are ${viewer?.blockingByList ? "" : "NOT "}blocking this profile thru list${viewer?.blockingByList ? ": " + viewer?.blockingByList?.name : ""}"></i>`;
		html							+= `&nbsp;<i class="bi bi-list-stars ${viewer?.mutedByList ? "text-white bg-primary" : defaultColor}" title="you are ${viewer?.mutedByList ? "" : "NOT "}muting this profile thru list${viewer?.mutedByList ? ": " + viewer?.mutedByList?.name : ""}"></i>`;

		html							+= `</td><td>`;
		if (profile.avatar) {
			html						+= `<img src="${profile.avatar}"`;
		} else {
			html						+= `<img src="${BLANK_IMAGE}"`;
		}
		html							+= ` height="20" style="vertical-align: bottom;">&nbsp;<a href="https://bsky.app/profile/${handle}" target="_blank" title="${handle}">${profile.displayName || handle}</a></td>`;
		html							+= `<td class="theme-smaller">${(profile.description) ? profile.description.substring(0, DESC_MAX_CHARS) : ""}</td>`;
		// html							+= `<td>${new Date(profile.indexedAt).toLocaleString( LOCALE_SPAIN, LOCALE_OPTIONS )}</td>`;
		html							+= '</tr>';
		
		// TEST
		delete viewer.following;
		delete viewer.followedBy;
		delete viewer.blocking;
		delete viewer.blockedBy;
		delete viewer.muted;
		delete viewer.knownFollowers;
		delete viewer.blockingByList;
		let keys						= Object.keys(viewer);
		if ( keys.length>0 ) {
			if (window.BSKY.DEBUG) console.debug( PREFIX + `+ Viewer:`, viewer );
		}

	}

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return html;
}

export function htmlRenderUserFollows( data ) {
	const STEP_NAME						= "htmlRenderUserFollows";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	let total							= 0;
	let index							= 0;
	let htmlContent						= null;
	let $tableBody						= $( DIV_JQ_TABLE_FOLLOWING + " tbody" );

	// Clear the current content.
	$tableBody.empty();
	$( DIV_JQ_TAB_FOLLOWING_BADGE ).html(data.missingProfiles.length + data.profiles.length);

	// Missed
	total								= data.missingProfiles.length;
	index								= 0;
	if ( total>0 ) {
		// Add data.
		data.missingProfiles.forEach( profile => {
			index++;
			htmlContent					= htmlRenderSingleProfile( index, profile );
			$tableBody.append( htmlContent );
		});
	}

	// Following
	total								= data.profiles.length;
	index								= 0;
	if ( total>0 ) {
		// Add data.
		data.profiles.forEach( profile => {
			index++;
			htmlContent					= htmlRenderSingleProfile( index, profile );
			$tableBody.append( htmlContent );
		});
	}

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}

export function htmlRenderUserFollowers( data ) {
	const STEP_NAME						= "htmlRenderUserFollowers";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	let index							= 0;
	let htmlContent						= null;
	let $tableBody						= $( DIV_JQ_TABLE_FOLLOWERS + " tbody" );

	// Clear the current content.
	$tableBody.empty();

	// Total
	let total							= data.length;
	$( DIV_JQ_TAB_FOLLOWERS_BADGE ).html(total);
	if ( total>0 ) {
		// Add data.
		data.forEach( user => {
			index++;
			htmlContent					= htmlRenderSingleProfile( index, user, { follower: true } );
			$tableBody.append( htmlContent );
		});
	}

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * HTML Render: User Blocks.
 * -------------------------------------------------------- */
export function htmlRenderUserBlocks( data ) {
	const STEP_NAME						= "htmlRenderUserBlocks";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	let index							= 0;
	let htmlContent						= null;
	let $tableBody						= $( DIV_JQ_TABLE_BLOCKING + " tbody" );

	// Clear the current content.
	$tableBody.empty();

	// Total
	let total							= data.length;
	$( DIV_JQ_TAB_BLOCKS_BADGE ).html(total);
	if ( total>0 ) {
		// Add data.
		data.forEach( user => {
			index++;
			htmlContent					= htmlRenderSingleProfile( index, user, { block: true } );
			$tableBody.append( htmlContent );
		});
	}

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * HTML Render: User Mutes.
 * -------------------------------------------------------- */
export function htmlRenderUserMutes( data ) {
	const STEP_NAME						= "htmlRenderUserMutes";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	let index							= 0;
	let htmlContent						= null;
	let $tableBody						= $( DIV_JQ_TABLE_MUTING + " tbody" );

	// Clear the current content.
	$tableBody.empty();

	// Total
	let total							= data.length;
	$( DIV_JQ_TAB_MUTED_BADGE ).html(total);
	if ( total>0 ) {
		// Add data.
		data.forEach( user => {
			index++;
			htmlContent					= htmlRenderSingleProfile( index, user, user, { muted: true } );
			$tableBody.append( htmlContent );
		});
	}

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * HTML Render: User Lists.
 * -------------------------------------------------------- */
function htmlRenderSingleList( idx, list, id ) {
	const STEP_NAME						= "htmlRenderSingleList";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[idx=${idx}] [id=${id}]` );

	if (window.BSKY.DEBUG) console.debug( PREFIX + "LIST:", list );

	let html							= "";
	html								+= '<tr class="align-top">';
	html								+= `<td>${idx}</td>`;
	html								+= `<td>${list.listItemCount}</td>`;
	html								+= `<td><a href="https://bsky.app/profile/${list.creator.handle}/lists/${id}" target="_blank" title="${list.name}">${list.name}</a></td>`;
	html								+= `<td class="theme-smaller">${(list.description) ? list.description.substring(0, DESC_MAX_CHARS) : ""}</td>`;
	html								+= `<td class="theme-smaller">${new Date(list.indexedAt).toLocaleString( LOCALE_SPAIN, LOCALE_OPTIONS )}</td>`;
	html								+= '</tr>';

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return html;
}

export function htmlRenderUserLists( data ) {
	const STEP_NAME						= "htmlRenderUserLists";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	let index							= 0;
	let id								= null;
	let htmlContent						= null;
	let $tableBody						= $( DIV_JQ_TABLE_MY_LISTS + " tbody" );

	// Clear the current content.
	$tableBody.empty();

	// Total
	let total							= data.length;
	$( DIV_JQ_TAB_MY_LISTS_BADGE ).html(total);
	if ( total>0 ) {
		// Add data.
		data.forEach( list => {
			index++;
			id							= list.uri.split("/")[4];
			htmlContent					= htmlRenderSingleList( index, list, id );
			$tableBody.append( htmlContent );
		});
	}

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * HTML Render: Trending Topics.
 * -------------------------------------------------------- */
export function htmlRenderTrendingTopics( data ) {
	const STEP_NAME						= "htmlRenderTrendingTopics";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	let index							= 0;
	let id								= null;
	let htmlContent						= "";
	let $container						= $( DIV_JQ_TRENDING_TOPICS );

	// Clear the current content.
	$container.html("");

	/* Trending Topics
		{
			"topics": [
				{
					"topic": "SNL Concert",
					"link": "/profile/trending.bsky.app/feed/90941852"
				},
				{
					"topic": "WWE SmackDown",
					"link": "/profile/trending.bsky.app/feed/90892200"
				},
				{
					"topic": "CDC Layoffs",
					"link": "/profile/trending.bsky.app/feed/90412700"
				},
				{
					"topic": "Texas Outbreak",
					"link": "/profile/trending.bsky.app/feed/90355383"
				}
			],
			"suggested": [
				{
					"topic": "Popular with Friends",
					"link": "/profile/bsky.app/feed/with-friends"
				},
				{
					"topic": "Quiet Posters",
					"link": "/profile/why.bsky.team/feed/infreq"
				},
				{
					"topic": "Sports",
					"link": "/profile/crevier.bsky.social/feed/aaanstr6k5dvo"
				},
				{
					"topic": "NFL",
					"link": "/profile/parkermolloy.com/feed/aaai44jkavvrs"
				},
				{
					"topic": "NBA",
					"link": "/profile/davelevitan.bsky.social/feed/aaadvxju4txkk"
				},
				{
					"topic": "WNBA",
					"link": "/profile/trollhamels.bsky.social/feed/aaac3xufjdvjg"
				},
				{
					"topic": "MLB",
					"link": "/profile/parkermolloy.com/feed/aaap7dpu57ve6"
				},
				{
					"topic": "NHL",
					"link": "/profile/hockeyhotline.bsky.social/feed/aaacm5rbitxqa"
				},
				{
					"topic": "Cats",
					"link": "/profile/jaz.bsky.social/feed/cv:cat"
				},
				{
					"topic": "Gardening",
					"link": "/profile/eepy.bsky.social/feed/aaao6g552b33o"
				},
				{
					"topic": "Dogs",
					"link": "/profile/jaz.bsky.social/feed/cv:dog"
				},
				{
					"topic": "Game Dev",
					"link": "/profile/trezy.codes/feed/game-dev"
				},
				{
					"topic": "Web Dev",
					"link": "/profile/did:plc:m2sjv3wncvsasdapla35hzwj/feed/web-development"
				},
				{
					"topic": "Video Games",
					"link": "/profile/wyattswickedgoods.com/feed/aaaaieaxm5v3y"
				},
				{
					"topic": "Anime",
					"link": "/profile/anianimals.moe/feed/anime-en-new"
				},
				{
					"topic": "Music",
					"link": "/profile/cookieduh.xyz/feed/aaagw7oidihfs"
				},
				{
					"topic": "Film & TV",
					"link": "/profile/francesmeh.reviews/feed/aaaotdzmoni2q"
				},
				{
					"topic": "Taylor Swift",
					"link": "/profile/heheviolet.bsky.social/feed/aaakqsvp6kke4"
				},
				{
					"topic": "Fashion",
					"link": "/profile/sammyouatts.bsky.social/feed/aaacqhe34hlv6"
				},
				{
					"topic": "Pop Culture",
					"link": "/profile/nahuel.bsky.social/feed/aaae2qpt4236c"
				},
				{
					"topic": "Fitness/Health",
					"link": "/profile/sammyouatts.bsky.social/feed/aaadcogx3hvwc"
				},
				{
					"topic": "Beauty",
					"link": "/profile/abmuse.net/feed/aaac256qq7vh4"
				},
				{
					"topic": "Science",
					"link": "/profile/bossett.social/feed/for-science"
				},
				{
					"topic": "Blacksky Trending",
					"link": "/profile/rudyfraser.com/feed/blacksky-trend"
				}
			]
		}
	 */

	// Total
	let total							= data.topics.length;
	if ( total>0 ) {
		// Add data.
		data.topics.forEach( item => {
			index++;
			htmlContent					+= `<a href="${API.bluesky.profile.root}${item.link}" role="button" class="btn btn-sm btn-outline-dark m-1" target="_blank" aria-disabled="true">${item.topic}</button>`;
		});
		$container.html( htmlContent );
	}

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}

