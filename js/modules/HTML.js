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
// Common HTML Constants
import * as HTMLConstants				from "./HTML.Constants.js";
export * from "./HTML.Constants.js";
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
const GLOBAL							= CONFIGURATION.global;

// Bluesky constants


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
	$( '#'+HTMLConstants.DIV_DATE_TIME ).val( now.toLocaleString( HTMLConstants.LOCALE_SPAIN, HTMLConstants.LOCALE_OPTIONS ) );
}

export function updateHighlight() {
	$( '#'+HTMLConstants.DIV_GIT_INFO_JSON ).removeAttr('data-highlighted');
	$( '#'+HTMLConstants.DIV_ACCESS_TOKEN_JSON ).removeAttr('data-highlighted');
	$( '#'+HTMLConstants.DIV_ACCESS_TOKEN_JWT ).removeAttr('data-highlighted');
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
		COMMON.show( HTMLConstants.DIV_PANEL_ERROR );
	}

	if ( isInstanceOfAccessTokenError ) {
		if (window.BSKY.DEBUG) console.debug(PREFIX + "+ code........:", error.code);
		if (window.BSKY.DEBUG) console.debug(PREFIX + "+ message.....:", error.message);

		// Update the error fields
		if ( renderHTMLErrors ) {
			$( '#'+HTMLConstants.DIV_ERROR ).html(error.title);
			$( '#'+HTMLConstants.DIV_ERROR_DESCRIPTION ).val(error.message);
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
			$( '#'+HTMLConstants.DIV_ERROR ).html(error.message);
			if ( error.isJson ) {
				let msg					= ( error.json.error ) ? error.json.error + ": " : "";
				msg						+= ( error.json.message ) ? error.json.message : "";
				msg						+= ( error.json.error_description ) ? error.json.error_description : "";
				$( '#'+HTMLConstants.DIV_ERROR_DESCRIPTION ).val(msg);
			} else {
				let msg					= `[${error.step}] Error [${error.statusText}] invocando a: [${error.url}]`;
				$( '#'+HTMLConstants.DIV_ERROR_DESCRIPTION ).val(msg);
			}
		}
	} else if ( error.error && error.message ) {
		// Puede venir también un: "{"error":"InternalServerError","message":"Internal Server Error"}"
		if (window.BSKY.DEBUG) console.debug(PREFIX + "+ error.......:", error.error);
		if (window.BSKY.DEBUG) console.debug(PREFIX + "+ message.....:", error.message);

		// Update the error fields
		if ( renderHTMLErrors ) {
			$( '#'+HTMLConstants.DIV_ERROR ).html(error.error);
			$( '#'+HTMLConstants.DIV_ERROR_DESCRIPTION ).val(error.message);
		}
	} else {
		// Unknown error type. Update the error fields
		if ( renderHTMLErrors ) {
			$( '#'+HTMLConstants.DIV_ERROR ).html("ERROR");
			$( '#'+HTMLConstants.DIV_ERROR_DESCRIPTION ).val(error.message);
		}
	}
	if (window.BSKY.DEBUG) console.debug( PREFIX + "ERROR dpopNonce........:", BSKY.data.dpopNonce );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "ERROR dpopNonceUsed....:", BSKY.data.dpopNonceUsed );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "ERROR dpopNonceReceived:", BSKY.data.dpopNonceReceived );

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}

export function clearHTMLError() {
	// Clear and hide error fields and panel
	$( '#'+HTMLConstants.DIV_ERROR ).html("");
	$( '#'+HTMLConstants.DIV_ERROR_DESCRIPTION ).val("");
	COMMON.hide( HTMLConstants.DIV_PANEL_ERROR );
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
	$( '#'+HTMLConstants.DIV_ISS ).val(iss);
	$( '#'+HTMLConstants.DIV_STATE ).val(state);
	$( '#'+HTMLConstants.DIV_CODE ).val(code);
	$( '#'+HTMLConstants.DIV_DPOP_NONCE ).val(dpopNonce);

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return response;
}

export function updateUserAccessToken(clientId, userAccessToken) {
	$( '#'+HTMLConstants.DIV_CLIENT_ID ).val( clientId );
	$( '#'+HTMLConstants.DIV_ACCESS_TOKEN_JWT ).text( userAccessToken );
	$( '#'+HTMLConstants.DIV_ACCESS_TOKEN_JSON ).text( JWT.jwtToPrettyJSON( userAccessToken ) );
}

