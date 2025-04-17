/**********************************************************
 * Module imports
 *
 * PKCE HELPER FUNCTIONS
 * See: https://gist.github.com/ahmetgeymen/a9dcd656a1527f6c73d9c712ea2d9d7e
 *
 **********************************************************/
// Global configuration
import CONFIGURATION					from "../../data/config.json" with { type: "json" };

// Common functions
import * as COMMON						from "./CommonFunctions.js";
// Common Classes and Exceptions ("Types")
import * as TYPES						from "./CommonTypes.js";
// Common HTML Constants
import * as HTMLConstants				from "./HTML.Constants.js";
export * from "./HTML.Constants.js";

// To perform API calls
import * as APICall						from "../utils/APICall.js";
// Common DPOP functions
import * as DPOP						from "../auth/DPoPProof.js";
// Common JWT functions
import * as JWT							from "../auth/JWT.js";


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
const BLUESKY							= API.bluesky;
const XRPC								= BLUESKY.XRPC;

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
	$( '#'+HTMLConstants.DIV_MODAL_ERROR_CODE ).removeAttr('data-highlighted');
	hljs.highlightAll();
}

/* --------------------------------------------------------
 * Errors management.
 * -------------------------------------------------------- */
export function updateHTMLError(error, renderHTMLErrors=true) {
	const STEP_NAME						= "updateHTMLError";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_STACK					= `${PREFIX}[STACK] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[renderHTMLErrors==${renderHTMLErrors}]` );

	let isInstanceOfAccessTokenError	= error instanceof TYPES.AccessTokenError;
	let isInstanceOfHTTPResponseError	= error instanceof TYPES.HTTPResponseError;
	let isInstanceOfHTMLError			= error instanceof TYPES.HTMLError;

	if ( renderHTMLErrors ) {
		const errorsList					= error.stack.split('\n');
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR: [code==${error.code}] [message==${error.message}] [cause==${error.cause}]` );
		if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_STACK );
		for ( const stack of errorsList ) {
			if (window.BSKY.DEBUG) console.debug( PREFIX_STACK + `+ MESSAGE: [${stack}]` );
		}
		if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	}

	if ( isInstanceOfAccessTokenError ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR TYPE: [TYPES.AccessTokenError]` );

		// Update the error fields
		if ( renderHTMLErrors ) {
			$( '#'+HTMLConstants.DIV_ERROR ).html(error.title);
			$( '#'+HTMLConstants.DIV_ERROR_DESCRIPTION ).val(error.message);
		}
	} else if ( isInstanceOfHTTPResponseError ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR TYPE: [TYPES.HTTPResponseError]` );

		// Update the error fields
		if ( renderHTMLErrors ) {
			$( '#'+HTMLConstants.DIV_ERROR ).html(error.title);
			$( '#'+HTMLConstants.DIV_ERROR_DESCRIPTION ).val(error.cause);
		}
	} else if ( isInstanceOfHTMLError ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR TYPE: [TYPES.HTMLError]` );

		// Update the error fields
		if ( renderHTMLErrors ) {
			$( '#'+HTMLConstants.DIV_ERROR ).html(error.title);
			$( '#'+HTMLConstants.DIV_ERROR_DESCRIPTION ).val(error.cause);
		}
	} else if ( error.error && error.message ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR TYPE: [${typeof error}]` );
		// Puede venir también un: "{"error":"InternalServerError","message":"Internal Server Error"}"

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

	// Info on the error in the modal
	// HTML L&F
	if ( renderHTMLErrors ) {
		if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "Passing the info into the error's modal..." );
		const html							= {
			version: CONFIGURATION.global.appVersion,
			date: new Date(),
			// stack: error.stack.split('\n'),
			error: error
		}
		$( `#${HTMLConstants.DIV_MODAL_ERROR_CODE}` ).text( COMMON.prettyJson( html ) );
		updateHighlight();

		COMMON.show( HTMLConstants.DIV_PANEL_ERROR );
	} else {
		if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "Nothing else to do." );
	}

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}

