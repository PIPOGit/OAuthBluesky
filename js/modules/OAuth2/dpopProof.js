/**********************************************************
 * Module imports
 *
 * See: https://github.com/udelt/dpop_js_test/blob/main/modules/dpopProof.js
 **********************************************************/
// Common modules
import * as COMMON					from "../common.functions.js";
import CONFIGURATION				from "../../data/config.json" with { type: "json" };
// For OAuth2 User Token retrieval / DPoP
import * as JWT         			from "./jwt.js";
import * as CryptoModule 			from "./crypto.js";
import * as uuid         			from './uuid.js';
import * as tokenClient  			from './tokenClient.js'


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
export async function createDPoPProof(atHash, jwk, key, resourceUrl, clientId, nonce, method="POST") {
	const PREFIX = `[${MODULE_NAME}:createDPoPProof] `;
	if (GROUP_DEBUG) console.groupCollapsed(PREFIX + "[Resource=="+resourceUrl+"]");
	if (DEBUG) console.debug(PREFIX, "atHash:", atHash);
	if (DEBUG) console.debug(PREFIX, "jwk:", COMMON.prettyJson(jwk));
	if (DEBUG) console.debug(PREFIX, "key:", COMMON.prettyJson(key));
	if (DEBUG) console.debug(PREFIX, "resourceUrl:", resourceUrl);
	if (DEBUG) console.debug(PREFIX, "clientId:", clientId);
	if (DEBUG) console.debug(PREFIX, "nonce:", nonce);
	if (DEBUG) console.debug(PREFIX, "method:", method);

	var dpopProof = {
        key: undefined,
        jwk: undefined,
        thumbprint: undefined
    };
    
    var dpop_proof_payload = {
        iss: clientId,	// Added
        jti: await uuid.generate(),
        htm: method,
        htu: resourceUrl,
        iat: Math.floor(Date.now() / 1000)
    };

	if (atHash)
        dpop_proof_payload["ath"] = atHash;
	if (nonce)
        dpop_proof_payload["nonce"] = nonce;
	if (DEBUG) console.debug(PREFIX, "dpop_proof_payload:", COMMON.prettyJson( dpop_proof_payload ));

    var header = {
        typ: "dpop+jwt",
        alg: "ES256",
        jwk: undefined
    };

    if (!key){
        key = await CryptoModule.generateKey();
    }
	if (DEBUG) console.debug(PREFIX, "key:", COMMON.prettyJson(key));

    if (!jwk){
        jwk = await CryptoModule.exportJwk(key.publicKey);
		if (DEBUG) console.debug(PREFIX, "jwk (original):", COMMON.prettyJson(jwk));
        delete jwk.ext;
        delete jwk.key_ops;
    }        
	if (DEBUG) console.debug(PREFIX, "jwk:", COMMON.prettyJson(jwk));

    header.jwk = jwk;
	if (DEBUG) console.debug(PREFIX, "header:", COMMON.prettyJson(header));
    var dpopProof = await JWT.create(key.privateKey, header, dpop_proof_payload);
	if (DEBUG) console.debug(PREFIX, "dpopProof:", dpopProof);
	if (DEBUG) console.debug(PREFIX, "dpopProof (pretty):", JWT.jwtToPrettyJSON( dpopProof ));

	if (GROUP_DEBUG) console.groupEnd();
    return { dpopProof: dpopProof, key: key, jwk: jwk };
}