export function updateUserDIDInfo() {
	let $linkClientID					= $( '#'+HTMLConstants.DIV_BTN_CLIENT_ID );
	let $linkDIDDocument				= $( '#'+HTMLConstants.DIV_BTN_DID_DOCUMENT );
	$linkClientID.attr("href",  CLIENT_APP.client_id);
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
		if ( !COMMON.isNullOrEmpty( step ) && GLOBAL.show_info_step ) {
			$( '#'+HTMLConstants.DIV_PANEL_INFO_STEP ).html( `[${step}] ${message}` );
		} else {
			$( '#'+HTMLConstants.DIV_PANEL_INFO_STEP ).html( `${message}` );
		}
	} else {
		$( '#'+HTMLConstants.DIV_PANEL_INFO_STEP ).html( "&nbsp;" );
	}
}


/* --------------------------------------------------------
 * HTML Render: Notification.
 * -------------------------------------------------------- */
async function getReferredBluit( notiURI ) {
	const STEP_NAME						= "getReferredBluit";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	let bluitUrl						= API.bluesky.XRPC.public + API.bluesky.XRPC.api.public.getPosts + "?uris=" + encodeURIComponent( notiURI );
	let headers							= {
		'Accept': APICall.CONTENT_TYPE_JSON,
	}
	let fetchOptions					= {
		method: APICall.HTML_GET,
		headers: headers
	}
	if (window.BSKY.DEBUG) console.debug(PREFIX + "+ bluitUrl:", bluitUrl);
	if (window.BSKY.DEBUG) console.debug(PREFIX + "+ headers:", COMMON.prettyJson( headers ) );
	if (window.BSKY.DEBUG) console.debug(PREFIX + "+ fetchOptions:", COMMON.prettyJson( fetchOptions ) );

	let callResponse					= await APICall.makeAPICall( STEP_NAME, bluitUrl, fetchOptions )
	if (window.BSKY.DEBUG) console.debug(PREFIX + "+ callResponse:", callResponse);
	let bluits							= callResponse.body.posts;
	if (window.BSKY.DEBUG) console.debug(PREFIX + "+ bluits:", bluits);
	let bluit							= bluits[0];
	if (window.BSKY.DEBUG) console.debug(PREFIX + "+ bluit:", bluit);

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return bluit;
}

