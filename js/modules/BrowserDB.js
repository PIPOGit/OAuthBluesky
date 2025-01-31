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
// Common modules
import CONFIGURATION				from "../data/config.json" with { type: "json" };
// Common functions
import * as COMMON					from "./common.functions.js";
// Common Crypto functions
import * as Crypto					from "./OAuth2/Crypto.js";
// IDB functions
import { openDB, deleteDB }			from 'https://cdn.jsdelivr.net/npm/idb@8/+esm';


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

// Database variables
export const DB_NAME				= "BlueskyDB";
export const DB_VERSION				= 4;
export const DB_JWK_TABLENAME		= "JWK";


/**********************************************************
 * Module Variables
 **********************************************************/
let GROUP_DEBUG						= DEBUG && DEBUG_FOLDED;

// Database variables
let database						= null;

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

	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );
	if (DEBUG) console.debug( PREFIX + "Initializing the database:", DB_NAME );
	database							= await openDB(DB_NAME, DB_VERSION, {
		upgrade(db) {
			if (GROUP_DEBUG) console.groupCollapsed( PREFIX_UPGRADE );
			if (DEBUG) console.debug( PREFIX_UPGRADE + "Upgrading the database:", DB_NAME );
			db.createObjectStore(DB_JWK_TABLENAME);
			if (DEBUG) console.debug( PREFIX_BLOCKED + "-- END" );
			if (GROUP_DEBUG) console.groupEnd();
		},
		blocking(currentVersion, blockedVersion, event) {
			if (GROUP_DEBUG) console.groupCollapsed( PREFIX_BLOCKING );
			if (DEBUG) console.debug( PREFIX_BLOCKING + "BLOCKING the database:", DB_NAME );
			if (DEBUG) console.debug( PREFIX_BLOCKING + "+ currentVersion:", currentVersion );
			if (DEBUG) console.debug( PREFIX_BLOCKING + "+ blockedVersion:", blockedVersion );
			if (DEBUG) console.debug( PREFIX_BLOCKING + "+ received event:", event );
			if (DEBUG) console.debug( PREFIX_BLOCKING + "-- END" );
			if (GROUP_DEBUG) console.groupEnd();
		},
		blocked(currentVersion, blockedVersion, event) {
			if (GROUP_DEBUG) console.groupCollapsed( PREFIX_BLOCKED );
			if (DEBUG) console.debug( PREFIX_BLOCKED + "BLOCKED the database:", DB_NAME );
			if (DEBUG) console.debug( PREFIX_BLOCKED + "+ currentVersion:", currentVersion );
			if (DEBUG) console.debug( PREFIX_BLOCKED + "+ blockedVersion:", blockedVersion );
			if (DEBUG) console.debug( PREFIX_BLOCKED + "+ received event:", event );
			if (DEBUG) console.debug( PREFIX_BLOCKED + "-- END" );
			if (GROUP_DEBUG) console.groupEnd();
		},
		terminated() {
			if (GROUP_DEBUG) console.groupCollapsed( PREFIX_TERMINATED );
			if (DEBUG) console.debug( PREFIX_TERMINATED + "Database TERMINATED:", DB_NAME );
			if (DEBUG) console.debug( PREFIX_TERMINATED + "-- END" );
			if (GROUP_DEBUG) console.groupEnd();
		}
	}).then( database => {
		if (GROUP_DEBUG) console.groupCollapsed( PREFIX_THEN );
		if (DEBUG) console.debug( PREFIX_THEN + "Database opened:", DB_NAME );
		if (DEBUG) console.debug( PREFIX_THEN + "+ received database:", database );
		if (DEBUG) console.debug( PREFIX_THEN + "-- END" );
		if (GROUP_DEBUG) console.groupEnd();
		return database;
	}).catch( error => {
		if (GROUP_DEBUG) console.groupCollapsed( PREFIX_CATCH );
		if (DEBUG) console.debug( PREFIX_CATCH + "Error opening the database:", DB_NAME );
		if (DEBUG) console.debug( PREFIX_CATCH + "+ received error:", error );
		if (DEBUG) console.debug( PREFIX_CATCH + "-- END" );
		if (GROUP_DEBUG) console.groupEnd();
		return null;
	});
	if (DEBUG) console.debug( PREFIX + "Returning a database:", database );
	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
	return database;
}

