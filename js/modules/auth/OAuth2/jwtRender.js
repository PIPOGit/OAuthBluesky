/**********************************************************
 * Module imports
 *
 * See: https://github.com/udelt/dpop_js_test/blob/main/modules/uuid.js
 **********************************************************/
// Common modules
import * as COMMON					from "../CommonFunctions.js";
import CONFIGURATION				from "../../data/config.json" with { type: "json" };


/**********************************************************
 * Module Constants
 **********************************************************/


// Inner constants


/**********************************************************
 * Module Variables
 **********************************************************/


/**********************************************************
 * PRIVATE Functions
 **********************************************************/


/**********************************************************
 * PUBLIC Functions
 **********************************************************/
export function renderJwtPart(document, claims, parent){    
    
    parent.appendChild(createOpeningBracket(null, document));;
        
    for (var c in claims) {
        var claim_type = c;        
        var claim_value = claims[c];

        if (typeof(claim_value) == 'object' && claim_value!= null)
        {
            renderComplexTypeClaim(claim_type, claim_value, document, parent);            
        }
        else{
            renderSimpleTypeClaim(claim_type, claim_value, 1, parent, document);            
        }        
    }
    parent.appendChild(createClosingBracket("tabx1", document));
}

function renderComplexTypeClaim(claim_type, claim_value, document, parent){     
    
    parent.appendChild(createComplexClaimTypeStartNode(claim_type, document));    
     
    var claims = JSON.parse(JSON.stringify(claim_value));
     
     for (var claim in claims){                                        
        var last_claimValue = renderSimpleTypeClaim(claim, claims[claim], 2, parent, document);
     }
     last_claimValue.innerText = last_claimValue.innerText.slice(0, -1);

     parent.appendChild(createClosingBracket("tabx2", document));
}

function renderSimpleTypeClaim(type, value, indentationLevel, parent, document){
    var container = createClaimContainer(document, indentationLevel);
    var claimTypeNode = createClaimTypeNode(type, document);
    var claimValueNode = createClaimValueNode(value, document);

    if (type==="htm" || type==="htu" || type==="ath" || type==="jkt") {
        claimTypeNode.classList.add("notice_payload_claim");
        claimValueNode.classList.add("notice_payload_claim");
    }
    container.appendChild(claimTypeNode);
    container.appendChild(claimValueNode);
    parent.appendChild(container);
    return claimValueNode;
}

function createComplexClaimTypeStartNode(claim_type, document){
    var container = createClaimContainer(document, 1);

    var claim_type_node = createClaimTypeNode(claim_type, document);
    container.appendChild(claim_type_node);

    var claim_value = document.createElement("div");
    claim_value.classList.add("claim", "claim_value");
    claim_value.appendChild(document.createTextNode("{"));

    container.appendChild(claim_value);

    return container;
}

function createClosingBracket(cssClass, document){
    var closingBracket = document.createElement("div");
    closingBracket.appendChild(document.createTextNode("}"));
    closingBracket.classList.add(cssClass);
    return closingBracket;
}

function createOpeningBracket(cssClass, document){
    var closingBracket = document.createElement("div");
    closingBracket.appendChild(document.createTextNode("{"));
    closingBracket.classList.add(cssClass);
    return closingBracket;
}

function createClaimContainer(document, indentationLevel){
    var flex = document.createElement("div");
    var indentationCssClass = 0;

    switch(indentationLevel){
    case 1:
        indentationCssClass = "tabx1";
        break;
    case 2:
        indentationCssClass = "tabx2";
        break;
    default:
        indentationCssClass = "tabx1";
    }

    flex.classList.add(indentationCssClass, "code", "flex-container-code");
    return flex;
}

function createClaimTypeNode(value, document){
    var claim_type = document.createElement("div");
    claim_type.classList.add("claim", "claim_type");
    claim_type.appendChild(document.createTextNode(`"${value}": `));
    return claim_type;
}

function createClaimValueNode(value, document){
    var claim_value = document.createElement("div");
    claim_value.classList.add("claim", "claim_value");
    claim_value.appendChild(document.createTextNode(`"${value}",`));
    return claim_value;
}