export function clearHTMLError() {
	// Clear and hide error fields and panel
	$( '#'+HTMLConstants.DIV_ERROR ).html("");
	$( '#'+HTMLConstants.DIV_ERROR_DESCRIPTION ).val("");
	COMMON.hide( HTMLConstants.DIV_PANEL_ERROR );
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

	// if (window.BSKY.DEBUG) console.debug(PREFIX + "Updating HTML Elements:");
	// if (window.BSKY.DEBUG) console.debug(PREFIX + "+ iss:", iss);
	// if (window.BSKY.DEBUG) console.debug(PREFIX + "+ state:", state);
	// if (window.BSKY.DEBUG) console.debug(PREFIX + "+ code:", code);
	// if (window.BSKY.DEBUG) console.debug(PREFIX + "+ dpopNonce:", dpopNonce);

	// Update HTML page element values.
	// CSS Classes.
	$( '#'+HTMLConstants.DIV_ISS ).val(iss);
	$( '#'+HTMLConstants.DIV_STATE ).val(state);
	$( '#'+HTMLConstants.DIV_CODE ).val(code);
	$( '#'+HTMLConstants.DIV_DPOP_NONCE ).val(dpopNonce);

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
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
	$linkClientID.prop("href",  CLIENT_APP.client_id);
	$linkDIDDocument.prop("href",  BLUESKY.profile.pld + BSKY.user.userDid);

	// "User Profile" links
	$( 'a[target="pdsls"]' ).prop( 'href', BLUESKY.pds.url + "at://" + BSKY.user.userDid );
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

	let bluitUrl						= XRPC.public + XRPC.api.public.getPosts + "?uris=" + encodeURIComponent( notiURI );
    let headers										= {};
    headers[ APICall.HTTP_HEADER_ACCEPT ]			= APICall.CONTENT_TYPE_JSON;
	let fetchOptions					= {
		method: APICall.HTTP_GET,
		headers: headers
	}
	if (window.BSKY.DEBUG) console.debug(PREFIX + "+ bluitUrl:", bluitUrl);
	if (window.BSKY.DEBUG) console.debug(PREFIX + "+ headers:", COMMON.prettyJson( headers ) );
	if (window.BSKY.DEBUG) console.debug(PREFIX + "+ fetchOptions:", COMMON.prettyJson( fetchOptions ) );

	let callResponse					= null;
	let bluit							= null;
	try {
		callResponse					= await APICall.call( STEP_NAME, bluitUrl, fetchOptions );
		if (window.BSKY.DEBUG) console.debug(PREFIX + "+ callResponse:", callResponse);
		let bluits						= callResponse.json.posts;
		if (window.BSKY.DEBUG) console.debug(PREFIX + "+ bluits:", bluits);
		bluit							= bluits[0];
		if (window.BSKY.DEBUG) console.debug(PREFIX + "+ bluit:", bluit);
	} catch ( error ) {
		if (window.BSKY.DEBUG) console.debug(PREFIX + "  ERROR bluit:", error);
	}

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
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
	let authorURL						= BLUESKY.profile.url + authorHandle;

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
			userProfileURL				= BLUESKY.profile.url + notiDID + "/post/" + notiBluitID;
			if (window.BSKY.DEBUG) console.debug(PREFIX + "+ userProfileURL:", userProfileURL);

			try {
				bluit					= await getReferredBluit( notiURI );

				if ( !COMMON.isNullOrEmpty( bluit ) ) {
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
				}
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

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
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
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Current notifications: [${notifications.length}]` );
	// if (window.BSKY.DEBUG) console.debug( PREFIX + "Current notifications:", COMMON.prettyJson( notifications ) );
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
			if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[Noti ${currentUnread}/${totalUnread}]` );
			await htmlRenderNotification( currentUnread, unreadNotifications[key], userAccessToken, clientId, accessTokenHash );
			if (window.BSKY.GROUP_DEBUG) console.groupEnd(PREFIX);
		}
	}

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
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


	// The banner, if any
	if (profile?.banner) {	// DIV_PROFILE_CARD
		$( '#'+HTMLConstants.DIV_PROFILE_CARD ).css( "background-image", `url(${profile.banner})` );
	} else {
		$( '#'+HTMLConstants.DIV_PROFILE_CARD ).css( "background-image", `url(${HTMLConstants.BLANK_IMAGE})` );
	}

	// The avatar, if any
	if (profile?.avatar) {
		$( '#'+HTMLConstants.DIV_PROFILE_AVATAR ).prop( "src", profile.avatar );
		$( '#'+HTMLConstants.DIV_PROFILE_AVATAR_TOP ).prop( "src", profile.avatar );
	} else {
		$( '#'+HTMLConstants.DIV_PROFILE_AVATAR ).prop( "src", HTMLConstants.BLANK_IMAGE );
		$( '#'+HTMLConstants.DIV_PROFILE_AVATAR_TOP ).prop( "src", HTMLConstants.BLANK_IMAGE );
	}

	// The StatuSphere, if any
	if (profile?.statuSphere) {
		// TODO: See where to put the info
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
	let href							= BLUESKY.profile.url + profile.handle;
	$link.prop("href",  href);
	$link.prop("alt",   `ALT: ${profile.description}`);
	$link.prop("title", `TITLE: ${profile.description}`);

	// El enlace del perfil
	$link								= $( '#'+HTMLConstants.DIV_PROFILE_HANDLE_LINK );
	$link.prop("href",  href);
	$link.prop("alt",   `ALT: ${profile.description}`);
	$link.prop("title", `TITLE: ${profile.description}`);

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
				$toastImg.prop( "src", profile.avatar );
			} else {
				$toastImg.prop( "src", HTMLConstants.BLANK_IMAGE );
			}
			$toastBody.html( html );
			$toast.show();

			if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
			if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		} else {
			if (window.BSKY.DEBUG) console.debug( PREFIX_COMPARE + `Following: ${diffFollowing}-[${following}] - Followers: ${diffFollowers}-[${followers}]` );
		}
	}

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * HTML Render: User Follows.
 * -------------------------------------------------------- */
