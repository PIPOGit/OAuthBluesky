/**********************************************************
 * Module imports
 **********************************************************/
// Global configuration
import CONFIGURATION					from "../data/config.json" with { type: "json" };


/**********************************************************
 * Common constants
 **********************************************************/
// Fancy CSS style for the DevTools console.
export const CONSOLE_STYLE				= 'background-color: darkblue; color: yellow; padding: 1px 4px; border: 1px solid hotpink; font-size: 1em;'


/**********************************************************
 * Common function
 **********************************************************/
export const getModuleName				= url => {
	// Otra manera
	// let re = /([\w\d_-]*)\.?[^\\\/]*$/i;
	// let fileNameWithoutExtension = url.match(re)[1];
	// console.debug( "[getModuleName] fileNameWithoutExtension", fileNameWithoutExtension );
	let withoutURL						= url.replace( /^.*[\\/]/, '' );
	let withoutExtension				= withoutURL.replace( /\.[^.]*$/, '' );
	return withoutExtension;
}


/**********************************************************
 * Module Constants
 **********************************************************/
// Module SELF constants
const MODULE_NAME						= getModuleName( import.meta.url );


// Inner constants
const LSKEYS							= CONFIGURATION.localStorageKeys;

// Toast IDs
const ID_TOAST_OK						= "myToastOK";
const ID_TOAST_KO						= "myToastKO";


/**********************************************************
 * Module Variables
 **********************************************************/

// Conversion objects.
export const localeDefault				= 'es-ES';
export const numberFormatter			= new Intl.NumberFormat( localeDefault, {style: "currency", currency: "EUR", MinimumIntegerDigits: 6});
export const dateFormatOptions			= { DateStyle: 'short', year: 'numeric', month: '2-digit', day: '2-digit' };
export const prettyJson					= obj => JSON.stringify( obj, null, "  " );

// Comparison functions
export const getTypeOf					= option => typeof option;
export const areEquals					= (str1,str2) => ( str1.trim().toUpperCase().localeCompare( str2.trim().toUpperCase() ) == 0 );
export const isFunction					= obj => ( getTypeOf( obj ).trim().toUpperCase().localeCompare( 'FUNCTION' ) == 0 );
export const isEmpty					= str => (typeof str === "string" && str.length === 0);
export const isNull						= str => (str === null);
export const isUndefined				= str => (str === undefined);
export const isNullOrEmpty				= str => ( isUndefined(str) || isNull(str) || isEmpty(str) || ( Array.isArray( str ) && str.length===0 ) );

// String functions
export const removeTrailingSlash		= str => ( str.endsWith('/') ? str.slice(0, -1) : str );

// Filename functions
export const getFileExtension			= filename => filename.split('.').pop();
export const getFileNameFromPath		= filename => filename.split( '/' ).pop();
export const fnGetById					= id => document.getElementById( id );

// LocalStorage
export const lsSave						= ( key, value ) => localStorage.setItem( key, value );
export const lsGet						= ( key ) => localStorage.getItem( key );

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
		const response					= await fetch( file );
		if ( !response.ok ) {
			throw new Error( `File[${file}] not found. HTTP error[${response.status}]: ${response.statusText}` );
		}
		const data						= await response.json();
		return data;
	} catch (error) {
		console.error(`Could not get JSON file[${file}]: ${error}`);
		return null;
	}
}

export async function loadBLOBFile( file ) {
	try {
		const response					= await fetch( file );
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
export const showHide					= id => { $( "#" + id ).toggleClass( "hidden" ); }
export const show						= id => { $( "#" + id ).removeClass( "hidden" ).addClass( "visible" ); }
export const hide						= id => { $( "#" + id ).removeClass( "visible" ).addClass( "hidden" ); }
export const showMessage				= message => {
	$("#"+ID_TOAST_OK+"Body").html( message );
	$("#"+ID_TOAST_OK).toast("show");
}
export const showError					= message => {
	$("#"+ID_TOAST_KO+"Body").html( message );
	$("#"+ID_TOAST_KO).toast("show");
}

export function renderHTMLElements(parsedSearch) {
	const STEP_NAME						= "renderHTMLElements";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.DEBUG) console.groupCollapsed(PREFIX);

	// CSS Classes.
	$("#rootPanel").removeClass("hidden");
	$("#rootPanel").addClass("visible");

	// Retrieve the "code"...
	let iss								= parsedSearch.get("iss");
	let state							= parsedSearch.get("state");
	let code							= parsedSearch.get("code");
	let error							= parsedSearch.get("error");
	let errorDescription				= parsedSearch.get("error_description");

	if (window.BSKY.DEBUG) console.debug(PREFIX + "Updating HTML Elements:");
	if (window.BSKY.DEBUG) console.debug(PREFIX + "+ iss:", iss);
	if (window.BSKY.DEBUG) console.debug(PREFIX + "+ state:", state);
	if (window.BSKY.DEBUG) console.debug(PREFIX + "+ code:", code);
	if (window.BSKY.DEBUG) console.debug(PREFIX + "+ error:", error);
	if (window.BSKY.DEBUG) console.debug(PREFIX + "+ errorDescription:", errorDescription);

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

	if (window.BSKY.DEBUG) console.groupEnd();
}

export function renderHTMLErrorElements(errorObject) {
	const STEP_NAME						= "renderHTMLErrorElements";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed(PREFIX);
	if (window.BSKY.DEBUG) console.debug(PREFIX + "Received:", errorObject);

	// CSS Classes.
	$(".container .center").removeClass("hidden");
	$(".container .center").addClass("visible");

	let error							= null;
	let errorDescription				= null;
	let isAnObject						= ( typeof errorObject === 'object' && !Array.isArray(errorObject) && errorObject !== null );
	if (window.BSKY.DEBUG) console.debug(PREFIX + "isAnObject:", isAnObject);
	if ( isAnObject ) {
		error							= errorObject.error;
		errorDescription				= errorObject.message;
	} else {
		error							= "ERROR";
		errorDescription				= errorObject;
	}

	if (window.BSKY.DEBUG) console.debug(PREFIX + "Updating HTML Elements:");
	if (window.BSKY.DEBUG) console.debug(PREFIX + "+ error:", error);
	if (window.BSKY.DEBUG) console.debug(PREFIX + "+ errorDescription:", errorDescription);

	$("#error").val(error);
	$("#errorDescription").val(errorDescription);

	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}

