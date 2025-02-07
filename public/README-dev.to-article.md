
Bluesky OAuth2 Client, with Vanilla JavaScript
===================================================

## Bluesky OAuth2 Client, with Vanilla JavaScript

Hi, there! ;^)

### Introduction
This post talks about integrating **Bluesky Authentication** (***OAuth** + **DPoP***) in a "*serverless*" client application, ruled with only "*Vanilla JavaScript*".
Fine for You? Ok... Let's go!

### DISCLAIMER
This post is merely to illustrate "*how-to*". It's not a "*working example*"; mainly 'cause the tokens expire! ;^)

If you see any error, please don't doubt on contacting me.


## Our application

### The "OAuth" word
Let's say we want to develop a serverless application, open to whoever who wants to access, **BUT** we need the users to authenticate themselves to gain access to it.

One option is to request the incoming user to auto-register within the application directly (*create an account and generate a "credential"; usually*), a combination of a login with a password for that account. But, another way to authenticate themself is to "***trust***" a third-party authority.

Just like [**Google**](https://developers.google.com/identity/protocols/oauth2) does, in this case [**Bluesky**](https://docs.bsky.app/blog/oauth-atproto) also provides a way for bluesky users to authenticate where it's needed.

This is driven by the [**`OAuth2 Protocol`**](https://auth0.com/intro-to-iam/what-is-oauth-2).

More info about how **OAuth** works within **Bluesky** can be found here: [**OAuth - AT Protocol**](https://atproto.com/specs/oauth).

### The Client Metadata... What's that?
In order that our brand new web application (*let's suppose it's a Javascript-based application*) can use this authentication mechanism from **Bluesky**, the Bluesky Authentication Services/Servers **MUST** recognize our application. How can we do it?
Easy! Generating a [**"*Client Metadata*" file**](https://docs.bsky.app/docs/advanced-guides/oauth-client), which will hold all the information that the Bluesky Authentication Services/Servers need to provide the app the information about the user.

With this file, as stated above in the "OAuth Protocol" page, "***Automated client registration using client metadata***" approach is followed. This means that there will be no need to "*register*" our brand-new application in any Authentication Server; it is enough to create a "*metadata*" file to automatically be a "**Bluesky OAuth Client**".

So in order for this to work, the only thing we need in our system is a "**`client-metadata.json`**" file, and make it accesible under the **`https://`** protocol.

> **NOTE**: We can name the file with any name we want; even more, we can place it anywhere; it's just a descriptor.

So then, we must create a [**`JSON`**](https://es.wikipedia.org/wiki/JSON) file that the Bluesky authentication servers will query to identify our application; for them, our applications will be a "*Client Application*" described by that JSON file.

The "*metadata file*", for our "*client application*", **MUST** be accesible from anywhere in the internet.

> **NOTE**: As an **example**, we've deployed a file in this url: https://madrilenyer.neocities.org/bsky/oauth/client-metadata.json. If you click in that link, you will see the contents of it; directly.

So, to show an example, and following the Bluesky guidelines [here](https://github.com/bluesky-social/proposals/blob/main/0004-oauth/README.md#client-metadata) and [here](https://atproto.com/specs/oauth#clients), we've set up a "*metadata file*" that looks like this:

[client-metadata.json](https://madrilenyer.neocities.org/bsky/oauth/client-metadata.json):
```json
{
  "client_id":"https://madrilenyer.neocities.org/bsky/oauth/client-metadata.json",
  "application_type":"web",
  "grant_types":[
    "authorization_code",
    "refresh_token"
  ],
  "scope":"atproto transition:generic transition:chat.bsky",
  "response_types":[
    "code id_token",
    "code"
  ],
  "redirect_uris":[
    "https://madrilenyer.neocities.org/bsky/oauth/callback/"
  ],
  "dpop_bound_access_tokens":true,
  "token_endpoint_auth_method":"none",
  "client_name":"Madrilenyer Example Browser App",
  "client_uri":"https://madrilenyer.neocities.org/bsky/"
}
```

This **JSON** file "*describes*" an application that "*wants to be identified as a Bluesky OAuth 'Client Application'*".

Now, we're ready to request from the users an authentication against **Bluesky**.

### Let's use... A programming language
The problem here is that there are several implementations of "*how-to-do*" this integration **BUT** with modern frameworks. The guys from [**`@atproto.com`**](https://bsky.app/profile/atproto.com) have implemented a wonderful pack in [**TypeScript**](https://www.typescriptlang.org/) and some guys has some solutions with [**NodeJS**](https://nodejs.org/).

But, personally, I prefer "*Vanilla Javascript*", first, just to understand the basics on the mechanism; just to learn it, before start using a "*library*" that hides almost all. The problem is that there is **NOTHING** out there...

So this is the reason why I'm writing this post.


## The basics: The context

Ok; so here we are.
We are trying to tell an incoming user to identify himself to access our application.
And we offer him to "*Sign-In with Bluesky*", but... What do we **really** need?
What is the minimum data from the user that we need to perform a validation process with an authenticated user?

### The user's Handle
First of all, we need a "**handle**".
The only thing we need **from the user** is his **handle**.

> **NOTE**: A "Bluesky Handle" is all that text following your "Bluesky Profile URL"; the characters after: "**`https://bsky.app/profile/_______________________`**".

This is our "**Bluesky *handle***", our "**Bluesky *account***"; for instance, mine is: [**`madrilenyer.bsky.social`**](https://bsky.app/profile/madrilenyer.bsky.social).

> **NOTE**: [Jay (*Bluesky CEO*)](https://bsky.app/profile/jay.bsky.team) wrote time ago a [post about this](https://bsky.social/about/blog/3-6-2023-domain-names-as-handles-in-bluesky). If you need, you can dive into the [Bluesky Docs](https://docs.bsky.app/) for more information about handles, PDS's, accounts, AT Protocol...

### The user's DID
So, once we know the user's "**handle**", the first step is to retrieve the user's **`did`**: The user's "*Decentralized ID*".

> **NOTE**: What the hell is a "*DID*" and how does it looks like? Well... [**Click here**](https://ilo.so/bluesky-did/) or [**here**](https://www.w3.org/TR/did-core/)

To gather user's "*did*", we will should call an API (*using Javascript, as I said*): [Retrieve DID](https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=madrilenyer.bsky.social)
Just, open this link in a browser and wait.

If you look at the URL, you'll see something like: [https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=**madrilenyer.bsky.social**].
This means that, calling this URL but changing the "*handle*", you will receive the "*did*" of the corresponding "*handle*".

> **NOTE**: Wanna try yours? ;^)

So, this call will show us our **`did`**:
```json
{
  "did": "did:plc:tjc27aje4uwxtw5ab6wwm4km"
}
```

> **NOTE**: This did is for the Bluesky handle: [`madrilenyer.bsky.social`]

```javascript
	// ------------------------------------------
	//   Javascript
	// ------------------------------------------
	const USER_HANDLE = "madrilenyer.bsky.social";
	const APP_CLIENT_ID = "https://madrilenyer.neocities.org/bsky/oauth/client-metadata.json";
	const APP_CALLBACK_URL = "https://madrilenyer.neocities.org/bsky/oauth/callback/";

	let userDid = null;

	let url = "https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=" + USER_HANDLE;
	fetch( url ).then( response => {
		// Process the HTTP Response
		return response.json();
	}).then( data => {
		// Process the HTTP Response Body
		// Here, we gather the "did" item in the received json.
		userDid = data.did;
	});
```


### The user's DID Document
Once with the **`did`**, and with the help of the **`PLC API`**, our next step is to retrieve the [**`user/handle's DID Document`**](https://plc.directory/did:plc:tjc27aje4uwxtw5ab6wwm4km).
We do this calling a specific API EndPoint (`https://plc.directory/`) followed with the user's **did** ("*did:plc:tjc27aje4uwxtw5ab6wwm4km*"); not the user's **handle** ("*madrilenyer.bsky.social*").

> **NOTE**: General information about DID, PLC's and so on, can be achieved [here](https://docs.bsky.app/docs/advanced-guides/atproto). Detailed info about the **`DID PLC`** [here](https://github.com/did-method-plc/did-method-plc)
> **NOTE**: This also can help: [did:plc Directory Server API (0.1)](https://web.plc.directory/api/redoc)

So, upon calling that URL, our **`DID Document`** (*generated -or stored- by Bluesky*) is something like this (*JSON File Format*):

```json
{
  "@context": [
    "https://www.w3.org/ns/did/v1",
    "https://w3id.org/security/multikey/v1",
    "https://w3id.org/security/suites/secp256k1-2019/v1"
  ],
  "id": "did:plc:tjc27aje4uwxtw5ab6wwm4km",
  "alsoKnownAs": [
    "at://madrilenyer.bsky.social"
  ],
  "verificationMethod": [
    {
      "id": "did:plc:tjc27aje4uwxtw5ab6wwm4km#atproto",
      "type": "Multikey",
      "controller": "did:plc:tjc27aje4uwxtw5ab6wwm4km",
      "publicKeyMultibase": "zQ3shQzL5vznqAdHiD6wvKRfH5xEaDXWpP3JTGQYAfhQo6Dz5"
    }
  ],
  "service": [
    {
      "id": "#atproto_pds",
      "type": "AtprotoPersonalDataServer",
      "serviceEndpoint": "https://velvetfoot.us-east.host.bsky.network"
    }
  ]
}
```

Coding it in Vanilla JavaScript:

```javascript
	// ------------------------------------------
	//   Javascript
	// ------------------------------------------
	let userDidDocument = null;
	let userPDSURL = null;

	let url = "https://plc.directory/" + USER_HANDLE;
	fetch( url ).then( response => {
		// Process the HTTP Response
		return response.json();
	}).then( data => {
		// Process the HTTP Response Body
		userDidDocument = data;
		userPDSURL = userDidDocument.service[0].serviceEndpoint;
	});
```


### The PDS URL
As you may notice in that response, within the "*DID Document*" there is a special key under: **`<did_document>.service.serviceEndpoint`**, which points to an URL: **`https://velvetfoot.us-east.host.bsky.network`**

This is the URL of our [**PDS Server**](https://velvetfoot.us-east.host.bsky.network).

> **NOTE**: Again... What the hell is a "PDS Server"? Well... Click [**here**](https://docs.bsky.app/docs/advanced-guides/entryway). For those using [**Mastodon**](https://joinmastodon.org/) is just like an "*instance*".

If you open that URL in the browser (*the URL of the PDS Server; again, publicly accesible*), the only thing you see should be something like this:

    This is an AT Protocol Personal Data Server (PDS): https://github.com/bluesky-social/atproto
    
    Most API routes are under /xrpc/

So... This means that, whenever we need to request something to our **PDS Server**, we must build an URL starting with something like:

    https://velvetfoot.us-east.host.bsky.network/xrpc/[whatever_follows]


### The PDS Metadata
Another thing to retrieve is the [**PDS Server Metadata**](https://velvetfoot.us-east.host.bsky.network/.well-known/oauth-protected-resource). This is basic information that the server exposes to anyone, and is accesible at this URL: `https://velvetfoot.us-east.host.bsky.network/.well-known/oauth-protected-resource`.

The response is something like this:
```json
{
  "resource": "https://velvetfoot.us-east.host.bsky.network",
  "authorization_servers": [
    "https://bsky.social"
  ],
  "scopes_supported": [],
  "bearer_methods_supported": [
    "header"
  ],
  "resource_documentation": "https://atproto.com"
}
```

> **NOTE**: Changing the "*hostname*" part of the URL (*`https://velvetfoot.us-east.host.bsky.network`*) by another PDS Server host direction, will produce similar results.

Just like before, in this JSON there is also a special entry under: **`<pds_metadata>.authorization_servers`**, normally with only one entry (*in JSON format, it's an array*) and, in this case, this entry represents the **Authorization Server** this PDS uses; in this case, our PDS is pointing to [**this Authorization Server**](https://bsky.social): **`https://bsky.social`**.

This URL, the one of the **Authorization Server**, is needed because **ANY** **protected** request to our PDS Server, protected with OAuth2, will need an **user token**, that can only be obtained **FROM** the Authorization Server once we are authenticated against it.

This means that, first of all, we have to identify ourselves against that Authentication/Authorization Server in order to allow that third-party app to retrieve our "*user token*" to perform *whatever action* the user wants.

So, let's take a look to the "Authentication/Authorization Server Metadata", if any.

```javascript
	// ------------------------------------------
	//   Javascript
	// ------------------------------------------
	let userPDSMetadata = null;
	let userAuthServerURL = null;

	let url = userPDSURL + "/.well-known/oauth-protected-resource";
	fetch( url ).then( response => {
		// Process the HTTP Response
		return response.json();
	}).then( data => {
		// Process the HTTP Response Body
		userPDSMetadata = data;
		userAuthServerURL = userPDSMetadata.authorization_servers[0];
	});
```


### The Authorization Server Discovery
The next step is to gather the metadata of the Authorization Server. This is also part of the OAuth2 protocol (*known as: "Discovery"*) and, in this case, can be accessed with: https://bsky.social/.well-known/oauth-authorization-server

Once again, is publicly accesible, so if we click on that URL, we will receive this information; the "*Discovery*" information for our Authorization Server:

```json
{
  "issuer":"https://bsky.social",
  "scopes_supported":[
    "atproto",
    "transition:generic",
    "transition:chat.bsky"
  ],
  "subject_types_supported":[
    "public"
  ],
  "response_types_supported":[
    "code"
  ],
  "response_modes_supported":[
    "query",
    "fragment",
    "form_post"
  ],
  "grant_types_supported":[
    "authorization_code",
    "refresh_token"
  ],
  "code_challenge_methods_supported":[
    "S256"
  ],
  "ui_locales_supported":[
    "en-US"
  ],
  "display_values_supported":[
    "page",
    "popup",
    "touch"
  ],
  "authorization_response_iss_parameter_supported":true,
  "request_object_signing_alg_values_supported":[
    "RS256",
    "RS384",
    "RS512",
    "PS256",
    "PS384",
    "PS512",
    "ES256",
    "ES256K",
    "ES384",
    "ES512",
    "none"
  ],
  "request_object_encryption_alg_values_supported":[
    
  ],
  "request_object_encryption_enc_values_supported":[
    
  ],
  "request_parameter_supported":true,
  "request_uri_parameter_supported":true,
  "require_request_uri_registration":true,
  "jwks_uri":"https://bsky.social/oauth/jwks",
  "authorization_endpoint":"https://bsky.social/oauth/authorize",
  "token_endpoint":"https://bsky.social/oauth/token",
  "token_endpoint_auth_methods_supported":[
    "none",
    "private_key_jwt"
  ],
  "token_endpoint_auth_signing_alg_values_supported":[
    "RS256",
    "RS384",
    "RS512",
    "PS256",
    "PS384",
    "PS512",
    "ES256",
    "ES256K",
    "ES384",
    "ES512"
  ],
  "revocation_endpoint":"https://bsky.social/oauth/revoke",
  "introspection_endpoint":"https://bsky.social/oauth/introspect",
  "pushed_authorization_request_endpoint":"https://bsky.social/oauth/par",
  "require_pushed_authorization_requests":true,
  "dpop_signing_alg_values_supported":[
    "RS256",
    "RS384",
    "RS512",
    "PS256",
    "PS384",
    "PS512",
    "ES256",
    "ES256K",
    "ES384",
    "ES512"
  ],
  "client_id_metadata_document_supported":true
}
```


There are some entries here to use to retrieve our "*user token*"... Let's begin:

+ **`authorization_endpoint`**: We will need this URL to request authorization to access to the user's token.
  In this case, this entry is: [https://bsky.social/oauth/authorize](https://bsky.social/oauth/authorize)
+ **`token_endpoint`**: This is the URL to request the user's access token
  In this case, this entry is: [https://bsky.social/oauth/token](https://bsky.social/oauth/token)
+ **`pushed_authorization_request_endpoint`** (*PAR EndPoint*): A "*preRequirement*". All calls to the Authorization Server, trying to obtain an user's token, must be validated, as per [**RFC 9126**](https://datatracker.ietf.org/doc/html/rfc9126#name-authorization-server-metada)
  In this case, this entry is: [https://bsky.social/oauth/par](https://bsky.social/oauth/par)

And here ends the "*public accessible*" steps for authenticate users against our application.
From now on, we must continue with the development of the JavaScript application; 'cause other "*types of requests*" are needed, not as easy as "*click here*".

```javascript
	// ------------------------------------------
	//   Javascript
	// ------------------------------------------
	let userAuthServerDiscovery = null;
	let userAuthorizationEndPoint = null;
	let userTokenEndPoint = null;
	let userPAREndPoint = null;

	let url = userAuthServerURL + "/.well-known/oauth-authorization-server";
	fetch( url ).then( response => {
		// Process the HTTP Response
		return response.json();
	}).then( data => {
		// Process the HTTP Response Body
		userAuthServerDiscovery   = data;
		userAuthorizationEndPoint = userAuthServerDiscovery.authorization_endpoint;
		userTokenEndPoint         = userAuthServerDiscovery.token_endpoint;
		userPAREndPoint           = userAuthServerDiscovery.pushed_authorization_request_endpoint;
	});
```


## Authentication

As a help, Bluesky has [an entry](https://github.com/bluesky-social/proposals/blob/main/0004-oauth/README.md#authorization-flow-from-a-serverless-browser-app) explaining "*how-to*" perform all these steps... except the last one. We'll see later.


### PAR Request
Once in this point, we must request the **`PAR Authorization`**; this can be done using **`PKCE`**.

Recap: In order to retrieve the user's token, we must:
1. Call the "`token_endpoint`".
2. But, prior to it, we need to get an authorization, calling the "`authorization_endpoint`".
3. And also, before above steps, we need to tell the server we are going to perform those operations, by using the "**`pushed_authorization_request_endpoint`**", the **PAR EndPoint**.

> **NOTE**: The **OAuth 2.0 Pushed Authorization Requests** specification is [here](https://datatracker.ietf.org/doc/html/rfc9126)

Back to our Javascript area, we will need to generate three things:
+ **state**: First, we need a "state"; a string with `28` random characters.
  For our purposes, this value should be: **`2e94cf77e8b0ba2209dc6dcb90018c8d044ac31cb526fc4823278585`**
+ **code_verifier**: Later, a "`code_verifier`" is needed; just like before.
  For our purposes, this value should be: **`46148ae0fd74b698a5f78efc44a8f76f1fd778602b14b46a2318a814`**
+ **code_challenge**: Finally, from the "`code_verifier`" we need to generate a "**`code_challenge`**".
  Basically, this: `base64urlencode( sha256( code_verifier ) );`
  For our purposes, this value should be: **`URQ-2arwHpJzNwcFPng-_IE3gRGGBN0SVoFMN7wEiWI`**

> **NOTE**: We'll need more parameters, but all of them are well known, at this point:
>           + Some static constants (*code_challenge_method, scope*)
>           + Some data from our `client-metadata.json` file (*client_id, redirect_uri, login_hint*)
>           + and some of the just generated data (*code_challenge, state*)

Now, with all that information, we prepare a **`POST`** request against the URL indicated in the `pushed_authorization_request_endpoint` key (*in this case: `https://bsky.social/oauth/par`*), with these `content-type`: **`application/x-www-form-urlencoded`**, and this "*body*":

```text
response_type=code&code_challenge_method=S256&scope=atproto+transition%3Ageneric&client_id=https%3A%2F%2Fmadrilenyer.neocities.org%2Fbsky%2Foauth%2Fclient-metadata.json&redirect_uri=https%3A%2F%2Fmadrilenyer.neocities.org%2Fbsky%2Foauth%2Fcallback%2F&code_challenge=URQ-2arwHpJzNwcFPng-_IE3gRGGBN0SVoFMN7wEiWI&state=2e94cf77e8b0ba2209dc6dcb90018c8d044ac31cb526fc4823278585&login_hint=madrilenyer.bsky.social
```

Splitted:
```text
  response_type=code
    &code_challenge_method=S256
    &scope=atproto+transition%3Ageneric
    &client_id=https%3A%2F%2Fmadrilenyer.neocities.org%2Fbsky%2Foauth%2Fclient-metadata.json
    &redirect_uri=https%3A%2F%2Fmadrilenyer.neocities.org%2Fbsky%2Foauth%2Fcallback%2F
    &code_challenge=URQ-2arwHpJzNwcFPng-_IE3gRGGBN0SVoFMN7wEiWI
    &state=2e94cf77e8b0ba2209dc6dcb90018c8d044ac31cb526fc4823278585
    &login_hint=madrilenyer.bsky.social
```

Note that we send the **`state`** and the **`code_challenge`**; not the **`code_challenge`**; we will use this last value to check things later.

This is a sample of the response (***`201 (Created)`***):
```json
{
  "request_uri": "urn:ietf:params:oauth:request_uri:req-df74117722b7f1e7d807d4244a8dae0a",
  "expires_in": 299
}
```

We need the `request_uri` item for the next step.
And also, in the headers of the response, we can find out the: [**`DPoP-Nonce`**] header; known as "***the nonce***". We will need its value later.

```javascript
	// ------------------------------------------
	//   Javascript
	// ------------------------------------------
	let dpopNonce = null;
	let userAuthServerRequestURI = null;

	// The AuthServer Discovery Information
	// ------------------------------------------
	let url = userAuthServerURL + "/.well-known/oauth-authorization-server";
	fetch( url ).then( response => {
		// Process the HTTP Response
		return response.json();
	}).then( data => {
		// Process the HTTP Response Body
		userAuthServerDiscovery   = data;
		userAuthorizationEndPoint = userAuthServerDiscovery.authorization_endpoint;
		userTokenEndPoint         = userAuthServerDiscovery.token_endpoint;
		userPAREndPoint           = userAuthServerDiscovery.pushed_authorization_request_endpoint;
	});

	// The state
	// ------------------------------------------
    let stateArray = new Uint32Array(28);
    window.crypto.getRandomValues(stateArray);
	let state = Array.from(stateArray, dec => ('0' + dec.toString(16)).substr(-2)).join('');

	// The code verifier
	// ------------------------------------------
    let codeVerifierArray = new Uint32Array(28);
    window.crypto.getRandomValues(codeVerifierArray);
	let codeVerifier = Array.from(codeVerifierArray, dec => ('0' + dec.toString(16)).substr(-2)).join('');

	// The code verifier challenge
	// ------------------------------------------
    let hashedCodeVerifier = await sha256(codeVerifier);
    let codeChallenge = base64urlencode(hashedCodeVerifier);

	// Build up the URL.
	// Just, to make it simple! I know there are better ways to do this, BUT...
	// ------------------------------------------
	let url = userPAREndPoint;
	let body = "response_type=code";
	body += "&code_challenge_method=S256";
	body += "&scope=" + encodeURIComponent( "atproto transition:generic" );	// MUST match the scopes in the client-metadata.json
	body += "&client_id=" + encodeURIComponent( APP_CLIENT_ID );
	body += "&redirect_uri=" + encodeURIComponent( APP_CALLBACK_URL );
	body += "&code_challenge=" + codeChallenge;
	body += "&state=" + state;
	body += "login_hint=" + USER_HANDLE;

	// TuneUp and perform the call
	// ------------------------------------------
	let fetchOptions = {
		method: 'POST',
		headers: {
			'Content-Type': "application/x-www-form-urlencoded"
		},
		body: body
	}
	fetch( url, fetchOptions ).then( response => {
		// Process the HTTP Response
		dpopNonce = response.headers.get( "dpop-nonce" );
		return response.json();
	}).then( data => {
		// Process the HTTP Response Body
		userAuthServerRequestURI = data.request_uri;
	});
```


### User's Authentication

We've got enough to request the user to authenticate against the Bluesky Server... How?

Well, we need to "*build-up*" a new URL to redirect the user to.
It's something like:

    [`authorization_endpoint`]?client_id=[client_id]&request_uri=[`request_uri`]

> **NOTE**: The URL parameters need to e encoded; you can use [this encoder](https://www.urlencoder.org/), thought Javacript uses [`encodeURIComponent`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent)

In our case, our URL looks like this (*values may not be the same*):

    https://bsky.social/oauth/authorize?client_id=https%3A%2F%2Fmadrilenyer.neocities.org%2Fbsky%2Foauth%2Fclient-metadata.json&request_uri%3Durn%3Aietf%3Aparams%3Aoauth%3Arequest_uri%3Areq-df74117722b7f1e7d807d4244a8dae0a

Coded in our Vanilla Javascript:

```javascript
	// ------------------------------------------
	//   Javascript
	// ------------------------------------------

	// Buld up the URL.
	// ------------------------------------------
	let url = userAuthorizationEndPoint;
	url += "?client_id=" + encodeURIComponent( APP_CLIENT_ID );
	url += "&request_uri=" + encodeURIComponent( userAuthServerRequestURI );

	// Redirect the user to the Bluesky Auth Page
	// ------------------------------------------
	window.location = url;
```


### The Bluesky OAuth Authentication Page

This URL (*well... "similar"; as the validity is about some minutes, you may see an error page, if you click*) leads the user to the Bluesky Authentication page.

In this page, the server requests from the user to authenticate and, if so, authorize the application to use your "`acess_token`" to perform "`things`" in your name.

Just like Google does, doesn't it? ;^)


### Redirected Page

If, in that page (*remember, 'Bluesky Authorization Page'*), the user **agrees** and **accepts** to give permission to the application to use the "*user's token*", then the server will redirect the user's browser to the "Redirection/Callback Page".

Remember that "`redirect_uri`" parameter while the "`PAR Request`, above"? Yes, **that parameter**; one of the ones described in the "`client-metadata.json`" file, under the **array** (*yes, you can state several URLs for the callback*) identified with the key: **`redirect_uris`**.

Now, the flow comes back to our control. When the user lands in the "*callback page*", we will receive something like **this**:

```text
https://madrilenyer.neocities.org/bsky/oauth/callback/?iss=https%3A%2F%2Fbsky.social&state=4e47aaac8cbd35ed1a2afff53ce6f4511898d7c2ef0e47b37d77110f&code=cod-b17f75f356b83f35e99c4d7664ed30442a9c79c5c37ecf88261d77db799d0c0f
```

Splitted:
```text
https://madrilenyer.neocities.org/bsky/oauth/callback/
    ?iss=https%3A%2F%2Fbsky.social
	&state=4e47aaac8cbd35ed1a2afff53ce6f4511898d7c2ef0e47b37d77110f
	&code=cod-b17f75f356b83f35e99c4d7664ed30442a9c79c5c37ecf88261d77db799d0c0f
```

Three parameters:

+ **`iss`**: The "*Authority*"; in this case, the URL of the Bluesky Authorization Server
+ **`state`**: The "*`state`*" parameter we send before in the `PAR Request`, and
+ **`code`**: A (*one single use*) code that the application needs to retrieves the user's access token from the server.


```javascript
	// ------------------------------------------
	//   Javascript
	// ------------------------------------------
	let receivedIss = null;
	let receivedState = null;
	let receivedCode = null;

	// Let's retrieve the values from the URL.
	// ------------------------------------------
	// Retrieve the URL.
	let thisURL = new URL(window.location);

	// Retrieve the "search" part from the url
	let parsedSearch = new URLSearchParams(thisURL.search);

	// Retrieve the data.
	let receivedIss = parsedSearch.get("iss");
	let receivedState = parsedSearch.get("state");
	let receivedCode = parsedSearch.get("code");
	
	// We should include here some checks (the 'iss', the 'state'...), BUT...
```


## Access tokens and security

But there is still a problem; in order to retrieve the user's access token, the server requires from us to *validate* that we are the one who will handle the token. How do the application do this?

There is a "*new*" specification, under the OAuth protocol, named: "**Demonstrate proof of possession (DPoP)**".

> NOTE: The DPoP specification is [here](https://datatracker.ietf.org/doc/html/rfc9449)
>		    You can find an explanation about DPoP is [here](https://developer.okta.com/blog/2024/09/05/dpop-oauth)
>		    Bluesky docs has also some information about this... [here](https://docs.bsky.app/docs/advanced-guides/oauth-client#dpop).

### The DPoP
The idea of the **`DPoP`** data is to "*bind*" the client application to the user's access token; let's say, "*this token will be used by this application*", and no other one else. It's just another additional **level of security**, to avoid someone takes the token and uses it in another application.

The problem is that, to link both data (*the token and the 'client application'*), we need to use a cryptographic key. Javascript can generate such a key, and we can use it. The key component in this step is... Remember the "*nonce*"? Here it comes!

> **NOTE**: A DPoP-Proof will be needed **every time** we need to call an endPoint protected with OAuth. Every DPoP-Proof will include **the invoking URL**, so we will have to (re-)generate new DPoP-Proofs for each request.

### The User `access_token`
The first thing we need is the *some-steps-ago-received* **`dpop_nonce`** data. It came in a header during the call to the **`PAR EndPoint`**, and jher we will use it.

Another thing we need is to tell the Server "*who are we*", to "*link*" the user `access_token` to our future requests. For this, we need to create a DPoP-Prook; just in order to "*pass*" our cryptographic keys to the server.

For this first trial, we do NOT have yet the token, but we can setup a DPoP-Proof, something that identies us, how?
Well, let's use these three things:

+ `userTokenEndPoint`(**): The server's token endpoint
+ `client_id`: Let's say, the "`APP_CLIENT_ID`", and
+ `dpopNonce`: To create the DPoP-Proof with a crypto key

We will build up, again, an URL 


```javascript
	// ------------------------------------------
	//   Javascript
	//
	//   (maybe some steps are wrong 'typed')...
	// ------------------------------------------
	let userAccessToken = null;

	// Build up the URL.
	// ------------------------------------------
	let url = userTokenEndPoint;

	// The body of the call
	// ------------------------------------------
	let body = new URLSearchParams({
		// Fixed values
		'grant_type': 'authorization_code',
		// Constant values
		'client_id': encodeURIComponent( APP_CLIENT_ID ),
		'redirect_uri': encodeURIComponent( APP_CALLBACK_URL ),
		// Variable values
		'code': receivedCode,
		'code_verifier': codeVerifier
	});

	// Create the crypto key.
	// Must save it, 'cause we'll reuse it later.
	// ------------------------------------------
	let keyOptions = {
		name: "ECDSA",
		namedCurve: "P-256"
	};
	let keyPurposes = ["sign", "verify"];
    let key = await crypto.subtle.generateKey(keyOptions, false, keyPurposes).then(function(eckey) {
		return eckey;
	});
	let jwk = await crypto.subtle.exportKey("jwk", key.publicKey).then(function(keydata) {
		return keydata;
	});
	delete jwk.ext;
	delete jwk.key_ops;

	// Create the DPoP-Proof 'body' for this request.
	// ------------------------------------------
	let uuid = self.crypto.randomUUID();
    let dpop_proof_header = {
        typ: "dpop+jwt",
        alg: "ES256",
        jwk: jwk
    };
    let dpop_proof_payload = {
        iss: APP_CLIENT_ID,	// Added
        jti: uuid,
        htm: "POST",
        htu: url,
        iat: Math.floor(Date.now() / 1000),
		nonce: dpopNonce
    };

	// Crypt and sign the DPoP-Proof header+body
	// ------------------------------------------
    const h = JSON.stringify(dpop_proof_header);
    const p = JSON.stringify(dpop_proof_payload);
    const partialToken = [
        Base64.ToBase64Url(Base64.utf8ToUint8Array(h)),
        Base64.ToBase64Url(Base64.utf8ToUint8Array(p)),
    ].join(".");
    const messageAsUint8Array = Base64.utf8ToUint8Array(partialToken);

    let signOptions = {
		name: "ECDSA",
		hash: { name: "SHA-256" },
	};
    let signatureAsBase64 = await crypto.subtle.sign(signOptions, key.privateKey, dpop_proof_payload)
	.then(function(signature) {
		return Base64.ToBase64Url(new Uint8Array(signature));
	});

	// The DPoP-Proof
	// ------------------------------------------
	let dpopProof = `${partialToken}.${signatureAsBase64}`;

	// TuneUp the call
	// ------------------------------------------
	let headers = {
		'DPOP': dpopProof,
		'Content-Type': 'application/x-www-form-urlencoded',
		'DPoP-Nonce': dpopNonce
	}
	let fetchOptions = {
		method: 'POST',
		headers: headers,
		body: body.toString()
	}

	// Finally, perform the call
	// ------------------------------------------
	let url = userTokenEndPoint;
	fetch( url, fetchOptions ).then( response => {
		// Process the HTTP Response
		return response.json();
	}).then( data => {
		// Process the HTTP Response Body
		authServerResponse = data;
		userAccessToken = data.access_token;
	});
```

In this point, the "authServerResponse" variable (*the response from the authorization server*) should look like:

```json
	{
	  "access_token": "eyJ0eXAiOiJhdCtqd3QiLCJhbGciOiJFUzI1NksifQ.eyJhdWQiOiJkaWQ6d2ViOnZlbHZldGZvb3QudXMtZWFzdC5ob3N0LmJza3kubmV0d29yayIsImlhdCI6MTczNzQ5ODM4NCwiZXhwIjoxNzM3NTAxOTg0LCJzdWIiOiJkaWQ6cGxjOnRqYzI3YWplNHV3eHR3NWFiNnd3bTRrbSIsImp0aSI6InRvay1jYzM0YTYzZjgwNWJjMWQ1MTdhNDNmNzU5YWU3ZjJiNCIsImNuZiI6eyJqa3QiOiJVVW1YVXAwMUxySkctak1WQnJHSG1DZy1FR3UyemRncFBMWjhGZDhYMFlNIn0sImNsaWVudF9pZCI6Imh0dHBzOi8vbWFkcmlsZW55ZXIubmVvY2l0aWVzLm9yZy9ic2t5L29hdXRoL2NsaWVudC1tZXRhZGF0YS5qc29uIiwic2NvcGUiOiJhdHByb3RvIHRyYW5zaXRpb246Z2VuZXJpYyIsImlzcyI6Imh0dHBzOi8vYnNreS5zb2NpYWwifQ.OoKiX0LIofSvCqCsZHKtSa7TrOAdWOlTPapu2EGrSxWeF8qkklaM8HXgtmEPTs1BEGIkol91zz32lE1jI72i9Q",
	  "token_type": "DPoP",
	  "refresh_token": "ref-5c3ecf03caded355cde56b394dae9d9922fda73434dc02642fcb3e1a5fe2e149",
	  "scope": "atproto transition:generic",
	  "expires_in": 3599,
	  "sub": "did:plc:tjc27aje4uwxtw5ab6wwm4km"
	}
	 */
```

> **NOTE**: To "*view*" how is the "`access_token`", you can go to [**JWT**](https://jwt.io/#debugger-io)


Here we go!

We've got the user's access token to make calls to the protected Bluesky EndPoints "*on behalf*" of the user.

### Subsequent calls

From this point on, all DPoP-Proofs that need to be created (*for subsequent calls*) **MUST** include not only the "*dpop-nonce*" parameter, but also the "**`atHash`**", the access_token hashed.

```javascript
	// ------------------------------------------
	//   Javascript
	// ------------------------------------------

	// For subsequent calls, we must include the
	// hash of the access token in the DPoP-Proof payload.
	// ------------------------------------------

	// Let's calculate the hash
    let encodedAccessToken = new TextEncoder().encode(userAccessToken);
    let atHash = await crypto.subtle.digest('SHA-256', encodedAccessToken)
    .then(function(hash) {        
        let base = Base64.ToBase64Url(new Uint8Array(hash));
        if (noPadding){
            base = base.replace(/\=+$/, '');
        }    
        return base;
    });
	
	// Regenerate the UUID.
	let uuid = self.crypto.randomUUID();

	// Add the hash in the DPoP-Proof payload.
	// The "url" is a new one.
    let dpop_proof_payload = {

		// This parameter LINKs the user access token
		// to the call & the application, thru the crypto key
		// ------------------------------------------
        ath: atHash,

		// The method can be "GET" or whatever.
		// ------------------------------------------
        htm: "POST",

		// The "url" should be distinct.
		// ------------------------------------------
        htu: url,

		// The "time stamp" is "now" (UNIX like)
		// ------------------------------------------
        iat: Math.floor(Date.now() / 1000),

		// The brand new uuid.
		// ------------------------------------------
        jti: uuid,

		// The rest of the parameters should be the same
		// ------------------------------------------
        iss: APP_CLIENT_ID,
		nonce: dpopNonce

	};

```

With this new DPoP-Proof, we can create a new "*headers*" object to perform the call.


```javascript
	// ------------------------------------------
	//   Javascript
	// ------------------------------------------

	let headers: {
		'Content-Type': [whichever],
		'Accept': 'application/json',

		// The "Authorization" header now is
		// not a "Bearer" but a "DPoP". 
		// ------------------------------------------
		'Authorization': `DPoP ${userAccessToken}`,

		// The "DPoP-Proof" must be included also
		// in a proper header.
		// ------------------------------------------
		'DPoP': dpopProof
	},
	let fetchOptions = {
		method: 'POST',		// Or "GET", or...
		headers: headers,
		body: body			// Whatever. If needed
	}
	fetch( url, fetchOptions ).then( response => {
		// Process the HTTP Response

		// Normally, the "nonce" should come; to be checked.
		// ------------------------------------------
		dpopNonce = response.headers.get( "dpop-nonce" );
		return response.json();
	}).then( data => {
		// Process the HTTP Response Body
		// Whatever we expect.
	});
```



## Final words

Of course, this is only a "*pseudo-Javascript*" code. If you want to use it, mind that the **`.then(...)`** functions are "*Promises*", so you have to program accordingly.

I've not included any check or "*error control*" in the code; it's just to explain the "*happy path*", the easiest way. If you plan to use this code as a base, remember to include all needed checks and error controls in the flow, as should be normal.

And, finally, "*of course*" is much, much better to use the [**official Bluesky TypeScript client**](https://docs.bsky.app/docs/starter-templates/clients). You can find here the [**source code**](https://github.com/bluesky-social/atproto).

