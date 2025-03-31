/**********************************************************
 * Module Info:
 *
 * This file contains all the operative related
 * with the management of the token.
 *
 **********************************************************/


/**********************************************************
 * Module imports
 **********************************************************/
/* --------------------------------------------------------
 * Modules for Global configuration
 * -------------------------------------------------------- */
// The application configuration
import CONFIGURATION					from "../../data/config.json" with { type: "json" };

/* --------------------------------------------------------
 * Modules with Base functions
 * -------------------------------------------------------- */
// Common functions
import * as COMMON						from "../common/CommonFunctions.js";
// Common HTML Constants
import * as HTML						from "../common/HTML.js";

/* --------------------------------------------------------
 * Modules with external, concrete API calls functions
 * -------------------------------------------------------- */
// Common APIBluesky functions
import * as APIBluesky					from "../api/APIBluesky.js";

/* --------------------------------------------------------
 * Modules with Crypto and authentication functions
 * -------------------------------------------------------- */
// Common Crypto functions
import * as CRYPT						from "./Crypt.js";
// Common JWT functions
import * as JWT							from "./JWT.js";
// Common JWT functions
import * as OAuth2						from "./OAuth2.js";


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


/**********************************************************
 * BUSINESS Functions
 **********************************************************/


/**********************************************************
 * PUBLIC Functions
 **********************************************************/

/* --------------------------------------------------------
 * postProcessAccessToken.
 * -------------------------------------------------------- */
function postProcessAccessToken() {
	const STEP_NAME						= "postProcessAccessToken";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_RAWDATA				= `${PREFIX}[RawData] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Show some more information
	// if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_RAWDATA );
	// if (window.BSKY.DEBUG) console.debug( PREFIX_RAWDATA + "Current jwk:", BSKY.data.jwk );
	// if (window.BSKY.DEBUG) console.debug( PREFIX_RAWDATA + "Current userAccessToken:", JWT.jwtToPrettyJSON( BSKY.data.userAccessToken ) );
	// if (window.BSKY.DEBUG) console.debug( PREFIX_RAWDATA + "Current BSKY.data.dpopNonce:", BSKY.data.dpopNonce);
	// if (window.BSKY.GROUP_DEBUG) console.groupEnd();

	// Let's backup the current data.
	BSKY.saveRuntimeDataInLocalStorage();

	// Let's render the user's access token.
	// if (window.BSKY.DEBUG) console.debug( PREFIX + "userAuthentication:", BSKY.data.userAuthentication );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Rendering the access token fields and panel..." );

	// Update HTML fields
	HTML.updateUserAccessToken(APP_CLIENT_ID, BSKY.data.userAccessToken);
	HTML.updateHighlight();

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * Validates the access token.
 * -------------------------------------------------------- */
export async function validateAccessToken() {
	const STEP_NAME						= "validateAccessToken";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_RAWDATA				= `${PREFIX}[RawData] `;
	const PREFIX_AFTER					= `${PREFIX}[After] `;
	const PREFIX_ERROR					= `${PREFIX}[ERROR] `;
	const PREFIX_RETRY					= `${PREFIX}[Retry] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Info step
	HTML.showStepInfo( STEP_NAME, `The access token of the user...` );

	// ---------------------------------------------------------
	// Retrieve the access_token
	let apiCallResponse					= null;
	let tokenValidationInfo				= false;
	let isAccessTokenValid				= false;
	let isTokenCloseToExpire			= false;

	if (window.BSKY.DEBUG) console.debug( PREFIX + `Let's see whether we have a "valid" user access token...` );
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_RAWDATA );
	if (window.BSKY.DEBUG) console.debug( PREFIX_RAWDATA + "+ Current userAccessToken:", BSKY.data.userAccessToken );
	if (window.BSKY.DEBUG) console.debug( PREFIX_RAWDATA + "+ Current userAuthServerDiscovery:", BSKY.auth.userAuthServerDiscovery );
	if (window.BSKY.DEBUG) console.debug( PREFIX_RAWDATA + "+ Current userAuthentication:", BSKY.data.userAuthentication );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();

	// Do we have access token?
	if ( COMMON.isNullOrEmpty( BSKY.data.userAccessToken ) ) {
		// NO. Let's see if this is the first time after login.

		if (window.BSKY.DEBUG) console.debug( PREFIX + "No userAccessToken." );

		// Retrieve the "code"...
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Let's see if we have a code to retrieve the userAccessToken." );

		let lsCallbackData				= null;
		// Let's see if there is something in the localStorage...
		lsCallbackData					= localStorage.getItem(LSKEYS.CALLBACK_DATA) || null;
		if (COMMON.isNullOrEmpty(lsCallbackData)) {
			if (window.BSKY.DEBUG) console.debug( PREFIX + `Nothing[${LSKEYS.CALLBACK_DATA}] in the localStorage.` );
		} else {
			if (window.BSKY.DEBUG) console.debug( PREFIX + "Something in the localStorage." );
			BSKY.auth.callbackData		= JSON.parse( lsCallbackData );
			if (window.BSKY.DEBUG) console.debug( PREFIX_AFTER + "Detected:", COMMON.prettyJson( BSKY.auth.callbackData ) );
		}

		lsCallbackData					= localStorage.getItem(LSKEYS.CALLBACK_URL) || null;
		if (COMMON.isNullOrEmpty(lsCallbackData)) {
			if (window.BSKY.DEBUG) console.debug( PREFIX + `Nothing[${LSKEYS.CALLBACK_URL}] in the localStorage.` );
		} else {
			if (window.BSKY.DEBUG) console.debug( PREFIX + "Something in the localStorage." );
			BSKY.auth.redirectURL		= lsCallbackData;
			if (window.BSKY.DEBUG) console.debug( PREFIX_AFTER + "Detected:", BSKY.auth.redirectURL );
		}

		if ( !BSKY?.auth?.callbackData?.code || COMMON.isNullOrEmpty( BSKY.auth.callbackData.code ) ) {
			if (window.BSKY.DEBUG) console.debug( PREFIX + `No "code" detected.` );
			// NO. No token and no code. Throw an error.
			if (window.BSKY.GROUP_DEBUG) console.groupEnd();
			throw new TYPES.AccessTokenError( OAuth2.ERROR_CODE_02 );
		} else {
			// YES. Let's retrieve the token
			if (window.BSKY.DEBUG) console.debug( PREFIX + "Current code:", BSKY.auth.callbackData.code );

			// With the "code", let's retrieve the user access_token from the server.
			apiCallResponse				= await APIBluesky.getAccessToken();
			if (window.BSKY.DEBUG) console.debug( PREFIX + "Current apiCallResponse:", apiCallResponse );

			// Let's group log messages
			if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_AFTER );

			// Parse the response
			BSKY.data.userAuthentication	= apiCallResponse.userAuthentication;
			BSKY.data.userAccessToken	= apiCallResponse.userAccessToken;

			// Let's create also the access token HASH...
			BSKY.data.accessTokenHash	= await CRYPT.createHash(BSKY.data.userAccessToken, true);
			if (window.BSKY.DEBUG) console.debug(PREFIX_AFTER + "accessTokenHash:", BSKY.data.accessTokenHash);
			if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		}
	} else {
		// YES. Let's see if it's valid.

		// if (window.BSKY.DEBUG) console.debug( PREFIX + "GET userAccessToken" );
		
		try {
			tokenValidationInfo			= OAuth2.validateAccessToken( BSKY.data.userAccessToken, BSKY.auth.userAuthServerDiscovery, BSKY.data.userAuthentication, BSKY.auth.userDidDocument, BSKY.auth.userPDSMetadata );
			isAccessTokenValid			= tokenValidationInfo.isValid;
			isTokenCloseToExpire		= tokenValidationInfo.needsToRefresh;

			if ( isAccessTokenValid ) {
				if (window.BSKY.DEBUG) console.debug( PREFIX + `We have a VALID user access token. Continue` );
			} else {
				if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
				if (window.BSKY.GROUP_DEBUG) console.groupEnd();
				throw new TYPES.AccessTokenError( OAuth2.ERROR_CODE_07 );
			}

			if ( isTokenCloseToExpire ) {
				if (window.BSKY.DEBUG) console.debug( PREFIX + `We need to REFRESH the user access token.` );
				await refreshAccessToken();
			}
		} catch ( error ) {
			if (window.BSKY.DEBUG) console.debug( PREFIX + `ERROR(${typeof error}): [code==${error.code}] [message==${error.message}] [cause==${error.cause}]` );
		}

	}

	// Do something with the token information: Post Process the access token
	postProcessAccessToken();

	// Update some HTML fields
	// Prepare an object to pass
	HTML.updateHTMLFields(BSKY.auth.callbackData);

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return true;
}


