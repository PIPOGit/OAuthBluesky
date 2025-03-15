/**********************************************************
 * File Info:
 *
 * This file contains all the operative related
 * specifically with the dashboard page.
 *
 **********************************************************/


/**********************************************************
 * Module imports
 **********************************************************/
// Global configuration
import CONFIGURATION					from "./data/config.json" with { type: "json" };
// Common functions
import * as COMMON						from "./modules/common.functions.js";
// Common APIBluesky functions
import * as APIBluesky					from "./modules/APIBluesky.js";
// To perform API calls
import * as APICall						from "./modules/APICall.js";
// Common BrowserDB functions
import * as DB							from "./modules/BrowserDB.js";
// Common GEO functions
import * as GEO							from "./modules/GEO.js";
// Common GitHub functions
import * as GitHub						from "./modules/GitHub.js";
// Common HTML functions
import * as HTML						from "./modules/HTML.js";
// Common Settings functions
import * as SETTINGS					from "./modules/Settings.js";


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

// Relationship constants
const EVENT_RELATION_FOLLOW				= "FOLLOW";
const EVENT_RELATION_BLOCK				= "BLOCK";
const EVENT_RELATION_MUTE				= "MUTE";


/**********************************************************
 * Module Variables
 **********************************************************/


/**********************************************************
 * BOOTSTRAP Functions
 **********************************************************/


/**********************************************************
 * Module Load
 **********************************************************/
( ( parent, argument ) => {
	if ( COMMON.getTypeOf( argument ) === 'function' ) {
		parent.addEventListener( "DOMContentLoaded", argument );
		return;
	};
}).call(
	this			// The reference object (as per protocol).
	, window		// The first argument for the constructor; the top-most object in the DOM hierarchy.
	, startUp		// The loading function to be executed, once the page is loaded.
);


/**********************************************************
 * Module BootStrap Loader Function
 **********************************************************/
