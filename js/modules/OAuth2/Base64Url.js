/**********************************************************
 * Module imports
 *
 * See: https://github.com/udelt/dpop_js_test/blob/main/modules/Base64Url.js
 **********************************************************/
// Common modules
import * as COMMON					from "../common.functions.js";
import CONFIGURATION				from "../../data/config.json" with { type: "json" };


/**********************************************************
 * Module Constants
 **********************************************************/
// Module SELF constants
const MODULE_NAME					= COMMON.getModuleName( import.meta.url );
const MODULE_VERSION				= "1.0.0";
const MODULE_PREFIX					= `[${MODULE_NAME}]: `;


// Inner constants
const DEBUG							= CONFIGURATION.global.debug;
const DEBUG_FOLDED					= CONFIGURATION.global.debug_folded;


/**********************************************************
 * Module Variables
 **********************************************************/
let GROUP_DEBUG						= DEBUG && DEBUG_FOLDED;


/**********************************************************
 * PRIVATE Functions
 **********************************************************/


/**********************************************************
 * PUBLIC Functions
 **********************************************************/
export function ToBase64Url(input) {
    const base64string = btoa(String.fromCharCode.apply(0, input));
    return base64string.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export function Base64UrlToUint8Array(input) {
    input = input.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "");
    return new Uint8Array(
        Array.prototype.map.call(atob(input), (c) => c.charCodeAt(0))
    );
}

export function ToBase64UrlString(Base64String){
    return Base64String.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "")
}

export const utf8ToUint8Array = (str) => Base64UrlToUint8Array(btoa(unescape(encodeURIComponent(str))));

