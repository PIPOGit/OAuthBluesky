/**********************************************************
 * Module imports
 **********************************************************/
/* --------------------------------------------------------
 * Modules for Global configuration
 * -------------------------------------------------------- */
// Global configuration
import CONFIGURATION					from "../../data/config.json" with { type: "json" };

/* --------------------------------------------------------
 * Modules with Base functions
 * -------------------------------------------------------- */
// Common functions
import * as COMMON						from "../common/CommonFunctions.js";
// Common HTML functions
import * as HTML						from "../common/HTML.js";

/* --------------------------------------------------------
 * Modules with external, concrete API calls functions
 * -------------------------------------------------------- */
// Common APIBluesky functions
import * as APIBluesky					from "../api/APIBluesky.js";

/* --------------------------------------------------------
 * Modules with Helper functions
 * -------------------------------------------------------- */
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
const API								= CONFIGURATION.api;
const LSKEYS							= CONFIGURATION.localStorageKeys;
const CLIENT_APP						= CONFIGURATION.clientApp;
const BLUESKY							= API.bluesky;
const XRPC								= BLUESKY.XRPC;

// Bluesky constants
const APP_CLIENT_ID						= CLIENT_APP.client_id;
const NSID								= BLUESKY.NSID;


/**********************************************************
 * Module Variables
 **********************************************************/


/**********************************************************
 * PRIVATE Functions
 **********************************************************/
/* --------------------------------------------------------
 * Manage events from the modal for "User Search".
 * -------------------------------------------------------- */
async function eventRelationManage( event, type ) {
	const STEP_NAME						= "eventRelationManage";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[${type}==${event.target.checked}]` );

	const target						= event.target;
	const dataset						= target.dataset;
	const checked						= target.checked;
	let profile							= window.BSKY.data?.current?.profile  || null;
	let relation						= window.BSKY.data?.current?.relation || null;

	// if (window.BSKY.DEBUG) console.debug( PREFIX + "Evento.:", event );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "type....:", type );								// El slider que se ha pulsado
	if (window.BSKY.DEBUG) console.debug( PREFIX + "target..:", target.id );						// El ID del slider
	if (window.BSKY.DEBUG) console.debug( PREFIX + "dataset.:", COMMON.prettyJson( dataset ) );		// El dataset
	if (window.BSKY.DEBUG) console.debug( PREFIX + "checked.:", checked );							// El estado FINAL del slider
	if (window.BSKY.DEBUG) console.debug( PREFIX + "profile.:", profile?.displayName || null );		// El perfil temporal
	if (window.BSKY.DEBUG) console.debug( PREFIX + "  > did.:", profile?.did || null );				// El did del perfil temporal
	if (window.BSKY.DEBUG) console.debug( PREFIX + "viewer..:", profile?.viewer || null );			// El viewer del perfil temporal
	if (window.BSKY.DEBUG) console.debug( PREFIX + "relation:", relation );							// La relación con el perfil

	let response						= null;
	if ( !COMMON.isNullOrEmpty( profile ) && !COMMON.isNullOrEmpty( relation ) ) {
		try {
			switch ( type ) {
				case EVENT_RELATION_FOLLOW:
					if ( checked ) {
						response		= await APIBluesky.follow( profile.did );
					} else {
						response		= await APIBluesky.unfollow( relation.follow.itRkey );
					}
					break;
				case EVENT_RELATION_MUTE:
					// El toast.
					COMMON.showInfo( `¡Aún en desarrollo!` );

					/*
					if ( checked ) {
						response		= await APIBluesky.mute( profile.did );
					} else {
						response		= await APIBluesky.unmute( relation.mute.xxxx );
					}
					*/
					break;
				case EVENT_RELATION_BLOCK:
					if ( checked ) {
						response		= await APIBluesky.block( profile.did );
					} else {
						response		= await APIBluesky.unblock( relation.block.itRkey );
					}
					break;
			}
			if (window.BSKY.DEBUG) console.debug( PREFIX + "response:", response );
			
			if ( !COMMON.isNullOrEmpty( response ) ) {
				profile					= await BSKY.getUserProfile( profile.handle );
				relation				= analyzeRelationship( profile.viewer, relation.mute.it );
				window.BSKY.data.current.profile	= profile;
				window.BSKY.data.current.relation	= relation;
			}
		} catch ( error ) {
			if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR(${typeof error}): [code==${error.code}] [message==${error.message}] [cause==${error.cause}]` );
		}
	}

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}

/* --------------------------------------------------------
 * Analizes the relationship between this profile
 * and other, thru it's "viewer" key.
 * -------------------------------------------------------- */