async function startUp() {
	'use strict'

	const STEP_NAME						= "startUp";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_MODULE_INFO			= `${PREFIX}[Module Info] `;
	if (window.BSKY.DEBUG) console.groupCollapsed( PREFIX );

	// ================================================================
	// Module info.
	if (window.BSKY.DEBUG) console.groupCollapsed( PREFIX_MODULE_INFO );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "MODULE_NAME:", MODULE_NAME, "import.meta.url:", import.meta.url );

	// ================================================================
	// Actualizamos el objeto raiz.
	// + Properties
	// + Logging Properties
	window.BSKY.refreshStaticSeconds	= CONFIGURATION.global.refresh_static;
	window.BSKY.refreshDynamicSeconds	= CONFIGURATION.global.refresh_dynamic;
	// + Functions
	window.BSKY.searchUser				= fnSearchUser;
	window.BSKY.updateDebug				= SETTINGS.fnUpdateDebug;
	window.BSKY.updateCurrentRefresh	= SETTINGS.fnUpdateCurrentRefreshTime;
	window.BSKY.filterFollowing			= HTML.fnFilterTable;
	window.BSKY.filterFollowers			= HTML.fnFilterTable;
	window.BSKY.showProfile				= fnShowUserProfile;

	// ================================================================
	// Module END
	console.info( `Loaded module ${MODULE_NAME}.` );

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.DEBUG) console.groupEnd();


	// ================================================================
	// Ejecutamos las acciones propias de esta página.

	// La clave criptográfica en la base de datos
	// ---------------------------------------------------------
	await DB.checkCryptoKeyInDB();

	// El reloj
	// ---------------------------------------------------------
	setInterval(() => HTML.clock(), BSKY.data.MILLISECONDS );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Clock started" );

	// GitHub Information
	// ---------------------------------------------------------
	let githubInfo						= await GitHub.getRepositoryInformation();
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received githubInfo:", githubInfo );

	// Save the info
	BSKY.git							= githubInfo;

	// Geolocation Information
	// ---------------------------------------------------------
	let geolocationInfo					= await GEO.getGeolocationInformation();
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received geolocationInfo:", geolocationInfo );

	// Save the info
	BSKY.user.geolocation				= geolocationInfo;

	// Geolocation Update
	let where							= BSKY.user.geolocation.bdc.localityInfo.administrative;
	let place							= where[where.length-1];
	$( `#${HTML.DIV_GEOLOCATION}` ).val( place.name );

	// Los eventos de los modales Bootstrap
	// ---------------------------------------------------------
	COMMON.getById(HTML.DIV_MODAL_SEARCH_USER ).addEventListener( 'shown.bs.modal',  modalEventForSearchUsersWhenShowed );
	COMMON.getById(HTML.DIV_MODAL_SEARCH_USER ).addEventListener( 'hidden.bs.modal',  modalEventForSearchUsersWhenClosed );
	COMMON.getById(HTML.DIV_MODAL_SETTINGS    ).addEventListener( 'show.bs.modal',   modalEventForSettingsWhenInvoked );
	COMMON.getById(HTML.DIV_MODAL_SETTINGS    ).addEventListener( 'hidden.bs.modal', modalEventForSettingsWhenClosed );
	COMMON.getById(HTML.DIV_MODAL_VERSION     ).addEventListener( 'show.bs.modal',   modalEventForVersionWhenInvoked );
	COMMON.getById(HTML.DIV_MODAL_USER_PROFILE).addEventListener( 'hidden.bs.modal',  modalEventForUserProfileWhenClosed );

	// Los eventos del "User Profile"
	// ---------------------------------------------------------
	COMMON.getById( HTML.RELATION_FOLLOW  ).addEventListener( 'click',  eventRelationFollow );
	COMMON.getById( HTML.RELATION_BLOCKED ).addEventListener( 'click',  eventRelationBlock );
	COMMON.getById( HTML.RELATION_MUTED   ).addEventListener( 'click',  eventRelationMute );

	// Los eventos del OffCanvas
	// ---------------------------------------------------------
	// const offCanvas						= COMMON.getById( "offCanvasMenu" );
	// const buttons						= offCanvas.querySelectorAll( ".nav-link" );
	// const $offCanvas					= $( "#offCanvasMenu" );
	const bsOffcanvas					= new bootstrap.Offcanvas('#offCanvasMenu')
	const $buttons						= $( "#offCanvasMenu .nav-link" );
	if ( $buttons ) {
		$buttons.each( n => {
			$buttons[n].addEventListener( 'click', event => {
				bsOffcanvas.hide();
			});
		});
	}

	// End of module setup
	// ---------------------------------------------------------
	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.DEBUG) console.groupEnd();

	// Perform dashboard operations
	// ---------------------------------------------------------
	BSKY.dashboard();
}


/**********************************************************
 * PRIVATE Functions
 **********************************************************/



/**********************************************************
 * MODAL Events Functions
 **********************************************************/

/* --------------------------------------------------------
 * Invoked when modal for "User Search" pops-up.
 * -------------------------------------------------------- */
