/**********************************************************
 * Module imports
 *
 * OAuth2 HELPER FUNCTIONS
 *
 **********************************************************/
// Global configuration
import CONFIGURATION					from "../data/config.json" with { type: "json" };
// Common functions
import * as COMMON						from "./common.functions.js";
// Common Classes and Exceptions ("Types")
import * as TYPES						from "./common.types.js";
// Common HTML functions
import * as HTML						from "./HTML.js";
// Common JWT functions
import * as JWT							from "./OAuth2/JWT.js";


/**********************************************************
 * Module Constants
 **********************************************************/
// Module SELF constants
const MODULE_NAME						= COMMON.getModuleName( import.meta.url );
const MODULE_VERSION					= "1.0.0";
const MODULE_PREFIX						= `[${MODULE_NAME}]: `;

// Logging constants
const DEBUG								= CONFIGURATION.global.debug;
const DEBUG_FOLDED						= CONFIGURATION.global.debug_folded;

// Inner constants
export const ERROR_CODE_01				= { "code":  1, "message": "No Auth Server Discovery" };
export const ERROR_CODE_02				= { "code":  2, "message": "No code to retrieve an access token" };
export const ERROR_CODE_03				= { "code":  3, "message": "No user authentication" };
export const ERROR_CODE_04				= { "code":  4, "message": "No access token" };
export const ERROR_CODE_05				= { "code":  5, "message": "No user DID Document received" };
export const ERROR_CODE_06				= { "code":  6, "message": "No user PDS Metadata received" };
export const ERROR_CODE_07				= { "code":  7, "message": "Invalid token" };
export const ERROR_CODE_10				= { "code": 10, "message": "Auth Servers mismatch!" };
export const ERROR_CODE_11				= { "code": 11, "message": "User did's mismatch!" };
export const ERROR_CODE_12				= { "code": 12, "message": "Expired token!" };

// Inner constants
const LSKEYS							= CONFIGURATION.localStorageKeys;
const DIV_TOKEN_TIMEOUT					= "currentTokenTimeout";


/**********************************************************
 * Module Variables
 **********************************************************/
let GROUP_DEBUG							= DEBUG && DEBUG_FOLDED;


/**********************************************************
 * PRIVATE Functions
 **********************************************************/


/**********************************************************
 * PUBLIC Functions
 **********************************************************/
/*
 * Validates the token.
 *
 * + Check the expiration time
 * + Check that the token has been generated by the same ISS
 *
 */
