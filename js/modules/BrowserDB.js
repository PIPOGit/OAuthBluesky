/**********************************************************
 * Module imports
 *
 * IndexedDB HELPER FUNCTIONS
 *
 * See: https://es.javascript.info/indexeddb
 * See: https://github.com/jakearchibald/idb
 * See: [API] https://github.com/jakearchibald/idb/blob/main/src/entry.ts
 * See: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
 *
 **********************************************************/
// Global configuration
import CONFIGURATION					from "../data/config.json" with { type: "json" };
// Common functions
import * as COMMON						from "./common.functions.js";
// Common Crypto functions
import * as CRYPT						from "./OAuth2/Crypt.js";
// Common HTML functions
import * as HTML						from "./HTML.js";
// IDB functions
import { openDB, deleteDB }				from 'https://cdn.jsdelivr.net/npm/idb@8/+esm';


/**********************************************************
 * Module Constants
 **********************************************************/
// Module SELF constants
const MODULE_NAME						= COMMON.getModuleName( import.meta.url );

// Inner constants

// Database variables
export const DB_NAME					= "BlueskyDB";
export const DB_VERSION					= 4;
export const DB_JWK_TABLENAME			= "JWK";


/**********************************************************
 * Module Variables
 **********************************************************/

// Database variables
let database							= null;

// While using IDB

/**********************************************************
 * PRIVATE Functions
 **********************************************************/


/**********************************************************
 * PUBLIC Functions
 **********************************************************/
export async function connect() {
	const STEP_NAME						= "connect";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_BLOCKED				= `${PREFIX}[BLOCKED] `;
	const PREFIX_BLOCKING				= `${PREFIX}[BLOCKING] `;
	const PREFIX_TERMINATED				= `${PREFIX}[TERMINATED] `;
	const PREFIX_THEN					= `${PREFIX}[THEN] `;
	const PREFIX_UPGRADE				= `${PREFIX}[UPGRADE] `;
	const PREFIX_CATCH					= `${PREFIX}[CATCH] `;

	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Initializing the database:", DB_NAME );
	database							= await openDB(DB_NAME, DB_VERSION, {
		upgrade(db) {
			if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_UPGRADE );
			if (window.BSKY.DEBUG) console.debug( PREFIX_UPGRADE + "Upgrading the database:", DB_NAME );
			db.createObjectStore(DB_JWK_TABLENAME);
			if (window.BSKY.DEBUG) console.debug( PREFIX_BLOCKED + "-- END" );
			if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		},
		blocking(currentVersion, blockedVersion, event) {
			if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_BLOCKING );
			if (window.BSKY.DEBUG) console.debug( PREFIX_BLOCKING + "BLOCKING the database:", DB_NAME );
			if (window.BSKY.DEBUG) console.debug( PREFIX_BLOCKING + "+ currentVersion:", currentVersion );
			if (window.BSKY.DEBUG) console.debug( PREFIX_BLOCKING + "+ blockedVersion:", blockedVersion );
			if (window.BSKY.DEBUG) console.debug( PREFIX_BLOCKING + "+ received event:", event );
			if (window.BSKY.DEBUG) console.debug( PREFIX_BLOCKING + "-- END" );
			if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		},
		blocked(currentVersion, blockedVersion, event) {
			if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_BLOCKED );
			if (window.BSKY.DEBUG) console.debug( PREFIX_BLOCKED + "BLOCKED the database:", DB_NAME );
			if (window.BSKY.DEBUG) console.debug( PREFIX_BLOCKED + "+ currentVersion:", currentVersion );
			if (window.BSKY.DEBUG) console.debug( PREFIX_BLOCKED + "+ blockedVersion:", blockedVersion );
			if (window.BSKY.DEBUG) console.debug( PREFIX_BLOCKED + "+ received event:", event );
			if (window.BSKY.DEBUG) console.debug( PREFIX_BLOCKED + "-- END" );
			if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		},
		terminated() {
			if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_TERMINATED );
			if (window.BSKY.DEBUG) console.debug( PREFIX_TERMINATED + "DELETED Database:", DB_NAME );
			if (window.BSKY.DEBUG) console.debug( PREFIX_TERMINATED + "-- END" );
			if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		}
	}).then( database => {
		if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_THEN );
		if (window.BSKY.DEBUG) console.debug( PREFIX_THEN + "Database opened:", DB_NAME );
		if (window.BSKY.DEBUG) console.debug( PREFIX_THEN + "+ received database:", database );
		if (window.BSKY.DEBUG) console.debug( PREFIX_THEN + "-- END" );
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		return database;
	}).catch( error => {
		if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_CATCH );
		if (window.BSKY.DEBUG) console.debug( PREFIX_CATCH + "Error opening the database:", DB_NAME );
		if (window.BSKY.DEBUG) console.debug( PREFIX_CATCH + "+ received error:", error );
		if (window.BSKY.DEBUG) console.debug( PREFIX_CATCH + "-- END" );
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		return null;
	});
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Returning a database:", database );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return database;
}