function modalEventForVersionWhenInvoked( event ) {

	// Update the version and name fields
	// ---------------------------------------------------------
	let $modalBody						= `#${HTML.DIV_MODAL_VERSION} .modal-body`;
	$( `${$modalBody} #appName` ).html( CONFIGURATION.global.appName );
	$( `${$modalBody} #appVersion` ).html( CONFIGURATION.global.appVersion );

	// GIT Information as per PowerShell
	// ---------------------------------------------------------
	/*
		Write-Host "Name: $($RepoMetadata.name) [$($RepoMetadata.full_name)]
		Write-Host "Description: $($RepoMetadata.description)";
		Write-Host "Web: $($RepoMetadata.homepage) | GIT URL: $($RepoMetadata.url)";
		Write-Host "Dates: $($RepoMetadata.updated_at) | $($RepoMetadata.pushed_at)";
		Write-Host "Last Commit on: $($LastCommit.commit.committer.date)";
		Write-Host "Last Tag: $($LastTAG.name), on: $($TagCommit.commit.committer.date)";

		# Sample:
		# Name: OAuthBluesky [PIPOGit/OAuthBluesky]
		# Description: Bluesky OAuth2 Client, with Vanilla JavaScript (post, hosted in dev.to)
		# Web: https://oauthbluesky.onrender.com/ | GIT URL: https://api.github.com/repos/PIPOGit/OAuthBluesky
		# Dates: 2025-02-21T18:20:37Z | 2025-02-21T18:20:33Z
		# Last Commit on: 2025-02-21T18:20:31Z
		# Last Tag: v1.6.6, on: 2025-02-21T18:03:49Z

	 */
	if ( BSKY.git ) {
		$( `${$modalBody} #gitAppName` ).html( BSKY.git.repoMetadata?.name );
		$( `${$modalBody} #gitAppFullName` ).html( BSKY.git.repoMetadata?.full_name );
		$( `${$modalBody} #gitDescription` ).html( BSKY.git.repoMetadata?.description );
		$( `${$modalBody} #gitPublicURL` ).html( BSKY.git.repoMetadata?.homepage );
		$( `${$modalBody} #gitURL` ).html( BSKY.git.repoMetadata?.html_url );
		$( `${$modalBody} #gitLastTAG` ).html( BSKY.git.lastTag?.name );
		$( `${$modalBody} #gitLastUpdated` ).html( BSKY.git.lastCommit?.commit?.committer?.date );
		$( `${$modalBody} #gitPublicURLLink` ).prop( "href", BSKY.git.repoMetadata?.homepage );
		$( `${$modalBody} #gitURLLink` ).prop( "href", BSKY.git.repoMetadata?.html_url );
	}

	// Raw GIT Information
	// ---------------------------------------------------------
	$( `#${HTML.DIV_GIT_INFO_JSON}` ).text( COMMON.prettyJson( BSKY.git ) );
	HTML.updateHighlight();
}

/* --------------------------------------------------------
 * Invoked when modal for "User Search" is displayed.
 * -------------------------------------------------------- */
function modalEventForSearchUsersWhenShowed( event ) {

	// Clear "Search user" field
	// ---------------------------------------------------------
	$( `#${HTML.DIV_MODAL_SEARCH_OUTPUT}` ).empty();
	$( `#${HTML.DIV_MODAL_SEARCH_PATTERN}` ).val( '' );
	$( `#${HTML.DIV_MODAL_SEARCH_PATTERN}` ).focus();
}

/* --------------------------------------------------------
 * Invoked when dismissing modal for "User Search".
 * -------------------------------------------------------- */
function modalEventForSearchUsersWhenClosed( event ) {

	// Clear "Search user" field
	// ---------------------------------------------------------
	$( `#${HTML.DIV_MODAL_SEARCH_OUTPUT}` ).empty();
	$( `#${HTML.DIV_MODAL_SEARCH_PATTERN}` ).val( '' );
	$( `#${HTML.DIV_MODAL_SEARCH_PATTERN}` ).focus();
}

/* --------------------------------------------------------
 * Invoked when modal for "Settings" pops-up.
 * -------------------------------------------------------- */
function modalEventForSettingsWhenInvoked( event ) {

	// Logging options
	// ---------------------------------------------------------
	$( '#flexSwitchCheckDebug' ).prop( 'checked', window.BSKY.DEBUG );
	$( '#flexSwitchCheckGroupedDebug' ).prop( 'checked', window.BSKY.DEBUG_FOLDED );

	// Refresh time options
	// ---------------------------------------------------------
	$( '#refreshStaticSeconds' ).val( window.BSKY.refreshStaticSeconds );
	$( '#refreshDynamicSeconds' ).val( window.BSKY.refreshDynamicSeconds );
}

/* --------------------------------------------------------
 * Invoked when dismissing modal for "Settings".
 * -------------------------------------------------------- */
function modalEventForSettingsWhenClosed( event ) {
	SETTINGS.fnUpdateDebug( event.target );
}

/* --------------------------------------------------------
 * Invoked when dismissing modal for "User Profile".
 * -------------------------------------------------------- */