export async function terminate() {
	const STEP_NAME						= "terminate";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_BLOCKED				= `${PREFIX}[BLOCKED] `;
	const PREFIX_THEN					= `${PREFIX}[THEN] `;
	const PREFIX_CATCH					= `${PREFIX}[CATCH] `;

	if (GROUP_DEBUG) console.groupCollapsed( PREFIX );
	if (DEBUG) console.debug( PREFIX + "Terminating the database:", DB_NAME );
	deleteDB(DB_NAME, {
		blocked(currentVersion, event) {
			if (GROUP_DEBUG) console.groupCollapsed( PREFIX_BLOCKED );
			if (DEBUG) console.debug( PREFIX_BLOCKED + "BLOCKED the database:", DB_NAME );
			if (DEBUG) console.debug( PREFIX_BLOCKED + "+ currentVersion:", currentVersion );
			if (DEBUG) console.debug( PREFIX_BLOCKED + "+ received event:", event );
			if (DEBUG) console.debug( PREFIX_BLOCKED + "-- END" );
			if (GROUP_DEBUG) console.groupEnd();
			/* Twice. */	if (GROUP_DEBUG) console.groupEnd();
		}
	});
	if (DEBUG) console.debug( PREFIX + "Returning a database:", database );
	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
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
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + `[KEY=${Crypto.JWK_DB_KEY}] [DB=${DB_NAME}] [TABLENAME=${DB_JWK_TABLENAME}]` );

	// If we come from LOGOUT, we must not create a new crypto key and/or store it in the database.
	if (comeFromLogout) {
		if (DEBUG) console.debug( PREFIX + `We come from logout.` );
		if (DEBUG) console.debug( PREFIX + "-- END" );
		if (GROUP_DEBUG) console.groupEnd();
		return;
	}

	// Inicializamos la conexión con IndexedDB
	if (DEBUG) console.debug( PREFIX + `Initializing the database...` );
	await connect();
	if (DEBUG) console.debug( PREFIX + `Initialized the database.` );

	if (DEBUG) console.debug( PREFIX + `Checking whether the Crypto Key exists in the database:`, Crypto.JWK_DB_KEY );
	let savedCryptoKey					= await get( Crypto.JWK_DB_KEY );
	
	if ( COMMON.isNullOrEmpty(savedCryptoKey) ) {
		if (DEBUG) console.debug( PREFIX + `The Crypto Key DOES NOT exists in the database. Create a new key and store it in the DB:` );

		// Create (received a cryptoKey and a jwk )
		let cryptKey					= await Crypto.generateCryptoKey();
		if (DEBUG) console.debug( PREFIX + `+ Got a crypto key:`, cryptKey );

		// Save
		savedCryptoKey					= await put( Crypto.JWK_DB_KEY, cryptKey );
		if (DEBUG) console.debug( PREFIX + `Stored the Crypto Key in the database:`, savedCryptoKey );

		// Check
		savedCryptoKey					= await get( Crypto.JWK_DB_KEY );
		if (DEBUG) console.debug( PREFIX + `+ Checked:`, savedCryptoKey );
	} else {
		if (DEBUG) console.debug( PREFIX + `The Crypto Key exists in the database:`, savedCryptoKey );
	}

	// Set values
	window.BSKY.data.cryptoKey			= savedCryptoKey.cryptoKey;
	window.BSKY.data.jwk				= savedCryptoKey.jwk;

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
}


export async function deleteDatabase() {
	const STEP_NAME						= "deleteDatabase";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_THEN					= `${PREFIX}[THEN] `;
	const PREFIX_CATCH					= `${PREFIX}[CATCH] `;
	if (GROUP_DEBUG) console.groupCollapsed( PREFIX + `[KEY=${Crypto.JWK_DB_KEY}] [DB=${DB_NAME}] [TABLENAME=${DB_JWK_TABLENAME}]` );

	// Delete values
	window.BSKY.data.cryptoKey			= null;
	window.BSKY.data.jwk				= null;

	// Delete the database
	let deletedDB						= await terminate().then( deleted => {
		if (GROUP_DEBUG) console.groupCollapsed( PREFIX_THEN );
		if (DEBUG) console.debug( PREFIX_THEN + "Database deleted:", DB_NAME );
		if (DEBUG) console.debug( PREFIX_THEN + "+ received deleted:", deleted );
		if (DEBUG) console.debug( PREFIX_THEN + "-- END" );
		if (GROUP_DEBUG) console.groupEnd();
		return deleted;
	}).catch( error => {
		if (GROUP_DEBUG) console.groupCollapsed( PREFIX_CATCH );
		if (DEBUG) console.debug( PREFIX_CATCH + "Error deleting the database:", DB_NAME );
		if (DEBUG) console.debug( PREFIX_CATCH + "+ received error:", error );
		if (DEBUG) console.debug( PREFIX_CATCH + "-- END" );
		if (GROUP_DEBUG) console.groupEnd();
		return null;
	});
	if (DEBUG) console.debug( PREFIX + `Removed the database[${DB_NAME}]:`, deletedDB );

	if (DEBUG) console.debug( PREFIX + "-- END" );
	if (GROUP_DEBUG) console.groupEnd();
}

