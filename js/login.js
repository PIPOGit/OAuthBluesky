/**********************************************************
 * Module Info:
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

// Bluesky constants
const APP_CLIENT_ID						= CLIENT_APP.client_id;
const APP_CALLBACK_URL					= CLIENT_APP.redirect_uri;
const APP_LOCALHOST_CALLBACK_URL		= CLIENT_APP.redirect_to_localhost;
const APP_DASHBOARD_URL					= CLIENT_APP.dashboard;
const APP_LOCALHOST_DASHBOARD_URL		= CLIENT_APP.dashboard_localhost;


/**********************************************************
 * Module Variables
 **********************************************************/
let redirectURI							= APP_CALLBACK_URL;


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
	// + Functions
	window.BSKY.authenticateWithBluesky = fnAuthenticateWithBluesky;
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Updated object: [window.BSKY].`, window.BSKY );

	// ================================================================
	// Module END
	console.info( `Loaded module ${MODULE_NAME}.` );

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.DEBUG) console.groupEnd();


	// ================================================================
	// Ejecutamos las acciones propias de esta página.

	// Check whether we come from LOGOUT.
	// ---------------------------------------------------------
	let comeFromLogout					= checkIfComesFromLogout();
	if (window.BSKY.DEBUG) console.debug( PREFIX + "comeFromLogout:", comeFromLogout );

	// La clave criptográfica en la base de datos
	// ---------------------------------------------------------
	await DB.checkCryptoKeyInDB(comeFromLogout);

	// Check whether we are in localhost.
	// ---------------------------------------------------------
	let isLocalhost						= checkIfWeAreInLocalhost();
	if (isLocalhost) {
		console.warn( "%c==== [warn] ENTERING DEVEL MODE ====", COMMON.CONSOLE_LOCAL );
		redirectURI						= APP_LOCALHOST_CALLBACK_URL;
	}
	if (window.BSKY.DEBUG) console.debug( PREFIX + `isLocalhost:${isLocalhost}, redirectURI:${redirectURI}, ` );

	// Update the "userHandle" field
	// ---------------------------------------------------------
	let gotUserHandle					= checkUserHandle( comeFromLogout );

	// Finally, let's see if we already have a valid user access token.
	// ---------------------------------------------------------
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Check the token..." );
	let isValid							= await BSKY.checkUserAccessToken();
	if (window.BSKY.DEBUG) console.debug( PREFIX + "isValid:", isValid );
	if ( isValid ) {
		let url							= isLocalhost ? APP_LOCALHOST_DASHBOARD_URL : APP_DASHBOARD_URL;
		if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
		if (window.BSKY.DEBUG) console.groupEnd();
		window.location					= url;
	} else {
		COMMON.show( HTML.DIV_ROOT_PANEL );
		// End of module setup
		// ---------------------------------------------------------
		if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
		if (window.BSKY.DEBUG) console.groupEnd();
	}
}


/**********************************************************
 * PRIVATE Functions
 **********************************************************/

/* --------------------------------------------------------
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

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return isLocalhost;
}


/* --------------------------------------------------------
 * Function to be executed in the "login page".
 * -------------------------------------------------------- */
function checkUserHandle( comeFromLogout ) {
	const STEP_NAME						= "checkUserHandle";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[comeFromLogout==${comeFromLogout}]` );

	// Update the "user handle" field with the value in localStorage, if any.
	let previous						= false;
	BSKY.user.userHandle				= localStorage.getItem(LSKEYS.user.handle) || null;
	if ( BSKY.user.userHandle && !COMMON.isNullOrEmpty(BSKY.user.userHandle) && !COMMON.areEquals(BSKY.user.userHandle.toLowerCase(), "null") ) {
		let $input						= $( `#${HTML.USER_HANDLE}` );
		if ( $input.length ) {
			$input.val( BSKY.user.userHandle );
			if (window.BSKY.DEBUG) console.debug( PREFIX + `Updated field: "${$input[0].id}" with (localStorage) value: "${BSKY.user.userHandle}"` );
		}
		previous						= true;

		// Bootstrap Salute
		// ---------------------------------------------------------
		if (!comeFromLogout) {
			let id							= HTML.DIV_TOAST_WELCOME;
			let jqID						= "#" + id;
			let toastOptions				= null;		// Kept here for further purposes
			$( `${jqID} > .toast-body` ).html( `Welcome back, ${BSKY.user.userHandle}!` );
			let jqBSToast					= new bootstrap.Toast( jqID, toastOptions );
			jqBSToast.show();
		}
	} else {
		localStorage.removeItem(LSKEYS.user.handle)
	}
	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return previous;
}


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
	// ---------------------------------------------------------
	let preparedData					= await PKCE.prepareDataForPARRequest( BSKY.user.userHandle, APP_CLIENT_ID, redirectURI );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Received prepared data:", preparedData );
	BSKY.auth.state						= preparedData.state;
	BSKY.auth.codeVerifier				= preparedData.codeVerifier;
	BSKY.auth.codeChallenge				= preparedData.codeChallenge;
	let body							= preparedData.body;

    // TuneUp and perform the call
	// ---------------------------------------------------------
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

	// ---------------------------------------------------------
    // SAVE ALL RECEIVED DATA
	// IN localStorage BEFORE LEAVING!!!
	// ---------------------------------------------------------
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Saved data in localStorage." );
	BSKY.saveRuntimeDataInLocalStorage();

    // Buld up the URL.
	// ---------------------------------------------------------
    let url								= BSKY.auth.userAuthorizationEndPoint;
    url									+= "?client_id=" + encodeURIComponent( APP_CLIENT_ID );
    url									+= "&request_uri=" + encodeURIComponent( BSKY.auth.userAuthServerRequestURI );
 	if (window.BSKY.DEBUG) console.debug( PREFIX + "Redirecting the user to URL:", url );

    // Redirect the user to the Bluesky Auth Page
	// ---------------------------------------------------------
	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
    window.location = url;
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

	// Disable login button.
	$( HTML.BTN_LOGIN ).attr( "disabled", "" );
	window.BSKY.faviconWorking();

	// Hide error panel and show the info one.
	COMMON.hide( HTML.DIV_PANEL_ERROR );
	COMMON.show( HTML.DIV_PANEL_INFO );

	let variable						= null;
	
	try {
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Current handle:", handle );
		BSKY.user.userHandle			= handle;

		variable						= await step01RetrieveUserDID();
		// if (window.BSKY.DEBUG) console.debug( PREFIX + "Received variable:", COMMON.prettyJson( variable ) );
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Current userDid:", BSKY.user.userDid );

		variable						= await stop02RetrieveUserDIDDocument();
		// if (window.BSKY.DEBUG) console.debug( PREFIX + "Received variable:", COMMON.prettyJson( variable ) );
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Current userDidDocument:", BSKY.auth.userDidDocument );
		// if (window.BSKY.DEBUG) console.debug( PREFIX + "Current userDidDocument:", COMMON.prettyJson( BSKY.auth.userDidDocument ) );
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Current userPDSURL:", BSKY.auth.userPDSURL );

		variable						= await step03RetrievePDSServerMetadata();
		// if (window.BSKY.DEBUG) console.debug( PREFIX + "Received variable:", COMMON.prettyJson( variable ) );
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Current userPDSMetadata:", BSKY.auth.userPDSMetadata );
		// if (window.BSKY.DEBUG) console.debug( PREFIX + "Current userPDSMetadata:", COMMON.prettyJson( BSKY.auth.userPDSMetadata ) );
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Current userAuthServerURL:", BSKY.auth.userAuthServerURL );

		variable						= await step04RetrieveAuthServerDiscoveryMetadata();
		// if (window.BSKY.DEBUG) console.debug( PREFIX + "Received variable:", COMMON.prettyJson( variable ) );
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Current userAuthServerDiscovery:", BSKY.auth.userAuthServerDiscovery );
		// if (window.BSKY.DEBUG) console.debug( PREFIX + "Current userAuthServerDiscovery:", COMMON.prettyJson( BSKY.auth.userAuthServerDiscovery ) );
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Current userAuthorizationEndPoint:", BSKY.auth.userAuthorizationEndPoint );
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Current userTokenEndPoint:", BSKY.auth.userTokenEndPoint );
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Current userPAREndPoint:", BSKY.auth.userPAREndPoint );
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Current userRevocationEndPoint:", BSKY.auth.userRevocationEndPoint );

		if (window.BSKY.DEBUG) console.debug( PREFIX + "Current redirectURI:", redirectURI );
		variable						= await step05PARRequest();
		if (window.BSKY.DEBUG) console.debug( PREFIX + "Current userAuthServerRequestURI:", BSKY.auth.userAuthServerRequestURI );

		// Enable login button.
		COMMON.hide( HTML.DIV_PANEL_INFO );
		$( HTML.BTN_LOGIN ).removeAttr( "disabled" );

		if (window.BSKY.DEBUG) console.debug( PREFIX + "Redirecting user to the Bluesky Authorization Server page..." );
		step06RedirectUserToBlueskyAuthPage();
	} catch ( error ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		if (window.BSKY.DEBUG) console.error( PREFIX + "Detected error:", COMMON.prettyJson( error ) );

		// Clear info panel
		HTML.clearStepInfo();
		COMMON.hide( HTML.DIV_PANEL_INFO );

		// Hide error panel and show the info one.
		COMMON.show( HTML.DIV_PANEL_ERROR );
	} finally {
		window.BSKY.faviconStandBy();
		// Enable login button.
		$( HTML.BTN_LOGIN ).removeAttr( "disabled" );
	}

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}

