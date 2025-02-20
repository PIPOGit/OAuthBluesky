/**********************************************************
 * Module imports
 *
 **********************************************************/
// Global configuration
import CONFIGURATION					from "../data/config.json" with { type: "json" };
// Common functions
import * as COMMON						from "./common.functions.js";
// To perform API calls
import * as APICall						from "./APICall.js";


/**********************************************************
 * Module Constants
 **********************************************************/
// Module SELF constants
const MODULE_NAME						= COMMON.getModuleName( import.meta.url );

// Inner constants
const API								= CONFIGURATION.api;


/**********************************************************
 * Module Variables
 **********************************************************/


/**********************************************************
 * PRIVATE Functions
 **********************************************************/


/**********************************************************
 * PUBLIC Functions
 **********************************************************/

/* --------------------------------------------------------
 * Updates refresh times for refresh functions.
 * -------------------------------------------------------- */
export function fnUpdateCurrentRefreshTime( item ) {
	$( `#${item.id}Current` ).html( item.value );
}

/* --------------------------------------------------------
 * Updates logging options.
 * -------------------------------------------------------- */
export function fnUpdateDebug( form ) {
	const STEP_NAME						= "fnUpdateDebug";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.DEBUG) console.groupCollapsed( PREFIX );
	
	const inputs						= form.querySelectorAll( "input" );

	inputs.forEach( item => {
		switch( item.id ) {
			case "refreshStaticSeconds":
				window.BSKY.refreshStaticSeconds	= item.value;
				break;
			case "refreshDynamicSeconds":
				window.BSKY.refreshDynamicSeconds	= item.value;
				break;
			case "flexSwitchCheckDebug":
				window.BSKY.DEBUG					= item.checked;
				break;
			case "flexSwitchCheckGroupedDebug":
				window.BSKY.DEBUG_FOLDED			= item.checked;
				break;
		}
	});

	// Logging options
	// ---------------------------------------------------------
	window.BSKY.GROUP_DEBUG				= window.BSKY.DEBUG && window.BSKY.DEBUG_FOLDED;
	if (window.BSKY.DEBUG) console.debug( PREFIX + `+ DEBUG[${window.BSKY.DEBUG}]: [${window.BSKY.DEBUG}]` );
	if (window.BSKY.DEBUG) console.debug( PREFIX + `+ DEBUG_FOLDED[${window.BSKY.DEBUG_FOLDED}]: [${window.BSKY.DEBUG_FOLDED}]` );
	if (window.BSKY.DEBUG) console.debug( PREFIX + `+ GROUP_DEBUG[${window.BSKY.GROUP_DEBUG}]: [${window.BSKY.GROUP_DEBUG}]` );

	// Refresh time options
	// ---------------------------------------------------------
	if (window.BSKY.DEBUG) console.debug( PREFIX + `+ refreshStaticSeconds[${window.BSKY.refreshStaticSeconds}]: [${window.BSKY.refreshStaticSeconds}]` );
	if (window.BSKY.DEBUG) console.debug( PREFIX + `+ refreshDynamicSeconds[${window.BSKY.refreshDynamicSeconds}]: [${window.BSKY.refreshDynamicSeconds}]` );

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.DEBUG) console.groupEnd();
}

