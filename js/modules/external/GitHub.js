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
import * as COMMON						from "../common/CommonFunctions.js";
// Common HTML functions
import * as HTML						from "../common/HTML.js";

// To perform API calls
import * as APICall						from "../utils/APICall.js";


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

	// Info step
	HTML.showStepInfo( STEP_NAME, `Retrieving GIT Repository Information...` );

	let root							= null;
	let endpoint						= null;
	let url								= null;
	let repoMetadata					= null;
	let allTags							= null;
	let allCommits						= null;
	let lastTag							= null;
	let lastTagCommit					= null;
	let lastTagCommitAuthor				= null;
	let lastTagCommitCommitter			= null;
	let lastCommit						= null;

	let user							= "Ov23liYZfIhg5Sifx63W";
	let pass							= "300d1459aad2ec52d88ab270baf9d44651a5fcb0";
	let basicAuthToken					= `${user}:${pass}`;
	let basicAuth						= btoa( basicAuthToken );
	let fetchOptions					= {
		'mode': 'no-cors',
		'credentials': 'include',
		'method': 'GET',
		'headers': {
			'Content-Type' : 'application/json',
			'Authorization': `Basic ${basicAuth}`
		}
	};
	let response						= {};
	// no-cors

	try {
		// Repository Metadata configuration
		root							= CONFIGURATION.github.repo;

		// Repository general info
		// ---------------------------------------------------------
		endpoint						= "";
		url								= root + endpoint;
		if (window.BSKY.DEBUG) console.debug(PREFIX + "Fetching data from:", url);
		repoMetadata					= await APICall.call( STEP_NAME, url );
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Received repoMetadata:", repoMetadata );
		response.repoMetadata			= repoMetadata.json;

		// Last tag info
		// ---------------------------------------------------------
		endpoint						= "/tags";
		url								= root + endpoint;
		if (window.BSKY.DEBUG) console.debug(PREFIX + "Fetching data from:", url);
		allTags							= await APICall.call( STEP_NAME, url );
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Received allTags:", allTags );
		if ( allTags ) {
			lastTag						= allTags.json[0];
			response.lastTag			= lastTag;
			if (window.BSKY.DEBUG) console.debug( PREFIX + "Received lastTag:", lastTag );
			if (window.BSKY.DEBUG) console.debug( PREFIX + "+ lastTag.name:", lastTag.name );
			if (window.BSKY.DEBUG) console.debug( PREFIX + "+ lastTag.commit.url:", lastTag.commit.url );

			// Retrieve commit information
			lastTagCommit				= await APICall.call( STEP_NAME, lastTag.commit.url );
			response.lastTagCommit		= lastTagCommit.json;
			lastTagCommitAuthor			= response.lastTagCommit.commit.author;
			lastTagCommitCommitter		= response.lastTagCommit.commit.committer;
		}

		// Commits info
		// ---------------------------------------------------------
		endpoint						= "/commits";
		url								= root + endpoint;
		if (window.BSKY.DEBUG) console.debug(PREFIX + "Fetching data from:", url);
		allCommits						= await APICall.call( STEP_NAME, url );
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Received allCommits:", allCommits );
		if ( allCommits ) {
			lastCommit					= allCommits.json[0];
			response.lastCommit			= lastCommit;
			if (window.BSKY.DEBUG) console.debug( PREFIX + "Received lastCommit:", lastCommit );
			if (window.BSKY.DEBUG) console.debug( PREFIX + "+ lastCommit.commit:", lastCommit.commit );
			if (window.BSKY.DEBUG) console.debug( PREFIX + "+ lastCommit.commit.url:", lastCommit.commit.url );
		}
	} catch (error) {
		if (window.BSKY.DEBUG) console.debug(PREFIX + "ERROR fetching data from:", url);
		// Show the error and update the HTML fields
		// HTML.updateHTMLError(error);
		/*
			{
				"message": "Error: 0",
				"step": "getRepositoryInformation",
				"status": 0,
				"statusText": "",
				"ok": false,
				"bodyUsed": false,
				"redirected": false,
				"type": "opaque",
				"url": "",
				"isJson": false,
				"headers": {
					"bodyUsed": false,
					"ok": false,
					"redirected": false,
					"status": 0,
					"statusText": "",
					"type": "opaque",
					"url": "",
					"headers": {}
				},
				"json": null,
				"text": ""
			}
		 */
	}
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received githubInfo:", response );

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return response;
}

