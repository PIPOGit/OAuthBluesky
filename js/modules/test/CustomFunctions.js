/**********************************************************
 * Module imports
 *
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
// Common ClearSky functions
import * as APIClearSky					from "../api/APIClearSky.js";
// Common PLC Directory functions
import * as APIPLCDirectory				from "../api/APIPLCDirectory.js";

// Common Relations functions
import * as RELATIONS					from "../utils/Relations.js";


/**********************************************************
 * Module Constants
 **********************************************************/
// Module SELF constants
const MODULE_NAME						= COMMON.getModuleName( import.meta.url );

// Inner constants
const API								= CONFIGURATION.api;
const BLUESKY							= API.bluesky;
const NSID								= BLUESKY.NSID;

// Inner constants functions
const CONSOLE_STYLE						= 'background-color: navy; color: white; padding: 1px 4px; border: 1px solid cyan; font-size: 1em;';


/**********************************************************
 * Module Variables
 **********************************************************/


/**********************************************************
 * BOOTSTRAP Functions
 **********************************************************/
/* --------------------------------------------------------
 * Module Load
 * -------------------------------------------------------- */
( ( parent, argument ) => {
	if ( COMMON.getTypeOf( argument ) === 'function' ) {
		parent.addEventListener( "DOMContentLoaded", argument ); return;
	};
}).call(
	this			// The reference object (as per protocol).
	, window		// The first argument for the constructor; the top-most object in the DOM hierarchy.
	, startUp		// The loading function to be executed, once the page is loaded.
);


/* --------------------------------------------------------
 * Module BootStrap Loader Function
 * -------------------------------------------------------- */
async function startUp() {
	'use strict'

	const STEP_NAME						= "startUp";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_MODULE_INFO			= `${PREFIX}[Module Info] `;

	// ---------------------------------------------------------
	// General default logging properties
	// ---------------------------------------------------------
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// ================================================================
	// Module INFO INI

	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_MODULE_INFO );
	if (window.BSKY.DEBUG) console.debug( PREFIX_MODULE_INFO + "MODULE_NAME:", MODULE_NAME, "import.meta.url:", import.meta.url );

	// Root Object update.
	// ---------------------------------------------------------
	// + Properties

	// + Functions
	window.BSKY.customFunction			= runCustomFunction;

	// Module INFO END
	// ================================================================
	if (window.BSKY.DEBUG) console.debug( PREFIX_MODULE_INFO + `Updated object: [window.BSKY].`, window.BSKY );
	console.info( `Loaded module ${MODULE_NAME}.` );

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX_MODULE_INFO + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();

	// Page setup concrete actions.
	// ---------------------------------------------------------

	// ---------------------------------------------------------
	// End of module setup
	// ---------------------------------------------------------
	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/**********************************************************
 * PRIVATE Functions
 **********************************************************/

/* --------------------------------------------------------
 * Inner "Business function": Retrieve records from the
 * user's PDS (the "repo"), of a given type ("NSID").
 * -------------------------------------------------------- */
