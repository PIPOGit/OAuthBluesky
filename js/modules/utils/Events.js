/**********************************************************
 * Module imports
 **********************************************************/
// Global configuration
import CONFIGURATION					from "../../data/config.json" with { type: "json" };

// Common functions
import * as COMMON						from "../common/CommonFunctions.js";
// Common HTML functions
import * as HTML						from "../common/HTML.js";

// Common Settings functions
import * as SETTINGS					from "./Settings.js";


/**********************************************************
 * Module Constants
 **********************************************************/
// Module SELF constants
const MODULE_NAME						= COMMON.getModuleName( import.meta.url );

// Relationship constants
const EVENT_RELATION_FOLLOW				= "FOLLOW";
const EVENT_RELATION_BLOCK				= "BLOCK";
const EVENT_RELATION_MUTE				= "MUTE";

// Inner constants


/**********************************************************
 * Module Variables
 **********************************************************/


/**********************************************************
 * PRIVATE Functions
 **********************************************************/
/* --------------------------------------------------------
 * Manage events from the modal for "User Search".
 * -------------------------------------------------------- */
function eventRelationManage( event, type ) {
	const STEP_NAME						= "eventRelationManage";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[${type}]` );

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

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/**********************************************************
 * MODAL Events Functions
 **********************************************************/

/* --------------------------------------------------------
 * Invoked when modal for "User Search" pops-up.
 * -------------------------------------------------------- */
export function modalEventForVersionWhenInvoked( event ) {

	// Update the version and name fields
	// ---------------------------------------------------------
	let $modalBody						= `#${HTML.DIV_MODAL_VERSION} .modal-body`;
	$( `${$modalBody} #appName` ).html( CONFIGURATION.global.appName );
	$( `${$modalBody} #appVersion` ).html( CONFIGURATION.global.appVersion );

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
export function modalEventForSearchUsersWhenInvoked( event ) {

	// Clear "Search user" field
	// ---------------------------------------------------------
	$( `#${HTML.DIV_MODAL_SEARCH_OUTPUT}` ).empty();
	$( `#${HTML.DIV_MODAL_SEARCH_PATTERN}` ).val( '' );
	$( `#${HTML.DIV_MODAL_SEARCH_PATTERN}` ).focus();
}

/* --------------------------------------------------------
 * Invoked when dismissing modal for "User Search".
 * -------------------------------------------------------- */
export function modalEventForSearchUsersWhenClosed( event ) {

	// Clear "Search user" field
	// ---------------------------------------------------------
	$( `#${HTML.DIV_MODAL_SEARCH_OUTPUT}` ).empty();
	$( `#${HTML.DIV_MODAL_SEARCH_PATTERN}` ).val( '' );
	$( `#${HTML.DIV_MODAL_SEARCH_PATTERN}` ).focus();
}

/* --------------------------------------------------------
 * Invoked when modal for "Settings" pops-up.
 * -------------------------------------------------------- */
export function modalEventForSettingsWhenInvoked( event ) {

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
export function modalEventForSettingsWhenClosed( event ) {
	SETTINGS.fnUpdateDebug( event.target );
}

/* --------------------------------------------------------
 * Invoked when dismissing modal for "User Profile".
 * -------------------------------------------------------- */
export function modalEventForUserProfileWhenClosed( event ) {

	$( '.theme-profile-images-banner' ).prop( 'src', HTML.CONST_GRAY_IMAGE );
	$( '.theme-profile-images-avatar' ).prop( 'src', HTML.CONST_BLACK_IMAGE );

	// Los datos
	$( '.theme-profile-info .profile-name' ).html( "" );
	$( '.theme-profile-info .profile-handle' ).html( "" );
	$( '.theme-profile-info .profile-handle-link' ).prop( 'href', `javascript:void(0)` );
	$( '.theme-profile-info .profile-created' ).html( "" );
	$( '.theme-profile-info .profile-following' ).html( "" );
	$( '.theme-profile-info .profile-followers' ).html( "" );
	$( '.theme-profile-info .profile-posts' ).html( "" );
	$( '.theme-profile-info .profile-description' ).val( "" );

	// La relación
	$( '.theme-profile-relation #relation-follow'     ).prop( 'checked', false );
	$( '.theme-profile-relation #relation-follow-me'  ).prop( 'checked', false );
	$( '.theme-profile-relation #relation-blocked'    ).prop( 'checked', false );
	$( '.theme-profile-relation #relation-blocked-by' ).prop( 'checked', false );
	$( '.theme-profile-relation #relation-muted'      ).prop( 'checked', false );
	$( '.theme-profile-relation #relation-muted-by'   ).prop( 'checked', false );

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
 * Invoke: "eventRelationManage( event, EVENT_RELATION_FOLLOW )"
 * -------------------------------------------------------- */
export function eventRelationFollow( event ) {
	eventRelationManage( event, EVENT_RELATION_FOLLOW );
}

/* --------------------------------------------------------
 * Invoked when the user "switches" the "block" switch
 * in the "User Profile" modal.
 *
 * Invoke: "eventRelationManage( event, EVENT_RELATION_BLOCK )"
 * -------------------------------------------------------- */
export function eventRelationBlock( event ) {
	eventRelationManage( event, EVENT_RELATION_BLOCK );
}

/* --------------------------------------------------------
 * Invoked when the user "switches" the "mute" switch
 * in the "User Profile" modal.
 *
 * Invoke: "eventRelationManage( event, EVENT_RELATION_MUTE )"
 * -------------------------------------------------------- */
export function eventRelationMute( event ) {
	eventRelationManage( event, EVENT_RELATION_MUTE );
}


/**********************************************************
 * PUBLIC Functions
 **********************************************************/

