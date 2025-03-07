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
	COMMON.getById(HTML.DIV_MODAL_SEARCH_USER).addEventListener( 'show.bs.modal', modalEventForSearchUsersWhenInvoked );
	COMMON.getById(HTML.DIV_MODAL_SETTINGS).addEventListener( 'show.bs.modal', modalEventForSettingsWhenInvoked );
	COMMON.getById(HTML.DIV_MODAL_SETTINGS).addEventListener( 'hidden.bs.modal', modalEventForSettingsWhenClosed );
	COMMON.getById(HTML.DIV_MODAL_VERSION).addEventListener( 'show.bs.modal', modalEventForVersionWhenInvoked );

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
	$( `${$modalBody} #gitAppName` ).html( BSKY.git.repoMetadata.name );
	$( `${$modalBody} #gitAppFullName` ).html( BSKY.git.repoMetadata.full_name );
	$( `${$modalBody} #gitDescription` ).html( BSKY.git.repoMetadata.description );
	$( `${$modalBody} #gitPublicURL` ).html( BSKY.git.repoMetadata.homepage );
	$( `${$modalBody} #gitURL` ).html( BSKY.git.repoMetadata.html_url );
	$( `${$modalBody} #gitLastTAG` ).html( BSKY.git.lastTag.name );
	$( `${$modalBody} #gitLastUpdated` ).html( BSKY.git.lastCommit.commit.committer.date );
	$( `${$modalBody} #gitPublicURLLink` ).prop( "href", BSKY.git.repoMetadata.homepage );
	$( `${$modalBody} #gitURLLink` ).prop( "href", BSKY.git.repoMetadata.html_url );

	// Raw GIT Information
	// ---------------------------------------------------------
	$( `#${HTML.DIV_GIT_INFO_JSON}` ).text( COMMON.prettyJson( BSKY.git ) );
	HTML.updateHighlight();
}

/* --------------------------------------------------------
 * Invoked when modal for "User Search" pops-up.
 * -------------------------------------------------------- */
function modalEventForSearchUsersWhenInvoked( event ) {

	// Clear "Search user" field
	// ---------------------------------------------------------
	$( `#${HTML.DIV_MODAL_SEARCH_PATTERN}` ).val( '' );
	$( `#${HTML.DIV_MODAL_SEARCH_OUTPUT}` ).empty();
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

	if (window.BSKY.DEBUG) console.debug( PREFIX + "source.dataset:", source.dataset );

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
				if (actor.avatar) {
					html				+= `<a href="${API.bluesky.profile.url}${actor.handle || actor.did}" target="_blank">`;
					html				+= `<img src="${actor.avatar}" height="24"></a>&nbsp;`;
				}
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

