/**********************************************************
 * Module imports
 *
 * PKCE HELPER FUNCTIONS
 * See: https://gist.github.com/ahmetgeymen/a9dcd656a1527f6c73d9c712ea2d9d7e
 *
 **********************************************************/
// Common modules
import CONFIGURATION				from "../data/config.json" with { type: "json" };
// Common functions
import * as COMMON					from "./common.functions.js";
// Common Classes and Exceptions ("Types")
import * as TYPES					from "./common.types.js";
// To perform API calls
import * as APICall					from "./APICall.js";
// Common DPOP functions
import * as DPOP					from "./OAuth2/dpopProof.js";
// Common JWT functions
import * as JWT						from "./OAuth2/JWT.js";


/**********************************************************
 * Module Constants
 **********************************************************/
// Module SELF constants
const MODULE_NAME					= COMMON.getModuleName( import.meta.url );
const MODULE_VERSION				= "1.0.0";
const MODULE_PREFIX					= `[${MODULE_NAME}]: `;

// Logging constants
const DEBUG							= CONFIGURATION.global.debug;
const DEBUG_FOLDED					= CONFIGURATION.global.debug_folded;

// Inner constants
const API							= CONFIGURATION.api;

// HTML constants
const MILLISECONDS					= 250;
const LOCALE_SPAIN					= 'es-ES';
const LOCALE_OPTIONS				= { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", seconds: "2-digit", hour12: true };
const DIV_TOKEN_TIMEOUT				= "currentTokenTimeout";
const DIV_DATE_TIME					= "currentDateTime";


/**********************************************************
 * Module Variables
 **********************************************************/
let GROUP_DEBUG						= DEBUG && DEBUG_FOLDED;
let momentReceivedToken				= null;
let expiration						= 0;
let secondsToExpire					= 0;


/**********************************************************
 * PRIVATE Functions
 **********************************************************/
function clock() {

	// La fecha y hora actual
	const now = new Date();
	$( "#" + DIV_DATE_TIME ).val( now.toLocaleString( LOCALE_SPAIN, LOCALE_OPTIONS ) );

	// Los segundos de expiración del token
	secondsToExpire = parseInt( expiration - ( now.getTime() - momentReceivedToken.getTime() ) / 1000 );
	$( "#" + DIV_TOKEN_TIMEOUT ).val( secondsToExpire );
}

async function htmlRenderNotification( notification, userAccessToken, clientId, accessTokenHash ) {
	const STEP_NAME						= "htmlRenderNotification";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;

	// Vamos preparando el HTML para la notificación.
	// TODO: To render the noti: SEE: https://getbootstrap.com/docs/5.3/components/card/#horizontal
	// TODO: To get the post data: SEE: https://docs.bsky.app/docs/api/app-bsky-feed-get-posts
	//       XRPC.api.getPosts
	let jqRoot							= $( "#notifications" );

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

	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + "["+authorName+"]" + " ["+notiReason+"]" + " ["+when.toLocaleString()+"]" );

	// Actualizamos el HTML con el autor.
	let html							= jqRoot.html() + `<div id="notification-${cid}" name="notification${cid}" class="notification">`;
	html								+= `<div class="header">`;
	html								+= `  <a href="${authorURL}"><img src="${authorAvatar}" height="24"/></a> `;
	html								+= `  <a href="${authorURL}"><strong>${authorName}</strong></a>`;
	html								+= `</div>`;
	html								+= `<ul style="margin: 0px 0px 8px 0px">`;
	html								+= `  <li class="notificacion-data">Handle: <strong>${authorHandle}</strong></li>`;
	html								+= `  <li class="notificacion-data">Did: <strong>${authorDid}</strong></li>`;
	html								+= `  <li class="notificacion-data">Description: <strong>${authorDescription}</strong></li>`;

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
	*/
	if (DEBUG) console.debug(PREFIX + "+ Reason:", notiReason);

	if ( COMMON.areEquals( notiReason, "follow" ) ) {
		// It's a "follow" notification.
		html							+= `  <li class="notificacion-data"><strong>${notiReason} you</strong></li>`;
	} else {
		// It's about an action on a post.
		let notiURI						= "";
		if ( COMMON.areEquals( notiReason, "reply" ) ) {
			notiURI						= notification.record.reply.parent.uri;
		} else {
			notiURI						= notification.record.subject.uri;
		}
		let notiURISplitted				= notiURI.substring(5).split("/")
		let notiDID						= notiURISplitted[0];
		let notiBluitID					= notiURISplitted[2];
		let userProfileURL				= "https://bsky.app/profile/" + notiDID + "/post/" + notiBluitID;
		if (DEBUG) console.debug(PREFIX + "+ userProfileURL:", userProfileURL);
		
		// TEST: Get post
		let bluitUrl					= API.bluesky.XRPC.public + API.bluesky.XRPC.api.getPosts + "?uris=" + encodeURIComponent( notiURI );
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
			case "follow":
				break;
			case "like":
				referredText			= ( bluit.embed && bluit.embed.record && bluit.embed.record.value && bluit.embed.record.value.text ) || bluit.record.text;
				break;
			case "reply":
				referredText			= bluit.embed.record.value.text;
				break;
			case "repost":
				break;
			default:
				referredText			= ( bluit.embed && bluit.embed.record && bluit.embed.record.value && bluit.embed.record.value.text ) || bluit.record.text;
		}
		if (DEBUG) console.debug(PREFIX + "+ referredText:", referredText);
		html							+= `  <li class="notificacion-data">${notiReason} <a href="${userProfileURL}" target="post-${cid}">this post</a>: ${referredText}</li>`;
	}
	html								+= `</ul>`;

	// Pintamos el HTML.
	html								+= '</div>';
	jqRoot.html( html );

	if (GROUP_DEBUG) console.groupEnd(PREFIX);
}


