/**********************************************************
 * File Info:
 *
 * This file contains all the operative related
 * specifically with the index/login page.
 *
 **********************************************************/


/**********************************************************
 * Module imports
 **********************************************************/
// Global configuration
import CONFIGURATION					from "./data/config.json" with { type: "json" };
// Common functions
import * as COMMON						from "./modules/common.functions.js";
// To perform API calls
import * as APICall						from "./modules/APICall.js";
// Common BrowserDB functions
import * as DB							from "./modules/BrowserDB.js";
// Common HTML functions
import * as HTML						from "./modules/HTML.js";
// Common PKCE functions
import * as PKCE						from "./modules/PKCE.js";


/**********************************************************
 * Module Constants
 **********************************************************/
// Module SELF constants
const MODULE_NAME						= COMMON.getModuleName( import.meta.url );

// Inner constants
const API								= CONFIGURATION.api;
const LSKEYS							= CONFIGURATION.localStorageKeys;
const CLIENT_APP						= CONFIGURATION.clientApp;

// Bootstrap Toast constants
const TOAST_WELCOME						= "toast-welcome";

// Bluesky constants
const APP_CLIENT_ID						= CLIENT_APP.client_id;
const APP_CALLBACK_URL					= CLIENT_APP.redirect_uri;
const APP_LOCALHOST_CALLBACK_URL		= CLIENT_APP.redirect_to_localhost;


/**********************************************************
 * Module Variables
 **********************************************************/