async function getRepoRecordsOfNSIDType( nsid, renderHTMLErrors=true ) {
	const STEP_NAME						= "getRepoRecordsOfNSIDType";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[nsid=${nsid}]` );

	let n								= 0;
	let apiCallResponse					= null;
	let cursor							= null;
	let hayCursor						= false;
	let data							= [];
	let allData							= [];
	let subTotal						= 0;
	let acumulado						= 0;

	try {
		do {
			n++;
			// Retrieve the user's repo records of type 'NSID'
			// ---------------------------------------------------------
			apiCallResponse					= await APIBluesky.getRecords( { cursor: cursor, nsid: nsid, renderHTMLErrors: renderHTMLErrors } );

			// Datos. Seguimos?
			cursor							= ( apiCallResponse.hasOwnProperty("cursor") ) ? apiCallResponse.cursor : null;
			hayCursor						= !COMMON.isNullOrEmpty(cursor);

			data							= apiCallResponse.records;
			subTotal						= data.length;
			allData.push(...data);
			acumulado						= allData.length;

			// Update the info panel
			HTML.showStepInfo( STEP_NAME, `Retrieving who the user follows (${acumulado})...` );
		} while ( hayCursor && (n<MAX_ITERATIONS) );
	} catch ( error ) {
		if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		throw( error );
	}

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return allData;
}


/**********************************************************
 * TEST Functions
 **********************************************************/

async function cfGetRecordsByNSID( event ) {
	const STEP_NAME						= "cfGetRecordsByNSID";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Retrieve the list of records of a given type from the repo.
	// ---------------------------------------------------------
	const nsid							= NSID.status;

	// The records.
	let allData							= null;
	try {
		allData							= await getRepoRecordsOfNSIDType( nsid, false );
		if ( COMMON.isNullOrEmpty( allData ) ) {
			if (window.BSKY.DEBUG) console.debug( PREFIX + `No data received.` );
		} else {
			// TODO: Explore the results
			if (window.BSKY.DEBUG) console.debug( PREFIX + `Received:`, allData );
		}
	} catch( error ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR[${error?.error}==${error?.error}]` );
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR[${error?.error?.json}==${error?.error?.json}]` );
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR[${error?.error?.json?.error}==${error?.error?.json?.message}]` );
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR:`, COMMON.prettyJson( error ) );
	}

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}

async function cfGetClearSkyInfo( event ) {
	const STEP_NAME						= "cfGetClearSkyInfo";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_DID_INFO				= `${PREFIX}[DID Info] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	const USER_DID						= "did:plc:tjc27aje4uwxtw5ab6wwm4km";
	const USER_HANDLE					= "madrilenyer.bsky.social";

	// Retrieve the ClearSky info.
	// ---------------------------------------------------------
	window.BSKY.faviconWorking();
	let clearSkyInfo							= null;
	try {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `Invoking the 'getClearSkyInfo' function with: [did==${USER_DID}] [handle==${USER_HANDLE}]` );
		clearSkyInfo					= await APIClearSky.getClearSkyInfo( USER_DID, USER_HANDLE );
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Retrieved result:", clearSkyInfo );
		
		/* Ahora, con el resultado, comprobamos si tenemos los perfiles ya descargados o no.
		 * Hay que mirar en:
		 *
		 * + BSKY.user.following.profiles => did
		 * + BSKY.user.following.missingProfiles => did
		 * + BSKY.user.followers => did
		 * + BSKY.user.blocks => did
		 * + BSKY.user.mutes => did
		 */
		let found						= null;
		let didDoc						= null;
		let profile						= null;
		let someFound					= false;
		let alreadyBlocked				= null;

		const blockedBy					= clearSkyInfo.userInfo.blockedBy.data.blocklist;
		if (window.BSKY.DEBUG) console.debug( PREFIX + `Searching for blocked profiles...`);
		for ( const blocked of blockedBy ) {
			if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_DID_INFO + `[did==${blocked.did}]` );
			someFound					= false;
			found						= BSKY.user.following.profiles.find( x => COMMON.areEquals( x.did, blocked.did ) ) || null;
			if (found) {
				someFound				= true;
				if (window.BSKY.DEBUG) console.debug( PREFIX_DID_INFO + `+ [following]: [${found.handle}/${found.displayName}]`, COMMON.prettyJson( found.viewer ) );
			}
			found						= BSKY.user.missingProfiles.find( x => COMMON.areEquals( x.did, blocked.did ) ) || null;
			if (found) {
				someFound				= true;
				if (window.BSKY.DEBUG) console.debug( PREFIX_DID_INFO + `+ [missingProfiles]: [${found.handle}/${found.displayName}]`, COMMON.prettyJson( found.viewer ) );
			}
			found						= BSKY.user.followers.find( x => COMMON.areEquals( x.did, blocked.did ) ) || null;
			if (found) {
				someFound				= true;
				if (window.BSKY.DEBUG) console.debug( PREFIX_DID_INFO + `+ [followers]: [${found.handle}/${found.displayName}]`, COMMON.prettyJson( found.viewer ) );
			}
			found						= BSKY.user.blocks.find( x => COMMON.areEquals( x.did, blocked.did ) ) || null;
			if (found) {
				someFound				= true;
				if (window.BSKY.DEBUG) console.debug( PREFIX_DID_INFO + `+ [blocks]: [${found.handle}/${found.displayName}]`, COMMON.prettyJson( found.viewer ) );
			}
			found						= BSKY.user.mutes.find( x => COMMON.areEquals( x.did, blocked.did ) ) || null;
			if (found) {
				someFound				= true;
				if (window.BSKY.DEBUG) console.debug( PREFIX_DID_INFO + `+ [mutes]: [${found.handle}/${found.displayName}]`, COMMON.prettyJson( found.viewer ) );
			}
			if ( !someFound ) {
				if (window.BSKY.DEBUG) console.debug( PREFIX_DID_INFO + `%c- Need to add: [${blocked.did}]`, CONSOLE_STYLE );
				try {
					didDoc					= await APIPLCDirectory.resolveDid( blocked.did );
					if (window.BSKY.DEBUG) console.debug( PREFIX_DID_INFO + `  DID Doc: [${blocked.did}]`, didDoc );
				} catch ( error ) {
					const errorAsJson		= error.toJSON();
					if (window.BSKY.DEBUG) console.debug( PREFIX_DID_INFO + `  ERROR(${typeof error}|${typeof errorAsJson}) Retrieving profile for [${blocked.did}]:`, errorAsJson );
				}
				try {
					profile					= await APIBluesky.getUserProfile( blocked.did );
					alreadyBlocked			= BSKY.user.blocks.filter( x => COMMON.areEquals( x.did, blocked.did ) );
					if (window.BSKY.DEBUG) console.debug( PREFIX_DID_INFO + `  Profile: [${profile.handle}/${profile.displayName}] [alreadyBlocked==${alreadyBlocked}]`, COMMON.prettyJson( profile.viewer ) );
				} catch ( error ) {
					const errorAsJson		= error.toJSON();
					if (window.BSKY.DEBUG) console.debug( PREFIX_DID_INFO + `  ERROR(${typeof error}|${typeof errorAsJson}) Retrieving profile for [${blocked.did}]:`, errorAsJson );
				}
			}
			if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX_DID_INFO + "-- END" );
			if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		};

	} catch (error) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Errors found.", error );

		// Show the error and update the HTML fields
		HTML.updateHTMLError(error);
	} finally {
		window.BSKY.faviconStandBy();
	}

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return clearSkyInfo;
}