function modalEventForUserProfileWhenClosed( event ) {

	$( '.theme-profile-images-banner' ).attr( 'src', HTML.CONST_GRAY_IMAGE );
	$( '.theme-profile-images-avatar' ).attr( 'src', HTML.CONST_BLACK_IMAGE );

	// Los datos
	$( '.theme-profile-info .profile-name' ).html( "" );
	$( '.theme-profile-info .profile-handle' ).html( "" );
	$( '.theme-profile-info .profile-handle-link' ).attr( 'href', `javascript:void(0)` );
	$( '.theme-profile-info .profile-created' ).html( "" );
	$( '.theme-profile-info .profile-following' ).html( "" );
	$( '.theme-profile-info .profile-followers' ).html( "" );
	$( '.theme-profile-info .profile-posts' ).html( "" );
	$( '.theme-profile-info .profile-description' ).val( "" );

	// La relación
	$( '.theme-profile-relation #relation-follow'     ).attr( 'checked', false );
	$( '.theme-profile-relation #relation-follow-me'  ).attr( 'checked', false );
	$( '.theme-profile-relation #relation-blocked'    ).attr( 'checked', false );
	$( '.theme-profile-relation #relation-blocked-by' ).attr( 'checked', false );
	$( '.theme-profile-relation #relation-muted'      ).attr( 'checked', false );
	$( '.theme-profile-relation #relation-muted-by'   ).attr( 'checked', false );

	// Los datasets
	let input							= null;
	input								= COMMON.getById( 'relation-follow' );
	delete input.dataset.bskyHandle;
	delete input.dataset.bskyDid;
	input								= COMMON.getById( 'relation-blocked' );
	delete input.dataset.bskyHandle;
	delete input.dataset.bskyDid;
	input								= COMMON.getById( 'relation-muted' );
	delete input.dataset.bskyHandle;
	delete input.dataset.bskyDid;
}

/* --------------------------------------------------------
 * Invoked when the user "switches" the "follow" switch
 * in the "User Profile" modal.
 *
 * Invoka: "eventRelationManage( event, EVENT_RELATION_FOLLOW )"
 * -------------------------------------------------------- */
function eventRelationFollow( event ) {
	eventRelationManage( event, EVENT_RELATION_FOLLOW );
}

/* --------------------------------------------------------
 * Invoked when the user "switches" the "block" switch
 * in the "User Profile" modal.
 *
 * Invoka: "eventRelationManage( event, EVENT_RELATION_BLOCK )"
 * -------------------------------------------------------- */
function eventRelationBlock( event ) {
	eventRelationManage( event, EVENT_RELATION_BLOCK );
}

/* --------------------------------------------------------
 * Invoked when the user "switches" the "mute" switch
 * in the "User Profile" modal.
 *
 * Invoka: "eventRelationManage( event, EVENT_RELATION_MUTE )"
 * -------------------------------------------------------- */
function eventRelationMute( event ) {
	eventRelationManage( event, EVENT_RELATION_MUTE );
}

function eventRelationManage( event, type ) {
	const STEP_NAME						= "eventRelationManage";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.DEBUG) console.groupCollapsed( PREFIX + `[${type}]` );

	const target						= event.target;
	const dataset						= target.dataset;
	const checked						= target.checked;

	if (window.BSKY.DEBUG) console.debug( PREFIX + "Evento.:", event );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "type...:", type );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "target.:", target );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "dataset:", dataset );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "checked:", checked );

	// El toast.
	COMMON.showInfo( `¡Aún en desarrollo!` );

	switch ( type ) {
		case EVENT_RELATION_FOLLOW:
			break;
		case EVENT_RELATION_BLOCK:
			break;
		case EVENT_RELATION_MUTE:
			break;
	}

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.DEBUG) console.groupEnd();
}


/**********************************************************
 * BUSINESS Functions
 **********************************************************/

/* --------------------------------------------------------
 * LOGGED-IN PROCESS.
 *
 * "Search an user"
 *
 *   Requires a: "data-bsky-target" to complete.
 *   This is the "output" field where to display the results list.
 *
 *		/xrpc/app.bsky.actor.searchActorsTypeahead
 *		endpoint: API.bluesky.XRPC.api.public.searchActorsTypeahead
 *
 *		https://bsky.social/xrpc/app.bsky.actor.searchActorsTypeahead?q=madri
 *		https://public.api.bsky.app/xrpc/app.bsky.actor.searchActorsTypeahead?q=madri
 *
 *		https://bsky.social/xrpc/app.bsky.actor.searchActorsTypeahead?q=madri
 *		https://public.api.bsky.app/xrpc/app.bsky.actor.searchActorsTypeahead?q=madri
 *
 * -------------------------------------------------------- */
