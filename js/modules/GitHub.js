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
// To perform API calls
import * as APICall						from "./APICall.js";


/**********************************************************
 * Module Constants
 **********************************************************/
// Module SELF constants
const MODULE_NAME						= COMMON.getModuleName( import.meta.url );

// Inner constants
const API								= CONFIGURATION.api;


/**********************************************************
 * Module Variables
 **********************************************************/


/**********************************************************
 * PRIVATE Functions
 **********************************************************/


/**********************************************************
 * PUBLIC Functions
 **********************************************************/
// Return the Geolocation Information
export async function getRepositoryInformation() {
	const STEP_NAME						= "getRepositoryInformation";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_HEADERS				= `${PREFIX}[Headers] `;
	const PREFIX_BODY					= `${PREFIX}[Body] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	let root							= null;
	let endpoint						= null;
	let url								= null;
	let repositoryMetadata				= null;
	let allTags							= null;
	let allCommits						= null;
	let lastTag							= null;
	let lastTagCommit					= null;
	let lastTagCommitAuthor				= null;
	let lastTagCommitCommitter			= null;
	let lastCommit						= null;
	let response						= {};

	try {
		// Repository Metadata
		root							= CONFIGURATION.github.repo;
		endpoint						= "";
		url								= root + endpoint;
		if (window.BSKY.DEBUG) console.debug(PREFIX + "Fetching data from:", url);
		repositoryMetadata				= await APICall.makeAPICall( STEP_NAME, url );
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Received repositoryMetadata:", repositoryMetadata );
		response.repositoryMetadata		= repositoryMetadata;

		// Last tag info
		/*
			$LastTAG = $Tags[0];
			# $LastTAG;
			$LastTAG.name;
			# $LastTAG.commit;
			# $LastTAG.commit.url;
			$LastTAGURL = $LastTAG.commit.url;
			# $LastTAGURL;
			$TagCommit = IRM -Method GET -Uri "${LastTAGURL}";
			# $TagCommit;
			# $TagCommit.commit;
			$TagCommit.commit.author;
			$TagCommit.commit.committer;
		 */
		endpoint						= "/tags";
		url								= root + endpoint;
		if (window.BSKY.DEBUG) console.debug(PREFIX + "Fetching data from:", url);
		allTags							= await APICall.makeAPICall( STEP_NAME, url );
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Received allTags:", allTags );
		if ( allTags ) {
			lastTag						= allTags[0];
			response.lastTag			= lastTag;
			if (window.BSKY.DEBUG) console.debug( PREFIX + "Received lastTag:", lastTag );
			if (window.BSKY.DEBUG) console.debug( PREFIX + "+ lastTag.name:", lastTag.name );
			if (window.BSKY.DEBUG) console.debug( PREFIX + "+ lastTag.commit.url:", lastTag.commit.url );

			// Retrieve commit information
			lastTagCommit				= await APICall.makeAPICall( STEP_NAME, lastTag.commit.url );
			lastTagCommitAuthor			= lastTagCommit.commit.author;
			lastTagCommitCommitter		= lastTagCommit.commit.committer;
		}

		// Last commit info
		endpoint						= "/commits";
		url								= root + endpoint;
		if (window.BSKY.DEBUG) console.debug(PREFIX + "Fetching data from:", url);
		allCommits						= await APICall.makeAPICall( STEP_NAME, url );
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Received allCommits:", allCommits );
		if ( allCommits ) {
			lastCommit					= allCommits[0];
			response.lastCommit			= lastCommit;
			if (window.BSKY.DEBUG) console.debug( PREFIX + "Received lastCommit:", lastCommit );
			if (window.BSKY.DEBUG) console.debug( PREFIX + "+ lastCommit.commit:", lastCommit.commit );
			if (window.BSKY.DEBUG) console.debug( PREFIX + "+ lastCommit.commit.url:", lastCommit.commit.url );
		}
	} catch (error) {
		if (window.BSKY.DEBUG) console.debug(PREFIX + "ERROR fetching data from:", url);
		// Show the error and update the HTML fields
		// HTML.updateHTMLError(error);
	}

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	
	// return { state: state, codeVerifier: codeVerifier, codeChallenge: codeChallenge, body: body };
	return response;
}