async function htmlRenderNotification( idx, notification, userAccessToken, clientId, accessTokenHash ) {
	const STEP_NAME						= "htmlRenderNotification";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;

	// Vamos preparando el HTML para la notificación.
	let jqRoot							= $( '#'+HTMLConstants.DIV_NOTIFICATIONS );

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
	let authorURL						= API.bluesky.profile.url + authorHandle;

	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + "["+notiReason+"] ["+authorName+"] ["+when.toLocaleString()+"]" );

	// El icono principal.
	/* Possible reasons: like, repost, follow, mention, reply, quote, starterpack-joined */
	let svgIcon							= "";
	let smNoti							= notiReason.toLowerCase();
	const svgSize						= "24px";
	switch ( smNoti ) {
		case "follow":
		case "like":
		case "quote":
		case "reply":
		case "repost":
			svgIcon						= `<svg class="bi me-2" role="img" width="${svgSize}" height="${svgSize}" alt="${smNoti}" title="t-${smNoti}" aria-label="${smNoti}" ><use alt="${smNoti}" title="t-${smNoti}" xlink:href="#${smNoti}"/></svg>`;
			break;
	}

	// Actualizamos el Header HTML con la info de la notificación.
	let htmlHeader						= `<h2  class="accordion-header notificacion-header">`;
	htmlHeader							+= `  <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#notification-body-${cid}" aria-expanded="${idx===1 ? "true" : "false"}" aria-controls="notification-body-${cid}"> `;
	htmlHeader							+= `  ${svgIcon}&nbsp;`;
	htmlHeader							+= `<a href="javascript:void(0)" onClick="BSKY.showProfile('${authorHandle}', '${authorDid}')" data-bsky-handle="${authorHandle}" data-bsky-did="${authorDid}" data-bs-toggle="modal" data-bs-target="#${HTMLConstants.DIV_MODAL_USER_PROFILE}" data-bs-dismiss="modal">`;
	if (authorAvatar) {
		htmlHeader						+= `<img src="${authorAvatar}" height="${svgSize}"/>`;
	} else {
		htmlHeader						+= `<i class="bi bi-person-slash" height="${svgSize}"></i>`;
	}
	htmlHeader							+= `</a>`;
	htmlHeader							+= `  <a href="${authorURL}" class="ps-2" title="Handle: ${authorHandle}, DID: ${authorDid}"><strong>${authorName}</strong></a>`;
	htmlHeader							+= `</h2 >`;

	// Actualizamos el Body HTML con la info de la notificación.
	let htmlBody						= `<div id="notification-body-${cid}" class="accordion-body accordion-collapse collapse ${idx===1 ? "show " : ""}notificacion-body" data-bs-parent="#${HTMLConstants.DIV_NOTIFICATIONS}">`;
	// let htmlBody						= `<div class="accordion-body notificacion-body">`;
	htmlBody							+= `  <ul style="margin: 0px 0px 8px 0px">`;

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

	/* Possible reasons: like, repost, follow, mention, reply, quote, starterpack-joined */
	if (window.BSKY.DEBUG) console.debug(PREFIX + "+ Reason:", notiReason);
	if ( COMMON.areEquals( notiReason, "follow" ) ) {
		// It's a "follow" notification.
			htmlBody					+= `    <li class="notificacion-data"><strong>${notiReason} you</strong></li>`;
	} else {
		// It's about an action on a post.
		let replyText					= null;
		if ( COMMON.areEquals( notiReason, "reply" ) ) {
			replyText					= notification.record.text;
		}

		/*
		if ( COMMON.areEquals( notiReason, "reply" ) ) {
			notiURI						= notification.record.reply.parent.uri;
			replyText					= notification.record.text;
		} else {
			notiURI						= notification.record.subject.uri;
		}
		*/

		// Get the referred bluit
		let notiURI						= "";
		notiURI							= notification.record.uri ? notification.record.uri
										  : notification.record?.subject?.uri ? notification.record.subject.uri
										  : notification.record?.embed?.record?.uri ? notification.record.embed.record.uri
										  : notification.record?.embed?.external?.uri ? notification.record.embed.external.uri
										  : notification.record?.reply?.parent?.uri ? notification.record.reply.parent.uri
										  : notification.record?.reply?.root?.uri ? notification.record.reply.root.uri
										  : null;
		let bluit						= null;
		let userProfileURL				= null;
		htmlBody						+= `    <li class="notificacion-data">${notiReason}`;
		if ( notiURI ) {
			let notiURISplitted			= notiURI.substring(5).split("/")
			let notiDID					= notiURISplitted[0];
			let notiBluitID				= notiURISplitted[2];
			userProfileURL				= API.bluesky.profile.url + notiDID + "/post/" + notiBluitID;
			if (window.BSKY.DEBUG) console.debug(PREFIX + "+ userProfileURL:", userProfileURL);
			
			try {
				bluit					= await getReferredBluit( notiURI );

				// Agregamos la info al html...
				let referredText		= `Not detected yet for ${notiReason}!`;
				let referredTextExtra	= "";

				// The "proper" text.
				referredText			= "<blockquote>";
				referredText			+= bluit?.record?.text ? bluit.record.text : "nothing in <code>bluit.record.text</code>";
				referredText			+= "</blockquote>";

				// The "related" text.
				referredTextExtra		= bluit?.embed?.record?.value?.text ? `<em>${bluit.embed.record.value.text}</em>`
											: bluit?.record?.embed?.external?.title ? `<em>${bluit.record.embed.external.title}</em>`
											: bluit?.embed?.external?.title ? `<em>${bluit.embed.external.title}</em>`
											: bluit?.embed?.record?.text ? `<em>${bluit.embed.record.text}</em>`
											: "";
											// : "<strong>no referred bluit in <code>bluit.embed.record.value.text</code> or <code>bluit.record.embed.external.title</code> or <code>bluit.embed.external.title</code> or <code>bluit.embed.record.text</code></strong>";
				referredText			+= ( referredTextExtra.trim().length>0 ) ? `Referred to bluit: <blockquote>${referredTextExtra}</blockquote>` : "";

				// HTML Tune-up
				referredText			= referredText.replaceAll( '\n', '<br/>' );
				if (window.BSKY.DEBUG) console.debug(PREFIX + "+ referredText:", referredText);

				// Add the text to the "body"
				if (replyText) {
					htmlBody				+= `:<blockquote><i class="text-primary">${replyText}</i></blockquote>to `;
				} else {
				htmlBody				+= ` `;
				}
				htmlBody				+= `<a href="${userProfileURL}" target="post-${cid}">this post</a>: ${referredText}`;
			} catch (error) {
				if (window.BSKY.DEBUG) console.debug(PREFIX + `ERROR retrieving the referred bluit[@${notiURI}]:`, error);
			}
		}
		htmlBody						+= `    </li>`;
	}
	htmlBody							+= `  </ul>`;
	htmlBody							+= `</div>`;

	// Pintamos el HTML final.
	let html							= `<div id="notification-${cid}" name="notification-${cid}" class="accordion-item notification">`;
	html								+= htmlHeader;
	html								+= htmlBody;
	html								+= '</div>';
	jqRoot.html( jqRoot.html() + html );

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}