function htmlRenderMissedProfile( idx, data, flags = { follower: false, block: false, muted: false } ) {
	const STEP_NAME						= "htmlRenderMissedProfile";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[idx=${idx}]` );

	const did							= data.did;
	const didDoc						= data.didDoc?.body;
	const profile						= data.profile?.fetchError?.json || data;
	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "+ Data:", data );
	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "+ Data:", COMMON.toJson( data ) );

	let html							= "";
	let handle							= ( didDoc?.alsoKnownAs && didDoc.alsoKnownAs[0]) ? didDoc.alsoKnownAs[0]?.substring(5) : "";
	html								+= '<tr class="align-top">';
	html								+= `<td>&nbsp;${idx}</td>`;
	html								+= `<td><i class="bi bi-ban-fill text-danger" title="Profile not found"></i></td>`;
	html								+= `<td><a href="${BLUESKY.profile.url}${handle}" target="_blank" title="${handle}">${handle}</a></td>`;
	html								+= `<td class="text-danger fw-medium theme-smaller">${profile.error || "Error"}: ${profile.message || "unknown"}</td>`;
	html								+= '</tr>';

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return html;
}


/* --------------------------------------------------------
 * HTML Render: User Follows.
 * -------------------------------------------------------- */
function htmlRenderSingleProfile( idx, data, flags = { follower: false, block: false, muted: false } ) {
	const STEP_NAME						= "htmlRenderSingleProfile";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[idx=${idx}]` );

	let did								= data.did;
	let didDoc							= data.didDoc;
	let profile							= data.profile || data;

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
	let handle							= profile.handle;
	const defaultColor					= "text-body-tertiary";

	// The labels part
	let labels							= profile.labels;
	let labelsAsStr						= "";
	if (!COMMON.isNullOrEmpty(labels)) {
		labelsAsStr						= labels.map(lbl => lbl.val);
	}

	// The viewer part
	let viewer							= profile.viewer;

	// The dataset
	let dataset							= "";
	dataset								+= " " + HTMLConstants.DATASET_PREFIX + `following="${!COMMON.isNullOrEmpty(viewer?.following)}"`;
	dataset								+= " " + HTMLConstants.DATASET_PREFIX + `followed-by="${!COMMON.isNullOrEmpty(viewer?.followedBy)}"`;
	dataset								+= " " + HTMLConstants.DATASET_PREFIX + `blocked="${viewer?.blocking || false}"`;
	dataset								+= " " + HTMLConstants.DATASET_PREFIX + `blocked-by="${viewer?.blockedBy || false}"`;
	dataset								+= " " + HTMLConstants.DATASET_PREFIX + `muted="${viewer?.muted || false}"`;
	dataset								+= " " + HTMLConstants.DATASET_PREFIX + `blocked-by-list="${viewer?.blockingByList || false}"`;
	dataset								+= " " + HTMLConstants.DATASET_PREFIX + `muted-by-list="${viewer?.mutedByList || false}"`;

	// The HTML.
	html								+= `<tr class="theme-record-item align-top"${dataset}>`;
	html								+= `<td>${idx}</td>`;

	// Icons: Following
	html								+= `<td>`;
	if ( flags.block || flags.muted ) {
		html							+= `<i class="bi bi-person-standing ${!COMMON.isNullOrEmpty(viewer?.following) ? "text-white bg-success" : defaultColor}" title="you are ${!COMMON.isNullOrEmpty(viewer?.following) ? "" : "NOT "}following this profile"></i>`;
		html							+= `&nbsp;<i class="bi bi-person-walking ${!COMMON.isNullOrEmpty(viewer?.followedBy) ? "text-white bg-success" : defaultColor}" title="you are ${!COMMON.isNullOrEmpty(viewer?.followedBy) ? "" : "NOT "}followed by this profile"></i>`;
	} else if ( flags.follower ) {
		html							+= `<i class="bi bi-person-standing ${!COMMON.isNullOrEmpty(viewer?.following) ? "text-white bg-success" : defaultColor}" title="you are ${!COMMON.isNullOrEmpty(viewer?.following) ? "" : "NOT "}following this profile"></i>`;
	} else {
		html							+= `<i class="bi bi-person-walking ${!COMMON.isNullOrEmpty(viewer?.followedBy) ? "text-white bg-success" : defaultColor}" title="you are ${!COMMON.isNullOrEmpty(viewer?.followedBy) ? "" : "NOT "}followed by this profile"></i>`;
	}
	html								+= `&nbsp;<i class="bi bi-person-dash ${viewer?.blocking ? "text-white bg-dark" : defaultColor}" title="you are ${viewer?.blocking ? "" : "NOT "}blocking this profile"></i>`;
	html								+= `&nbsp;<i class="bi bi-person-fill-dash ${viewer?.blockedBy ? "text-white bg-danger" : defaultColor}" title="you are ${viewer?.blockedBy ? "" : "NOT "}blocked by this profile"></i>`;
	html								+= `&nbsp;<i class="bi bi-person-slash ${viewer?.muted ? "text-white bg-primary" : defaultColor}" title="you are ${viewer?.muted ? "" : "NOT "}muting this profile"></i>`;
	html								+= `&nbsp;<i class="bi bi-list-ul ${viewer?.blockingByList ? "text-white bg-dark" : defaultColor}" title="you are ${viewer?.blockingByList ? "" : "NOT "}blocking this profile thru list${viewer?.blockingByList ? ": " + viewer?.blockingByList?.name : ""}"></i>`;
	html								+= `&nbsp;<i class="bi bi-list-stars ${viewer?.mutedByList ? "text-white bg-primary" : defaultColor}" title="you are ${viewer?.mutedByList ? "" : "NOT "}muting this profile thru list${viewer?.mutedByList ? ": " + viewer?.mutedByList?.name : ""}"></i>`;

	html								+= `</td><td>`;
	html								+= `<a href="javascript:void(0)" onClick="BSKY.showProfile('${profile.handle}', '${profile.did}')" data-bsky-handle="${profile.handle}" data-bsky-did="${profile.did}" data-bs-toggle="modal" data-bs-target="#${HTMLConstants.DIV_MODAL_USER_PROFILE}" data-bs-dismiss="modal">`;
	if (profile.avatar) {
		html							+= `<img src="${profile.avatar}"`;
	} else {
		html							+= `<img src="${HTMLConstants.BLANK_IMAGE}"`;
	}
	html								+= ` height="20" style="vertical-align: bottom;"></a>&nbsp;`;
	html								+= `<a href="${BLUESKY.profile.url}${handle}" target="_blank" title="${handle}">${profile.displayName || handle}</a></td>`;
	html								+= `<td class="theme-smaller">${(profile.description) ? profile.description.substring(0, HTMLConstants.DESC_MAX_CHARS) : ""}</td></tr>`;

	// TEST
	delete viewer.following;
	delete viewer.followedBy;
	delete viewer.blocking;
	delete viewer.blockedBy;
	delete viewer.muted;
	delete viewer.knownFollowers;
	delete viewer.blockingByList;
	let keys							= Object.keys(viewer);
	if ( keys.length>0 ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `+ Viewer:`, viewer );
	}

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return html;
}

