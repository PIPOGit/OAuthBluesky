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
const MODULE_VERSION					= "1.0.0";
const MODULE_PREFIX						= `[${MODULE_NAME}]: `;

// Logging constants
const DEBUG								= CONFIGURATION.global.debug;
const DEBUG_FOLDED						= CONFIGURATION.global.debug_folded;

// Inner constants
const API								= CONFIGURATION.api;
const LSKEYS							= CONFIGURATION.localStorageKeys;
const CLIENT_APP						= CONFIGURATION.clientApp;

// Bluesky constants
const APP_CLIENT_ID						= CLIENT_APP.client_id;

// HTML constants
const LOCALE_SPAIN						= 'es-ES';
const LOCALE_OPTIONS					= { year: "2-digit", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true };
const DESC_MAX_CHARS					= 40;

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
let GROUP_DEBUG							= DEBUG && DEBUG_FOLDED;
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
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + `[renderHTMLErrors==${renderHTMLErrors}]` );

	let isInstanceOfAccessTokenError	= error instanceof TYPES.AccessTokenError;
	let isInstanceOfAPICallError		= error instanceof TYPES.APICallError;

	if (DEBUG) console.warn( PREFIX + "ERROR:", error.toString() );

	// HTML L&F
	if ( renderHTMLErrors ) {
		// COMMON.hide( DIV_PANEL_INFO );
		COMMON.show( DIV_PANEL_ERROR );
	}

	if ( isInstanceOfAccessTokenError ) {
		if (DEBUG) console.debug(PREFIX + "+ code........:", error.code);
		if (DEBUG) console.debug(PREFIX + "+ message.....:", error.message);

		// Update the error fields
		if ( renderHTMLErrors ) {
			$( DIV_JQ_ERROR ).html(error.title);
			$( DIV_JQ_ERROR_DESCRIPTION ).val(error.message);
		}
	} else if ( isInstanceOfAPICallError ) {
		if (DEBUG) console.debug(PREFIX + "+ message.....:", error.message);
		if (DEBUG) console.debug(PREFIX + "+ step........:", error.step);
		if (DEBUG) console.debug(PREFIX + "+ status......:", error.status);
		if (DEBUG) console.debug(PREFIX + "+ statusText..:", error.statusText);
		if (DEBUG) console.debug(PREFIX + "+ contentType.:", error.contentType);
		if (DEBUG) console.debug(PREFIX + "+ ok..........:", error.ok);
		if (DEBUG) console.debug(PREFIX + "+ bodyUsed....:", error.bodyUsed);
		if (DEBUG) console.debug(PREFIX + "+ redirected..:", error.redirected);
		if (DEBUG) console.debug(PREFIX + "+ body........:", error.body);
		if (DEBUG) console.debug(PREFIX + "+ type........:", error.type);
		if (DEBUG) console.debug(PREFIX + "+ url.........:", error.url);
		if (DEBUG) console.debug(PREFIX + "+ isJson......:", error.isJson);
		if (DEBUG) console.debug(PREFIX + "+ json........:", error.json);
		if (DEBUG) console.debug(PREFIX + "+ text........:", error.text);
		if (DEBUG) console.debug(PREFIX + "+ stack.......:", error.stack);

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
		if (DEBUG) console.debug(PREFIX + "+ error.......:", error.error);
		if (DEBUG) console.debug(PREFIX + "+ message.....:", error.message);

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
	if (DEBUG) console.debug( PREFIX + "ERROR dpopNonce........:", BSKY.data.dpopNonce );
	if (DEBUG) console.debug( PREFIX + "ERROR dpopNonceUsed....:", BSKY.data.dpopNonceUsed );
	if (DEBUG) console.debug( PREFIX + "ERROR dpopNonceReceived:", BSKY.data.dpopNonceReceived );

	if (GROUP_DEBUG) console.groupEnd(PREFIX);
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
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + `[renderHTMLErrors=${renderHTMLErrors}]` );

	if (DEBUG) console.debug( PREFIX + "ERROR:", error.message );
	updateHTMLError(error, renderHTMLErrors);

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();

	// Finally, throw the error
	throw( error );
}