export function htmlRenderNoNotifications() {
	// Ponemos el badge a 0 y lo ocultamos
	$( '#'+HTMLConstants.DIV_TAB_NOTIS_BADGE ).html(0);
	COMMON.hide( HTMLConstants.DIV_TAB_NOTIS_BADGE );

	// Limpiamos el "DIV" de las notis.
	$( '#'+HTMLConstants.DIV_PANEL_NOTIFICATIONS ).removeClass( "accordion" );
	$( '#'+HTMLConstants.DIV_PANEL_NOTIFICATIONS ).html( '<div id="notifications" name="notifications" class="notifications">No notifications found</div>' );
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
	let jqRoot							= $( '#'+HTMLConstants.DIV_NOTIFICATIONS );
	jqRoot.html( "" );

	let totalUnread						= unreadNotifications.length;
	let currentUnread					= 0;
	if ( totalUnread > 0) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + "%cCurrently, " + totalUnread + " UNREAD notifications:", COMMON.CONSOLE_STYLE );
		if (window.BSKY.DEBUG) console.debug( PREFIX + "+ unread notifications:", unreadNotifications );

		// Actualizamos el badge y lo mostramos
		$( '#'+HTMLConstants.DIV_TAB_NOTIS_BADGE ).html(totalUnread);
		COMMON.show( HTMLConstants.DIV_TAB_NOTIS_BADGE );
		$( '#'+HTMLConstants.DIV_NOTIFICATIONS ).addClass( "accordion" );

		// Ponemos el badge a 0 y lo ocultamos
		for ( let key in unreadNotifications ) {
			currentUnread++;
			if (window.BSKY.DEBUG) console.groupCollapsed( PREFIX + `[Noti ${currentUnread}/${totalUnread}]` );
			await htmlRenderNotification( currentUnread, unreadNotifications[key], userAccessToken, clientId, accessTokenHash );
			if (window.BSKY.DEBUG) console.groupEnd(PREFIX);
		}
	}

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
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
		$( '#'+HTMLConstants.DIV_PROFILE_AVATAR ).attr( "src", profile.avatar );
		$( '#'+HTMLConstants.DIV_PROFILE_AVATAR_TOP ).attr( "src", profile.avatar );
	} else {
		$( '#'+HTMLConstants.DIV_PROFILE_AVATAR ).attr( "src", HTMLConstants.BLANK_IMAGE );
		$( '#'+HTMLConstants.DIV_PROFILE_AVATAR_TOP ).attr( "src", HTMLConstants.BLANK_IMAGE );
	}

	$( '#'+HTMLConstants.DIV_PROFILE_NAME ).html( profile.displayName || profile.handle );
	$( '#'+HTMLConstants.DIV_PROFILE_NAME_TOP ).html( profile.displayName || profile.handle );

	$( '#'+HTMLConstants.DIV_PROFILE_HANDLE ).html( profile.handle );
	$( '#'+HTMLConstants.DIV_PROFILE_HANDLE_TOP ).html( "@" + profile.handle );

	$( '#'+HTMLConstants.DIV_PROFILE_FOLLOWERS ).html( profile.followersCount );
	$( '#'+HTMLConstants.DIV_PROFILE_FOLLOWING ).html( profile.followsCount );
	$( '#'+HTMLConstants.DIV_PROFILE_POSTS ).html( profile.postsCount );
	$( '#'+HTMLConstants.DIV_PROFILE_DESCRIPTION ).html( profile.description );

	// El enlace de arriba
	let $link							= $( '#'+HTMLConstants.DIV_PROFILE_HANDLE_TOP );
	let href							= API.bluesky.profile.url + profile.handle;
	$link.attr("href",  href);
	$link.attr("alt",   `ALT: ${profile.description}`);
	$link.attr("title", `TITLE: ${profile.description}`);

	// El enlace del perfil
	$link								= $( '#'+HTMLConstants.DIV_PROFILE_HANDLE_LINK );
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
			let $toast					= $( '#'+HTMLConstants.DIV_TOAST_INFO, toastOptions );
			let $toastImg				= $( '#'+HTMLConstants.DIV_TOAST_INFO + " > .toast-header > img" );
			let $toastBody				= $( '#'+HTMLConstants.DIV_TOAST_INFO + " > .toast-body" );
			let html					= `Diferencia de ${diffFollowers} followers y de ${diffFollowing} following`;
			let delay					= ( window.BSKY.refreshDynamicSeconds - 1 ) * 1000;

			if (profile.avatar) {
				$toastImg.attr( "src", profile.avatar );
			} else {
				$toastImg.attr( "src", HTMLConstants.BLANK_IMAGE );
			}
			$toastBody.html( html );
			$toast.show();

			if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
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
	 *   <i class="bi bi-person-fill-dash"></i>&nbsp;Blocked By</button>
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
		html							+= `<td><a href="${API.bluesky.profile.url}${handle}" target="_blank" title="${handle}">${handle}</a></td>`;
		html							+= `<td class="text-danger fw-medium theme-smaller">${profile.body.error}: ${profile.body.message}</td>`;
		html							+= '</tr>';
	} else {
		handle							= profile.handle;
		const defaultColor				= "text-body-tertiary";

		// The labels part
		let labels						= profile.labels;
		let labelsAsStr					= "";
		if (!COMMON.isNullOrEmpty(labels)) {
			if (window.BSKY.DEBUG) console.debug( PREFIX + `+ Labels:`, labels );
			labelsAsStr					= labels.map(lbl => lbl.val);
		}

		// The viewer part
		let viewer						= profile.viewer;
		if (window.BSKY.DEBUG) console.debug( PREFIX + `+ Viewer:`, viewer );

		// The dataset
		let dataset						= "";
		dataset							+= " " + HTMLConstants.DATASET_PREFIX + `following="${!COMMON.isNullOrEmpty(viewer.following)}"`;
		dataset							+= " " + HTMLConstants.DATASET_PREFIX + `followed-by="${!COMMON.isNullOrEmpty(viewer.followedBy)}"`;
		dataset							+= " " + HTMLConstants.DATASET_PREFIX + `blocked="${viewer?.blocking || false}"`;
		dataset							+= " " + HTMLConstants.DATASET_PREFIX + `blocked-by="${viewer?.blockedBy || false}"`;
		dataset							+= " " + HTMLConstants.DATASET_PREFIX + `muted="${viewer?.muted || false}"`;
		dataset							+= " " + HTMLConstants.DATASET_PREFIX + `blocked-by-list="${viewer?.blockingByList || false}"`;
		dataset							+= " " + HTMLConstants.DATASET_PREFIX + `muted-by-list="${viewer?.mutedByList || false}"`;

		// The HTML.
		html							+= `<tr class="theme-record-item align-top"${dataset}>`;
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
		html							+= `&nbsp;<i class="bi bi-person-fill-dash ${viewer.blockedBy ? "text-white bg-danger" : defaultColor}" title="you are ${viewer.blockedBy ? "" : "NOT "}blocked by this profile"></i>`;
		html							+= `&nbsp;<i class="bi bi-person-slash ${viewer.muted ? "text-white bg-primary" : defaultColor}" title="you are ${viewer.muted ? "" : "NOT "}muting this profile"></i>`;
		html							+= `&nbsp;<i class="bi bi-list-ul ${viewer?.blockingByList ? "text-white bg-dark" : defaultColor}" title="you are ${viewer?.blockingByList ? "" : "NOT "}blocking this profile thru list${viewer?.blockingByList ? ": " + viewer?.blockingByList?.name : ""}"></i>`;
		html							+= `&nbsp;<i class="bi bi-list-stars ${viewer?.mutedByList ? "text-white bg-primary" : defaultColor}" title="you are ${viewer?.mutedByList ? "" : "NOT "}muting this profile thru list${viewer?.mutedByList ? ": " + viewer?.mutedByList?.name : ""}"></i>`;

		html							+= `</td><td>`;
		html							+= `<a href="javascript:void(0)" onClick="BSKY.showProfile('${profile.handle}', '${profile.did}')" data-bsky-handle="${profile.handle}" data-bsky-did="${profile.did}" data-bs-toggle="modal" data-bs-target="#${HTMLConstants.DIV_MODAL_USER_PROFILE}" data-bs-dismiss="modal">`;
		if (profile.avatar) {
			html						+= `<img src="${profile.avatar}"`;
		} else {
			html						+= `<img src="${HTMLConstants.BLANK_IMAGE}"`;
		}
		html							+= ` height="20" style="vertical-align: bottom;"></a>&nbsp;`;
		html							+= `<a href="${API.bluesky.profile.url}${handle}" target="_blank" title="${handle}">${profile.displayName || handle}</a></td>`;
		html							+= `<td class="theme-smaller">${(profile.description) ? profile.description.substring(0, HTMLConstants.DESC_MAX_CHARS) : ""}</td></tr>`;
		
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
	let $tableBody						= $( '#'+HTMLConstants.DIV_TABLE_FOLLOWING + " tbody" );

	// Clear the current content.
	$tableBody.empty();
	$( '#'+HTMLConstants.DIV_TAB_FOLLOWING_BADGE ).html(data.missingProfiles.length + data.profiles.length);
	$( '#'+HTMLConstants.DIV_TAB_FOLLOWING_TOTAL ).html(data.missingProfiles.length + data.profiles.length);

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
	let $tableBody						= $( '#'+HTMLConstants.DIV_TABLE_FOLLOWERS + " tbody" );

	// Clear the current content.
	$tableBody.empty();

	// Total
	let total							= data.length;
	$( '#'+HTMLConstants.DIV_TAB_FOLLOWERS_BADGE ).html(total);
	$( '#'+HTMLConstants.DIV_TAB_FOLLOWERS_TOTAL ).html(total);

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
	let $tableBody						= $( '#'+HTMLConstants.DIV_TABLE_BLOCKING + " tbody" );

	// Clear the current content.
	$tableBody.empty();

	// Total
	let total							= data.length;
	$( '#'+HTMLConstants.DIV_TAB_BLOCKS_BADGE ).html(total);
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
	let $tableBody						= $( '#'+HTMLConstants.DIV_TABLE_MUTING + " tbody" );

	// Clear the current content.
	$tableBody.empty();

	// Total
	let total							= data.length;
	$( '#'+HTMLConstants.DIV_TAB_MUTED_BADGE ).html(total);
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
	html								+= `<td><a href="${API.bluesky.profile.url}${list.creator.handle}/lists/${id}" target="_blank" title="${list.name}" class="text-success theme-bolder">${list.name}</a></td>`;
	html								+= `<td>${(list.description) ? list.description.substring(0, HTMLConstants.DESC_MAX_CHARS) : ""}</td>`;
	html								+= `<td>${new Date(list.indexedAt).toLocaleString( HTMLConstants.LOCALE_SPAIN, HTMLConstants.LOCALE_OPTIONS )}</td>`;
	html								+= '</tr>';

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return html;
}

