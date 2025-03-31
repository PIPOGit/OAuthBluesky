/**********************************************************
 * Module Info:
 *
 * This file contains all the Clearsky API top-level calls
 * (listed at the end).
 *
 * The functions here just prepare the call to be performed
 * later using: "APICall.xxxx" standardized methods.
 *
 * --------------------------------------------------------
 *
 * MORE ENDPOINTS!
 *
 * /subscribe-blocks-single-blocklist/
 *     This shows who is blocking you via a subscription to a list.
 *
 * /subscribe-blocks-blocklist/
 *     This show who you are blocking via a subscription to a list.
 *
 * /get-list/
 *     This is the moderation lists that other people have put you on.
 *
 * Get-list is just telling you what lists you're on.
 * Single-subscribe-list tells you who is blocking the lists you're on.
 *
 * About: "/subscribe-blocks-blocklist"
 *
 * No, it's a list of users that a person is blocking via a list.
 *
 * It is initially represented by the list name itself but we're planning on changing the UI/UX for lists to be more clear.
 *
 * I see what you're saying tho, from the pure API it comes as just the list.
 * On our UI that is hyperlinked to the list on bsky so you can see the users.
 *
 * We may have to add an endpoint that returns the actual users.
 *
 **********************************************************/


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
// Common Classes and Exceptions ("Types")
import * as TYPES						from "../common/CommonTypes.js";

/* --------------------------------------------------------
 * Modules with external, concrete API calls functions
 * -------------------------------------------------------- */
// Common APIBluesky functions
import * as APIBluesky					from "../api/APIBluesky.js";

/* --------------------------------------------------------
 * Modules with Helper functions
 * -------------------------------------------------------- */
// To perform API calls
import * as APICall						from "../utils/APICall.js";

/* --------------------------------------------------------
 * Modules with Crypto and authentication functions
 * -------------------------------------------------------- */
// Common DPOP functions
import * as DPOP						from "../auth/DPoPProof.js";


/**********************************************************
 * Module Constants
 **********************************************************/
// Module SELF constants
const MODULE_NAME						= COMMON.getModuleName( import.meta.url );

// Inner constants
const API								= CONFIGURATION.api;
const LSKEYS							= CONFIGURATION.localStorageKeys;
const CLIENT_APP						= CONFIGURATION.clientApp;
const CLEARSKY							= API.clearSky;
const URLS								= CLEARSKY.url;
const ENDPOINTS							= CLEARSKY.endpoints;

// Bluesky constants
const APP_CLIENT_ID						= CLIENT_APP.client_id;

// Module constants
const QUERY_PARAM_DID					= "[DID]";
const QUERY_PARAM_HANDLE_DID			= "[HANDLE/DID]";
const QUERY_PARAM_HANDLE				= "[HANDLE]";
const QUERY_PARAM_NAME					= "[NAME]";
const QUERY_PARAM_PAGE					= "[PAGE]";
const QUERY_PARAM_URI					= "[URI]";


/**********************************************************
 * Module Variables
 **********************************************************/


/**********************************************************
 * Module Load
 **********************************************************/


/**********************************************************
 * BOOTSTRAP Functions
 **********************************************************/


/**********************************************************
 * Module BootStrap Loader Function
 **********************************************************/


/**********************************************************
 * PRIVATE Functions
 **********************************************************/
