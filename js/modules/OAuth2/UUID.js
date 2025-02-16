/**********************************************************
 * Module imports
 *
 * See: https://github.com/udelt/dpop_js_test/blob/main/modules/uuid.js
 **********************************************************/
// Common modules
import * as COMMON					from "../common.functions.js";
import CONFIGURATION				from "../../data/config.json" with { type: "json" };


/**********************************************************
 * Module Constants
 **********************************************************/
// Module SELF constants
const MODULE_NAME					= COMMON.getModuleName( import.meta.url );


/**********************************************************
 * Module Variables
 **********************************************************/


/**********************************************************
 * PRIVATE Functions
 **********************************************************/


/**********************************************************
 * PUBLIC Functions
 **********************************************************/
export async function generate() {
    function randomDigit() {
        if (crypto && crypto.getRandomValues) {
            var randomdata = new Uint8Array(1);
            crypto.getRandomValues(randomdata);
            return (randomdata[0] % 16).toString(16);
        } else {
            return ((Math.random() * 16) | 0).toString(16);
        }
    }

    var crypto = window.crypto || window.msCrypto;
    return 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, randomDigit);
}

export function generateRandomState() {
    if (self?.crypto?.randomUUID) {
		return self.crypto.randomUUID();
    } else {
        console.error("self.crypto not available");
    }
}

export function generateRandomCodeVerifier() {
    let randomData = new Uint32Array(28);
    window.crypto.getRandomValues(randomData);
    return Array.from(randomData, dec => ('0' + dec.toString(16)).substr(-2)).join('');
}