async function fnSearchUser( source ) {
	const STEP_NAME						= "fnSearchUser";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;

	// Veamos qué trae...
	let searchString					= source.value;

	// El "target" field...
	let targetField						= source.dataset.bskyTarget;

	// LOG Head.
	if (window.BSKY.DEBUG) console.groupCollapsed( PREFIX + `[searching for: ${source.value}] [output:${targetField}]` );

	if ( !COMMON.isNullOrEmpty( searchString ) && ( searchString.length>0 ) ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Searching for:", searchString );
		let received					= await APIBluesky.tryAndCatch( "searchProfile", APIBluesky.searchProfile, searchString );
		let actors						= received.actors;
		if (window.BSKY.DEBUG) console.debug( PREFIX + `Received ${actors.length} actor(s):`, actors );

		// Borramos lo que hubiera
		let $list						= $( `#${targetField}` );
		$list.empty();
		if ( actors && actors.length>0 ) {
			// Agregamos los encontrados.
			let html					= null;
			actors.forEach( actor => {
				html					= `<li class="list-group-item">`;
				
				// TODO: Incorporar un enlace (<a...) para cerrar el modal: DIV_MODAL_SEARCH_USER
				// <a data-bs-toggle="modal" data-bs-target="#remote_modal_frame" data-bs-dismiss="modal">...</a>


				// La imagen de perfil...
				html					+= `<a href="javascript:void(0)" onClick="BSKY.showProfile('${actor.handle}', '${actor.did}')" data-bsky-handle="${actor.handle}" data-bsky-did="${actor.did}" data-bs-toggle="modal" data-bs-target="#${HTML.DIV_MODAL_SEARCH_USER}" data-bs-dismiss="modal">`;
				// html					+= `<a href="javascript:void(0)" onClick="BSKY.showProfile('${actor.handle}', '${actor.did}')" data-bs-toggle="modal" data-bs-target="#${HTML.DIV_MODAL_SEARCH_USER}" data-bs-dismiss="modal">`;
				// html					+= `<a href="${API.bluesky.profile.url}${actor.handle || actor.did}" target="_blank">`;
				html					+= (actor.avatar) ? `<img src="${actor.avatar}" height="24">` : `<i class="bi bi-person"></i>`;
				html					+= `</a>&nbsp;`;

				// El enlace al perfil...
				html					+= `<a href="${API.bluesky.profile.url}${actor.handle || actor.did}" target="_blank">`;
				html					+= `${actor.displayName || actor.handle || actor.did}</a> [${actor.handle}]`;

				html					+= `</li>`;
				$list.append( html );
			});
		} else {
			if (window.BSKY.DEBUG) console.debug( PREFIX + `Found(${actors.length}): Nothing` );
			$list.append( `No profiles found for: [${searchString}]` );
		}
	}

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.DEBUG) console.groupEnd();
}

