/**********************************************************
 * File Info:
 *
 * This file contains common classes/types and exceptions.
 *
 **********************************************************/


/**********************************************************
 * Module imports
 **********************************************************/
// Global configuration
import CONFIGURATION					from "../../data/config.json" with { type: "json" };

// Common functions
import * as COMMON						from "./CommonFunctions.js";

// To perform API calls
import { HTTP_GET }						from "../utils/APICall.js";


/**********************************************************
 * Module Constants
 **********************************************************/

// Bluesky constants
const CLIENT_APP						= CONFIGURATION.clientApp;
const APP_CLIENT_ID						= CLIENT_APP.client_id;

// Bluesky errors
export const ERROR_USE_DPOP_NONCE		= "use_dpop_nonce";

// Inner constants
const BSKY_LIST_COLLECTION				= "app.bsky.graph.list";


/**********************************************************
 * Module Classes
 **********************************************************/
export class AccessTokenError extends Error {
	title								= "Access Token Error";
	message								= null;
	valid								= false;
	code								= 0;
	constructor( { code, message } ) {
		super( "Error: " + message );
		this.code						= code;
		this.message					= message;
	};
	toString() {
		return `${this.title}[${this.code}] : ${this.message}`;
	}
}

export class CallbackData {
	iss									= null;
	state								= null;
	code								= null;
	dpopNonce							= null;
	constructor( iss, state, code, dpopNonce ) {
		this.iss						= iss;
		this.state						= state;
		this.code						= code;
		this.dpopNonce					= dpopNonce;
	}
};

export class DPoPRequest {
	privateKey							= null;
	jwk									= null;
	clientId							= null;
	accessToken							= null;
	accessTokenHash						= null;
	url									= null;
	dpopNonce							= null;
	method								= null;
	constructor( privateKey, jwk, clientId, accessToken, accessTokenHash, url, dpopNonce, method ) {
		this.privateKey					= privateKey;
		this.jwk						= jwk;
		this.clientId					= clientId;
		this.accessToken				= accessToken;
		this.accessTokenHash			= accessTokenHash;
		this.url						= url;
		this.dpopNonce					= dpopNonce;
		this.method						= method;
	}
	static getInstance( url, method ) {
		return new DPoPRequest(
			BSKY.data.cryptoKey.privateKey,
			BSKY.data.jwk,
			APP_CLIENT_ID,
			BSKY.data.userAccessToken,
			BSKY.data.accessTokenHash,
			url,
			BSKY.data.dpopNonce,
			method);
	}
	static getInstanceWithoutATH( url, method ) {
		return new DPoPRequest(
			BSKY.data.cryptoKey.privateKey,
			BSKY.data.jwk,
			APP_CLIENT_ID,
			BSKY.data.userAccessToken,
			null,
			url,
			BSKY.data.dpopNonce,
			method);
	}
}

/* --------------------------------------------------------
 * Classes to handle an HTTP Request.
 *
 * "fetchOptions" should contain the properties listed in:
 * https://developer.mozilla.org/en-US/docs/Web/API/RequestInit
 * -------------------------------------------------------- */
export class HTTPRequest {
	step								= null;
	method								= null;
	url									= null;
	fetchOptions						= null;

	static getInstance( step, url ) {				return new HTTPRequest( step, url, { method: HTTP_GET } ); }
	static getInstanceWithFetch( step, url, fetchOptions ) {	return new HTTPRequest( step, url, fetchOptions ); }
	static getInstanceWithMethod( step, url, method ) {		return new HTTPRequest( step, url, { method: method } ); }

	constructor( step, url, fetchOptions=null, method=null ) {
		this.step						= step;
		this.method						= method;
		this.url						= url;
		this.fetchOptions				= fetchOptions;
	}
}

/* --------------------------------------------------------
 * Classes to handle an HTTP Response.
 * -------------------------------------------------------- */
export class HTTPResponseHeaders {
	bodyUsed							= null;
	ok									= null;
	redirected							= null;
	status								= null;
	statusText							= null;
	type								= null;
	url									= null;
	headers								= null;
}

export class HTTPResponse {
	// From the request
	step								= null;
	url									= null;
	fetchOptions						= null;
	// From the response
	contentType							= null;
	headers								= null;
	body								= null;
	json								= null;
	isJson								= false;
	isError								= false;
	error								= null;
}