let redirectURI							= APP_CALLBACK_URL;
let isLocalhost							= false;



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
	const PREFIX_INNER					= `${PREFIX}[INTERNAL] `;
	if (window.BSKY.DEBUG) console.groupCollapsed( PREFIX );

	// ================================================================
	// Module info.
	if (window.BSKY.DEBUG) console.debug( PREFIX + "MODULE_NAME:", MODULE_NAME, "import.meta.url:", import.meta.url );

	// ================================================================
	// Actualizamos el objeto raiz.
	// + Functions
	window.BSKY.authenticateWithBluesky = fnAuthenticateWithBluesky;
	window.BSKY.launchToast				= fnLaunchToast;
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Updated object: [window.BSKY].`, window.BSKY );

	// ================================================================
	// Module END
	console.info( `Loaded module ${MODULE_NAME}.` );

	// ================================================================
	// Ejecutamos las acciones propias de esta página.
	if (window.BSKY.DEBUG) console.groupCollapsed( PREFIX_INNER );

	// Check whether we come from LOGOUT.
	let comeFromLogout					= checkIfComesFromLogout();
	if (window.BSKY.DEBUG) console.debug( PREFIX + "comeFromLogout:", comeFromLogout );

	// Check whether we are in localhost.
	isLocalhost							= checkIfWeAreInLocalhost();
	if (window.BSKY.DEBUG) console.debug( PREFIX + "isLocalhost:", isLocalhost );
	if (isLocalhost) {
		redirectURI						= APP_LOCALHOST_CALLBACK_URL;
	}
	if (window.BSKY.DEBUG) console.debug( PREFIX + "redirectURI:", redirectURI );

	// La clave criptográfica en la base de datos
	await DB.checkCryptoKeyInDB(comeFromLogout);

	// Update the "user_handle" field
	let gotUserHandle					= checkUserHandle();

	// BS Toast Test
	if (gotUserHandle && !comeFromLogout) {
		let id							= TOAST_WELCOME;
		let jqID						= "#" + id;
		let toastOptions				= null;
		$( `${jqID} > .toast-body` ).html( `Welcome back, ${BSKY.user.userHandle}!` );
		let jqBSToast					= new bootstrap.Toast( jqID, toastOptions );
		jqBSToast.show();
	}

	if (window.BSKY.DEBUG) console.groupEnd();

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.DEBUG) console.groupEnd();
}


/**********************************************************
 * PRIVATE Functions
 **********************************************************/

/* --------------------------------------------------------
 * LOGIN PROCESS.
 *
 * OAuth2 login processes.
 * -------------------------------------------------------- */
async function step01RetrieveUserDID() {
	const STEP_NAME						= "step01RetrieveUserDID";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userHandle=="+BSKY.user.userHandle+"]" );

	if (window.BSKY.DEBUG) console.debug( PREFIX + "Using handle:", BSKY.user.userHandle );

	// Info step
	HTML.showStepInfo( STEP_NAME, `Retrieving did for ${BSKY.user.userHandle}...` );

    let url								= API.bluesky.XRPC.url + API.bluesky.XRPC.api.auth.resolveHandle + "?handle=" + BSKY.user.userHandle;
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Invoking URL:", url );
 	let responseFromServer				= await APICall.makeAPICall( STEP_NAME, url );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received responseFromServer:", COMMON.prettyJson( responseFromServer ) );
	// Here, we gather the "did" item in the received json.
	BSKY.user.userDid					= responseFromServer.body.did;

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return BSKY.user.userDid;
}

async function stop02RetrieveUserDIDDocument() {
	const STEP_NAME						= "stop02RetrieveUserDIDDocument";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userDid=="+BSKY.user.userDid+"]" );

	// Info step
	HTML.showStepInfo( STEP_NAME, `Retrieving didDocument for ${BSKY.user.userHandle}...` );

    let url								= API.bluesky.plc.url + "/" + BSKY.user.userDid;
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Invoking URL:", url );
 	let responseFromServer				= await APICall.makeAPICall( STEP_NAME, url );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received responseFromServer:", COMMON.prettyJson( responseFromServer ) );
	// Here, we gather the "did" item in the received json.
	BSKY.auth.userDidDocument			= responseFromServer.body;
	BSKY.auth.userPDSURL				= BSKY.auth.userDidDocument.service[0].serviceEndpoint;
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received userDidDocument:", BSKY.auth.userDidDocument );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received userPDSURL:", BSKY.auth.userPDSURL );

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return { userDidDocument: BSKY.auth.userDidDocument, userPDSURL: BSKY.auth.userPDSURL };
}

async function step03RetrievePDSServerMetadata() {
	const STEP_NAME						= "step03RetrievePDSServerMetadata";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userPDSURL=="+BSKY.auth.userPDSURL+"]" );

	// Info step
	HTML.showStepInfo( STEP_NAME, `Retrieving PDS Server Metadata for ${BSKY.user.userHandle}...` );

    let url								= BSKY.auth.userPDSURL + API.bluesky.pds.api.metadata;
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Invoking URL:", url );
 	let responseFromServer				= await APICall.makeAPICall( STEP_NAME, url );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received responseFromServer:", COMMON.prettyJson( responseFromServer ) );
	// Here, we gather the "did" item in the received json.
	BSKY.auth.userPDSMetadata			= responseFromServer.body;
	BSKY.auth.userAuthServerURL			= BSKY.auth.userPDSMetadata.authorization_servers[0];
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received userPDSMetadata:", BSKY.auth.userPDSMetadata );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received userAuthServerURL:", BSKY.auth.userAuthServerURL );

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return { userPDSMetadata: BSKY.auth.userPDSMetadata, userAuthServerURL: BSKY.auth.userAuthServerURL };
}

async function step04RetrieveAuthServerDiscoveryMetadata() {
	const STEP_NAME						= "step04RetrieveAuthServerDiscoveryMetadata";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userAuthServerURL=="+BSKY.auth.userAuthServerURL+"]" );

	// Info step
	HTML.showStepInfo( STEP_NAME, `Retrieving Authentication Server URL...` );

    let url								= BSKY.auth.userAuthServerURL + API.bluesky.authServer.api.discovery;
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Invoking URL:", url );
 	let responseFromServer				= await APICall.makeAPICall( STEP_NAME, url );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received responseFromServer:", COMMON.prettyJson( responseFromServer ) );
	// Here, we gather the "did" item in the received json.
	BSKY.auth.userAuthServerDiscovery	= responseFromServer.body;
	BSKY.auth.userAuthorizationEndPoint	= BSKY.auth.userAuthServerDiscovery.authorization_endpoint;
	BSKY.auth.userTokenEndPoint			= BSKY.auth.userAuthServerDiscovery.token_endpoint;
	BSKY.auth.userPAREndPoint			= BSKY.auth.userAuthServerDiscovery.pushed_authorization_request_endpoint;
	BSKY.auth.userRevocationEndPoint	= BSKY.auth.userAuthServerDiscovery.revocation_endpoint;
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received userAuthServerDiscovery:", BSKY.auth.userAuthServerDiscovery );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received userAuthorizationEndPoint:", BSKY.auth.userAuthorizationEndPoint );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received userTokenEndPoint:", BSKY.auth.userTokenEndPoint );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received userPAREndPoint:", BSKY.auth.userPAREndPoint );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received userRevocationEndPoint:", BSKY.auth.userRevocationEndPoint );

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return {
		userAuthServerDiscovery: BSKY.auth.userAuthServerDiscovery
		, userAuthorizationEndPoint: BSKY.auth.userAuthorizationEndPoint
		, userTokenEndPoint: BSKY.auth.userTokenEndPoint
		, userPAREndPoint: BSKY.auth.userPAREndPoint
		, userRevocationEndPoint: BSKY.auth.userRevocationEndPoint
	};
}

async function step05PARRequest() {
	const STEP_NAME						= "step05PARRequest";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Info step
	HTML.showStepInfo( STEP_NAME, `Requesting PAR authorization...` );

	// The "context".
	localStorage.setItem(LSKEYS.CALLBACK_URL, redirectURI);

    // Prepare the data to perform the call
    // ------------------------------------------
	let preparedData					= await PKCE.prepareDataForPARRequest( BSKY.user.userHandle, APP_CLIENT_ID, redirectURI );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received prepared data:", preparedData );
	BSKY.auth.state						= preparedData.state;
	BSKY.auth.codeVerifier				= preparedData.codeVerifier;
	BSKY.auth.codeChallenge				= preparedData.codeChallenge;
	let body							= preparedData.body;

    // TuneUp and perform the call
    // ------------------------------------------
    let url								= BSKY.auth.userPAREndPoint;
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Invoking URL:", url );
    let fetchOptions					= {
        method: APICall.HTML_POST,
        headers: {
            'Content-Type': APICall.CONTENT_TYPE_FORM_ENCODED
        },
        body: body
    }
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "+ with this options:", COMMON.prettyJson( fetchOptions ) );
 	let responseFromServer				= await APICall.makeAPICall( STEP_NAME, url, fetchOptions );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received responseFromServer:", COMMON.prettyJson( responseFromServer ) );
	// Here, we gather the "request_uri" item in the received json.
	BSKY.auth.userAuthServerRequestURI	= responseFromServer.body.request_uri;
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received dpopNonce:", BSKY.data.dpopNonce );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received userAuthServerRequestURI:", BSKY.auth.userAuthServerRequestURI );

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return { dpopNonce: BSKY.data.dpopNonce, userAuthServerRequestURI: BSKY.auth.userAuthServerRequestURI };
}

function step06RedirectUserToBlueskyAuthPage() {
	const STEP_NAME						= "step06RedirectUserToBlueskyAuthPage";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Info step
	HTML.showStepInfo( STEP_NAME, `Redirecting user to Bluesky authorization page...` );

    // ------------------------------------------
    // SAVE ALL RECEIVED DATA
	// IN localStorage BEFORE LEAVING!!!
    // ------------------------------------------
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Saved data in localStorage." );
	saveRuntimeLoginDataInLocalStorage();

    // Buld up the URL.
    // ------------------------------------------
    let url								= BSKY.auth.userAuthorizationEndPoint;
    url									+= "?client_id=" + encodeURIComponent( APP_CLIENT_ID );
    url									+= "&request_uri=" + encodeURIComponent( BSKY.auth.userAuthServerRequestURI );
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Redirecting the user to URL:", url );

    // Redirect the user to the Bluesky Auth Page
    // ------------------------------------------
	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
    window.location = url;
}

/* --------------------------------------------------------
 * LOGIN PROCESS.
 *
 * Function to check whether we come from the logged-out
 * process.
 * -------------------------------------------------------- */
function checkIfComesFromLogout() {
	const STEP_NAME						= "checkIfComesFromLogout";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Set, in localStorage, we come from "LOGOUT"
	let comeFromLogout					= localStorage.getItem(LSKEYS.LOGOUT);
	comeFromLogout						= ( COMMON.isNullOrEmpty(comeFromLogout) ) ? false : comeFromLogout;
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Are we redirected from LOGOUT:`, comeFromLogout );
	localStorage.removeItem(LSKEYS.LOGOUT);
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Deleted localStorage item:", LSKEYS.LOGOUT );

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return comeFromLogout;
}