async function callClearSkyURL( step, endpoint, did=BSKY.user?.profile?.did, handle=BSKY.user?.profile?.handle ) {
	const STEP_NAME						= "callClearSkyURL";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[step==${step}] [${did}/${handle}] [endpoint==${endpoint}]` );

	// Prepare the URL..
	// ---------------------------------------------------------
	let finalEndpoint					= endpoint.
		replaceAll( QUERY_PARAM_DID, did ).
		replaceAll( QUERY_PARAM_HANDLE_DID, did ).
		replaceAll( QUERY_PARAM_HANDLE, handle ).
		replaceAll( QUERY_PARAM_PAGE, 1 );

	// The URL is PDS, so... PDS Server
	const url							= URLS.api + URLS.prefix + finalEndpoint;
	if (window.BSKY.DEBUG) console.debug(PREFIX + "Fetching data from the URL:", url);

    // The DPoPProof.
	// ---------------------------------------------------------
	let dpopProof						= await DPOP.createDPoPProof( TYPES.DPoPRequest.getInstance( url, APICall.HTTP_GET ) )

    // The call headers, except the DPoP one, which will be included later.
	// ---------------------------------------------------------
    let headers										= {};
    headers[ APICall.HTTP_HEADER_ACCEPT ]			= APICall.CONTENT_TYPE_JSON;
	headers[ APICall.HTTP_HEADER_AUTHORIZATION ]	= `${APICall.HTTP_HEADER_DPOP} ${BSKY.data.userAccessToken}`;
	headers[ APICall.HTTP_HEADER_DPOP ]				= dpopProof;
	headers[ APICall.HTTP_HEADER_DPOP_NONCE ]		= BSKY.data.dpopNonce;

    // The call fetch options.
	// ---------------------------------------------------------
    let fetchOptions					= {
        method: APICall.HTTP_GET,
        headers: headers
    }

    // The call params; with a typed format.
	// ---------------------------------------------------------
	let requestParams					= TYPES.HTTPRequest.getInstanceWithFetch( STEP_NAME, url, fetchOptions );

    // The call.
	// ---------------------------------------------------------
	let responseFromServer				= null;
	try {
		responseFromServer				= await APICall.authenticatedCall( requestParams, false );
	} catch ( error ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR(${typeof error}):`, error );
		responseFromServer				= error;
	}
	if (window.BSKY.DEBUG) console.debug( PREFIX + "GOT responseFromServer:", responseFromServer );

	// Sanity check
	// ---------------------------------------------------------
	if ( responseFromServer instanceof TYPES.HTTPResponseError ) {
		if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		throw responseFromServer;
	}

    // The response payload.
	// ---------------------------------------------------------
	const payload						= responseFromServer.isJson ? responseFromServer.json : responseFromServer.txt;
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Returning:", payload );

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return payload;
}


/**********************************************************
 * BUSINESS Functions
 **********************************************************/
/* --------------------------------------------------------
 * LOGGED-IN PROCESS.
 *
 * Retrieve generic information about BlueSky.
 *
 * + ENDPOINTS.statistics.uptime
 * + ENDPOINTS.statistics.totalUsers
 * + ENDPOINTS.statistics.top20Blockers
 * + ENDPOINTS.statistics.top20BlockersAndBloqued
 * + ENDPOINTS.statistics.blockStats
 * -------------------------------------------------------- */
async function getStatistics() {
	const STEP_NAME						= "getStatistics";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + "Retrieving Statistics..." );

	let statistics						= {};
	statistics.uptime					= await callClearSkyURL( STEP_NAME, ENDPOINTS.statistics.uptime );
	statistics.totalUsers				= await callClearSkyURL( STEP_NAME, ENDPOINTS.statistics.totalUsers );
	// statistics.top20Blockers			= await callClearSkyURL( STEP_NAME, ENDPOINTS.statistics.top20Blockers );
	// statistics.top20BlockersAndBloqued	= await callClearSkyURL( STEP_NAME, ENDPOINTS.statistics.top20BlockersAndBloqued );
	// statistics.blockStats				= await callClearSkyURL( STEP_NAME, ENDPOINTS.statistics.blockStats );

	// First time step
	// ---------------------------------------------------------
	if ( window.BSKY.steps.firstTime ) window.BSKY.steps.total++;

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return statistics;
}

/* --------------------------------------------------------
 * LOGGED-IN PROCESS.
 *
 * Retrieve information about this particular user.
 *
 * + ENDPOINTS.user.history
 * + ENDPOINTS.user.blockedBy
 * + ENDPOINTS.user.blockedByCount
 * + ENDPOINTS.user.modLists
 * + ENDPOINTS.user.listsUserBlock
 * + ENDPOINTS.user.listsUserBlocked
 * -------------------------------------------------------- */