/* --------------------------------------------------------
 * Callback data and access token management.
 * -------------------------------------------------------- */
export function updateHTMLFields(parsedSearch) {
	const STEP_NAME						= "updateHTMLFields";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Recibido.
	let isInstanceOfCallbackData		= parsedSearch instanceof TYPES.CallbackData;
	let isInstanceOfURLSearchParams		= parsedSearch instanceof URLSearchParams;
	if (DEBUG) console.debug(PREFIX + "Tipo de parsedSearch:", COMMON.getTypeOf( parsedSearch ) );
	if (DEBUG) console.debug(PREFIX + "Instancia de TYPES.CallbackData:", isInstanceOfCallbackData );
	if (DEBUG) console.debug(PREFIX + "Instancia de URLSearchParams:", isInstanceOfURLSearchParams );

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

	if (DEBUG) console.debug(PREFIX + "Updating HTML Elements:");
	if (DEBUG) console.debug(PREFIX + "+ iss:", iss);
	if (DEBUG) console.debug(PREFIX + "+ state:", state);
	if (DEBUG) console.debug(PREFIX + "+ code:", code);
	if (DEBUG) console.debug(PREFIX + "+ dpopNonce:", dpopNonce);

	// Update HTML page element values.
	// CSS Classes.
	$( DIV_JQ_ISS ).val(iss);
	$( DIV_JQ_STATE ).val(state);
	$( DIV_JQ_CODE ).val(code);
	$( DIV_JQ_DPOP_NONCE ).val(dpopNonce);

	if (GROUP_DEBUG) console.groupEnd(PREFIX);
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

	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + "["+notiReason+"] ["+authorName+"] ["+when.toLocaleString()+"]" );

	// Actualizamos el HTML con el autor.
	let html							= jqRoot.html() + `<div id="notification-${cid}" name="notification${cid}" class="notification">`;
	html								+= `<div class="header">`;
	html								+= `  <a href="${authorURL}"><img src="${authorAvatar}" height="24"/></a> `;
	html								+= `  <a href="${authorURL}"><strong>${authorName}</strong></a>`;
	html								+= `</div>`;
	html								+= `<ul style="margin: 0px 0px 8px 0px">`;
	html								+= `  <li class="notificacion-data">Handle: <strong>${authorHandle}</strong> (<i>Did: <strong>${authorDid}</strong></i>)</li>`;
	// html								+= `  <li class="notificacion-data">Description: <strong>${authorDescription}</strong></li>`;

	if (DEBUG) console.debug(PREFIX + "Updating Notification:");
	if (DEBUG) console.debug(PREFIX + "+ notification:", notification);
	if (DEBUG) console.debug(PREFIX + "+ isRead:", isRead);
	if (DEBUG) console.debug(PREFIX + "+ when:", when.toLocaleString() );
	if (DEBUG) console.debug(PREFIX + "+ Author:", authorName);
	if (DEBUG) console.debug(PREFIX + "  > handle:", authorHandle);
	if (DEBUG) console.debug(PREFIX + "  > did:", authorDid);
	if (DEBUG) console.debug(PREFIX + "  > description:", authorDescription);
	if (DEBUG) console.debug(PREFIX + "  > avatar:", authorAvatar);
	if (DEBUG) console.debug(PREFIX + "  > URL:", authorURL);

	/*
	 * Possible reasons:
		"reason": "follow",
		"reason": "like",
		"reason": "reply",
		"reason": "repost",
		// like, repost, follow, mention, reply, quote, starterpack-joined
	*/
	if (DEBUG) console.debug(PREFIX + "+ Reason:", notiReason);

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
		if (DEBUG) console.debug(PREFIX + "+ userProfileURL:", userProfileURL);
		
		// TEST: Get post
		let bluitUrl					= API.bluesky.XRPC.public + API.bluesky.XRPC.api.public.getPosts + "?uris=" + encodeURIComponent( notiURI );
		let headers						= null;
		let fetchOptions				= null;
		let withAuthentication			= false;
		if (withAuthentication) {
			if (DEBUG) console.debug(PREFIX + "Testing to retrieve the bluit:");
			if (DEBUG) console.debug(PREFIX + "+ bluitUrl:", bluitUrl);

			let dpopRequest				= new TYPES.DPoPRequest(BSKY.data.cryptoKey.privateKey, BSKY.data.jwk, clientId, userAccessToken, accessTokenHash, bluitUrl, BSKY.data.dpopNonce, APICall.HTML_GET);
			let dpopProof				= await DPOP.createDPoPProof(dpopRequest)
			if (DEBUG) console.debug( PREFIX + "Received dpopProof:", JWT.jwtToPrettyJSON( dpopProof ) );

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
		if (DEBUG) console.debug(PREFIX + "+ withAuthentication:", withAuthentication);
		if (DEBUG) console.debug(PREFIX + "+ bluitUrl:", bluitUrl);
		if (DEBUG) console.debug(PREFIX + "+ headers:", COMMON.prettyJson( headers ) );
		if (DEBUG) console.debug(PREFIX + "+ fetchOptions:", COMMON.prettyJson( fetchOptions ) );

		let callResponse				= await APICall.makeAPICall( STEP_NAME, bluitUrl, fetchOptions )
		if (DEBUG) console.debug(PREFIX + "+ callResponse:", callResponse);
		let bluits						= callResponse.body.posts;
		if (DEBUG) console.debug(PREFIX + "+ bluits:", bluits);
		let bluit						= bluits[0];
		if (DEBUG) console.debug(PREFIX + "+ bluit:", bluit);

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
		if (DEBUG) console.debug(PREFIX + "+ referredText:", referredText);
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

	if (GROUP_DEBUG) console.groupEnd(PREFIX);
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
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + "[Response data]" );
	if (DEBUG) console.debug( PREFIX + "Current notifications:", notifications );
	if (DEBUG) console.debug( PREFIX + "Current notifications:", COMMON.prettyJson( notifications ) );
	if (GROUP_DEBUG) console.groupEnd();

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
		if (DEBUG) console.debug( PREFIX + "%cCurrently, " + totalUnread + " UNREAD notifications:", COMMON.CONSOLE_STYLE );
		if (DEBUG) console.debug( PREFIX + "+ unread notifications:", unreadNotifications );

		// Actualizamos el badge y lo mostramos
		$( DIV_JQ_TAB_NOTIS_BADGE ).html(totalUnread);
		COMMON.show( DIV_TAB_NOTIS_BADGE );

		// Ponemos el badge a 0 y lo ocultamos
		for ( let key in unreadNotifications ) {
			currentUnread++;
			if (DEBUG) console.groupCollapsed( PREFIX + `[Noti ${currentUnread}/${totalUnread}]` );
			await htmlRenderSingleNotification( unreadNotifications[key], userAccessToken, clientId, accessTokenHash );
			if (DEBUG) console.groupEnd(PREFIX);
		}
	}

	if (GROUP_DEBUG) console.groupEnd(PREFIX);
}


