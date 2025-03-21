/**********************************************************
 * Module imports
 **********************************************************/
// Global configuration
import CONFIGURATION					from "../data/config.json" with { type: "json" };
// Common HTML Constants
import * as HTMLConstants				from "./HTML.Constants.js";


/**********************************************************
 * Common constants
 **********************************************************/
// Fancy CSS style for the DevTools console.
export const CONSOLE_STYLE				= 'background-color: darkblue; color: yellow; padding: 1px 4px; border: 1px solid hotpink; font-size: 1em;'
export const CONSOLE_LOCAL				= 'background-color: darkblue; color: yellow; padding: 1px 4px; border: 1px solid hotpink; font-size: 1em;'
// For Date/Time locale parsing.
export const DEFAULT_LOCALE				= 'es-ES';
export const DEFAULT_DATEFORMAT			= { DateStyle: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalseconddigits: 3 };


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
export const numberFormatter			= new Intl.NumberFormat( DEFAULT_LOCALE, {style: "currency", currency: "EUR", MinimumIntegerDigits: 6});
export const prettyJson					= obj => JSON.stringify( obj, null, "  " );
export const getDateForFile				= param => {
	const date							= new Date();
	let formattedDate					=  `${date.getFullYear()}-`;
	formattedDate						+= `${ ( "" + ( date.getMonth()   + 1 ) ).padStart( 2, "0" ) }-`;
	formattedDate						+= `${ ( "" + ( date.getDate()        ) ).padStart( 2, "0" ) } - `;
	formattedDate						+= `${ ( "" + ( date.getHours()       ) ).padStart( 2, "0" ) }.`;
	formattedDate						+= `${ ( "" + ( date.getMinutes()     ) ).padStart( 2, "0" ) }.`;
	formattedDate						+= `${ ( "" + ( date.getSeconds()     ) ).padStart( 2, "0" ) } - `;
	return formattedDate;
};

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
export const getById					= id => document.getElementById( id );

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
export const showInfo					= message => {
	// El toast.
	const jqID							= "#" + HTMLConstants.DIV_TOAST_INFO;
	const $toastBody					= $( jqID + " > .toast-body" );
	const toastOptions					= {"animation": true, "autohide": true, "delay": 2500};
	$toastBody.html( message );
	const jqBSToast						= new bootstrap.Toast( jqID, toastOptions );
	jqBSToast.show();
}