async function fnShowUserProfile( handle, did ) {
	const STEP_NAME						= "fnShowUserProfile";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.DEBUG) console.groupCollapsed( PREFIX + `[handle:${handle}] [did:${did}]` );
	
	const profileFromKnownFollowers		= BSKY.user.profile.viewer.knownFollowers.followers.find( x => COMMON.areEquals( did, x.did ) ) || null;
	const profileFromFollowers			= BSKY.user.followers.find( x => COMMON.areEquals( did, x.did ) ) || null;
	const profileFromFollowing			= BSKY.user.following.profiles.find( x => COMMON.areEquals( did, x.did ) ) || null;
	const profileFromMissingProfiles	= BSKY.user.following.missingProfiles.find( x => COMMON.areEquals( did, x.did ) ) || null;
	const profileFromBlocks				= BSKY.user.blocks.find( x => COMMON.areEquals( did, x.did ) ) || null;
	const profileFromMutes				= BSKY.user.mutes.find( x => COMMON.areEquals( did, x.did ) ) || null;
	const userProfile					= await BSKY.getUserProfile( handle );
	HTML.showStepInfo( STEP_NAME );

	if (window.BSKY.DEBUG) console.debug( PREFIX + `profileFromKnownFollowers.:`, profileFromKnownFollowers );
	if (window.BSKY.DEBUG) console.debug( PREFIX + `profileFromFollowers......:`, profileFromFollowers );
	if (window.BSKY.DEBUG) console.debug( PREFIX + `profileFromFollowing......:`, profileFromFollowing );
	if (window.BSKY.DEBUG) console.debug( PREFIX + `profileFromMissingProfiles:`, profileFromMissingProfiles );
	if (window.BSKY.DEBUG) console.debug( PREFIX + `profileFromBlocks.........:`, profileFromBlocks );
	if (window.BSKY.DEBUG) console.debug( PREFIX + `profileFromMutes..........:`, profileFromMutes );
	if (window.BSKY.DEBUG) console.debug( PREFIX + `userProfile...............:`, userProfile );

	// Las imágenes
	$( '.theme-profile-images-banner' ).attr( 'src', userProfile.banner );
	$( '.theme-profile-images-avatar' ).attr( 'src', userProfile.avatar );

	// Los datos
	$( '.theme-profile-info .profile-name' ).html( userProfile.displayName );
	$( '.theme-profile-info .profile-handle' ).html( userProfile.handle );
	$( '.theme-profile-info .profile-handle-link' ).attr( 'href', `https://bsky.app/profile/${userProfile.handle}` );
	$( '.theme-profile-info .profile-created' ).html( new Date( userProfile.createdAt ).toLocaleString( COMMON.DEFAULT_LOCALE, COMMON.DEFAULT_DATEFORMAT ) );
	$( '.theme-profile-info .profile-following' ).html( userProfile.followsCount );
	$( '.theme-profile-info .profile-followers' ).html( userProfile.followersCount );
	$( '.theme-profile-info .profile-posts' ).html( userProfile.postsCount );
	$( '.theme-profile-info .profile-description' ).val( userProfile.description );

	// La relación y los datasets para la relación
	let input							= null;

	input								= COMMON.getById( 'relation-follow' );
	input.checked						= !COMMON.isNullOrEmpty( profileFromFollowing );
	input.dataset.bskyHandle			= userProfile.handle;
	input.dataset.bskyDid				= userProfile.did;

	input								= COMMON.getById( 'relation-blocked' );
	input.checked						= !COMMON.isNullOrEmpty( profileFromBlocks );
	input.dataset.bskyHandle			= userProfile.handle;
	input.dataset.bskyDid				= userProfile.did;

	input								= COMMON.getById( 'relation-muted' );
	input.checked						= !COMMON.isNullOrEmpty( profileFromMutes );
	input.dataset.bskyHandle			= userProfile.handle;
	input.dataset.bskyDid				= userProfile.did;

	input								= COMMON.getById( 'relation-follow-me' );
	input.checked						= !COMMON.isNullOrEmpty( profileFromFollowers );

	input								= COMMON.getById( 'relation-blocked-by' );
	input.checked						= userProfile.viewer.blockedBy;

	input								= COMMON.getById( 'relation-muted-by' );
	input.checked						= userProfile.viewer.muted;


	if (window.BSKY.DEBUG) console.debug( PREFIX + `Opening the 'User Profile' modal...` );
	const userProfileModalOptions		= {
		"backdrop": true,
		"focus": true,
		"keyboard": true
	};
	// const userProfileModal				= new bootstrap.Modal( `#${HTML.DIV_MODAL_USER_PROFILE}`, userProfileModalOptions );
	const userProfileModal				= bootstrap.Modal.getOrCreateInstance( `#${HTML.DIV_MODAL_USER_PROFILE}`, userProfileModalOptions );
	userProfileModal.show();
	userProfileModal.handleUpdate();

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.DEBUG) console.groupEnd();
}