export class HTMLError {
	// Map fields.
	// From Error
	name;
	message;
	stack;
	cause;
	// From HTTPResponseError
	code;
	title;
	// From HTTPResponseError::HTTPResponse
	step;
	url;
	fetchOptions;
	contentType;
	headers;
	body;
	json;
	isJson;
	isError;
	isDPoPNonceError;
}

/* --------------------------------------------------------
 * Classes to handle an HTTP Error.
 *
 * Extending: "Error", we already have: "message" & "cause".
 * -------------------------------------------------------- */
export class HTTPResponseError extends Error {
	// **** Internal
	code								= null;
	title								= null;

	// **** From the HTTPResponse
	// From the request
	step								= null;
	url									= null;
	fetchOptions						= null;

	// From the response
	contentType							= null;
	headers								= null;
	body								= null;
	json								= null;
	isJson								= false;
	isError								= false;

	// Others
	isDPoPNonceError					= false;

	constructor( httpResponse ) {
		super( "Error: " + httpResponse.headers.status );

		// Map response fields
		this.step						= httpResponse.step;
		this.url						= httpResponse.url;
		this.fetchOptions				= httpResponse.fetchOptions;
		this.contentType				= httpResponse.contentType;
		this.headers					= httpResponse.headers;
		this.body						= httpResponse.body;
		this.json						= httpResponse.json;
		this.isJson						= httpResponse.isJson;
		this.isError					= httpResponse.isError;

		// Inner fields
		this.code						= this.headers.status;
		this.title						= `Error: ${this.code}`;
		this.cause						= ( this.isJson )
			? `${this.json.error}: ${this?.json?.message || this?.json?.error_description}`
			: this.body;
		this.isDPoPNonceError			= ( this.headers.status == 400 || this.headers.status == 401 )
			? this.isJson
				? COMMON.areEquals( ERROR_USE_DPOP_NONCE, this.json.error )
				: false
			: false;
	};
	toString() {
		return this.message + ": " + this.cause;
	};
	toJSON() {
		const object					= new HTMLError();

		// Map fields.
		// From Error
		object.name						= this.name;
		object.message					= this.message;
		object.stack					= this.stack.split( '\n' );
		object.cause					= this.cause;
		// From HTTPResponseError
		object.code						= this.code;
		object.title					= this.title;
		// From HTTPResponseError::HTTPResponse
		object.step						= this.step;
		object.url						= this.url;
		object.fetchOptions				= this.fetchOptions;
		object.contentType				= this.contentType;
		object.headers					= this.headers;
		object.body						= this.body;
		object.json						= this.json;
		object.isJson					= this.isJson;
		object.isError					= this.isError;
		object.isDPoPNonceError			= this.isDPoPNonceError;

		return object;
	}
}

/* --------------------------------------------------------
 * Classes to handle lists.
 * -------------------------------------------------------- */
export class BSKYListEntryDetails {
	uri									= null;
	subject								= null;
}

export class BSKYListDetails {
	created								= null;		// aka: "created_date"
	since								= null;		// aka: "date_added"
	description							= null;
	did									= null;		// aka: "list_owner"
	name								= null;		// aka: "list_name"
	source								= null;
	spam								= false;
	url									= null;		// aka: "list_url"
	uri									= null;
	cid									= null;
	creator								= null;
	purpose								= null;
	avatar								= null;
	count								= null;		// aka: "listItemCount"
	items								= null;		// Type: "BSKYListEntryDetails"

	// ClearSky: modList
	static getInstanceFromModList( list ) {
		let newList						= new BSKYListDetails();
		newList.created					= list.created_date;
		newList.since					= list.date_added;
		newList.description				= list.description;
		newList.did						= list.did;
		newList.name					= list.name;
		newList.source					= list.source;
		newList.spam					= list.spam;
		newList.url						= list.url;
		// Internal actions
		newList.uri						= COMMON.convertUrlToATUri( newList.url, BSKY_LIST_COLLECTION );
		return newList;
	}

	// ClearSky: listsUserBlock & listsUserBlocked
	static getInstanceFromBlockList( list ) {
		let newList						= new BSKYListDetails();
		newList.since					= list.date_added;
		newList.description				= list.description;
		newList.did						= list.list_owner;
		newList.name					= list.list_name;
		newList.url						= list.list_url;
		// Internal actions
		newList.uri						= COMMON.convertUrlToATUri( newList.url, BSKY_LIST_COLLECTION );
		return newList;
	}
}