export function validateAccessToken( accessToken, userAuthServerDiscovery, userAuthentication, userDidDocument, userPDSMetadata ) {
	const STEP_NAME						= "validateAccessToken";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );
	
	let isValid							= false;
	let needsToRefresh					= false;

	// Basic Checks
	// ------------------------------------------
	if ( COMMON.isNullOrEmpty( userAuthServerDiscovery ) ) {
		if (DEBUG) console.debug( PREFIX + "-- END" );
		if (GROUP_DEBUG) console.groupEnd();
		throw new TYPES.AccessTokenError( ERROR_CODE_01 );
	}
	// if (DEBUG) console.debug( PREFIX + "Received User Authentication Server Discovery information:", COMMON.prettyJson( userAuthServerDiscovery ) );

	if ( COMMON.isNullOrEmpty( userAuthentication ) ) {
		if (DEBUG) console.debug( PREFIX + "-- END" );
		if (GROUP_DEBUG) console.groupEnd();
		throw new TYPES.AccessTokenError( ERROR_CODE_03 );
	}
	// if (DEBUG) console.debug( PREFIX + "Received User Access Authentication:", COMMON.prettyJson( userAuthentication ) );

	if ( COMMON.isNullOrEmpty( accessToken ) ) {
		if (DEBUG) console.debug( PREFIX + "-- END" );
		if (GROUP_DEBUG) console.groupEnd();
		throw new TYPES.AccessTokenError( ERROR_CODE_04 );
	}
	// if (DEBUG) console.debug( PREFIX + "Received User Access Token:", JWT.jwtToPrettyJSON( accessToken ) );

	if ( COMMON.isNullOrEmpty( userDidDocument ) ) {
		if (DEBUG) console.debug( PREFIX + "-- END" );
		if (GROUP_DEBUG) console.groupEnd();
		throw new TYPES.AccessTokenError( ERROR_CODE_05 );
	}
	// if (DEBUG) console.debug( PREFIX + "Received User DID Document:", COMMON.prettyJson( userDidDocument ) );

	if ( COMMON.isNullOrEmpty( userPDSMetadata ) ) {
		if (DEBUG) console.debug( PREFIX + "-- END" );
		if (GROUP_DEBUG) console.groupEnd();
		throw new TYPES.AccessTokenError( ERROR_CODE_06 );
	}
	// if (DEBUG) console.debug( PREFIX + "Received User PDS Metadata:", COMMON.prettyJson( userPDSMetadata ) );


	// Other Checks
	// ------------------------------------------

	// Let's retrieve the runtime data
	let dataInLocalStorage				= JSON.parse( localStorage.getItem(LSKEYS.BSKYDATA) );

	// Let's retrieve the payload
	if (DEBUG) console.debug( PREFIX + "Let's analize the access token..." );
	let jwt								= JWT.getJWTAsSemiJSON( accessToken );
	let header							= JSON.parse( jwt.header );
	let payload							= JSON.parse( jwt.payload );
	// if (DEBUG) console.debug( PREFIX + "+ header:", COMMON.prettyJson( header ) );
	// if (DEBUG) console.debug( PREFIX + "+ payload:", COMMON.prettyJson( payload ) );

	// Let's see the ISS
	if ( !COMMON.areEquals( payload.iss, userPDSMetadata.authorization_servers[0] ) ) {
		if (DEBUG) console.debug( PREFIX + "-- END" );
		if (GROUP_DEBUG) console.groupEnd();
		throw new TYPES.AccessTokenError( ERROR_CODE_10 );
	}

	// Let's see the DID
	if ( !COMMON.areEquals(payload.sub,dataInLocalStorage.userDid) ) {
		if (DEBUG) console.debug( PREFIX + "-- END" );
		if (GROUP_DEBUG) console.groupEnd();
		throw new TYPES.AccessTokenError( ERROR_CODE_11 );
	}

	// Let's see the dates
	if (DEBUG) console.debug( PREFIX + "Let's analize the dates..." );
	const currentTime					= new Date();
	const tokenIssuedAt					= new Date(payload.iat * 1000);
	const tokenExpiresIn				= new Date(payload.exp * 1000);
	const msCurrentTime					= currentTime.getTime();
	const msTokenIssuedAt				= tokenIssuedAt.getTime();
	const msTokenExpiresIn				= tokenExpiresIn.getTime();
	// if (DEBUG) console.debug( PREFIX + `+ [${msCurrentTime}] Current time....:`, currentTime );
	// if (DEBUG) console.debug( PREFIX + `+ [${msTokenIssuedAt}] Token issued at.:`, tokenIssuedAt );
	// if (DEBUG) console.debug( PREFIX + `+ [${msTokenExpiresIn}] Token expires in:`, tokenExpiresIn );
	
	// If the token expiration time is greater than current time, error.
	if ( msTokenExpiresIn < msCurrentTime ) {
		if (DEBUG) console.debug( PREFIX + "-- END" );
		if (GROUP_DEBUG) console.groupEnd();
		throw new TYPES.AccessTokenError( ERROR_CODE_12 );
	}

	// Now that the checks are OK, let's see the
	// token expiration time.
	// ------------------------------------------

	isValid								= true;

	// The differences
	const diffFromIssued				= msCurrentTime - msTokenIssuedAt;
	const diffToExpire					= msTokenExpiresIn - msCurrentTime;
	const ellapsedTimeAsString			= msToTime(diffFromIssued);
	const expiringTimeAsString			= msToTime(diffToExpire);
	if (DEBUG) console.debug( PREFIX + `Differences:` );
	if (DEBUG) console.debug( PREFIX + `+ [${msTokenIssuedAt}] --> [${diffFromIssued}] --> [${msCurrentTime}] --> [${diffToExpire}] --> [${msTokenExpiresIn}]` );
	if (DEBUG) console.debug( PREFIX + `+ [${msToTime(msTokenIssuedAt, true)}] --> [${ellapsedTimeAsString}] --> [${msToTime(msCurrentTime, true)}] --> [${expiringTimeAsString}] --> [${msToTime(msTokenExpiresIn, true)}]` );

	// Let's update the HTML field for the remaining time for the token to expire...
	$( "#" + DIV_TOKEN_TIMEOUT ).val( expiringTimeAsString );

	// If the expiration time is close to end ("threshold", in minutes, in the config file)
	const TOKEN_THRESHOLD				= CONFIGURATION.bluesky.token_expiration_threshold;
	if ( diffToExpire < ( TOKEN_THRESHOLD * 1000 *60 ) ) {
		console.warn( `Token about to expire! [TOKEN_THRESHOLD==${TOKEN_THRESHOLD}]` );
		needsToRefresh					= true;

		// BS Toast Test
		if (GROUP_DEBUG) console.groupCollapsed( PREFIX + `BS Toast Test` );
		// El toast.
		let toastDivID					= "toast-followers-change";
		let toastJQDivID				= `#${toastDivID}`;
		let delay						= ( CONFIGURATION.global.refresh_dashboard - 1 ) * 1000;
		let toastOptions				= {"animation": true, "autohide": true, "delay": delay};
		let $toast						= $( toastJQDivID, toastOptions );
		let $toastBody					= $( toastJQDivID + ` > .toast-body` );
		let $toastBodySpan				= $( toastJQDivID + ` > .toast-body > span` );
		let html						= `Token about to expire! Less than ${msToTime(TOKEN_THRESHOLD*1000)} minutes: <span>${msToTime(diffToExpire)}</span> seconds`;
		$toastBody.html( html );
		$toast.show();
		if (GROUP_DEBUG) console.groupEnd();
	}

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
	return { isValid: isValid, needsToRefresh: needsToRefresh };
}

