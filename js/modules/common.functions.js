/**********************************************************
 * Module imports
 **********************************************************/
import CONFIGURATION				from "../data/config.json" with { type: "json" };



/**********************************************************
 * Common function
 **********************************************************/
export const getModuleName			= url => {
	// Otra manera
	// let re = /([\w\d_-]*)\.?[^\\\/]*$/i;
	// let fileNameWithoutExtension = url.match(re)[1];
	// console.debug( "[getModuleName] fileNameWithoutExtension", fileNameWithoutExtension );
	let withoutURL					= url.replace( /^.*[\\/]/, '' );
	let withoutExtension			= withoutURL.replace( /\.[^.]*$/, '' );
	return withoutExtension;
}


/**********************************************************
 * Module Constants
 **********************************************************/
// Module SELF constants
const MODULE_NAME					= getModuleName( import.meta.url );
const MODULE_VERSION				= "1.0.0";
const MODULE_PREFIX					= `[${MODULE_NAME}]: `;


// Inner constants
const DEBUG							= CONFIGURATION.global.debug;
const DEBUG_FOLDED					= CONFIGURATION.global.debug_folded;
const LSKEYS						= CONFIGURATION.localStorageKeys;

// Toast IDs
const ID_TOAST_OK					= "myToastOK";
const ID_TOAST_KO					= "myToastKO";


/**********************************************************
 * Module Variables
 **********************************************************/
let GROUP_DEBUG						= DEBUG && DEBUG_FOLDED;


// Conversion objects.
export const localeDefault			= 'es-ES';
export const numberFormatter		= new Intl.NumberFormat( localeDefault, {style: "currency", currency: "EUR", MinimumIntegerDigits: 6});
export const dateFormatOptions		= { DateStyle: 'short', year: 'numeric', month: '2-digit', day: '2-digit' };
export const prettyJson				= obj => JSON.stringify( obj, null, "  " );

// Comparison functions
export const getTypeOf				= option => typeof option;
export const areEquals				= (str1,str2) => ( str1.trim().toUpperCase().localeCompare( str2.trim().toUpperCase() ) == 0 );
export const isFunction				= obj => ( getTypeOf( obj ).trim().toUpperCase().localeCompare( 'FUNCTION' ) == 0 );
export const isEmpty				= str => (typeof str === "string" && str.length === 0);
export const isNull					= str => (str === null);
export const isUndefined			= str => (str === undefined);
export const isEmptyOrNull			= str => ( isUndefined(str) || isNull(str) || isEmpty(str) );

// String functions
export const removeTrailingSlash	= str => ( str.endsWith('/') ? str.slice(0, -1) : str );

// Filename functions
export const getFileExtension		= filename => filename.split('.').pop();
export const getFileNameFromPath	= filename => filename.split( '/' ).pop();
export const fnGetById				= id => document.getElementById( id );

// LocalStorage
export const lsSave					= ( key, value ) => localStorage.setItem( key, value );
export const lsGet					= ( key ) => localStorage.getItem( key );

// Object LOAD functions
export async function loadJSONFile( file ) {
	try {
		/*
		const options = {
			headers: {
				"sec-fetch-dest": "document",
				"sec-fetch-mode": "navigate",
				"sec-fetch-site": "none",
				"Accept": "application/json",
				"Content-Type": "application/json",
				"Content-Security-Policy": "script-src-elem 'self'"
			},
		};
		const response = await fetch( file, options );
		*/
		const response = await fetch( file );
		if ( !response.ok ) {
			throw new Error( `File[${file}] not found. HTTP error[${response.status}]: ${response.statusText}` );
		}
		const data = await response.json();
		return data;
	} catch (error) {
		console.error(`Could not get JSON file[${file}]: ${error}`);
		return null;
	}
}

export async function loadBLOBFile( file ) {
	try {
		const response = await fetch( file );
		if ( !response.ok ) {
			throw new Error( `File[${file}] not found. HTTP error[${response.status}]: ${response.statusText}` );
		}
		return response.arrayBuffer();
	} catch (error) {
		console.error(`Could not get BLOB file[${file}]: ${error}`);
		return null;
	}
}

// Bootstrap HTML functions
export const showHide				= id => { $( "#" + id ).toggleClass( "hidden" ); }
export const show					= id => { $( "#" + id ).removeClass( "hidden" ).addClass( "visible" ); }
export const hide					= id => { $( "#" + id ).removeClass( "visible" ).addClass( "hidden" ); }
export const showMessage			= message => {
	$("#"+ID_TOAST_OK+"Body").html( message );
	$("#"+ID_TOAST_OK).toast("show");
}
export const showError				= message => {
	$("#"+ID_TOAST_KO+"Body").html( message );
	$("#"+ID_TOAST_KO).toast("show");
}