async function getUserInfo( did, handle ) {
	const STEP_NAME						= "getUserInfo";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_DATA					= `${PREFIX}[Raw Data] `;
	const PREFIX_HYDRATING				= `${PREFIX}[Hydrating] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `Retrieving UserInfo...` );

	let userInfo						= {};

	// Retrieving the info
	// ---------------------------------------------------------
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_DATA + "Retrieving raw data..." );

	// The user info history
	// [/get-handle-history/[HANDLE]]
	userInfo.history					= await callClearSkyURL( STEP_NAME, ENDPOINTS.user.history, did, handle );

	// How many accounts is the user blocking and which ones.
	// [/single-blocklist/[HANDLE/DID]] [/single-blocklist/total/[HANDLE/DID]]
	userInfo.blockedByCount				= await callClearSkyURL( STEP_NAME, ENDPOINTS.user.blockedByCount, did, handle );
	userInfo.blockedBy					= await callClearSkyURL( STEP_NAME, ENDPOINTS.user.blockedBy, did, handle );

	// Get what lists the user is on (someone has put the user there).
	// [subscribedToLists]			[/get-list/[HANDLE/DID]]
	userInfo.modLists					= await callClearSkyURL( STEP_NAME, ENDPOINTS.user.modLists, did, handle );

	// The lists of users that a person is blocking via a subscription to a list.
	// [subscribedToBlockLists]		[/subscribe-blocks-blocklist/[HANDLE/DID]]
	userInfo.listsUserBlock				= await callClearSkyURL( STEP_NAME, ENDPOINTS.user.listsUserBlock, did, handle );

	// The lists of users that are blocking the user via a subscription to a list
	// [blockedByLists]				[/subscribe-blocks-single-blocklist/[HANDLE/DID]]
	userInfo.listsUserBlocked			= await callClearSkyURL( STEP_NAME, ENDPOINTS.user.listsUserBlocked, did, handle );

	if (window.BSKY.GROUP_DEBUG) console.groupEnd();


	// Hydrating things
	// ---------------------------------------------------------
	const blockedByAccounts				= userInfo.blockedBy?.data?.blocklist			|| null;
	const subscribedToLists				= userInfo.modLists?.data?.lists				|| null;
	const subscribedToBlockLists		= userInfo.listsUserBlock?.data?.blocklists		|| null;
	const blockedByLists				= userInfo.listsUserBlocked?.data?.blocklists	|| null;
	let standardList					= null;
	let hydrated						= null;
	let cursor							= null;

	// Update the info panel
	HTML.showStepInfo( STEP_NAME, `Hydrating ClearSky data...` );

	// blockedBy
	// ---------------------------------------------------------
	if ( !COMMON.isNullOrEmpty( blockedByAccounts ) ) {
		if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_HYDRATING + "Hydrating blockedBy..." );
		userInfo.blockedBy.data.found	= [];
		for ( const account of blockedByAccounts ) {
			if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_HYDRATING + `+ Profile for account: [${account.did}]` );
			try {
				hydrated				= await APIBluesky.getUserProfile( account.did, false );
				if (window.BSKY.DEBUG) console.debug( PREFIX_HYDRATING + "  Hydrated profile:", hydrated );
				if ( !COMMON.isNullOrEmpty( hydrated ) ) userInfo.blockedBy.data.found.push( hydrated );
			} catch ( error ) {
				if (window.BSKY.DEBUG) console.debug( PREFIX_HYDRATING + `  ERROR[${error.message}]: [${error.cause}]`, error.json );
			}
			if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX_HYDRATING + "-- END" );
			if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		}
		if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX_HYDRATING + "-- END" );
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	} else {
		if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX_HYDRATING + "No profiles to hydrate." );
	}

	// First time step
	// ---------------------------------------------------------
	if ( window.BSKY.steps.firstTime ) window.BSKY.steps.total++;


	// subscribedToLists
	// ---------------------------------------------------------
	if ( !COMMON.isNullOrEmpty( subscribedToLists ) ) {
		if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_HYDRATING + "Hydrating subscribedToLists..." );
		userInfo.modLists.data.found	= [];
		for ( const list of subscribedToLists ) {
			if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_HYDRATING + `+ Subscribed to List: [${list.did}] [${list.name}]` );
			standardList				= TYPES.BSKYListDetails.getInstanceFromModList( list );
			try {
				hydrated				= await APIBluesky.getListDetails( standardList, cursor, false );
				if (window.BSKY.DEBUG) console.debug( PREFIX_HYDRATING + "  Hydrated subscribed to list:", hydrated );
				if ( !COMMON.isNullOrEmpty( hydrated ) ) userInfo.modLists.data.found.push( hydrated.list );
			} catch ( error ) {
				if (window.BSKY.DEBUG) console.debug( PREFIX_HYDRATING + `  ERROR[${error.message}]: [${error.cause}]`, error.json );
			}
			if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX_HYDRATING + "-- END" );
			if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		}
		if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX_HYDRATING + "-- END" );
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	} else {
		if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX_HYDRATING + "No subscribed to any list." );
	}

	// First time step
	// ---------------------------------------------------------
	if ( window.BSKY.steps.firstTime ) window.BSKY.steps.total++;


	// subscribedToBlockLists
	// ---------------------------------------------------------
	if ( !COMMON.isNullOrEmpty( subscribedToBlockLists ) ) {
		if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_HYDRATING + "Hydrating subscribedToBlockLists..." );
		userInfo.listsUserBlock.data.found	= [];
		for ( const list of subscribedToBlockLists ) {
			if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_HYDRATING + `+ Subscribed to Block List: [${list.list_owner}] [${list.list_name}]` );
			standardList				= TYPES.BSKYListDetails.getInstanceFromBlockList( list );
			try {
				hydrated				= await APIBluesky.getListDetails( standardList, cursor, false );
				if (window.BSKY.DEBUG) console.debug( PREFIX_HYDRATING + "  Hydrated subscribed to block list:", hydrated );
				if ( !COMMON.isNullOrEmpty( hydrated ) ) userInfo.listsUserBlock.data.found.push( hydrated.list );
			} catch ( error ) {
				if (window.BSKY.DEBUG) console.debug( PREFIX_HYDRATING + `  ERROR[${error.message}]: [${error.cause}]`, error.json );
			}
			if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX_HYDRATING + "-- END" );
			if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		}
		if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX_HYDRATING + "-- END" );
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	} else {
		if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX_HYDRATING + "No subscribed to any block list." );
	}

	// First time step
	// ---------------------------------------------------------
	if ( window.BSKY.steps.firstTime ) window.BSKY.steps.total++;


	// blockedByLists
	// ---------------------------------------------------------
	if ( !COMMON.isNullOrEmpty( blockedByLists ) ) {
		if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_HYDRATING + "Hydrating blockedByLists..." );
		userInfo.listsUserBlocked.data.found	= [];
		for ( const list of blockedByLists ) {
			if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_HYDRATING + `+ Blocked by List: [${list.list_owner}] [${list.list_name}]` );
			standardList				= TYPES.BSKYListDetails.getInstanceFromBlockList( list );
			try {
				hydrated				= await APIBluesky.getListDetails( standardList, cursor, false );
				if (window.BSKY.DEBUG) console.debug( PREFIX_HYDRATING + "  Hydrated member of block list:", hydrated );
				if ( !COMMON.isNullOrEmpty( hydrated ) ) userInfo.listsUserBlocked.data.found.push( hydrated.list );
			} catch ( error ) {
				if (window.BSKY.DEBUG) console.debug( PREFIX_HYDRATING + `  ERROR[${error.message}]: [${error.cause}]`, error.json );
			}
			if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX_HYDRATING + "-- END" );
			if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		}
		if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX_HYDRATING + "-- END" );
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	} else {
		if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX_HYDRATING + "No member of any block list." );
	}

	// First time step
	// ---------------------------------------------------------
	if ( window.BSKY.steps.firstTime ) window.BSKY.steps.total++;

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return userInfo;
}

/* --------------------------------------------------------
 * LOGGED-IN PROCESS.
 *
 * Retrieve both:
 * + generic information about BlueSky, and
 * + information about this particular user.
 *
 * -------------------------------------------------------- */
export async function retrieveClearSkyInfo( did=BSKY.user.profile.did, handle=BSKY.user.profile.handle ) {
	const STEP_NAME						= "retrieveClearSkyInfo";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	// if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[${did}/${handle}]` );

	// The response object
	const response						= {};

	response.statistics					= await getStatistics();
	// if (window.BSKY.DEBUG) console.debug( PREFIX + "Received statistics:", response.statistics );

	response.userInfo					= await getUserInfo( did, handle );
	// if (window.BSKY.DEBUG) console.debug( PREFIX + "Received userInfo:", response.userInfo );

	// if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	// if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return response;
}


/**********************************************************
 * PUBLIC Functions
 *
 * Exported functions; visible from outside.
 *
 * Each of them will perform a call to: "APICall.call" o:
 * "APICall.authenticatedCall"
 **********************************************************/
export async function getClearSkyInfo( did=BSKY.user.profile.did, handle=BSKY.user.profile.handle ) { return await retrieveClearSkyInfo( did, handle ); }


