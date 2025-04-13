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
// Module SELF constants
const MODULE_NAME						= COMMON.getModuleName( import.meta.url );

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
export const ERROR_CODE_00				= { "code":  0, "message": "Generic Access Token error" };
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
export const ERROR_CODE_13				= { "code": 13, "message": "Invalid code!" };

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
	static getError( code ) {
		switch( code ) {
			case  1: return new AccessTokenError( ERROR_CODE_01 ); break;
			case  2: return new AccessTokenError( ERROR_CODE_02 ); break;
			case  3: return new AccessTokenError( ERROR_CODE_03 ); break;
			case  4: return new AccessTokenError( ERROR_CODE_04 ); break;
			case  5: return new AccessTokenError( ERROR_CODE_05 ); break;
			case  6: return new AccessTokenError( ERROR_CODE_06 ); break;
			case  7: return new AccessTokenError( ERROR_CODE_07 ); break;
			case  8: return new AccessTokenError( ERROR_CODE_08 ); break;
			case  9: return new AccessTokenError( ERROR_CODE_09 ); break;
			case 10: return new AccessTokenError( ERROR_CODE_10 ); break;
			case 11: return new AccessTokenError( ERROR_CODE_11 ); break;
			case 12: return new AccessTokenError( ERROR_CODE_12 ); break;
			case 13: return new AccessTokenError( ERROR_CODE_13 ); break;
			default: return new AccessTokenError( ERROR_CODE_00 );
		}
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
	blob								= null;

	static getInstance( step, url ) {				return new HTTPRequest( step, url, { method: HTTP_GET } ); }
	static getInstanceWithFetch( step, url, fetchOptions ) {	return new HTTPRequest( step, url, fetchOptions, fetchOptions.method ); }
	static getInstanceWithFetchAndBlob( step, url, fetchOptions ) {	return new HTTPRequest( step, url, fetchOptions, fetchOptions.method, true ); }
	static getInstanceWithMethod( step, url, method ) {		return new HTTPRequest( step, url, { method: method } ); }

	constructor( step, url, fetchOptions=null, method=null, blob=false ) {
		this.step						= step;
		this.method						= method;
		this.url						= url;
		this.fetchOptions				= fetchOptions;
		this.blob						= blob;
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


/* --------------------------------------------------------
 * Classes for canvas and drawing.
 * -------------------------------------------------------- */
// A canvas item.
export class CanvasItem {
	width								= 0;
	height								= 0;
	offsetX								= 1;
	offsetY								= 1;
	paddingX							= 0;
	paddingY							= 0;
	align								= "left";
	font								= 8;
	constructor() {
		this.color						= {};
		this.color.foreground			= 0;
		this.color.background			= 0;
		this.color.border				= {};
		this.color.border.color			= 0;
		this.color.border.size			= 0;
	}
}


/*
	The box.

		+-----[HEADER]------++-------[PAYLOAD]----------------------------------+

		+-----------------------------------------------------------------------+
		|+------------------+ +------------------------------------------------+|
		||                  | |+------++------++------++------++------++------++|
		||                  | ||      ||      ||      ||      ||      ||      |||
		||                  | ||  P1  ||  P2  ||  P3  ||  P4  ||  P5  ||  P6  |||
		||       MAIN       | |+------++------++------++------++------++------+||
		||                  | |+----++----++----++----++----++----++----++----+||
		||                  | || M1 || M2 || M3 || M4 || M5 || M6 || M7 || M8 |||
		||                  | |+----++----++----++----++----++----++----++----+||
		|+------------------+ || M1 || M2 || M3 || M4 || M5 || M6 || M7 || M8 |||
		||      HEARTS      | |+----++----++----++----++----++----++----++----+||
		||                  | |+--++--++--++--++--++--++--++--++--++--++--++--+||
		||       +--+       | ||S1||S2||S3||S4||S5||S6||S7||S8||S9||S0||S1||S2|||
		||       +--+       | |+--++--++--++--++--++--++--++--++--++--++--++--+||
		||                  | |+--++--++--++--++--++--++--++--++--++--++--++--+||
		|+------------------+ ||S1||S2||S3||S4||S5||S6||S7||S8||S9||S0||S1||S2|||
		||       SIGN       | |+--++--++--++--++--++--++--++--++--++--++--++--+||
		|+------------------+ +------------------------------------------------+|
		+-----------------------------------------------------------------------+

 */
export class BSKYCanvas {
	static CLASS_NAME					= "BSKYCanvas";

	#createStructure() {
		this.canvas						= new CanvasItem();
		this.header						= {};
		this.header.main				= new CanvasItem();
		this.header.hearts				= {};
		this.header.hearts.main			= new CanvasItem();
		this.header.hearts.main.hearts	= new CanvasItem();
		this.header.hearts.main.label	= new CanvasItem();
		this.header.hearts.shadow		= new CanvasItem();
		this.header.sign				= new CanvasItem();
		this.payload					= new CanvasItem();
		this.payload.big				= new CanvasItem();
		this.payload.medium1			= new CanvasItem();
		this.payload.medium2			= new CanvasItem();
		this.payload.small1				= new CanvasItem();
		this.payload.small2				= new CanvasItem();

		// The objects functions
		this.canvas.draw				= ( ctx ) => {
			const STEP_NAME				= "canvas.draw";
			const PREFIX				= `[${MODULE_NAME}:${BSKYCanvas.CLASS_NAME}:${STEP_NAME}] `;
			if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

			// The canvas
			// ---------------------------------------------------------
			let item					= null;

			// The global background
			item						= this.canvas;
			if (window.BSKY.DEBUG) console.debug( PREFIX + `+ [data]`, COMMON.toJson( item ) );
			ctx.fillStyle				= item.color.border.color;
			ctx.fillRect( 0, 0, item.width, item.height );
			ctx.fillStyle				= item.color.background;
			const size					= item.color.border.size;
			ctx.fillRect( size, size, item.width - 2 * size, item.height - 2 * size );

			// The hearts box
			// ---------------------------------------------------------

			// The background box
			item						= this.header.hearts.shadow;
			ctx.fillStyle				= item.color.background;
			ctx.fillRect(
				item.offsetX + item.paddingX,
				item.offsetY + item.paddingY,
				item.width,
				item.height);

			// The foreground box
			item						= this.header.hearts.main;
			ctx.fillStyle				= item.color.background;
			ctx.fillRect(
				item.offsetX,
				item.offsetY,
				item.width,
				item.height);

			// The hearts
			item						= this.header.hearts.main.hearts;
			ctx.textAlign				= item.align;
			ctx.font					= `${item.font}px system-ui`;
			// ctx.fillText( '❤️', 70, 220 );
			ctx.fillText( '💕', item.offsetX, item.offsetY + item.paddingY );

			// The text box
			item						= this.header.hearts.main.label;
			ctx.textAlign				= item.align;
			ctx.fillStyle				= item.color.background;
			ctx.fillText( 'Love!', item.offsetX, item.offsetY + item.paddingY );

			// The copyright box
			// ---------------------------------------------------------
			item						= this.header.sign;
			ctx.imageSmoothingEnabled	= true;
			ctx.textAlign				= item.align;
			ctx.font					= `${item.font}px system-ui`;
			ctx.fillStyle				= item.color.background;
			ctx.fillText( 'Generated by: BSKYAnalyzer', item.offsetX + item.paddingX, item.offsetY + 4 );
			ctx.fillText( CONFIGURATION.clientApp.url,  item.offsetX + item.paddingX, item.offsetY + 12 );
			ctx.fillText( new Date().toUTCString(),     item.offsetX + item.paddingX, item.offsetY + 20 );

			if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
			if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		};
	};

	constructor( width, height, leftSide ) {
		const STEP_NAME					= "constructor";
		const PREFIX					= `[${MODULE_NAME}:${BSKYCanvas.CLASS_NAME}:${STEP_NAME}] `;
		if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

		// The canvas itself
		// ---------------------------------------------------------
		// The structure
		this.#createStructure();

		// The dimensions
		this.canvas.width								= width;
		this.canvas.height								= height;
		this.canvas.color.background					= "white";
		this.canvas.color.border.color					= "black";
		this.canvas.color.border.size					= 1;

		// The header
		// ---------------------------------------------------------
		this.headerWidth								= leftSide + 16;
		const headerBoxWidth							= parseInt( this.headerWidth / 4 );

		const boxHeight									= parseInt( height / 8 );
		const mainHeight								= 4 * boxHeight;
		const heartsHeight								= 3 * boxHeight;
		const heartsTextHeight							= parseInt( heartsHeight / 3 );

		// The main section
		this.header.main.width							= this.headerWidth;
		this.header.main.height							= mainHeight;
		this.header.main.font							= 12;
		if (window.BSKY.DEBUG) console.debug( PREFIX + `MAIN: [w:${this.header.main.width}/h:${this.header.main.height}]` );

		// The hearts section
		this.header.hearts.main.width					= 2 * headerBoxWidth;
		this.header.hearts.main.height					= heartsTextHeight;
		this.header.hearts.main.offsetX					= headerBoxWidth;
		this.header.hearts.main.offsetY					= mainHeight + heartsTextHeight;
		this.header.hearts.main.color.background		= "blue";
		if (window.BSKY.DEBUG) console.debug( PREFIX + `HEARTS.MAIN: [w:${this.header.hearts.main.width}/h:${this.header.hearts.main.height}]` );

		this.header.hearts.main.hearts.width			= 2 * headerBoxWidth;
		this.header.hearts.main.hearts.height			= heartsTextHeight;
		this.header.hearts.main.hearts.offsetX			= 2 * headerBoxWidth;
		this.header.hearts.main.hearts.offsetY			= mainHeight + heartsTextHeight;
		this.header.hearts.main.hearts.paddingY			= 4;
		this.header.hearts.main.hearts.align			= "center";
		this.header.hearts.main.hearts.font				= 16;
		this.header.hearts.main.hearts.color.background	= "white";
		if (window.BSKY.DEBUG) console.debug( PREFIX + `HEARTS.MAIN.HEARTS: [w:${this.header.hearts.main.hearts.width}/h:${this.header.hearts.main.hearts.height}]` );

		this.header.hearts.main.label.width				= 2 * headerBoxWidth;
		this.header.hearts.main.label.height			= heartsTextHeight;
		this.header.hearts.main.label.offsetX			= 2 * headerBoxWidth;
		this.header.hearts.main.label.offsetY			= mainHeight + 2* heartsTextHeight;
		this.header.hearts.main.label.paddingY			= -20;
		this.header.hearts.main.label.align				= "center";
		this.header.hearts.main.label.font				= 16;
		this.header.hearts.main.label.color.background	= "#f0ffff";
		if (window.BSKY.DEBUG) console.debug( PREFIX + `HEARTS.MAIN.LABEL: [w:${this.header.hearts.main.label.width}/h:${this.header.hearts.main.label.height}]` );

		this.header.hearts.shadow.width					= 2 * headerBoxWidth;
		this.header.hearts.shadow.height				= heartsTextHeight;
		this.header.hearts.shadow.offsetX				= headerBoxWidth;
		this.header.hearts.shadow.offsetY				= mainHeight + heartsTextHeight;
		this.header.hearts.shadow.paddingX				= 2;
		this.header.hearts.shadow.paddingY				= 2;
		this.header.hearts.shadow.color.background		= "rgb(0 0 0 / 50%)";
		if (window.BSKY.DEBUG) console.debug( PREFIX + `HEARTS.SHADOW: [w:${this.header.hearts.shadow.width}/h:${this.header.hearts.shadow.height}]` );

		// The sign section
		this.header.sign.width							= this.headerWidth;
		this.header.sign.height							= boxHeight;
		this.header.sign.offsetY						= mainHeight + heartsHeight;
		this.header.sign.paddingX						= 4;
		this.header.sign.paddingY						= 4;
		this.header.sign.align							= "left";
		this.header.sign.font							= 10;
		this.header.sign.color.background				= "black";
		if (window.BSKY.DEBUG) console.debug( PREFIX + `SIGN: [w:${this.header.sign.width}/h:${this.header.sign.height}]` );

		// The payload
		// ---------------------------------------------------------
		const top						= 3;
		this.payloadWidth				= width - this.headerWidth;
		// 4, 3, 2
		const payloadBoxWidth			= parseInt( this.payloadWidth / 24 );
		// 4, 2, 2, 1, 1
		const payloadBoxHeight			= parseInt( height / 10 ) - 1;
		if (window.BSKY.DEBUG) console.debug( PREFIX + `PAYLOAD: [w:${this.payloadWidth}/bw:${payloadBoxWidth}/bh:${payloadBoxHeight}]` );

		// The big section(6): 1 thru 6
		this.payload.big.type			= "BIG";
		this.payload.big.width			= 4 * payloadBoxWidth;
		this.payload.big.height			= 4 * payloadBoxHeight;
		this.payload.big.offsetX		= n => this.headerWidth + ( n-1 ) * this.payload.big.width;
		this.payload.big.offsetY		= n => top;

		// The medium1 section(8): 7 thru 14
		this.payload.medium1.type		= "MEDIUM 1";
		this.payload.medium1.width		= 3 * payloadBoxWidth;
		this.payload.medium1.height		= 2 * payloadBoxHeight;
		this.payload.medium1.offsetX	= n => this.headerWidth + ( n-7 ) * this.payload.medium1.width;
		this.payload.medium1.offsetY	= n => this.payload.big.height + top;

		// The medium2 section(8): 15 thru 22
		this.payload.medium2.type		= "MEDIUM 2";
		this.payload.medium2.width		= 3 * payloadBoxWidth;
		this.payload.medium2.height		= 2 * payloadBoxHeight;
		this.payload.medium2.offsetX	= n => this.headerWidth + ( n-15 ) * this.payload.medium2.width;
		this.payload.medium2.offsetY	= n => this.payload.big.height + this.payload.medium1.height + top;

		// The small1 section(12): 23 thru 34
		this.payload.small1.type		= "SMALL 1";
		this.payload.small1.width		= 2 * payloadBoxWidth;
		this.payload.small1.height		= payloadBoxHeight;
		this.payload.small1.offsetX		= n => this.headerWidth + ( n-23 ) * this.payload.small1.width;
		this.payload.small1.offsetY		= n => this.payload.big.height + this.payload.medium1.height + this.payload.medium2.height + top;

		// The small2 section(12): 35 thru 46
		this.payload.small2.type		= "SMALL 2";
		this.payload.small2.width		= 2 * payloadBoxWidth;
		this.payload.small2.height		= payloadBoxHeight;
		this.payload.small2.offsetX		= n => this.headerWidth + ( n-35 ) * this.payload.small2.width;
		this.payload.small2.offsetY		= n => this.payload.big.height + this.payload.medium1.height + this.payload.medium2.height + this.payload.small1.height + top;

		if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	}
	
	getCanvasItem( n ) {
		if ( n <= 6) {						// First row: 1 thru 6
			return this.payload.big;
		} else if ( n <= 14 ) {				// Second row: 7 thru 14
			return this.payload.medium1;
		} else if ( n <= 22 ) {				// Third row: 15 thru 22
			return this.payload.medium2;
		} else if ( n <= 34 ) {				// Fourth row: 23 thru 34
			return this.payload.small1;
		} else {
			return this.payload.small2;
		}
	}
}