function analyzeRelationship( viewer, muted ) {
	const STEP_NAME						= "analyzeRelationship";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	const followingThisAccount			= viewer?.following			? true : false;
	const followedByThisAccount			= viewer?.followedBy		? true : false;
	const blockingThisAccount			= viewer?.blocking			? true : false;
	const blockedByThisAccount			= viewer?.blockedBy			? true : false;
	const blockingThisAccountByList		= viewer?.blockingByList	? true : false;
	const mutedByThisAccount			= viewer?.muted				? true : false;

	const rkeyFollowing					= followingThisAccount		? COMMON.getRKeyFromURL( viewer.following )		: null;
	const rkeyFollowed					= followedByThisAccount		? COMMON.getRKeyFromURL( viewer.followedBy )	: null;
	const rkeyBlocking					= blockingThisAccount		? COMMON.getRKeyFromURL( viewer.blocking )		: null;
	const rkeyBlockingByList			= blockingThisAccountByList	? COMMON.getRKeyFromURL( viewer.blockingByList.uri ) : null;
	
	const relation						= {};

	relation.follow						= {};
	relation.follow.me					= followedByThisAccount;
	relation.follow.meRkey				= rkeyFollowed;
	relation.follow.it					= followingThisAccount;
	relation.follow.itRkey				= rkeyFollowing;

	relation.mute						= {};
	relation.mute.me					= mutedByThisAccount;
	relation.mute.it					= muted;

	relation.block						= {};
	relation.block.me					= blockedByThisAccount;
	relation.block.it					= blockingThisAccount;
	relation.block.itRkey				= rkeyBlocking;
	relation.block.itByList				= blockingThisAccountByList;
	relation.block.itByListRkey			= rkeyBlockingByList;

	if (window.BSKY.DEBUG) console.debug( PREFIX + `+ followingThisAccount.....: [${followingThisAccount}] [rkey==${rkeyFollowing}]` );
	if (window.BSKY.DEBUG) console.debug( PREFIX + `+ followedByThisAccount....: [${followedByThisAccount}] [rkey==${rkeyFollowed}]` );
	if (window.BSKY.DEBUG) console.debug( PREFIX + `+ mutedByThisAccount.......: [${mutedByThisAccount}]` );
	if (window.BSKY.DEBUG) console.debug( PREFIX + `+ blockingThisAccount......: [${blockingThisAccount}] [rkey==${rkeyBlocking}]` );
	if (window.BSKY.DEBUG) console.debug( PREFIX + `+ blockedByThisAccount.....: [${blockedByThisAccount}]` );
	if (window.BSKY.DEBUG) console.debug( PREFIX + `+ blockingThisAccountByList: [${blockingThisAccountByList}] [rkey==${rkeyBlockingByList}]` );

    // The relation status
	// ---------------------------------------------------------

	/*
		[Chema Torrales]
			did: did:plc:zzff7xikgohhuanfodxmuruw
			handle: torraleschema.bsky.social
			Viewer:
				blockedBy: false
				followedBy: "at://did:plc:zzff7xikgohhuanfodxmuruw/app.bsky.graph.follow/3lbpjx6ekdb2i"
				following: "at://did:plc:tjc27aje4uwxtw5ab6wwm4km/app.bsky.graph.follow/3lbfazyjcp327"
				muted: false
			Log:
				[Events:showUserProfile] + displayName..............: Chema Torrales
				[Events:showUserProfile] + followingThisAccount.....: [true] [rkey==3lbfazyjcp327]
				[Events:showUserProfile] + followedByThisAccount....: [true] [rkey==3lbpjx6ekdb2i]
				[Events:showUserProfile] + mutedByThisAccount.......: [false]
				[Events:showUserProfile] + blockingThisAccount......: [false] [rkey==null]
				[Events:showUserProfile] + blockedByThisAccount.....: [false]
				[Events:showUserProfile] + blockingThisAccountByList: [false] [rkey==null]
		[Martis]			[MUTED]
			did: did:plc:fhcznawyz2o7o6gt43fx2tcc
			handle: martismar.bsky.social
			Viewer:
				blockedBy: false
				muted: true
			Log:
				[Events:showUserProfile] + displayName..............: Martis
				[Events:showUserProfile] + followingThisAccount.....: [false] [rkey==null]
				[Events:showUserProfile] + followedByThisAccount....: [false] [rkey==null]
				[Events:showUserProfile] + mutedByThisAccount.......: [true]
				[Events:showUserProfile] + blockingThisAccount......: [false] [rkey==null]
				[Events:showUserProfile] + blockedByThisAccount.....: [false]
				[Events:showUserProfile] + blockingThisAccountByList: [false] [rkey==null]
		[Oscar]				[BLOCKED] [BLOCKEDBY]
			did: did:plc:5is5ee4fqposxdsvel3vw623
			handle: soyoscarsintilde.bsky.social
			Viewer:
				blockedBy: true
				blocking: "at://did:plc:tjc27aje4uwxtw5ab6wwm4km/app.bsky.graph.block/3llesttisuz2a"
				muted: false
			Log:
				[Events:showUserProfile] + displayName..............: Oscar 🇨🇴
				[Events:showUserProfile] + followingThisAccount.....: [false] [rkey==null]
				[Events:showUserProfile] + followedByThisAccount....: [false] [rkey==null]
				[Events:showUserProfile] + mutedByThisAccount.......: [false]
				[Events:showUserProfile] + blockingThisAccount......: [true] [rkey==3llesttisuz2a]
				[Events:showUserProfile] + blockedByThisAccount.....: [true]
				[Events:showUserProfile] + blockingThisAccountByList: [false] [rkey==null]
		[Miss Mangajojo]	[BLOCKED] [BLOCKEDBY] [BLOCKED THRU LIST]
			did: did:plc:l5kihpf5ow3yiwerg7ornele
			handle: msmangajojo.bsky.social
			Viewer:
				blockedBy: true
				blocking: "at://did:plc:74dumyxhcc33gzm6jgaj76g6/app.bsky.graph.list/3l6s7olkplp2t"
				blockingByList: {uri: 'at://did:plc:74dumyxhcc33gzm6jgaj76g6/app.bsky.graph.list/3l6s7olkplp2t', cid: 'bafyreih3pskmfawupbkfgacrqehfiv5e4rkcdasf7yzdtfe2u5vec2kewm', name: 'Nazis y mierdas', purpose: 'app.bsky.graph.defs#modlist', avatar: 'https://cdn.bsky.app/img/avatar/plain/did:plc:74du…yyejaxxb5zksmw2plequac7p4n332spyvlm5l7vezn3m@jpeg', …}
				muted: false
			Log:
				[Events:showUserProfile] + displayName..............: 🌹💙Miss Mangajojo, Covid Cautious, Left-Wing & Coffee Lover.
				[Events:showUserProfile] + followingThisAccount.....: [false] [rkey==null]
				[Events:showUserProfile] + followedByThisAccount....: [false] [rkey==null]
				[Events:showUserProfile] + mutedByThisAccount.......: [false]
				[Events:showUserProfile] + blockingThisAccount......: [true] [rkey==3l6s7olkplp2t]
				[Events:showUserProfile] + blockedByThisAccount.....: [true]
				[Events:showUserProfile] + blockingThisAccountByList: [true] [rkey==3l6s7olkplp2t]
		[Trinity Guinness]	[BLOCKEDBY]
			did: did:plc:r6sahwxjoxxpp5rggqpyz6hp
			handle: guinnessiana.bsky.social
			Viewer:
				blockedBy: true
				muted: false
			Log:
				[Events:showUserProfile] + displayName..............:  Trinity Guinness 🏳️‍🌈🏳️‍⚧️Q+ #AltriNON
				[Events:showUserProfile] + followingThisAccount.....: [false] [rkey==null]
				[Events:showUserProfile] + followedByThisAccount....: [false] [rkey==null]
				[Events:showUserProfile] + mutedByThisAccount.......: [false]
				[Events:showUserProfile] + blockingThisAccount......: [false] [rkey==null]
				[Events:showUserProfile] + blockedByThisAccount.....: [true]
				[Events:showUserProfile] + blockingThisAccountByList: [false] [rkey==null]
	 */

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return relation;
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
 * Invoked when modal for "User Profile" pops-up.
 * -------------------------------------------------------- */
export function modalEventForUserProfileWhenInvoked( event ) {
	const STEP_NAME						= "modalEventForUserProfileWhenInvoked";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	if (window.BSKY.DEBUG) console.debug( PREFIX + `Showing modal...` );

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}

/* --------------------------------------------------------
 * "Display an user's profile"
 * -------------------------------------------------------- */
export async function showUserProfile( handle, did ) {
	const STEP_NAME						= "showUserProfile";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[handle:${handle}] [did:${did}]` );

    // Several data.
	// ---------------------------------------------------------
	const profileFromKnownFollowers		= BSKY.user.profile.viewer.knownFollowers.followers.find( x => COMMON.areEquals( did, x.did ) ) || null;
	const profileFromFollowers			= BSKY.user.followers.find( x => COMMON.areEquals( did, x.did ) ) || null;
	const profileFromFollowing			= BSKY.user.following.profiles.find( x => COMMON.areEquals( did, x.did ) ) || null;
	const profileFromMissingProfiles	= BSKY.user.missingProfiles.find( x => COMMON.areEquals( did, x.did ) ) || null;
	const profileFromBlocks				= BSKY.user.blocks.find( x => COMMON.areEquals( did, x.did ) ) || null;
	const profileFromMutes				= BSKY.user.mutes.find( x => COMMON.areEquals( did, x.did ) ) || null;
	
	// A refreshed version of the user's profile
	const userProfile					= await BSKY.getUserProfile( handle );
	const viewer						= userProfile.viewer;
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Got profile for user: [${handle}]. "Viewer":`, viewer );

	HTML.showStepInfo( STEP_NAME );

    // Draw the profile.
	// ---------------------------------------------------------

	// Las imágenes
	$( '.theme-profile-images-banner' ).prop( 'src', userProfile.banner );
	$( '.theme-profile-images-avatar' ).prop( 'src', userProfile.avatar );

	// Los datos
	const urlDIDDoc						= BLUESKY.plc.url + "/" + encodeURIComponent( userProfile.did );
	$( '.theme-profile-info .profile-name' ).html( userProfile.displayName );
	$( '.theme-profile-info .profile-did' ).html( userProfile.did );
	$( '.theme-profile-info .profile-did-link' ).prop( 'href', urlDIDDoc );
	$( '.theme-profile-info .profile-handle' ).html( userProfile.handle );
	$( '.theme-profile-info .profile-handle-link' ).prop( 'href', `https://bsky.app/profile/${userProfile.handle}` );
	$( '.theme-profile-info .profile-created' ).html( new Date( userProfile.createdAt ).toLocaleString( COMMON.DEFAULT_LOCALE, COMMON.DEFAULT_DATEFORMAT ) );
	$( '.theme-profile-info .profile-following' ).html( userProfile.followsCount );
	$( '.theme-profile-info .profile-followers' ).html( userProfile.followersCount );
	$( '.theme-profile-info .profile-posts' ).html( userProfile.postsCount );
	$( '.theme-profile-info .profile-description' ).val( userProfile.description );
	if (window.BSKY.DEBUG) console.debug( PREFIX + `+ displayName..............:`, userProfile.displayName );

    // The relationship between profiles
	// ---------------------------------------------------------
	const relation						= analyzeRelationship( viewer, !COMMON.isNullOrEmpty( profileFromMutes ) );

    // The dataset
	// ---------------------------------------------------------

	// La relación y los datasets para la relación
	let input							= null;

	input								= COMMON.getById( 'relation-follow' );
	input.checked						= relation.follow.it;
	input.dataset.bskyHandle			= userProfile.handle;
	input.dataset.bskyDid				= userProfile.did;

	input								= COMMON.getById( 'relation-blocked' );
	input.checked						= relation.block.it;
	input.dataset.bskyHandle			= userProfile.handle;
	input.dataset.bskyDid				= userProfile.did;

	input								= COMMON.getById( 'relation-muted' );
	input.checked						= relation.mute.it;
	input.dataset.bskyHandle			= userProfile.handle;
	input.dataset.bskyDid				= userProfile.did;

	input								= COMMON.getById( 'relation-follow-me' );
	input.checked						= relation.follow.me;

	input								= COMMON.getById( 'relation-blocked-by' );
	input.checked						= relation.block.me;

	input								= COMMON.getById( 'relation-muted-by' );
	input.checked						= relation.mute.me;

	// The modal itselft, to resize.
	// ---------------------------------------------------------
	const userProfileModal				= bootstrap.Modal.getOrCreateInstance( `#${HTML.DIV_MODAL_USER_PROFILE}` );
	userProfileModal.show();
	userProfileModal.handleUpdate();

    // Temp save.
	// ---------------------------------------------------------

	// Save temporarilly the user's profile un the top object.
	window.BSKY.data.current			= {};
	window.BSKY.data.current.profile	= userProfile;
	window.BSKY.data.current.relation	= relation;			// To store the "mute"

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}

/* --------------------------------------------------------
 * Invoked when dismissing modal for "User Profile".
 * -------------------------------------------------------- */
export function modalEventForUserProfileWhenClosed( event ) {
	const STEP_NAME						= "modalEventForUserProfileWhenClosed";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	if (window.BSKY.DEBUG) console.debug( PREFIX + `Hiding modal...` );

    // Draw an empty profile.
	// ---------------------------------------------------------

	$( '.theme-profile-images-banner' ).prop( 'src', HTML.CONST_GRAY_IMAGE );
	$( '.theme-profile-images-avatar' ).prop( 'src', HTML.CONST_BLACK_IMAGE );

	// Los datos
	$( '.theme-profile-info .profile-name' ).html( "" );
	$( '.theme-profile-info .profile-did' ).html( "" );
	$( '.theme-profile-info .profile-did-link' ).prop( 'href', `javascript:void(0)` );
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

    // The dataset
	// ---------------------------------------------------------

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

    // Delete saved temp.
	// ---------------------------------------------------------
	delete window.BSKY.data.current;

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
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