async function cfGetUserFeeds( event ) {
	const STEP_NAME						= "cfGetUserFeeds";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Retrieve the user feeds.
	// ---------------------------------------------------------

	// The records.
	let allData							= null;
	try {
		allData							= await APIBluesky.getUserFeeds();
		if ( COMMON.isNullOrEmpty( allData ) ) {
			if (window.BSKY.DEBUG) console.debug( PREFIX + `No data received.` );
		} else {
			// TODO: Explore the results
			if (window.BSKY.DEBUG) console.debug( PREFIX + `Received:`, allData );
		}
	} catch( error ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR[${error?.error}==${error?.error}]` );
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR[${error?.error?.json}==${error?.error?.json}]` );
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR[${error?.error?.json?.error}==${error?.error?.json?.message}]` );
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR:`, COMMON.prettyJson( error ) );
	}

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}

async function cfFollowUnfollowTestArguments( event, parameters ) {
	const STEP_NAME						= "cfFollowUnfollowTestArguments";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	if (window.BSKY.DEBUG) console.debug( PREFIX + `Received event.....:`, event );
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Received parameters:`, parameters );
	const profiles						= parameters?.profiles || null;
	let profile							= null;
	let unfollowed						= null;
	if ( profiles ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `Exploring profiles...`, );
		let entry						= null;
		for ( let key in profiles ) {
			entry						= profiles[key];
			if (window.BSKY.DEBUG) console.debug( PREFIX + `+ User[${key}]:`, entry );
			profile						= await APIBluesky.getUserProfile( entry.handle, false )
			if (window.BSKY.DEBUG) console.debug( PREFIX + `  Profile[${key}]:`, profile );
		}

		// TEST: FOLLOW
		const martis					= profiles.martis;
		if (window.BSKY.DEBUG) console.debug( PREFIX + `  Profile[martis]:`, martis );
		profile							= await APIBluesky.getUserProfile( martis.handle, false )
		if (window.BSKY.DEBUG) console.debug( PREFIX + `  Profile[martis][before]:`, profile );
		const followed					= await APIBluesky.follow( martis.did );
		if (window.BSKY.DEBUG) console.debug( PREFIX + `  Profile[martis][followed]:`, followed );
		profile							= await APIBluesky.getUserProfile( martis.handle, false )
		if (window.BSKY.DEBUG) console.debug( PREFIX + `  Profile[martis][hydrated]:`, profile );
		
		// The "rkey"
		const record					= profile?.viewer?.following || null;
		// const rkey						= record ? record.split('/')[4] : null;
		const rkey						= record ? COMMON.getRKeyFromURL( record ) : null;
		if (window.BSKY.DEBUG) console.debug( PREFIX + `  Profile[martis][rkey==${rkey}]` );

		// TEST: UNFOLLOW
		if ( rkey ) {
			unfollowed					= await APIBluesky.unfollow( rkey );
			if (window.BSKY.DEBUG) console.debug( PREFIX + `  Profile[martis][unfollowed]:`, unfollowed );
		}
	}

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return { profile: profile, unfollowed: unfollowed };
}

async function cfGetTheRelations() {
	const STEP_NAME						= "cfGetTheRelations";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;

	// Retrieve the user relations.
	// ---------------------------------------------------------

	// The records.
	let allData							= null;
	try {
		allData							= await RELATIONS.getTheRelations();
		if ( COMMON.isNullOrEmpty( allData ) ) {
			if (window.BSKY.DEBUG) console.debug( PREFIX + `No data received.` );
		} else {
			// TODO: Explore the results
			if (window.BSKY.DEBUG) console.debug( PREFIX + `Received:`, allData );
		}
	} catch( error ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR[${error?.error}==${error?.error}]` );
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR[${error?.error?.json}==${error?.error?.json}]` );
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR[${error?.error?.json?.error}==${error?.error?.json?.message}]` );
		if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR:`, COMMON.prettyJson( error ) );
	}
}


/**********************************************************
 * PUBLIC Functions
 **********************************************************/

/* --------------------------------------------------------
 * LOGGED-IN PROCESS.
 *
 * "Custom Function"
 *
 * Put here the desired code to run, and launch the function
 * just pressing the keyboard combination binded to the:
 *     KPListener.KEYSTROKES_CUSTOM_FUNCTION ==
 *       config.keystrokes.custom_function
 * variable.
 * -------------------------------------------------------- */
export async function runCustomFunction( event ) {
	const STEP_NAME						= "runCustomFunction";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Run a concrete custom function
	// (CHOOSE one function to run)
	// ---------------------------------------------------------
	// const customFunction					= cfGetRecordsByNSID;
	// const customFunction					= cfGetClearSkyInfo;
	// const customFunction					= cfGetUserFeeds;
	// const customFunction					= cfFollowUnfollowTestArguments;
	const customFunction					= cfGetTheRelations;
	const parameters						= {
		sample: "Hello!",
		profiles: {
			martis: { did: "did:plc:fhcznawyz2o7o6gt43fx2tcc", handle: "martismar.bsky.social" },
			oscar: { did: "did:plc:5is5ee4fqposxdsvel3vw623", handle: "soyoscarsintilde.bsky.social" }
		}
	};

	if (window.BSKY.DEBUG) console.debug( PREFIX + `Invoking the custom function: [${customFunction.name}]` );

	// Info step
	window.BSKY.faviconWorking();
	HTML.showStepInfo( STEP_NAME, `Invoking the custom function: [${customFunction.name}]...` );

	const result						= await customFunction( event, parameters );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Retrieved result:", result );

	// Info step
	HTML.showStepInfo( STEP_NAME );
	window.BSKY.faviconStandBy();

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