/* --------------------------------------------------------
 * HTML Render: User Profile.
 * -------------------------------------------------------- */
export function htmlRenderUserProfile( profile ) {
	const STEP_NAME						= "htmlRenderUserProfile";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_COMPARE				= `${PREFIX}[Compare] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

	if (DEBUG) console.debug( PREFIX + "User Profile:", profile );

	$( DIV_JQ_PROFILE_AVATAR ).attr( "src", profile.avatar );
	$( DIV_JQ_PROFILE_AVATAR_TOP ).attr( "src", profile.avatar );

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
		// if (DEBUG) console.debug( PREFIX_COMPARE + "+ PREV userProfile:", COMMON.prettyJson( userProfilePREV ) );
		// if (DEBUG) console.debug( PREFIX_COMPARE + "+ NEW  userProfile:", COMMON.prettyJson( profile ) );

		let following					= profile.followsCount;
		let followers					= profile.followersCount;
		let diffFollowing				= following - userProfilePREV.followsCount;
		let diffFollowers				= followers - userProfilePREV.followersCount;

		if ( (diffFollowing>0) || (diffFollowers>0)) {
			if (GROUP_DEBUG) console.groupCollapsed( PREFIX_COMPARE + `Following: ${diffFollowing}[${following}] - Followers: ${diffFollowers}[${followers}]` );
			// El toast.
			let toastOptions			= {"animation": true, "autohide": true, "delay": 5000};
			let $toast					= $( DIV_JQ_TOAST, toastOptions );
			let $toastImg				= $( DIV_JQ_TOAST + " > .toast-header > img" );
			let $toastBody				= $( DIV_JQ_TOAST + " > .toast-body" );
			let html					= `Diferencia de ${diffFollowers} followers y de ${diffFollowing} following`;
			let delay					= ( CONFIGURATION.global.refresh_dashboard - 1 ) * 1000;

			$toastImg.attr( "src", profile.avatar );
			$toastBody.html( html );
			$toast.show();
			if (GROUP_DEBUG) console.groupEnd();
		} else {
			if (DEBUG) console.debug( PREFIX_COMPARE + `Following: ${diffFollowing}[${following}] - Followers: ${diffFollowers}[${followers}]` );
		}
	}

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * HTML Render: User Follows.
 * -------------------------------------------------------- */
function htmlRenderSingleFollow( idx, user ) {
	const STEP_NAME						= "htmlRenderSingleFollow";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + `[idx=${user.handle}]` );

	if (DEBUG) console.debug( PREFIX + "USER:", user );

	let html							= "";
	html								+= '<tr class="align-top">';
	html								+= `<td>${idx}</td>`;
	html								+= `<td><img src="${user.avatar}" height="20" style="vertical-align: bottom;">&nbsp;<a href="https://bsky.app/profile/${user.handle}" target="_blank" title="${user.handle}">${user.displayName || user.handle}</a></td>`;
	html								+= `<td>${(user.description) ? user.description.substring(0, DESC_MAX_CHARS) : ""}</td>`;
	html								+= `<td>${new Date(user.indexedAt).toLocaleString( LOCALE_SPAIN, LOCALE_OPTIONS )}</td>`;
	html								+= '</tr>';

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
	return html;
}

export function htmlRenderUserFollows( data ) {
	const STEP_NAME						= "htmlRenderUserFollows";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

	if (DEBUG) console.debug(PREFIX + "+ Received:", COMMON.prettyJson( data[0] ) );
	if (DEBUG) console.debug(PREFIX + "+ Received:", COMMON.prettyJson( data[1] ) );
	if (DEBUG) console.debug(PREFIX + "+ Received:", COMMON.prettyJson( data[2] ) );

	let index							= 0;
	let htmlContent						= null;
	let $tableBody						= $( DIV_JQ_TABLE_FOLLOWING + " tbody" );

	// Clear the current content.
	$tableBody.empty();

	// Total
	let total							= data.length;
	$( DIV_JQ_TAB_FOLLOWING_BADGE ).html(total);
	if ( total>0 ) {
		// Add data.
		data.forEach( user => {
			index++;
			htmlContent					= htmlRenderSingleFollow( index, user );
			$tableBody.append( htmlContent );
		});
	}

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * HTML Render: User Follows (from repository).
 * -------------------------------------------------------- */
export function htmlRenderUserFollowsFromRepo( data ) {
	const STEP_NAME						= "htmlRenderUserFollowsFromRepo";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

	if (DEBUG) console.warn( PREFIX + "Under development yet!" );
	if (DEBUG) console.debug(PREFIX + "+ Received:", COMMON.prettyJson( data[0] ) );
	if (DEBUG) console.debug(PREFIX + "+ Received:", COMMON.prettyJson( data[1] ) );
	if (DEBUG) console.debug(PREFIX + "+ Received:", COMMON.prettyJson( data[2] ) );

	/*
	 * Received an array of:
		{
		  "uri": "at://did:plc:tjc27aje4uwxtw5ab6wwm4km/app.bsky.graph.follow/3li2xzgdvwo22",
		  "cid": "bafyreicrmjb4jabxmjglsjsbtabfft6a33c6dtvi6ampbojg2pwarhknci",
		  "value": {
			"$type": "app.bsky.graph.follow",
			"subject": "did:plc:yusufixihqclq3mb2o5o6iif",
			"createdAt": "2025-02-13T15:13:06.647Z"
		  }
		}
		{
		  "uri": "at://did:plc:tjc27aje4uwxtw5ab6wwm4km/app.bsky.graph.follow/3li2unj7njk2h",
		  "cid": "bafyreieky52bekgu7hwcbd4f5j6kifl2dpdafngoxwgspfkrq7emhy55je",
		  "value": {
			"$type": "app.bsky.graph.follow",
			"subject": "did:plc:lnwaez6y2snt7jh2tbmktgkg",
			"createdAt": "2025-02-13T14:12:45.664Z"
		  }
		}
		{
		  "uri": "at://did:plc:tjc27aje4uwxtw5ab6wwm4km/app.bsky.graph.follow/3lhvhkp7cjz2t",
		  "cid": "bafyreic34rqons4t6m5ljmjb2menrj7ovcxf5ybocmzpjicw62yigx5i4m",
		  "value": {
			"$type": "app.bsky.graph.follow",
			"subject": "did:plc:apkhfnhhbxsei3ni7dkvyvan",
			"createdAt": "2025-02-11T10:35:14.576Z"
		  }
		}
	 *
	 */

	/*
	let index							= 0;
	let htmlContent						= null;
	let $tableBody						= $( DIV_JQ_TABLE_FOLLOWING + " tbody" );
	const content						= ( idx, user ) => `<tr class="align-top">
											<td>${idx}</td>
											<td><img src="${user.avatar}" height="20" style="vertical-align: bottom;">&nbsp;<a href="https://bsky.app/profile/${user.handle}" target="_blank" title="${user.handle}">${user.displayName || user.handle}</a></td>
											<td>${(user.description) ? user.description.substring(0, DESC_MAX_CHARS) : ""}</td>
											<td>${new Date(user.indexedAt).toLocaleString( LOCALE_SPAIN, LOCALE_OPTIONS )}</td>
											</tr>`;
	// Clear the current content.
	$tableBody.empty();
	// Add data.
	for ( index in data ) {
		htmlContent						= content( Number(index)+1, data[index] );
		$tableBody.append( htmlContent );
	}
	 */

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * HTML Render: User Followers.
 * -------------------------------------------------------- */
function htmlRenderSingleFollower( idx, user ) {
	const STEP_NAME						= "htmlRenderSingleFollower";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + `[idx=${user.handle}]` );

	if (DEBUG) console.debug( PREFIX + "USER:", user );

	let html							= "";
	html								+= '<tr class="align-top">';
	html								+= `<td>${idx}</td>`;
	html								+= `<td><img src="${user.avatar}" height="20" style="vertical-align: bottom;">&nbsp;<a href="https://bsky.app/profile/${user.handle}" target="_blank" title="${user.handle}">${user.displayName || user.handle}</a></td>`;
	html								+= `<td>${(user.description) ? user.description.substring(0, DESC_MAX_CHARS) : ""}</td>`;
	html								+= `<td>${new Date(user.indexedAt).toLocaleString( LOCALE_SPAIN, LOCALE_OPTIONS )}</td>`;
	html								+= '</tr>';

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
	return html;
}

export function htmlRenderUserFollowers( data ) {
	const STEP_NAME						= "htmlRenderUserFollowers";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

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
			htmlContent					= htmlRenderSingleFollower( index, user );
			$tableBody.append( htmlContent );
		});
	}

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * HTML Render: User Blocks.
 * -------------------------------------------------------- */
function htmlRenderSingleBlock( idx, user ) {
	const STEP_NAME						= "htmlRenderSingleBlock";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + `[idx=${user.handle}]` );

	if (DEBUG) console.debug( PREFIX + "USER:", user );

	let html							= "";
	html								+= '<tr class="align-top">';
	html								+= `<td>${idx}</td>`;
	html								+= `<td>${user.viewer.muted}</td>`;
	html								+= `<td><img src="${user.avatar}" height="20" style="vertical-align: bottom;">&nbsp;<a href="https://bsky.app/profile/${user.handle}" target="_blank" title="${user.handle}">${user.displayName || user.handle}</a></td>`;
	html								+= `<td>${(user.description) ? user.description.substring(0, DESC_MAX_CHARS) : ""}</td>`;
	html								+= `<td>${new Date(user.indexedAt).toLocaleString( LOCALE_SPAIN, LOCALE_OPTIONS )}</td>`;
	html								+= '</tr>';

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
	return html;
}

export function htmlRenderUserBlocks( data ) {
	const STEP_NAME						= "htmlRenderUserBlocks";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

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
			htmlContent					= htmlRenderSingleBlock( index, user );
			$tableBody.append( htmlContent );
		});
	}

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * HTML Render: User Mutes.
 * -------------------------------------------------------- */
function htmlRenderSingleMute( idx, user ) {
	const STEP_NAME						= "htmlRenderSingleMute";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + `[idx=${user.handle}]` );

	if (DEBUG) console.debug( PREFIX + "USER:", user );

	let html							= "";
	html								+= '<tr class="align-top">';
	html								+= `<td>${idx}</td>`;
	html								+= `<td>${user.viewer.blockedBy}</td>`;
	html								+= `<td><img src="${user.avatar}" height="20" style="vertical-align: bottom;">&nbsp;<a href="https://bsky.app/profile/${user.handle}" target="_blank" title="${user.handle}">${user.displayName || user.handle}</a></td>`;
	html								+= `<td>${(user.description) ? user.description.substring(0, DESC_MAX_CHARS) : ""}</td>`;
	html								+= `<td>${new Date(user.indexedAt).toLocaleString( LOCALE_SPAIN, LOCALE_OPTIONS )}</td>`;
	html								+= '</tr>';

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
	return html;
}

export function htmlRenderUserMutes( data ) {
	const STEP_NAME						= "htmlRenderUserMutes";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

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
			htmlContent					= htmlRenderSingleMute( index, user );
			$tableBody.append( htmlContent );
		});
	}

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * HTML Render: User Lists.
 * -------------------------------------------------------- */
function htmlRenderSingleList( idx, list, id ) {
	const STEP_NAME						= "htmlRenderSingleList";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + `[idx=${idx}] [id=${id}]` );

	if (DEBUG) console.debug( PREFIX + "LIST:", list );

	let html							= "";
	html								+= '<tr class="align-top">';
	html								+= `<td>${idx}</td>`;
	html								+= `<td>${list.listItemCount}</td>`;
	html								+= `<td><a href="https://bsky.app/profile/${list.creator.handle}/lists/${id}" target="_blank" title="${list.name}">${list.name}</a></td>`;
	html								+= `<td>${(list.description) ? list.description.substring(0, DESC_MAX_CHARS) : ""}</td>`;
	html								+= `<td>${new Date(list.indexedAt).toLocaleString( LOCALE_SPAIN, LOCALE_OPTIONS )}</td>`;
	html								+= '</tr>';

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
	return html;
}

export function htmlRenderUserLists( data ) {
	const STEP_NAME						= "htmlRenderUserLists";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

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

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * HTML Render: Trending Topics.
 * -------------------------------------------------------- */
export function htmlRenderTrendingTopics( data ) {
	const STEP_NAME						= "htmlRenderTrendingTopics";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

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

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
}

