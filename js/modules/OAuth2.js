/**********************************************************
 * Module imports
 **********************************************************/
// Common modules
import * as COMMON					from "./common.functions.js";
import CONFIGURATION				from "../data/config.json" with { type: "json" };
// For OAuth2 User Token retrieval / DPoP
import * as DPoP					from './OAuth2/dpopProof.js'
import * as TokenClient				from './OAuth2/tokenClient.js';
import * as APIClient				from './OAuth2/apiClient.js';
import * as CryptoModule			from './OAuth2/Crypto.js';
import * as JWT						from './OAuth2/JWT.js';
import * as JWTRenderer				from './OAuth2/jwtRender.js'



/**********************************************************
 * Module Constants
 **********************************************************/
// Module SELF constants
const MODULE_NAME					= COMMON.getModuleName( import.meta.url );
const MODULE_VERSION				= "1.0.0";
const MODULE_PREFIX					= `[${MODULE_NAME}]: `;


// Inner constants
const CONST_URL						= new URL( window.location );
const DEBUG							= CONFIGURATION.global.debug;
const DEBUG_FOLDED					= CONFIGURATION.global.debug_folded;
const API							= CONFIGURATION.api;
const LSKEYS						= CONFIGURATION.localStorageKeys;

const resourceUrl = "https://dpoptestapi.azurewebsites.net/DPoP";


/**********************************************************
 * Module Variables
 **********************************************************/
let GROUP_DEBUG						= DEBUG && DEBUG_FOLDED;



/**********************************************************
 * PRIVATE Functions
 **********************************************************/
function renderJwtSignature(document, signature) {
    let container = document.createElement("div");
    container.appendChild(document.createTextNode(signature));
    return container;
}

function addDPopNonceToSearchParameters( body, nonce ) {
	var json = Object.fromEntries( body );
	json[ "nonce" ] = nonce;
	return new URLSearchParams( json );
}


/**********************************************************
 * PUBLIC Functions
 **********************************************************/