export function printOutFetchResponse(prefix, data) {
	let PREFIX = prefix + "[RESPONSE=="+(data.ok?"OK":"ERROR")+" ("+data.status+")]";
	if (DEBUG) console.groupCollapsed(PREFIX);
	if (DEBUG) console.debug(PREFIX, "Received response:", prettyJson(data));

	let response = {};
	response.bodyUsed = data.bodyUsed;
	if (DEBUG) console.debug(PREFIX, "+ Response[bodyUsed]:", data.bodyUsed);
	response.ok = data.ok;
	if (DEBUG) console.debug(PREFIX, "+ Response[ok]:", data.ok);
	response.redirected = data.redirected;
	if (DEBUG) console.debug(PREFIX, "+ Response[redirected]:", data.redirected);
	response.status = data.status;
	if (DEBUG) console.debug(PREFIX, "+ Response[status]:", data.status);
	response.statusText = data.statusText;
	if (DEBUG) console.debug(PREFIX, "+ Response[statusText]:", data.statusText);
	response.type = data.type;
	if (DEBUG) console.debug(PREFIX, "+ Response[type]:", data.type);
	response.url = data.url;
	if (DEBUG) console.debug(PREFIX, "+ Response[url]:", data.url);
	response.headers = {};
	if (DEBUG) console.debug(PREFIX, "+ Response Headers:");
	for (var pair of data.headers.entries()) {
		response.headers[pair[0]] = pair[1];
		if (DEBUG) console.debug(PREFIX, "  + Header["+pair[0]+"]:", pair[1]);
	}
	if (DEBUG) console.groupEnd(PREFIX);
	return response;
}

export function renderHTMLElements(parsedSearch) {
	const PREFIX = `[${MODULE_NAME}:renderHTMLElements] `;
	if (DEBUG) console.groupCollapsed(PREFIX);

	// CSS Classes.
	$("#rootPanel").removeClass("hidden");
	$("#rootPanel").addClass("visible");

	// Retrieve the "code"...
	let iss = parsedSearch.get("iss");
	let state = parsedSearch.get("state");
	let code = parsedSearch.get("code");
	let error = parsedSearch.get("error");
	let errorDescription = parsedSearch.get("error_description");

	if (DEBUG) console.debug(PREFIX, "Updating HTML Elements:");
	if (DEBUG) console.debug(PREFIX, "+ iss:", iss);
	if (DEBUG) console.debug(PREFIX, "+ state:", state);
	if (DEBUG) console.debug(PREFIX, "+ code:", code);
	if (DEBUG) console.debug(PREFIX, "+ error:", error);
	if (DEBUG) console.debug(PREFIX, "+ errorDescription:", errorDescription);

	$("#iss").val(iss);
	$("#state").val(state);
	$("#code").val(code);
	$("#error").val(error);
	$("#errorDescription").val(errorDescription);

	/*
	 * Also:
	 * &error=access_denied&error_description=This+request+was+initiated+from+another+device
	 *
	 */

	if (DEBUG) console.groupEnd();
}

export function renderHTMLErrorElements(errorObject) {
	const PREFIX = `[${MODULE_NAME}:renderHTMLErrorElements] `;
	if (GROUP_DEBUG) console.groupCollapsed(PREFIX);
	if (DEBUG) console.debug(PREFIX, "Received:", errorObject);

	// CSS Classes.
	$(".container .center").removeClass("hidden");
	$(".container .center").addClass("visible");

	let error = null;
	let errorDescription = null;
	let isAnObject = ( typeof errorObject === 'object' && !Array.isArray(errorObject) && errorObject !== null );
	if (DEBUG) console.debug(PREFIX, "isAnObject:", isAnObject);
	if ( isAnObject ) {
		error = errorObject.error;
		errorDescription = errorObject.message;
	} else {
		error = "ERROR";
		errorDescription = errorObject;
	}

	if (DEBUG) console.debug(PREFIX, "Updating HTML Elements:");
	if (DEBUG) console.debug(PREFIX, "+ error:", error);
	if (DEBUG) console.debug(PREFIX, "+ errorDescription:", errorDescription);

	$("#error").val(error);
	$("#errorDescription").val(errorDescription);

	if (GROUP_DEBUG) console.groupEnd();
}