/* --------------------------------------------------------
 * Refresh Access Token.
 *
 * Refresh DPoP token sample:
 *
 *	POST /token HTTP/1.1
 *	Host: server.example.com
 *	Content-Type: application/x-www-form-urlencoded
 *	DPoP: eyJ0eXAiOiJkcG9wK2p3dCIsImFsZyI6IkVTMjU2IiwiandrIjp7Imt0eSI6Ik
 *		  VDIiwieCI6Imw4dEZyaHgtMzR0VjNoUklDUkRZOXpDa0RscEJoRjQyVVFVZldWQVdCR
 *		  nMiLCJ5IjoiOVZFNGpmX09rX282NHpiVFRsY3VOSmFqSG10NnY5VERWclUwQ2R2R1JE
 *		  QSIsImNydiI6IlAtMjU2In19.eyJqdGkiOiItQndDM0VTYzZhY2MybFRjIiwiaHRtIj
 *		  oiUE9TVCIsImh0dSI6Imh0dHBzOi8vc2VydmVyLmV4YW1wbGUuY29tL3Rva2VuIiwia
 *		  WF0IjoxNTYyMjY1Mjk2fQ.pAqut2IRDm_De6PR93SYmGBPXpwrAk90e8cP2hjiaG5Qs
 *		  GSuKDYW7_X620BxqhvYC8ynrrvZLTk41mSRroapUA
 *
 *	grant_type=refresh_token
 *	&refresh_token=Q..Zkm29lexi8VnWg2zPW1x-tgGad0Ibc3s3EwM_Ni4-g
 *
 * -------------------------------------------------------- */
export async function refreshAccessToken() {
	const STEP_NAME						= "refreshAccessToken";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_RETRY					= `${PREFIX}[RETRY] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Clear and hide error fields and panel
	HTML.clearHTMLError();

	// Info step
	HTML.showStepInfo( STEP_NAME, `Refreshing the user Access Token...` );

	// Let's refresh the user's access token.
	// ---------------------------------------------------------
	let refreshedAccessToken			= await APIBluesky.refreshAccessToken( BSKY.auth.callbackData.code );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Current refreshedAccessToken:", refreshedAccessToken );

	// Clear and hide error fields and panel
	HTML.clearHTMLError();

	// First, let's validate the access token.
	// ---------------------------------------------------------
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Validating the refreshed token..." );
	await validateAccessToken();

	// Info step
	HTML.showStepInfo( STEP_NAME );

	// El toast.
	COMMON.showInfo( `Token refreshed` );

	if (window.BSKY.GROUP_DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


