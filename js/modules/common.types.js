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
import CONFIGURATION					from "../data/config.json" with { type: "json" };
// Common functions
import * as COMMON						from "./common.functions.js";


/**********************************************************
 * Module Constants
 **********************************************************/

// Inner constants


/**********************************************************
 * Module Classes
 **********************************************************/
export class APICallError extends Error {
	message								= null;
	step								= null;
	status								= null;
	statusText							= null;
	contentType							= null;
	ok									= false;
	bodyUsed							= null;
	redirected							= null;
	body								= null;
	type								= null;
	url									= null;
	isJson								= false;
	headers								= {};
	json								= {};
	text								= {};
	constructor( step, response, contentType ) {
		super( "Error: " + response.status );
		this.message					= "Error: " + response.status;
		this.step						= step;
		this.contentType				= contentType;
		this.status						= response.status;
		this.statusText					= response.statusText;
		this.ok							= response.ok;
		this.bodyUsed					= response.bodyUsed;
		this.redirected					= response.redirected;
		this.body						= response.body;
		this.type						= response.type;
		this.url						= response.url;
		this.isJson						= false;
		this.json						= null;
		this.text						= null;
		this.headers					= response.headers;
	};
	toString() {
		return ( this.isJson ) ? `${this.message}: ${this.json.message}` : `${this.message}: ${this.text}`;
	}
}
/*
	let response						= {
		valid: true,
		message: "",
	};
*/

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
}

export class APICallResponseError extends Error {
	error								= null;
	step								= null;
	callbackOptions						= null;
	sameSteps							= null;
	currentStep							= null;
	distinctDPoPNonce					= null;
	serverError							= null;
	constructor( error, step, callbackOptions, sameSteps, currentStep, distinctDPoPNonce, serverError ) {
		super( "Error @ " + step );
		this.error						= error;
		this.step						= step;
		this.callbackOptions			= callbackOptions;
		this.sameSteps					= sameSteps;
		this.currentStep				= currentStep;
		this.distinctDPoPNonce			= distinctDPoPNonce;
		this.serverError				= serverError;
	};
}
/**********************************************************
 * Module Variables
 **********************************************************/


/**********************************************************
 * Module Load
 **********************************************************/


/**********************************************************
 * HELPER Functions
 **********************************************************/


/**********************************************************
 * PRIVATE Functions
 **********************************************************/


/**********************************************************
 * PUBLIC Functions
 **********************************************************/