export function htmlRenderUserFollowing( profiles ) {
	const STEP_NAME						= "htmlRenderUserFollowing";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	let total							= 0;
	let index							= 0;
	let htmlContent						= null;
	let $tableBody						= $( '#'+HTMLConstants.DIV_TABLE_FOLLOWING + " tbody" );
	let $tableMissedBody				= $( '#'+HTMLConstants.DIV_TABLE_IDLE + " tbody" );

	// Clear the current content.
	$( '#'+HTMLConstants.DIV_TAB_FOLLOWING_BADGE ).html(profiles.length);
	$( '#'+HTMLConstants.DIV_TAB_FOLLOWING_TOTAL ).html(profiles.length);

	// Following
	$tableBody.empty();
	total								= profiles.length;
	index								= 0;
	if ( total>0 ) {
		// Add data.
		profiles.forEach( profile => {
			index++;
			htmlContent					= htmlRenderSingleProfile( index, profile );
			$tableBody.append( htmlContent );
		});
	}

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}

export function htmlRenderMissingProfiles( data ) {
	const STEP_NAME						= "htmlRenderMissingProfiles";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	let total							= 0;
	let index							= 0;
	let htmlContent						= null;
	let $tableMissedBody				= $( '#'+HTMLConstants.DIV_TABLE_IDLE + " tbody" );

	// Clear the current content.
	total								= data?.length || 0;
	$( '#'+HTMLConstants.DIV_TAB_IDLE_BADGE ).html(total);

	// Missed
	$tableMissedBody.empty();
	index								= 0;
	if ( total>0 ) {
		// Add data.
		data.forEach( profile => {
			index++;
			htmlContent					= htmlRenderMissedProfile( index, profile );
			$tableMissedBody.append( htmlContent );
		});
	}

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
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
	let total							= data?.length || 0;
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

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
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
	let total							= data?.length || 0;
	$( '#'+HTMLConstants.DIV_TAB_BLOCKS_BADGE ).html(total);
	if ( total>0 ) {
		// Add data.
		data.forEach( user => {
			index++;
			htmlContent					= htmlRenderSingleProfile( index, user, { block: true } );
			$tableBody.append( htmlContent );
		});
	}

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
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
	let total							= data?.length || 0;
	$( '#'+HTMLConstants.DIV_TAB_MUTED_BADGE ).html(total);
	if ( total>0 ) {
		// Add data.
		data.forEach( user => {
			index++;
			htmlContent					= htmlRenderSingleProfile( index, user, user, { muted: true } );
			$tableBody.append( htmlContent );
		});
	}

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * HTML Render: User Lists.
 * -------------------------------------------------------- */
// Renders an entry in a single list
function htmlRenderSingleListEntry( idx, list, id ) {
	const STEP_NAME						= "htmlRenderSingleListEntry";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;

	const profile						= list.creator;
	const authorAvatar					= profile.avatar;
	const svgSize						= "20px";
	let html							= "";
	html								+= '<tr class="align-top">';
	html								+= `<td>${idx}</td>`;
	html								+= `<td>${list.listItemCount}</td>`;
	html								+= `<td><a href="${BLUESKY.profile.url}${profile.handle}/lists/${id}" target="_blank" title="${list.name}" class="text-success">${list.name}</a></td>`;
	html								+= `<br/>by `;
	html								+= `<a href="javascript:void(0)" onClick="BSKY.showProfile('${profile.handle}', '${profile.did}')" data-bsky-handle="${profile.handle}" data-bsky-did="${profile.did}" data-bs-toggle="modal" data-bs-target="#${HTMLConstants.DIV_MODAL_USER_PROFILE}" data-bs-dismiss="modal">`;
	if (authorAvatar) {
		html							+= `<img src="${authorAvatar}" height="${svgSize}"/>`;
	} else {
		html							+= `<i class="bi bi-person-slash" height="${svgSize}"></i>`;
	}
	html								+= `</a>&nbsp;`;
	html								+= `<a href="${BLUESKY.profile.url}${profile.handle}" target="_blank" title="${profile.displayName || profile.name}">${profile.displayName || profile.name}</a>`;
	html								+= `<td>${(list.description) ? list.description.substring(0, HTMLConstants.DESC_MAX_CHARS) : ""}</td>`;
	html								+= `<td>${new Date(list.indexedAt).toLocaleString( HTMLConstants.LOCALE_SPAIN, HTMLConstants.LOCALE_OPTIONS )}</td>`;
	html								+= '</tr>';

	return html;
}

// Renders an entry in a single mod list
function htmlRenderSingleModListEntry( idx, list, id, danger=false ) {
	const STEP_NAME						= "htmlRenderSingleModListEntry";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;

	const profile						= list.creator;
	const authorAvatar					= profile.avatar;
	const svgSize						= "20px";
	let textColour						= danger ? "text-danger" : "text-success";
	let html							= "";
	html								+= '<tr class="align-top">';
	html								+= `<td>${idx}</td>`;
	html								+= `<td>${list.listItemCount}</td>`;
	html								+= `<td>`;
	html								+= `<a href="${BLUESKY.profile.url}${profile.handle}/lists/${id}" target="_blank" title="${list.name}" class="${textColour}">${list.name}</a>`;
	html								+= `<br/>by `;
	html								+= `<a href="javascript:void(0)" onClick="BSKY.showProfile('${profile.handle}', '${profile.did}')" data-bsky-handle="${profile.handle}" data-bsky-did="${profile.did}" data-bs-toggle="modal" data-bs-target="#${HTMLConstants.DIV_MODAL_USER_PROFILE}" data-bs-dismiss="modal">`;
	if (authorAvatar) {
		html							+= `<img src="${authorAvatar}" height="${svgSize}"/>`;
	} else {
		html							+= `<i class="bi bi-person-slash" height="${svgSize}"></i>`;
	}
	html								+= `</a>&nbsp;`;
	html								+= `<a href="${BLUESKY.profile.url}${profile.handle}" target="_blank" title="${profile.displayName || profile.name}">${profile.displayName || profile.name}</a>`;
	html								+= `</td>`;
	html								+= `<td>${(list.description) ? list.description.substring(0, HTMLConstants.DESC_MAX_CHARS) : ""}</td>`;
	html								+= `<td>${new Date(list.indexedAt).toLocaleString( HTMLConstants.LOCALE_SPAIN, HTMLConstants.LOCALE_OPTIONS )}</td>`;
	html								+= '</tr>';

	return html;
}

// Renders a single list
function htmlRenderSingleList( table, data ) {
	const STEP_NAME						= "htmlRenderSingleList";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	let index							= 0;
	let id								= null;
	let htmlContent						= null;
	let targetTable						= table;
	let $tableBody						= $( '#'+targetTable + " tbody" );

	// Clear the current content.
	$tableBody.empty();

	// Total
	const total							= data?.length || 0;

	// The "total" in the badge.
	const grandTotal					= parseInt( $( '#'+HTMLConstants.DIV_TAB_MY_LISTS_BADGE ).html() );
	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + `Badge Numbers: [total==${total}] [grandTotal==${grandTotal}]` );
	$( '#'+HTMLConstants.DIV_TAB_MY_LISTS_BADGE ).html( grandTotal + total );

	// The rendering
	if ( total>0 ) {
		// Sort
		const sorted					= data.sort( (a,b) => new Date(b.indexedAt).getTime() - new Date(a.indexedAt).getTime() );

		// Add data.
		sorted.forEach( list => {
			index++;
			// id							= list.uri.split("/")[4];
			id							= COMMON.getRKeyFromURL( list.uri );
			if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "+ List:", COMMON.toJson( list ) );
			htmlContent					= htmlRenderSingleListEntry( index, list, id );
			$tableBody.append( htmlContent );
		});
	}

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}

