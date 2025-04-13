/**********************************************************
 * Module imports
 **********************************************************/
// Global configuration
import CONFIGURATION					from "../../data/config.json" with { type: "json" };
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


/**********************************************************
 * Comparison functions
 **********************************************************/
export const isAfter					= ( date1, date2 ) => date1.getTime() > date2.getTime();
export const isBefore					= ( date1, date2 ) => date1.getTime() < date2.getTime();
export const getTypeOf					= option => typeof option;
export const areEquals					= (str1,str2) => ( str1.trim().toUpperCase().localeCompare( str2.trim().toUpperCase() ) == 0 );
export const isFunction					= obj => ( getTypeOf( obj ).trim().toUpperCase().localeCompare( 'FUNCTION' ) == 0 );
export const isEmpty					= str => (typeof str === "string" && str.length === 0);
export const isNull						= str => (str === null);
export const isUndefined				= str => (str === undefined);
export const isNullOrEmpty				= str => ( isUndefined(str) || isNull(str) || isEmpty(str) || ( Array.isArray( str ) && str.length===0 ) );


/**********************************************************
 * String functions
 **********************************************************/
export const removeTrailingSlash		= str => ( str.endsWith('/') ? str.slice(0, -1) : str );
// From: https://stackoverflow.com/questions/62449035/escape-all-unicode-non-ascii-characters-in-a-string-with-javascript
export const escapeUnicode				= str => [...str].map(c => /^[\x00-\x7F]$/.test(c) ? c : c.split("").map(a => "\\u" + a.charCodeAt().toString(16).padStart(4, "0")).join("")).join("");


/**********************************************************
 * DOM functions
 **********************************************************/
export const getById					= id => document.getElementById( id );
export const getByClassName				= x => document.getElementsByClassName(x);
export const getByTagName				= x => document.getElementsByTagName(x);
export const querySelector				= x => document.querySelector(x);


/**********************************************************
 * Filename functions
 **********************************************************/
export const getFileExtension			= filename => filename.split('.').pop();
export const getFileNameFromPath		= filename => filename.split( '/' ).pop();
export const getParentPathFromFilePath	= path => { const p = path.substring( 0, path.lastIndexOf( '/' ) ); return isNullOrEmpty( p ) ? "/" : p };


/**********************************************************
 * Browser's LocalStorage functions
 **********************************************************/
export const lsSave						= ( key, value ) => localStorage.setItem( key, value );
export const lsGet						= ( key ) => localStorage.getItem( key );


/**********************************************************
 * Formatting functions
 * See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat
 **********************************************************/
export const numberFormatter			= new Intl.NumberFormat( DEFAULT_LOCALE, {style: "decimal", MinimumIntegerDigits: 2});
export const currencyFormatter			= new Intl.NumberFormat( DEFAULT_LOCALE, {style: "currency", currency: "EUR", MinimumIntegerDigits: 6});
export const prettyJson					= obj => JSON.stringify( obj, null, "  " );
export const toJson						= obj => JSON.stringify( obj );


/**********************************************************
 * Date functions
 **********************************************************/
export const getDateForFile				= param => {
	const date							= new Date();
	let formattedDate					=  `${date.getFullYear()}.`;
	formattedDate						+= `${ ( "" + ( date.getMonth()   + 1 ) ).padStart( 2, "0" ) }.`;
	formattedDate						+= `${ ( "" + ( date.getDate()        ) ).padStart( 2, "0" ) } - `;
	formattedDate						+= `${ ( "" + ( date.getHours()       ) ).padStart( 2, "0" ) }.`;
	formattedDate						+= `${ ( "" + ( date.getMinutes()     ) ).padStart( 2, "0" ) }.`;
	formattedDate						+= `${ ( "" + ( date.getSeconds()     ) ).padStart( 2, "0" ) } - `;
	return formattedDate;
};


/**********************************************************
 * Object LOAD functions
 **********************************************************/
export async function loadJSONFile( file ) {
	try {
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


/**********************************************************
 * Bootstrap HTML functions
 **********************************************************/
export const disable					= id => { $( "#" + id ).addClass( "disabled" ); }
export const enable						= id => { $( "#" + id ).removeClass( "disabled" ); }
export const showHide					= id => { $( "#" + id ).toggleClass( "hidden" ); }
export const show						= id => { $( "#" + id ).removeClass( "hidden" ).addClass( "visible" ); }
export const hide						= id => { $( "#" + id ).removeClass( "visible" ).addClass( "hidden" ); }


/**********************************************************
 * Toast's functions
 **********************************************************/
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


/**********************************************************
 * Conversion functions
 **********************************************************/
export const decimalToHex				= dec => dec.toString(16);
export const hexToDecimal				= hex => parseInt(hex, 16);
// export const toHex						= buffer => { return Array.prototype.map.call(buffer, x => ('00' + x.toString(16)).slice(-2)).join(''); }
export const toHex						= buffer => Array.from(new Uint8Array(buffer)).map(byte => byte.toString(16).padStart(2, "0")).join("");


/**********************************************************
 * Network functions
 **********************************************************/
export const IPV4_PATTERN				= /^(\d{1,3}\.){3}\d{1,3}$/;
export const IPV6_PATTERN				= /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
export const checkIpAddressV4			= ip => IPV4_PATTERN.test(ip);
export const checkIpAddressV6			= ip => IPV6_PATTERN.test(ip);
export const checkIpAddress				= ip => checkIpAddressV4(ip) || checkIpAddressV6(ip);


/**********************************************************
 * Bluesky specific functions
 **********************************************************/
export const convertUrlToATUri			= ( url, key ) => {
	const tokens						= url.split("/");
	let uri								= `at://${tokens[4]}/${key}/${tokens[6]}`;
	return uri;
}
export const getRKeyFromURL				= ( url ) => isNullOrEmpty( url ) ? null : url.split("/")[4];