/**********************************************************
 * PUBLIC Functions
 **********************************************************/
export function updateHTMLError(error, renderHTMLErrors=true) {
	const STEP_NAME						= "makeAPICall";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + `[renderHTMLErrors==${renderHTMLErrors}]` );

	let isInstanceOfAccessTokenError	= error instanceof TYPES.AccessTokenError;
	let isInstanceOfAPICallError		= error instanceof TYPES.APICallError;

	if (DEBUG) console.warn( PREFIX + "ERROR:", error.toString() );
	// if (DEBUG) console.warn( PREFIX + "ERROR type:", COMMON.getTypeOf( error ) );
	// if (DEBUG) console.warn( PREFIX + "ERROR instance of TYPES.AccessTokenError:", isInstanceOfAccessTokenError );
	// if (DEBUG) console.warn( PREFIX + "ERROR instance of TYPES.APICallError:", isInstanceOfAPICallError );

	// HTML L&F
	if ( renderHTMLErrors ) {
		COMMON.hide( "infoPanel" );
		COMMON.show( "errorPanel" );
	}

	if ( isInstanceOfAccessTokenError ) {
		if (DEBUG) console.debug(PREFIX + "+ code........:", error.code);
		if (DEBUG) console.debug(PREFIX + "+ message.....:", error.message);

		// Update the error fields
		if ( renderHTMLErrors ) {
			$("#error").html(error.title);
			$("#errorDescription").val(error.message);
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
			$("#error").html(error.message);
			if ( error.isJson ) {
				let msg					= ( error.json.error ) ? error.json.error + ": " : "";
				msg						+= ( error.json.message ) ? error.json.message : "";
				msg						+= ( error.json.error_description ) ? error.json.error_description : "";
				$("#errorDescription").val(msg);
			} else {
				let msg					= `[${error.step}] Error invocando a: [${error.url}]`;
				$("#errorDescription").val(msg);
			}
		}
	} else {
		// Unknown error type

		// Update the error fields
		if ( renderHTMLErrors ) {
			$("#error").html("ERROR");
			$("#errorDescription").val(error.message);
		}
	}
	if (DEBUG) console.debug( PREFIX + "ERROR dpopNonce........:", BSKY.data.dpopNonce );
	if (DEBUG) console.debug( PREFIX + "ERROR dpopNonceUsed....:", BSKY.data.dpopNonceUsed );
	if (DEBUG) console.debug( PREFIX + "ERROR dpopNonceReceived:", BSKY.data.dpopNonceReceived );

	if (GROUP_DEBUG) console.groupEnd(PREFIX);
}