function htmlRenderSingleModList( idx, list, id, muting=false ) {
	const STEP_NAME						= "htmlRenderSingleModList";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[idx=${idx}] [id=${id}]` );

	if (window.BSKY.DEBUG) console.debug( PREFIX + "LIST:", list );

	let textColour						= muting ? "text-warning" : "text-danger";
	let html							= "";
	html								+= '<tr class="align-top">';
	html								+= `<td>${idx}</td>`;
	html								+= `<td>${list.listItemCount}</td>`;
	html								+= `<td>`;
	html								+= `<a href="${API.bluesky.profile.url}${list.creator.handle}/lists/${id}" target="_blank" title="${list.name}" class="${textColour} theme-bolder">${list.name}</a>`;
	html								+= `, by `;
	html								+= `<a href="${API.bluesky.profile.url}${list.creator.handle}" target="_blank" title="${list.creator.displayName || list.creator.name}">${list.creator.displayName || list.creator.name}</a>`;
	html								+= `</td>`;
	html								+= `<td>${(list.description) ? list.description.substring(0, HTMLConstants.DESC_MAX_CHARS) : ""}</td>`;
	html								+= `<td>${new Date(list.indexedAt).toLocaleString( HTMLConstants.LOCALE_SPAIN, HTMLConstants.LOCALE_OPTIONS )}</td>`;
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
	let targetTable						= HTMLConstants.DIV_TABLE_MY_LISTS;
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Target table:", targetTable );
	let $tableBody						= $( '#'+targetTable + " tbody" );

	// Clear the current content.
	$tableBody.empty();

	// Total
	let total							= data.length;
	$( '#'+HTMLConstants.DIV_TAB_MY_LISTS_BADGE ).html(total);
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


export function htmlRenderUserModerationLists( data, muting=false ) {
	const STEP_NAME						= "htmlRenderUserModerationLists";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[muting=${muting}]` );

	let index							= 0;
	let id								= null;
	let htmlContent						= null;
	let targetTable						= muting ? HTMLConstants.DIV_TABLE_MY_MOD_M_LISTS : HTMLConstants.DIV_TABLE_MY_MOD_B_LISTS;
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Target table:", targetTable );
	let $tableBody						= $( '#'+targetTable + " tbody" );

	// Clear the current content.
	$tableBody.empty();

	// Total
	let total							= data.length;
	// $( '#'+HTMLConstants.DIV_TAB_MY_LISTS_BADGE ).html(total);
	if ( total>0 ) {
		// Add data.
		data.forEach( list => {
			index++;
			id							= list.uri.split("/")[4];
			htmlContent					= htmlRenderSingleModList( index, list, id, muting );
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
	let $container						= $( '#'+HTMLConstants.DIV_TRENDING_TOPICS );

	// Clear the current content.
	$container.html("");

	// Total
	let total							= data.topics.length;
	if ( total>0 ) {
		// Add data.
		data.topics.forEach( item => {
			index++;
			htmlContent					+= `<a href="${API.bluesky.profile.root}${item.link}" role="button" class="btn btn-sm btn-outline-dark m-1 rounded rounded-3" target="_blank" aria-disabled="true">${item.topic}</button>`;
		});
		$container.html( htmlContent );
	}

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * HTML Render: Filters following list with options.
 * -------------------------------------------------------- */
export function fnFilterTable( item ) {
	const STEP_NAME						= "fnFilterTable";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const TEST							= true;
	if (TEST || window.BSKY.DEBUG) console.groupCollapsed( PREFIX );

	const TARGET_CLASS					= "theme-record-item";

	// First, hide all records
	// ---------------------------------------------------------
	let targetTable						= item.dataset.bskyTarget;
	if (TEST || window.BSKY.DEBUG) console.debug( PREFIX + `  + [TARGET Table.==${targetTable}]` );

	let rootSelector					= `#${targetTable} tbody tr.${TARGET_CLASS}`;
	if (TEST || window.BSKY.DEBUG) console.debug( PREFIX + "First, let's display all records...", rootSelector );

	let $matches						= $( rootSelector );
	if ( $matches.length>0 ) {
		if (TEST || window.BSKY.DEBUG) console.debug( PREFIX + `Found ${$matches.length} record(s).` );
		$matches.hide();
	} else {
		if (TEST || window.BSKY.DEBUG) console.debug( PREFIX + "No record(s) found." );

		if (TEST || window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
		if (TEST || window.BSKY.DEBUG) console.groupEnd();
		return;
	}

	// Examine the "constraints"
	// ---------------------------------------------------------
	if (TEST || window.BSKY.DEBUG) console.debug( PREFIX + "Let's look for the 'checked' radio buttons..." );
	let targetFilter					= null;
	let finalSelector					= "";
	let selector						= "";
	let parentForm						= "";
	let selectors						= {};
	let matches							= null;
	let checkedRadios					= item.querySelectorAll( "input[type='radio']:checked" );
	
	if ( checkedRadios.length>0 ) {
		if (TEST || window.BSKY.DEBUG) console.debug( PREFIX + `Found ${checkedRadios.length}. Let's see which radio buttons have been checked...` );
		checkedRadios.forEach( match => {
			if (TEST || window.BSKY.DEBUG) console.debug( PREFIX + `+ Radio button:` );
			if (TEST || window.BSKY.DEBUG) console.debug( PREFIX + `  + [ID...........==${match.id}]` );
			if (TEST || window.BSKY.DEBUG) console.debug( PREFIX + `  + [Name.........==${match.name}]` );
			if (TEST || window.BSKY.DEBUG) console.debug( PREFIX + `  + [Value........==${match.value}]` );
			
			// Guess the targets; both, the table object and the type of fields
			if (TEST || window.BSKY.DEBUG) console.debug( PREFIX + `+ Parent form:` );
			if (TEST || window.BSKY.DEBUG) console.debug( PREFIX + `  + [FORM ID......==${match.form.id}]` );
			if (TEST || window.BSKY.DEBUG) console.debug( PREFIX + `  + [FORM Name....==${match.form.name}]` );
			if (TEST || window.BSKY.DEBUG) console.debug( PREFIX + `  + [FORM Dataset.==${COMMON.prettyJson( match.form.dataset )}]` );
			parentForm					= match.form.id;
			if (TEST || window.BSKY.DEBUG) console.debug( PREFIX + `  + [FORM Parent..==${parentForm}]` );
			targetFilter				= match.dataset.bskyTarget;
			if (TEST || window.BSKY.DEBUG) console.debug( PREFIX + `  + [TARGET Filter==${targetFilter}]` );

			// The "selector" to select records within the table.
			rootSelector				= `#${targetTable} tbody tr.${TARGET_CLASS}`;
			selector					= "";
			let full					= false;
			let positive				= false;
			switch ( match.value.toLowerCase() ) {
				case "all":
					full				= true;
					break;
				case "true":
					positive			= true;
					selector			= `[${HTMLConstants.DATASET_PREFIX}${targetFilter}=true]`;
					break;
				case "false":
					selector			= `[${HTMLConstants.DATASET_PREFIX}${targetFilter}=false]`;
					break;
			}
			if (TEST || window.BSKY.DEBUG) console.debug( PREFIX + `  + [Selector.....==${selector}]` );
			
			// The button color [formFollowers::Btn::RadioFollowing]
			let btnId					= `${parentForm}Btn${match.name.replace( parentForm, '' )}`;
			if (TEST || window.BSKY.DEBUG) console.debug( PREFIX + `  + [Button ID....==${btnId}]` );
			let $button					= $( `#${btnId}` );
			$button.removeClass( 'btn-secondary' );
			$button.removeClass( 'btn-success' );
			$button.removeClass( 'btn-danger' );
			$button.addClass( ( full ? 'btn-secondary' : positive ? 'btn-success' : 'btn-danger' ) );

			// Add the selector to the array.
			selectors[match.id]			= { full: full, source: match.id, filter: targetFilter, selector: selector };
		});
		if (TEST || window.BSKY.DEBUG) console.debug( PREFIX + `Found selectors(s):`, selectors );

		// Mix all selectors in only one.
		finalSelector					= rootSelector;
		let filter						= null;
		for(var key in selectors) {
			filter						= selectors[key];
			finalSelector				+= filter.selector;
		}
		if (TEST || window.BSKY.DEBUG) console.debug( PREFIX + `finalSelector:`, finalSelector );

		// Find the records that match.
		$matches					= $( finalSelector );
		if (TEST || window.BSKY.DEBUG) console.debug( PREFIX + `Found ${$matches.length} record(s).` );

		// Show records.
		$matches.show();
		$( `#${parentForm}Total` ).html( $matches.length );
	} else {
		if (TEST || window.BSKY.DEBUG) console.debug( PREFIX + "No radio buttons checked." );

		if (TEST || window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
		if (TEST || window.BSKY.DEBUG) console.groupEnd();
		return;
	}

	if (TEST || window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (TEST || window.BSKY.DEBUG) console.groupEnd();
}