export async function terminate() {
	const STEP_NAME						= "terminate";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_BLOCKED				= `${PREFIX}[BLOCKED] `;
	const PREFIX_THEN					= `${PREFIX}[THEN] `;
	const PREFIX_CATCH					= `${PREFIX}[CATCH] `;

	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Terminating the database:", DB_NAME );
	deleteDB(DB_NAME, {
		blocked(currentVersion, event) {
			if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_BLOCKED );
			if (window.BSKY.DEBUG) console.debug( PREFIX_BLOCKED + "BLOCKED the database:", DB_NAME );
			if (window.BSKY.DEBUG) console.debug( PREFIX_BLOCKED + "+ currentVersion:", currentVersion );
			if (window.BSKY.DEBUG) console.debug( PREFIX_BLOCKED + "+ received event:", event );
			if (window.BSKY.DEBUG) console.debug( PREFIX_BLOCKED + "-- END" );
			if (window.BSKY.GROUP_DEBUG) console.groupEnd();
			/* Twice. */	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		}
	});
	if (window.BSKY.DEBUG) console.debug( PREFIX + "Returning a database:", database );
	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return database;
}

export async function get(key)		{ return await database.get(DB_JWK_TABLENAME, key); }
export async function getKey(key)	{ return await database.getKey(DB_JWK_TABLENAME, key); }
export async function getAll(key)	{ return await database.getAll(DB_JWK_TABLENAME, key); }
export async function getAllKeys()	{ return await database.getAllKeys(DB_JWK_TABLENAME); }
export async function count()		{ return await database.count(DB_JWK_TABLENAME); }
export async function add(key, val)	{ return await database.add(DB_JWK_TABLENAME, val, key); }
export async function put(key, val)	{ return await database.put(DB_JWK_TABLENAME, val, key); }
export async function del(key)		{ return await database.delete(DB_JWK_TABLENAME, key); }


export async function checkCryptoKeyInDB(comeFromLogout=false) {
	const STEP_NAME						= "checkCryptoKeyInDB";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[KEY=${CRYPT.JWK_DB_KEY}] [DB=${DB_NAME}] [TABLENAME=${DB_JWK_TABLENAME}]` );

	// If we come from LOGOUT, we must not create a new crypto key and/or store it in the database.
	if (comeFromLogout) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `We come from logout.` );
		if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		return;
	}

	// Info step
	HTML.showStepInfo( STEP_NAME, `Checking Browser Database...` );

	// Inicializamos la conexión con IndexedDB
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Initializing the database...` );
	await connect();
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Initialized the database.` );

	if (window.BSKY.DEBUG) console.debug( PREFIX + `Checking whether the Crypto Key exists in the database:`, CRYPT.JWK_DB_KEY );
	let savedCryptoKey					= await get( CRYPT.JWK_DB_KEY );
	
	if ( COMMON.isNullOrEmpty(savedCryptoKey) ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `The Crypto Key DOES NOT exists in the database. Create a new key and store it in the DB:` );

		// Create (received a cryptoKey and a jwk )
		let cryptKey					= await CRYPT.generateCryptoKey();
		if (window.BSKY.DEBUG) console.debug( PREFIX + `+ Got a crypto key:`, cryptKey );

		// Save
		savedCryptoKey					= await put( CRYPT.JWK_DB_KEY, cryptKey );
		if (window.BSKY.DEBUG) console.debug( PREFIX + `Stored the Crypto Key in the database:`, savedCryptoKey );

		// Check
		savedCryptoKey					= await get( CRYPT.JWK_DB_KEY );
		if (window.BSKY.DEBUG) console.debug( PREFIX + `+ Checked:`, savedCryptoKey );
	} else {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `The Crypto Key exists in the database:`, savedCryptoKey );
	}

	// Set values
	window.BSKY.data.cryptoKey			= savedCryptoKey.cryptoKey;
	window.BSKY.data.jwk				= savedCryptoKey.jwk;

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


export async function deleteDatabase() {
	const STEP_NAME						= "deleteDatabase";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_THEN					= `${PREFIX}[THEN] `;
	const PREFIX_CATCH					= `${PREFIX}[CATCH] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[KEY=${CRYPT.JWK_DB_KEY}] [DB=${DB_NAME}] [TABLENAME=${DB_JWK_TABLENAME}]` );

	// Delete values
	window.BSKY.data.cryptoKey			= null;
	window.BSKY.data.jwk				= null;

	// Delete the database
	let deletedDB						= await terminate().then( deleted => {
		if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_THEN );
		if (window.BSKY.DEBUG) console.debug( PREFIX_THEN + "Database deleted:", DB_NAME );
		if (window.BSKY.DEBUG) console.debug( PREFIX_THEN + "+ received deleted:", deleted );
		if (window.BSKY.DEBUG) console.debug( PREFIX_THEN + "-- END" );
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		return deleted;
	}).catch( error => {
		if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_CATCH );
		if (window.BSKY.DEBUG) console.debug( PREFIX_CATCH + "Error deleting the database:", DB_NAME );
		if (window.BSKY.DEBUG) console.debug( PREFIX_CATCH + "+ received error:", error );
		if (window.BSKY.DEBUG) console.debug( PREFIX_CATCH + "-- END" );
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		return null;
	});
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Removed the database[${DB_NAME}]:`, deletedDB );

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}