export function clearHTMLError() {
	// Clear and hide error fields and panel
	$("#error").html("");
	$("#errorDescription").val("");
	COMMON.hide("errorPanel");
}

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

	// Hide panels.
	// COMMON.hide("accessTokenPanel");
	// COMMON.hide("btnNotifications");

	let iss								= null;
	let state							= null;
	let code							= null;
	let dpopNonce						= null;

	if ( isInstanceOfURLSearchParams ) {
		iss								= parsedSearch.get("iss");
		state							= parsedSearch.get("state");
		code							= parsedSearch.get("code");
		dpopNonce						= parsedSearch.get("dpopNonce");
	} else {
		iss								= parsedSearch.iss;
		state							= parsedSearch.state;
		code							= parsedSearch.code;
		dpopNonce						= parsedSearch.dpopNonce;
	}

	if (DEBUG) console.debug(PREFIX + "Updating HTML Elements:");
	if (DEBUG) console.debug(PREFIX + "+ iss:", iss);
	if (DEBUG) console.debug(PREFIX + "+ state:", state);
	if (DEBUG) console.debug(PREFIX + "+ code:", code);
	if (DEBUG) console.debug(PREFIX + "+ dpopNonce:", dpopNonce);

	// Prepare an object to return
	let response						= new TYPES.CallbackData( iss, state, code, dpopNonce );

	// Update HTML page element values.
	// CSS Classes.
	$("#iss").val(iss);
	$("#state").val(state);
	$("#code").val(code);
	$("#dpopNonce").val(dpopNonce);

	if (GROUP_DEBUG) console.groupEnd(PREFIX);
	return response;
}

export async function parseNotifications( notifications, userAccessToken, clientId, accessTokenHash ) {
	const STEP_NAME						= "parseNotifications";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + "[Response data]" );
	if (DEBUG) console.debug( PREFIX + "Current notifications:", notifications );
	if (DEBUG) console.debug( PREFIX + "Current notifications:", COMMON.prettyJson( notifications ) );
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
	// Vaciamos el panel, previamente.
	let jqRoot							= $( "#notifications" );
	jqRoot.html( "" );
	clearHTMLError();
	let totalUnread						= unreadNotifications.length;
	let currentUnread					= 0;
	if ( totalUnread == 0) {
		if (DEBUG) console.debug( PREFIX + "Currently, no UNREAD notifications." );
	} else {
		if (DEBUG) console.debug( PREFIX + "%cCurrently, " + totalUnread + " UNREAD notifications:", COMMON.CONSOLE_STYLE );
		if (DEBUG) console.debug( PREFIX + "+ unread notifications:", unreadNotifications );
		for ( let key in unreadNotifications ) {
			currentUnread++;
			if (DEBUG) console.groupCollapsed( PREFIX + `[Noti ${currentUnread}/${totalUnread}]` );
			await htmlRenderNotification( unreadNotifications[key], userAccessToken, clientId, accessTokenHash );
			if (DEBUG) console.groupEnd(PREFIX);
		}
	}

	// Clear and hide error fields and panel
	clearHTMLError();

	// Hide "notificationsPanel" panel
	COMMON.show("notificationsPanel");
	COMMON.show("btnAccessToken");

	// Update the HTML fields
	$("#notifications_json").removeAttr('data-highlighted');
	$("#access_token_jwt").removeAttr('data-highlighted');
	$("#access_token_json").removeAttr('data-highlighted');
	$("#notifications_json").removeAttr('data-highlighted');
	$("#notifications_json").removeAttr('data-highlighted');
	$("#notificationsNumber").text( "Pendientes de leer: " + unreadNotifications.length );
	$("#notifications_json").text( COMMON.prettyJson( notifications ) );

	hljs.highlightAll();

	if (GROUP_DEBUG) console.groupEnd(PREFIX);
}