/* --------------------------------------------------------
 * LOGIN PROCESS.
 *
 * Function to check whether we are in the "local environment".
 * -------------------------------------------------------- */
function checkIfWeAreInLocalhost() {
	const STEP_NAME						= "checkIfWeAreInLocalhost";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Set, in localStorage, where we are.
	let thisURL							= new URL(window.location);
	let isLocalhost						= COMMON.areEquals(thisURL.host, "localhost");
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Are we in localhost:`, isLocalhost );

	// The "context".
	localStorage.setItem(LSKEYS.ROOT_URL, window.location);

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return isLocalhost;
}


/* --------------------------------------------------------
 * LOGIN PROCESS.
 *
 * Function to save data before we move to the Bluesky
 * auth page, to retrieve the runtime data after successful
 * authorization.
 * -------------------------------------------------------- */
function saveRuntimeLoginDataInLocalStorage() {
	const STEP_NAME						= "saveRuntimeLoginDataInLocalStorage";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + " [userHandle=="+BSKY.user.userHandle+"]" );

	localStorage.setItem(LSKEYS.user.handle, BSKY.user.userHandle);
	let savedInformation				= {
		// Bluesky Variables
		userHandle:						BSKY.user.userHandle,
		userDid:						BSKY.user.userDid,
		userDidDocument:				BSKY.auth.userDidDocument,
		userPDSURL:						BSKY.auth.userPDSURL,
		userPDSMetadata:				BSKY.auth.userPDSMetadata,
		userAuthServerURL:				BSKY.auth.userAuthServerURL,
		userAuthServerDiscovery:		BSKY.auth.userAuthServerDiscovery,
		userAuthorizationEndPoint:		BSKY.auth.userAuthorizationEndPoint,
		userTokenEndPoint:				BSKY.auth.userTokenEndPoint,
		userPAREndPoint:				BSKY.auth.userPAREndPoint,
		userRevocationEndPoint:			BSKY.auth.userRevocationEndPoint,
		userAuthServerRequestURI:		BSKY.auth.userAuthServerRequestURI,
		dpopNonce:						BSKY.data.dpopNonce,
		dpopNonceUsed:					BSKY.data.dpopNonceUsed,
		dpopNonceReceived:				BSKY.data.dpopNonceReceived,
		wwwAuthenticate:				BSKY.data.wwwAuthenticate,
		// Auth variables
		state:							BSKY.auth.state,
		codeVerifier:					BSKY.auth.codeVerifier,
		codeChallenge:					BSKY.auth.codeChallenge,
		callbackData:					BSKY.auth.callbackData,
		// Response from the access token request
		userAuthentication:				null,
		userAccessToken:				null,
		userRefreshToken:				null,
		accessTokenHash:				null
	};
	localStorage.setItem(LSKEYS.BSKYDATA, JSON.stringify( savedInformation ));
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Saved data in localStorage." );

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * LOGIN PROCESS.
 *
 * Function to be executed in the "login page".
 * -------------------------------------------------------- */
function checkUserHandle() {
	const STEP_NAME						= "checkUserHandle";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Update the "user handle" field with the value in localStorage, if any.
	let previous						= false;
	BSKY.user.userHandle				= localStorage.getItem(LSKEYS.user.handle) || null;
	if ( BSKY.user.userHandle && !COMMON.isNullOrEmpty(BSKY.user.userHandle) && !COMMON.areEquals(BSKY.user.userHandle.toLowerCase(), "null") ) {
		let $input						= $( "#user_handle" );
		if ( $input.length ) {
			$input.val( BSKY.user.userHandle );
			if (window.BSKY.DEBUG) console.debug( PREFIX + `Updated field: "${$input[0].id}" with (localStorage) value: "${BSKY.user.userHandle}"` );
		}
		previous						= true;
	} else {
		localStorage.removeItem(LSKEYS.user.handle)
	}
	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return previous;
}

function fnLaunchToast( obj ) {
	const STEP_NAME						= "fnLaunchToast";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	if (window.BSKY.DEBUG) console.debug( PREFIX + "OBJ:", obj );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "OBJ.dataset:", obj.dataset );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "OBJ.dataset.toastId:", obj.dataset.toastId );

	if (obj.dataset.toastId) {
		let id							= obj.dataset.toastId;
		let jqID						= "#" + id;
		if (window.BSKY.DEBUG) console.debug( PREFIX + "GOT OBJ.dataset.toastId:", `[id==${id}] [jqID==${jqID}]` );
		
		let toastOptions				= null;
		// let toastOptions				= {"animation": true, "autohide": true, "delay": 5000};
		let jqBSToast					= new bootstrap.Toast( jqID, toastOptions );
		jqBSToast.show();
	}

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/**********************************************************
 * PUBLIC Functions
 **********************************************************/
/* --------------------------------------------------------
 * LOGIN PROCESS.
 *
 * Function to be executed during the login process.
 * -------------------------------------------------------- */
async function fnAuthenticateWithBluesky( form, handle ) {
	const STEP_NAME						= "fnAuthenticateWithBluesky";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + " [handle " + handle + "]" );

	// Avoid form to be submitted.
	event.preventDefault();

	// Disable login button. // button-login
	$( "#button-login" ).attr( "disabled", "" );

	// Hide error panel and show the info one.
	COMMON.hide( "panel-error" );
	COMMON.show( "panel-info" );

	let variable						= null;
	
	try {
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Current handle:", handle );
		BSKY.user.userHandle				= handle;

		variable							= await step01RetrieveUserDID();
		// if (window.BSKY.DEBUG) console.debug( PREFIX + "Received variable:", COMMON.prettyJson( variable ) );
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Current userDid:", BSKY.user.userDid );

		variable							= await stop02RetrieveUserDIDDocument();
		// if (window.BSKY.DEBUG) console.debug( PREFIX + "Received variable:", COMMON.prettyJson( variable ) );
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Current userDidDocument:", COMMON.prettyJson( BSKY.auth.userDidDocument ) );
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Current userPDSURL:", BSKY.auth.userPDSURL );

		variable							= await step03RetrievePDSServerMetadata();
		// if (window.BSKY.DEBUG) console.debug( PREFIX + "Received variable:", COMMON.prettyJson( variable ) );
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Current userPDSMetadata:", COMMON.prettyJson( BSKY.auth.userPDSMetadata ) );
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Current userAuthServerURL:", BSKY.auth.userAuthServerURL );

		variable							= await step04RetrieveAuthServerDiscoveryMetadata();
		// if (window.BSKY.DEBUG) console.debug( PREFIX + "Received variable:", COMMON.prettyJson( variable ) );
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Current userAuthServerDiscovery:", COMMON.prettyJson( BSKY.auth.userAuthServerDiscovery ) );
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Current userAuthorizationEndPoint:", BSKY.auth.userAuthorizationEndPoint );
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Current userTokenEndPoint:", BSKY.auth.userTokenEndPoint );
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Current userPAREndPoint:", BSKY.auth.userPAREndPoint );
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Current userRevocationEndPoint:", BSKY.auth.userRevocationEndPoint );

		variable							= await step05PARRequest();
		// if (window.BSKY.DEBUG) console.debug( PREFIX + "Received variable:", COMMON.prettyJson( variable ) );
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Current userAuthServerRequestURI:", BSKY.auth.userAuthServerRequestURI );

		// Enable login button. // button-login
		COMMON.hide( "panel-info" );
		$( "#button-login" ).removeAttr( "disabled" );

		if (window.BSKY.DEBUG) console.debug( PREFIX + "Redirecting user to the Bluesky Authorization Server page..." );
		step06RedirectUserToBlueskyAuthPage();
	} catch ( error ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		if (window.BSKY.DEBUG) console.error( PREFIX + "Detected error:", COMMON.prettyJson( error ) );

		// Clear info panel
		HTML.clearStepInfo();
		COMMON.hide( "panel-info" );

		// Hide error panel and show the info one.
		COMMON.show( "panel-error" );

		// Enable login button. // button-login
		$( "#button-login" ).removeAttr( "disabled" );
	}

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}