export async function retrieveUserTokenFromAS( tokenEndpointUrl, urlData, clientId ) {
	const PREFIX = `[${MODULE_NAME}:retrieveUserTokenFromAS] `;
	if (GROUP_DEBUG) console.groupCollapsed(PREFIX);

	if (DEBUG) console.debug(PREFIX, "tokenEndpointUrl:", tokenEndpointUrl);
	if (DEBUG) console.debug(PREFIX, "urlData:", COMMON.prettyJson( Object.fromEntries( urlData ) ));	// parámetro de tipo: [URLSearchParams]

	// Let's retrieve the "dpopNonce" value from the localStorage... if any.
    let dpopNonce = localStorage.getItem(LSKEYS.request.dpop_nonce);
	if ( dpopNonce ) {
		if (DEBUG) console.debug(PREFIX, "dpopNonce:", dpopNonce);
	} else {
		dpopNonce = null;
	}

	if (DEBUG) console.debug(PREFIX, "Generating a DPoP-Proof for url:", tokenEndpointUrl);
	let dpopProofForAS = await DPoP.createDPoPProof(null, null, null, tokenEndpointUrl, clientId, dpopNonce);
    let base64DpopProof = dpopProofForAS;
    let jwk = dpopProofForAS.jwk;
    let key = dpopProofForAS.key;
	if (DEBUG) console.debug(PREFIX, "Received base64DpopProof:", base64DpopProof);
	if (DEBUG) console.debug(PREFIX, "Received base64DpopProof (prettyJson):", COMMON.prettyJson( base64DpopProof ));
	if (DEBUG) console.debug(PREFIX, "Received base64DpopProof.dpopProof:", base64DpopProof.dpopProof);
	if (DEBUG) console.debug(PREFIX, "Received base64DpopProof.dpopProof (pretty):", JWT.jwtToPrettyJSON( base64DpopProof.dpopProof ));

	// Let's request the token.
    let tokenFetchResult = await TokenClient.getAccessToken(tokenEndpointUrl, dpopProofForAS.dpopProof, urlData.toString(), dpopNonce);
	if (DEBUG) console.debug(PREFIX, "Received tokenFetchResult:", COMMON.prettyJson(tokenFetchResult));
	
    let tokenError = tokenFetchResult.error;
    let tokenErrorDesc = tokenFetchResult.error_description;
	if ( tokenError ) {
		if (DEBUG) console.warn(PREFIX, "tokenError:", tokenErrorDesc);
		let wwwAuthenticate = tokenFetchResult.wwwAuthenticate;
		if ( wwwAuthenticate ) {
			if (DEBUG) console.debug(PREFIX, "wwwAuthenticate:", wwwAuthenticate);
		}
		if ( COMMON.areEquals( tokenError, "use_dpop_nonce" ) ) {
			if (DEBUG) console.warn(PREFIX, "tokenError[use_dpop_nonce]:", tokenError, tokenErrorDesc);
			// Should say: "Authorization server requires nonce in DPoP proof"
			if (DEBUG) console.warn(PREFIX, "Should retry the token retrieval but, now, with the DPoP-Nonce item!");
			
			// First, add "nonce" to the "body" of the DPoP-Proof.
			/*
			urlData[ "nonce" ] = dpopNonce;
			urlData = addDPopNonceToSearchParameters( urlData, dpopNonce );
			if (DEBUG) console.debug(PREFIX, "urlData:", Object.fromEntries( urlData ));
			*/
			if (DEBUG) console.debug(PREFIX, "Generating a DPoP-Proof for url:", tokenEndpointUrl);
			dpopProofForAS = await DPoP.createDPoPProof(null, jwk, key, tokenEndpointUrl, clientId, dpopNonce);
			base64DpopProof = dpopProofForAS;
			if (DEBUG) console.debug(PREFIX, "Received base64DpopProof/dpopProofForAS:", base64DpopProof);

			tokenFetchResult = await TokenClient.getAccessToken(tokenEndpointUrl, dpopProofForAS.dpopProof, urlData.toString(), dpopNonce);
			if (DEBUG) console.debug(PREFIX, "Received tokenFetchResult:", tokenFetchResult);

			// If this second time, with "nonce" we get an error... Bad!
			tokenError = tokenFetchResult.error;
			tokenErrorDesc = tokenFetchResult.error_description;
			if ( tokenError ) {
				if ( COMMON.areEquals( tokenError, "use_dpop_nonce" ) ) {
					if (DEBUG) console.warn(PREFIX, "tokenError[use_dpop_nonce]:", tokenError, tokenErrorDesc);
					if (DEBUG) console.warn(PREFIX, "tokenError:", tokenErrorDesc);
					wwwAuthenticate = tokenFetchResult.wwwAuthenticate;
					if ( wwwAuthenticate ) {
						if (DEBUG) console.debug(PREFIX, "wwwAuthenticate:", wwwAuthenticate);
					}
				} else if ( COMMON.areEquals( tokenError, "invalid_grant" ) ) {
					if (DEBUG) console.warn(PREFIX, "tokenError[invalid_grant]:", tokenError, tokenErrorDesc);
				} else if ( COMMON.areEquals( tokenError, "invalid_dpop_proof" ) ) {
					if (DEBUG) console.warn(PREFIX, "tokenError[invalid_dpop_proof]:", tokenError, tokenErrorDesc);
				} else {
					if (DEBUG) console.warn(PREFIX, "UNKNOWN tokenError:", tokenError, tokenErrorDesc);
				}
			} else {
				if (DEBUG) console.debug(PREFIX, "No errors! ;^)");
			}
		} else if ( COMMON.areEquals( tokenError, "invalid_grant" ) ) {
			if (DEBUG) console.warn(PREFIX, "tokenError[invalid_grant]:", tokenError, tokenErrorDesc);
		} else if ( COMMON.areEquals( tokenError, "invalid_dpop_proof" ) ) {
			if (DEBUG) console.warn(PREFIX, "tokenError[invalid_dpop_proof]:", tokenError, tokenErrorDesc);
		} else {
			if (DEBUG) console.warn(PREFIX, "UNKNOWN tokenError:", tokenError, tokenErrorDesc);
		}
	}

	// Still errors?
	if ( tokenError ) {
		throw( tokenErrorDesc );
	}

	if (DEBUG) console.debug(PREFIX, "Seems everything is ok.");

    let accessToken = tokenFetchResult.access_token;
	if (DEBUG) console.debug(PREFIX, "accessToken:", JWT.jwtToPrettyJSON(accessToken));

	dpopNonce = tokenFetchResult.dpopNonce;
	if ( dpopNonce ) {
		if (DEBUG) console.debug(PREFIX, "dpopNonce:", dpopNonce);
	}

	let parts = JWT.getParts(accessToken);
	if (DEBUG) console.debug(PREFIX, "accessToken parts:", COMMON.prettyJson(parts));

    let atHash = await CryptoModule.createHash(accessToken, true);
	if (DEBUG) console.debug(PREFIX, "atHash:", atHash);

	if (GROUP_DEBUG) console.groupEnd();
    return { access_token: accessToken, atHash: atHash, nonce: dpopNonce, dpopProofForAS: dpopProofForAS };
}