// BUSINESS: Renders the users lists
export function htmlRenderUserLists( data ) {
	htmlRenderSingleList( HTMLConstants.DIV_TABLE_MY_LISTS, data );
}

// BUSINESS: Renders the users feeds
export function htmlRenderUserFeeds( data ) {
	htmlRenderSingleList( HTMLConstants.DIV_TABLE_MY_FEEDS, data );
}

// BUSINESS: Renders the users mod lists
export function htmlRenderUserModerationList( data, table, danger=false ) {
	const STEP_NAME						= "htmlRenderUserModerationList";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[table=${table}] [danger=${danger}]` );

	let index							= 0;
	let id								= null;
	let htmlContent						= null;
	let targetTable						= table;
	let $tableBody						= $( '#'+targetTable + " tbody" );

	// Clear the current content.
	$tableBody.empty();

	// Total
	const total							= data?.length || 0;

	// The "total" in the badge.
	const grandTotal					= parseInt( $( '#'+HTMLConstants.DIV_TAB_MY_LISTS_BADGE ).html() || 0 );
	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + `Badge Numbers: [total==${total}] [grandTotal==${grandTotal}]` );
	$( '#'+HTMLConstants.DIV_TAB_MY_LISTS_BADGE ).html( grandTotal + total );

	// The rendering
	if ( total>0 ) {
		// Sort
		const sorted					= data.sort( (a,b) => new Date(b.indexedAt).getTime() - new Date(a.indexedAt).getTime() );

		// Add data.
		let url							= "";
		sorted.forEach( list => {
			index++;
			url							= list?.uri || list?.url;
			// id							= url.split("/")[4];
			id							= COMMON.getRKeyFromURL( url );
			if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "+ List:", COMMON.toJson( list ) );
			htmlContent					= htmlRenderSingleModListEntry( index, list, id, danger );
			$tableBody.append( htmlContent );
		});
	}

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
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
			htmlContent					+= `<a href="${BLUESKY.profile.root}${item.link}" role="button" class="btn btn-sm btn-outline-dark m-1 rounded rounded-3" target="_blank" aria-disabled="true">${item.topic}</button>`;
		});
		$container.html( htmlContent );
	}

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
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

		if (TEST || window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
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
			if (TEST || window.BSKY.DEBUG) console.debug( PREFIX + `+ Radio button[${match.id}]: [value==${match.value}]` );

			// Guess the targets; both, the table object and the type of fields
			parentForm					= match.form.id;
			targetFilter				= match.dataset.bskyTarget;

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

			// The button color [formFollowers::Btn::RadioFollowing]
			let btnId					= `${parentForm}Btn${match.name.replace( parentForm, '' )}`;
			let $button					= $( `#${btnId}` );
			$button.removeClass( 'btn-secondary' );
			$button.removeClass( 'btn-success' );
			$button.removeClass( 'btn-danger' );
			$button.addClass( ( full ? 'btn-secondary' : positive ? 'btn-success' : 'btn-danger' ) );

			// Add the selector to the array.
			selectors[match.id]			= { full: full, source: match.id, filter: targetFilter, selector: selector };
		});

		// Mix all selectors in only one.
		finalSelector					= rootSelector;
		let filter						= null;
		for(var key in selectors) {
			filter						= selectors[key];
			finalSelector				+= filter.selector;
		}

		// Find the records that match.
		$matches					= $( finalSelector );
		if (TEST || window.BSKY.DEBUG) console.debug( PREFIX + `Found ${$matches.length} record(s).` );

		// Show records.
		$matches.show();
		$( `#${parentForm}Total` ).html( $matches.length );
	} else {
		if (TEST || window.BSKY.DEBUG) console.debug( PREFIX + "No radio buttons checked." );

		if (TEST || window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
		if (TEST || window.BSKY.DEBUG) console.groupEnd();
		return;
	}

	if (TEST || window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (TEST || window.BSKY.DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * HTML Render: ClearSky data.
 * -------------------------------------------------------- */
export function htmlRenderClearSkyInformation( clearSky ) {
	const STEP_NAME						= "htmlRenderClearSkyInformation";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// ClearSky data
	// ---------------------------------------------------------
	const statistics					= clearSky.statistics;
	const userInfo						= clearSky.userInfo;
	const subscribedToLists				= userInfo.modLists?.data?.found || null;
	const subscribedToBlockLists		= userInfo.listsUserBlock?.data?.found || null;
	const blockedByLists				= userInfo.listsUserBlocked?.data?.found || null;

	// ClearSky statistics
	// ---------------------------------------------------------
	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + `Rendering ClearSky statistics...` );
	$( `#${HTMLConstants.CLEARSKY_UPTIME}` ).val( statistics.uptime.data[ 'time behind' ] );
	$( `#${HTMLConstants.CLEARSKY_ACCOUNTS_DATE}` ).val( statistics.totalUsers[ 'as of' ] );
	$( `#${HTMLConstants.CLEARSKY_ACCOUNTS_ACTIVE}` ).val( COMMON.numberFormatter.format( statistics.totalUsers.data.active_count.value ) );
	$( `#${HTMLConstants.CLEARSKY_ACCOUNTS_DELETED}` ).val( COMMON.numberFormatter.format( statistics.totalUsers.data.deleted_count.value ) );
	$( `#${HTMLConstants.CLEARSKY_ACCOUNTS_TOTAL}` ).val( COMMON.numberFormatter.format( statistics.totalUsers.data.total_count.value ) );

	// ClearSky: The lists the user is subscribed to
	// ---------------------------------------------------------

	// Update the badge count
	$( '#'+HTMLConstants.DIV_TAB_MY_LISTS_BADGE ).html( "" );

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + `Rendering ClearSky lists...` );
	if ( !COMMON.isNullOrEmpty( subscribedToLists ) ) htmlRenderUserModerationList( subscribedToLists, HTMLConstants.CLEARSKY_DIV_B_IN );					// table-in-lists
	if ( !COMMON.isNullOrEmpty( subscribedToBlockLists ) ) htmlRenderUserModerationList( subscribedToBlockLists, HTMLConstants.CLEARSKY_DIV_B_SUBS, true );	// table-subscribed-to-lists
	if ( !COMMON.isNullOrEmpty( blockedByLists ) ) htmlRenderUserModerationList( blockedByLists, HTMLConstants.CLEARSKY_DIV_B_MEMBER, true );			// table-member-of-lists

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}