function msToTime(duration, keepVoids=false) {
    var milliseconds					= parseInt((duration%1000)/100)
        , seconds						= parseInt((duration/1000)%60)
        , minutes						= parseInt((duration/(1000*60))%60)
        , hours							= parseInt((duration/(1000*60*60))%24);
	
	let response						= "";
	if ( keepVoids ) {
		hours							= (hours   < 10) ? "0" + hours   : hours;
		minutes							= (minutes < 10) ? "0" + minutes : minutes;
		seconds							= (seconds < 10) ? "0" + seconds : seconds;
		response						= hours + ":" + minutes + ":" + seconds;
	} else {
		if ( ( hours < 1 ) ) {
			hours						= "";
			if ( minutes < 1 ) {
				minutes					= "";
				seconds					= (seconds < 10) ? "0" + seconds : seconds;
				response				= seconds;
			} else {
				minutes					= (minutes < 10) ? "0" + minutes : minutes;
				seconds					= (seconds < 10) ? "0" + seconds : seconds;
				response				= minutes + ":" + seconds;
			}
		} else {
			hours						= (hours   < 10) ? "0" + hours   : hours;
			minutes						= (minutes < 10) ? "0" + minutes : minutes;
			seconds						= (seconds < 10) ? "0" + seconds : seconds;
			response					= hours + ":" + minutes + ":" + seconds;
		}
	}



    return response;
    // return hours + ":" + minutes + ":" + seconds + "." + milliseconds;
}
