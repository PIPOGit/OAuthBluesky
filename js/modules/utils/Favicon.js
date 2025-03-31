/**********************************************************
 * Module imports
 *
 **********************************************************/
/* --------------------------------------------------------
 * Modules with Base functions
 * -------------------------------------------------------- */
// Common functions
import * as COMMON						from "../common/CommonFunctions.js";


/**********************************************************
 * Module Constants
 **********************************************************/
// Module SELF constants
const MODULE_NAME						= COMMON.getModuleName( import.meta.url );

// Inner constants
const ID_FAVICON						= "favicon";
const OBJ_FAVICON						= COMMON.getById( ID_FAVICON );
const SRC_FAVICON_NORMAL				= "/images/BSKY Analyzer.Logo.png";
const SRC_FAVICON_WORKING				= "/images/BSKY Analyzer.Logo.Working.png";

// Inner constants functions
const changeSrc							= src => {
	const STEP_NAME						= "changeSrc";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	OBJ_FAVICON.setAttribute( "href", BSKY.path.root + src );
}

/**********************************************************
 * Module Variables
 **********************************************************/


/**********************************************************
 * PRIVATE Functions
 **********************************************************/


/**********************************************************
 * PUBLIC Functions
 **********************************************************/
export const toStandBy					= () => changeSrc( SRC_FAVICON_NORMAL );
export const toWorking					= () => changeSrc( SRC_FAVICON_WORKING );