export function getJWTAsString(jwt) {
    return JWT.getJWTAsString(jwt);
}

export function jwtToPrettyJSON(jwt) {
    return JWT.jwtToPrettyJSON(jwt);
}

export async function generateDpopProof() {
    let dpopProofForAS = await DPoP.createDPoPProof(null, null, null, tokenEndpointUrl);
    return dpopProofForAS;
}

export async function getAccessToken(dpopProof) {
    let accessToken = await TokenClient.getAccessToken(tokenEndpointUrl, dpopProof);
    return accessToken;
}

export async function getAccessTokenHash(accessToken) {
    let atHash = await CryptoModule.createHash(accessToken, true);    
    return atHash;
}

export async function generateDpopProofForResource(accessTokenHash, dpopProofForAS, resourceUrl, clientId, nonce, method) {
    return await DPoP.createDPoPProof(accessTokenHash, dpopProofForAS.jwk, dpopProofForAS.key, resourceUrl, clientId, nonce, method)
		.then(data => data);
}

export async function callAPI(accessToken, dpopProofForResource, resourceUrl) {
    let apiResult = await APIClient.callAPI(accessToken, dpopProofForResource, resourceUrl);
    return apiResult;
}

export function getAccessTokenParts(accessToken) {
    let encodedAT = `${parts.header}.${parts.payload}.${parts.signature}`;
    let ATasString = `${partsAsString.header}.${partsAsString.payload}.${partsAsString.signature}`;

    return { encoded: encodedAT, asString: ATasString };
}

export function renderBase64DpopProof(document, element, token) {

    let parts = token.split(".");

    let headerTextNode = document.createTextNode(parts[0]);
    let payloadTextNode = document.createTextNode(parts[1]);
    let signatureTextNode = document.createTextNode(parts[2]);

    let headerSpan = document.createElement("span");
    let payloadSpan = document.createElement("span");
    let signatureSpan = document.createElement("span");
    let separatorSpan1 = document.createElement("span");
    let separatorSpan2 = document.createElement("span");

    headerSpan.classList.add("jwt-header");
    payloadSpan.classList.add("jwt-payload");
    signatureSpan.classList.add("jwt-signature");
    separatorSpan1.classList.add("jwt-part-separator")
    separatorSpan2.classList.add("jwt-part-separator")

    headerSpan.appendChild(headerTextNode);
    payloadSpan.appendChild(payloadTextNode);
    signatureSpan.appendChild(signatureTextNode);
    separatorSpan1.appendChild(document.createTextNode("."));
    separatorSpan2.appendChild(document.createTextNode("."));

    element.appendChild(headerSpan);
    element.appendChild(separatorSpan1);
    element.appendChild(payloadSpan);
    element.appendChild(separatorSpan2);
    element.appendChild(signatureSpan);
}

export function renderJwt(document, token, headerElement, payloadElement, signatureElement) {
    let parts = JWT.getParts(token);

    let header = JWT.partToJson(parts.header);
    let payload = JWT.partToJson(parts.payload);
    let signature = parts.signature;

    JWTRenderer.renderJwtPart(document, header, headerElement);
    JWTRenderer.renderJwtPart(document, payload, payloadElement);

    let jwtSignature = renderJwtSignature(document, signature);
    signatureElement.appendChild(jwtSignature);
}