export function processAPICallErrorResponse( error, renderHTMLErrors=true ) {
	const PREFIX = `[${MODULE_NAME}:processAPICallErrorResponse] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + `[renderHTMLErrors=${renderHTMLErrors}]` );

	if (DEBUG) console.debug( PREFIX + "ERROR:", error.message );
	updateHTMLError(error, renderHTMLErrors);

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();

	// Finally, throw the error
	throw( error );
}

export function htmlRenderUserAccessToken( userAuthentication ) {
	const PREFIX = `[${MODULE_NAME}:htmlRenderUserAccessToken] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

	if (DEBUG) console.debug( PREFIX + "User Authentication:", userAuthentication );

	// Planificamos la renovación del token en (dentro de) "expires_in" segundos
	momentReceivedToken = new Date();
	expiration = userAuthentication.expires_in;
	setInterval(() => clock(), MILLISECONDS );

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
}

export function htmlRenderUserProfile( profile ) {
	const PREFIX = `[${MODULE_NAME}:htmlRenderUserProfile] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );

	if (DEBUG) console.debug( PREFIX + "User Profile:", profile );
	/*
	 * // TODO: SEE: https://getbootstrap.com/docs/5.3/components/card/#horizontal
	 * Sample received profile:
	 *
		{
			"did": "did:plc:tjc27aje4uwxtw5ab6wwm4km",
			"handle": "madrilenyer.bsky.social",
			"displayName": "Madrileñer",
			"avatar": "https://cdn.bsky.app/img/avatar/plain/did:plc:tjc27aje4uwxtw5ab6wwm4km/bafkreieq35674mas2u5dwxnaupsx5s5f7muhvahgqjjczqkfb5pw2pummm@jpeg",
			"associated": {
				"lists": 2,
				"feedgens": 0,
				"starterPacks": 0,
				"labeler": false,
				"chat": {
					"allowIncoming": "all"
				}
			},
			"labels": [
				{
					"src": "did:plc:tjc27aje4uwxtw5ab6wwm4km",
					"uri": "at://did:plc:tjc27aje4uwxtw5ab6wwm4km/app.bsky.actor.profile/self",
					"cid": "bafyreiavezlxjtf354k3z37z5mn33e4wyey4sa36nwo4zzj2tv2nmnx4ju",
					"val": "!no-unauthenticated",
					"cts": "2024-11-13T14:16:08.560Z"
				}
			],
			"createdAt": "2024-11-13T14:16:09.483Z",
			"description": "De aquí, de Madrid",
			"indexedAt": "2024-11-17T11:17:42.829Z",
			"banner": "https://cdn.bsky.app/img/banner/plain/did:plc:tjc27aje4uwxtw5ab6wwm4km/bafkreiarzagn6jt6acaufnnvt7pf3kkssrbl53cxmtzicljvijs3suzriu@jpeg",
			"followersCount": 632,
			"followsCount": 966,
			"postsCount": 3928
		}

	 */
	
	$( "#profile-avatar" ).attr( "src", profile.avatar );
	$( "#profile-avatar-top" ).attr( "src", profile.avatar );

	$( "#profile-name" ).html( profile.displayName );
	$( "#profile-name-top" ).html( profile.displayName );

	$( "#profile-handle" ).html( profile.handle );
	$( "#profile-handle-top" ).html( profile.handle );

	$( "#profileFollowers" ).html( profile.followersCount );
	$( "#profileFollowing" ).html( profile.followsCount );
	$( "#profilePosts" ).html( profile.postsCount );
	$( "#profileDescription" ).html( profile.description );

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
}

