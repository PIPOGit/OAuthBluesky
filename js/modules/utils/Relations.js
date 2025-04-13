/**********************************************************
 * Module imports
 *
 **********************************************************/
/* --------------------------------------------------------
 * Modules for Global configuration
 * -------------------------------------------------------- */
// Global configuration
import CONFIGURATION					from "../../data/config.json" with { type: "json" };

/* --------------------------------------------------------
 * Modules with Base functions
 * -------------------------------------------------------- */
// Common functions
import * as COMMON						from "../common/CommonFunctions.js";
// Common Classes and Exceptions ("Types")
import * as TYPES						from "../common/CommonTypes.js";
// Common HTML functions
import * as HTML						from "../common/HTML.js";

/* --------------------------------------------------------
 * Modules with external, concrete API calls functions
 * -------------------------------------------------------- */
// Common APIBluesky functions
import * as APIBluesky					from "../api/APIBluesky.js";
// Common PLC Directory functions
import * as APIPLCDirectory				from "../api/APIPLCDirectory.js";


/**********************************************************
 * Module Constants
 **********************************************************/
// Module SELF constants
const MODULE_NAME						= COMMON.getModuleName( import.meta.url );

// Inner constants
const MAX_ITERATIONS					= 100;
const MAX_PROFILES						= 46;
const TYPE_POST							= "app.bsky.feed.post";
const TYPE_REPOST						= "app.bsky.feed.defs#reasonRepost";

const CANVAS_TYPE_LIKES					= "LIKES";
const CANVAS_TYPE_REPLIES				= "REPLIES";
const CANVAS_TYPE_REPOSTS				= "REPOSTS";

// Inner constants functions


/**********************************************************
 * Module Variables
 **********************************************************/
let renderedProfiles					= [];
let downloadingProfileAvatars			= false;
let canvasType							= CANVAS_TYPE_LIKES;


/**********************************************************
 * PRIVATE Functions
 **********************************************************/
/* --------------------------------------------------------
 * Retrieves the "one month before" date.
 * -------------------------------------------------------- */
function getOneMonthAgo() {
	const STEP_NAME						= "getOneMonthAgo";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	const today							= new Date();
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Date of TODAY:`, today );
	let oneMonthAgo						= new Date();
	oneMonthAgo.setDate(0);
	oneMonthAgo.setDate( today.getDate() );
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Date of Month:`, oneMonthAgo );

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return oneMonthAgo;
}


/* --------------------------------------------------------
 * Get user feed until a given date.
 * -------------------------------------------------------- */
async function getFeed( oneMonthAgo ) {
	const STEP_NAME						= "getFeed";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	let apiCallResponse					= null;
	let hayCursor						= false;
	let cursorDate						= null;
	let outOfScope						= false;
	let data							= null;
	let acumulado						= 0;
	let subTotal						= 0;

	if (window.BSKY.DEBUG) console.debug( PREFIX + `Retrieve author feed since:`, oneMonthAgo );
	let n								= 0;
	let cursor							= null;
	let authorFeed						= [];
	do {
		n++;
		apiCallResponse					= await APIBluesky.getAuthorFeed( cursor );

		// Datos. Seguimos?
		// De haber cursos, es la fecha.
		cursor							= apiCallResponse?.cursor || null;
		hayCursor						= !COMMON.isNullOrEmpty(cursor);
		if ( hayCursor ) {
			data						= apiCallResponse.feed;
			subTotal					= data.length;
			authorFeed.push(...data);
			acumulado					= authorFeed.length;

			cursorDate					= new Date( cursor );
			outOfScope					= COMMON.isBefore( cursorDate, oneMonthAgo );
		}
	} while ( !outOfScope && hayCursor && (n<MAX_ITERATIONS) );
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Last[${n}] cursor date[${outOfScope}]:`, cursorDate );

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return authorFeed;
}


/* --------------------------------------------------------
 * Get user likes until a given date.
 * -------------------------------------------------------- */
async function getLikes( oneMonthAgo ) {
	const STEP_NAME						= "getLikes";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	let apiCallResponse					= null;
	let hayCursor						= false;
	let cursorDate						= null;
	let outOfScope						= false;
	let data							= null;
	let acumulado						= 0;
	let subTotal						= 0;

	if (window.BSKY.DEBUG) console.debug( PREFIX + `Retrieve author likes since:`, oneMonthAgo );
	let n								= 0;
	let cursor							= null;
	let authorLikes						= [];
	do {
		n++;
		apiCallResponse					= await APIBluesky.getAuthorLikes( cursor );
		cursor							= apiCallResponse?.cursor || null;
		hayCursor						= !COMMON.isNullOrEmpty(cursor);
		if ( hayCursor ) {
			data						= apiCallResponse.feed;
			subTotal					= data.length;
			authorLikes.push(...data);
			acumulado					= authorLikes.length;

			cursorDate					= new Date( data[0].post.indexedAt );
			outOfScope					= COMMON.isBefore( cursorDate, oneMonthAgo );
		}
	} while ( !outOfScope && hayCursor && (n<MAX_ITERATIONS) );
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Last[${n}] cursor date[${outOfScope}]:`, cursorDate );

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return authorLikes;
}


/* --------------------------------------------------------
 * Analyze and segregate items in the feed.
 * -------------------------------------------------------- */
function analyzeAuthorFeed( authorFeed ) {
	const STEP_NAME						= "analyzeAuthorFeed";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_FEED					= `${PREFIX}[FEED] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[${authorFeed.length}]` );

	BSKY.user.relations.feed.mine		= [];	// An array
	BSKY.user.relations.feed.reposts	= [];	// An array of objects: { "did":<did>, "count":<count> }
	BSKY.user.relations.feed.replys		= [];	// An array of objects: { "did":<did>, "count":<count> }
	BSKY.user.relations.feed.others		= [];	// An array

	let isMine							= false;
	let isReason						= false;
	let isRepost						= false;
	let isReply							= false;
	let isParent						= false;
	let isParentNotMe					= false;
	let notFound						= false;
	let userDid							= null;
	let handle							= null;
	let hasDid							= false;
	let avatar							= null;
	let found							= null;
	let image							= null;

	let n								= 1;
	const total							= authorFeed.length;
	for ( const item of authorFeed ) {
		// if (window.BSKY.DEBUG) console.debug( PREFIX_FEED + `+ Feed[${n++}/${total}] [${item.post.indexedAt}] [${item.post.author.handle}]:`, COMMON.toJson( item ) );
		if (window.BSKY.DEBUG) console.debug( PREFIX_FEED + `+ Feed[${n++}/${total}] [${item.post.indexedAt}] [${item.post.author.handle}]:` );

		isMine							= COMMON.areEquals( item.post.author.did, BSKY.user.userDid );
		isReason						= ( item?.reason && item?.reason?.$type ) || false;
		isRepost						= ( isReason && COMMON.areEquals( item.reason.$type, TYPE_REPOST ) ) || false;
		isReply							= ( item?.reply && COMMON.areEquals( item.post.record.$type, TYPE_POST ) ) || false;
		isParent						= ( isReply && item?.reply?.parent?.author?.did ) || false;
		isParentNotMe					= ( isParent && !COMMON.areEquals( item.reply.parent.author.did, BSKY.user.userDid ) ) || false;
		notFound						= ( isParent && item.reply.parent?.notFound ) || false;
		if (window.BSKY.DEBUG) console.debug( PREFIX_FEED + `  [item.post.author.did==${item?.post?.author?.did}] [item.reply.parent.author.did==${item?.reply?.parent?.author?.did}] [item.reply.parent.notFound==${item.reply?.parent?.notFound}]` );
		if (window.BSKY.DEBUG) console.debug( PREFIX_FEED + `  [isMine==${isMine}] [isReason==${isReason}] [isRepost==${isRepost}] [isReply==${isReply}] [isParent==${isParent}] [isParentNotMe==${isParentNotMe}] [notFound==${notFound}]` );
		if ( isMine && !isReply ) {
			// Mine?
			BSKY.user.relations.feed.mine.push( item );
		} else if ( !isMine && isRepost ) {
			// Repost?
			userDid						= item.post.author.did;
			handle						= item.post.author.handle;
			hasDid						= BSKY.user.relations.feed.reposts.findIndex( a => COMMON.areEquals( userDid, a.did ) );
			if (window.BSKY.DEBUG) console.debug( PREFIX_FEED + `  [REPOST] [userDid==${userDid}] [handle==${handle}]` );
			if ( hasDid>=0 ) {
				found					= BSKY.user.relations.feed.reposts[ hasDid ];
				avatar					= found.avatar;
				image					= found.avatarImage;
				BSKY.user.relations.feed.reposts[ hasDid ] = { did: userDid, handle: handle, avatar: avatar, image: image, count: found.count+1 };
			} else {
				BSKY.user.relations.feed.reposts.push({ did: userDid, handle: handle, avatar: null, image: null, count: 1 });
			}
		} else if ( isMine && isReply && isParent && isParentNotMe && !notFound ) {
			// Reply?
			userDid						= item.reply.parent.author.did || null;
			handle						= item.reply.parent.author.handle;
			hasDid						= BSKY.user.relations.feed.replys.findIndex( a => COMMON.areEquals( userDid, a.did ) );
			if (window.BSKY.DEBUG) console.debug( PREFIX_FEED + `  [REPLY ] [userDid==${userDid}] [handle==${handle}]` );
			if ( hasDid>=0 ) {
				found					= BSKY.user.relations.feed.replys[ hasDid ];
				avatar					= found.avatar;
				image					= found.avatarImage;
				BSKY.user.relations.feed.replys[ hasDid ] = { did: userDid, handle: handle, avatar: avatar, image: image, count: found.count+1 };
			} else {
				BSKY.user.relations.feed.replys.push({ did: userDid, handle: handle, avatar: null, image: null, count: 1 });
			}
		} else {
			// Other
			BSKY.user.relations.feed.others.push( item );
		}
	};

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * Analyze likes.
 * -------------------------------------------------------- */
function analyzeAuthorLikes( authorLikes ) {
	const STEP_NAME						= "analyzeAuthorLikes";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_LIKES					= `${PREFIX}[LIKES] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[${authorLikes.length}]` );

	BSKY.user.relations.likes			= [];	// An array of objects: { "did":<did>, "count":<count> }

	let isMine							= false;
	let userDid							= null;
	let handle							= null;
	let hasDid							= false;
	let avatar							= null;
	let found							= null;
	let image							= null;

	let n								= 1;
	const total							= authorLikes.length;
	for ( const item of authorLikes ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX_LIKES + `+ Like[${n++}/${total}] [${item.post.indexedAt}] [${item.post.author.handle}]:`, COMMON.toJson( item ) );

		isMine							= COMMON.areEquals( item.post.author.did, BSKY.user.userDid );
		if ( !isMine ) {
			// Not Mine?
			userDid						= item.post.author.did;
			handle						= item.post.author.handle;
			hasDid						= BSKY.user.relations.likes.findIndex( a => COMMON.areEquals( userDid, a.did ) );
			if ( hasDid>=0 ) {
				found					= BSKY.user.relations.likes[ hasDid ];
				avatar					= found.avatar;
				image					= found.avatarImage;
				BSKY.user.relations.likes[ hasDid ] = { did: userDid, handle: handle, avatar: avatar, image: image, count: found.count+1 };
			} else {
				BSKY.user.relations.likes.push({ did: userDid, handle: handle, avatar: null, image: null, count: 1 });
			}
		}
	};

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * Re-cap (informative) summary for the previous actions.
 * -------------------------------------------------------- */
function summary() {
	const STEP_NAME						= "summary";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_REPOSTS				= `${PREFIX}[REPOSTS] `;
	const PREFIX_REPLIES				= `${PREFIX}[REPLIES] `;
	const PREFIX_LIKES					= `${PREFIX}[LIKES] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	let n								= 1;
	let total							= 0;

	// Reposts
	// ---------------------------------------------------------
	n									= 1;
	total								= BSKY.user.relations.feed.reposts.length;
	BSKY.user.relations.feed.reposts.sort( (a,b) => b.count - a.count );
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_REPOSTS + `Reposts: [${total}]` );
	// Retrieve the avatar image
	for ( const item of BSKY.user.relations.feed.reposts ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX_REPOSTS + `+ Repost: [${n++}/${total}] [${item.did}/${item.handle}==${item.count}]` );
	}
	if (window.BSKY.DEBUG) console.debug( PREFIX_REPOSTS + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();

	// Replies
	// ---------------------------------------------------------
	n									= 1;
	total								= BSKY.user.relations.feed.replys.length;
	BSKY.user.relations.feed.replys.sort( (a,b) => b.count - a.count );
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_REPLIES + `Replies: [${total}]` );
	// Retrieve the avatar image
	for ( const item of BSKY.user.relations.feed.replys ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX_REPLIES + `+ Repost: [${n++}/${total}] [${item.did}/${item.handle}==${item.count}]` );
	}
	if (window.BSKY.DEBUG) console.debug( PREFIX_REPLIES + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();

	// Likes
	// ---------------------------------------------------------
	n									= 1;
	total								= BSKY.user.relations.likes.length;
	BSKY.user.relations.likes.sort( (a,b) => b.count - a.count );
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_LIKES + `Likes..: [${total}]` );
	// Retrieve the avatar image
	for ( const item of BSKY.user.relations.likes ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX_LIKES + `+ Like: [${n++}/${total}] [${item.did}/${item.handle}==${item.count}]` );
	}
	if (window.BSKY.DEBUG) console.debug( PREFIX_LIKES + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * Function that searches in all retrieved data for the
 * avatar of a given did.
 *
 * Sources:
 *	+ renderedProfiles => did
 *	+ BSKY.user.following.profiles => did
 *	+ BSKY.user.followers => did
 *	+ BSKY.user.blocks => did
 *	+ BSKY.user.mutes => did
 *	+ BSKY.user.extra => did
 * -------------------------------------------------------- */
async function findSavedProfile( did, handle ) {
	let profile							= null;

	profile								= renderedProfiles.find( profile => COMMON.areEquals( profile.did, did ) ) || null;
	if ( profile ) { return profile; }
	
	BSKY.user.extra						= BSKY.user.extra || [];

	profile								= BSKY.user.following.profiles.find( profile => COMMON.areEquals( profile.did, did ) ) || null;
	if ( profile ) { return profile; }

	profile								= BSKY.user.followers.find( profile => COMMON.areEquals( profile.did, did ) ) || null;
	if ( profile ) { return profile; }

	profile								= BSKY.user.blocks.find( profile => COMMON.areEquals( profile.did, did ) ) || null;
	if ( profile ) { return profile; }

	profile								= BSKY.user.mutes.find( profile => COMMON.areEquals( profile.did, did ) ) || null;
	if ( profile ) { return profile; }

	profile								= BSKY.user.extra.find( profile => COMMON.areEquals( profile.did, did ) ) || null;
	if ( profile ) { return profile; }

	profile								= await APIBluesky.getUserProfile( handle, false ) || null;
	if ( profile ) {
		BSKY.user.extra.push( profile );
		return profile;
	} else {
		return null;
	}
}


/* --------------------------------------------------------
 * Function that retrieves the image avatar.
 * -------------------------------------------------------- */
async function findAvatar( did, handle ) {
	const STEP_NAME						= "findAvatar";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;

	const profile						= await findSavedProfile( did, handle );
	if ( COMMON.isNullOrEmpty( profile ) ) {
		return null;
	}

	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[did==${did}] [handle==${handle}]` );
	if ( COMMON.isNullOrEmpty( profile?.avatarImage ) ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + "The didDoc..." );
		profile.didDoc					= await APIPLCDirectory.resolveDid( did );

		// Retrieve the avatar as Data URL
		if (window.BSKY.DEBUG) console.debug( PREFIX + "The avatar as Data URL..." );
		const avatarURL					= await APIBluesky.getAvatarURL( profile );
		profile.avatarImage				= avatarURL ? await APIBluesky.getAvatar( avatarURL ) : null;
	}
	
	renderedProfiles.push( profile );

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return profile.avatarImage;
}


/**********************************************************
 * DRAWING Functions
 **********************************************************/
/* --------------------------------------------------------
 * Cross-check relationships.
 * -------------------------------------------------------- */
async function drawCanvas( idDiv, did, handle, profilesToDraw ) {
	const STEP_NAME						= "drawCanvas";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_IMAGE					= `${PREFIX}[IMAGE] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[idDiv==${idDiv}] [did==${did}]` );

	// The canvas
	// ---------------------------------------------------------

	// Info step
	// ---------------------------------------------------------
	HTML.showStepInfo( STEP_NAME, `Setting up the canvas...` );

	// Instantiate a Canvas object.
	const canvas						= document.getElementById( idDiv );

	// Some useful data
	canvas.dataset.did					= did;
	canvas.dataset.handle				= handle;

	// Tune-up the dimensions
	if (window.BSKY.DEBUG) console.debug( PREFIX + `The canvas dimensions:` );
	if (window.BSKY.DEBUG) console.debug( PREFIX + `+ [canvas.width==${canvas.width}]` );					// REAL: canvas.offsetWidth
	if (window.BSKY.DEBUG) console.debug( PREFIX + `+ [canvas.height==${canvas.height}]` );					// REAL: canvas.offsetHeight
	if (window.BSKY.DEBUG) console.debug( PREFIX + `+ [canvas.offsetWidth==${canvas.offsetWidth}]` );		// REAL: canvas.offsetWidth
	if (window.BSKY.DEBUG) console.debug( PREFIX + `+ [canvas.offsetHeight==${canvas.offsetHeight}]` );		// REAL: canvas.offsetHeight
	if (window.BSKY.DEBUG) console.debug( PREFIX + `+ [window.innerWidth==${window.innerWidth}]` );
	if (window.BSKY.DEBUG) console.debug( PREFIX + `+ [window.innerHeight==${window.innerHeight}]` );
	
	const maxWidth						= canvas.width;
	const maxHeight						= canvas.height;
	const mediumHeight					= parseInt( maxHeight / 2 );
	const boxHeight						= parseInt( maxHeight / 6 );

	/*
		The box.
		
		+-----------------------------------------------------------------------+
		|+------------------+ +------------------------------------------------+|
		||                  | |+------++------++------++------++------++------++|
		||                  | ||      ||      ||      ||      ||      ||      |||
		||                  | ||  P1  ||  P2  ||  P3  ||  P4  ||  P5  ||  P6  |||
		||       MAIN       | ||      ||      ||      ||      ||      ||      |||
		||                  | |+------++------++------++------++------++------+||
		||                  | |+----++----++----++----++----++----++----++----+||
		||                  | ||    ||    ||    ||    ||    ||    ||    ||    |+|
		|+------------------+ || M1 || M2 || M3 || M4 || M5 || M6 || M7 || M8 |||
		||                  | |+----++----++----++----++----++----++----++----+||
		||                  | |+--++--++--++--++--++--++--++--++--++--++--++--+||
		||      HEARTS      | ||S1||S2||S3||S4||S5||S6||S7||S8||S9||S0||S1||S2|||
		||                  | |+--++--++--++--++--++--++--++--++--++--++--++--+||
		||                  | |+--++--++--++--++--++--++--++--++--++--++--++--+||
		|+------------------+ ||S1||S2||S3||S4||S5||S6||S7||S8||S9||S0||S1||S2|||
		||       SIGN       | |+--++--++--++--++--++--++--++--++--++--++--++--+||
		|+------------------+ +------------------------------------------------+|
		+-----------------------------------------------------------------------+

		[P<n>]
		+ Width:
		  + Total width = 5 * [canvas width] / 6;
		  + Box width = Total width / 6;
		+ Height: (adjustable)
		  + Total height = [canvas height] / 2;
		  + Box height = Total width / 6;	( can be / 8 )

	 */

	// The canvas context
	// ---------------------------------------------------------
	if (window.BSKY.DEBUG) console.debug( PREFIX + `The BSKY Canvas object...` );
	const bskyCanvas					= new TYPES.BSKYCanvas( canvas.width, canvas.height, mediumHeight );

	if (canvas.getContext) {
		const ctx						= canvas.getContext("2d");

		// The canvas
		// ---------------------------------------------------------
		let item						= bskyCanvas.canvas;
		item.draw( ctx );

		// The user profile
		// ---------------------------------------------------------
		downloadingProfileAvatars		= true;

		// The user avatar as Data URL
		let imageAsDataURL				= await findAvatar( did, window.BSKY.user.profile.handle );

		// Draw the user avatar
		let image						= new Image();
		image.id						= `image-${did}`;
		image.alt						= window.BSKY.user.profile.handle;
		image.title						= window.BSKY.user.profile.handle;
		image.addEventListener("load", event => processImage( ctx, image, 4, 4, mediumHeight, mediumHeight ), false);
		image.src						= imageAsDataURL;
		if (window.BSKY.DEBUG) console.debug( PREFIX + `[image.width==${image.width}]` );
		if (window.BSKY.DEBUG) console.debug( PREFIX + `[image.height==${image.height}]` );

		// The other profiles
		// ---------------------------------------------------------
		// const profilesToDraw			= window.BSKY.user.relations.likes.filter( like => like.count>1 );
		// const profilesToDraw			= window.BSKY.user.relations.likes;
		let n							= 0;
		let max							= 0;
		let min							= 1000;
		for ( const like of profilesToDraw ) {
			n++;
			if ( n > MAX_PROFILES ) { break; }

			// Max & min
			max							= like.count > max ? like.count : max;
			min							= like.count < min ? like.count : min;
		}
		if (window.BSKY.DEBUG) console.debug( PREFIX + `Figures: [MAX_PROFILES==${MAX_PROFILES}] [min==${min}] [max==${max}]` );

		n								= 0;
		for ( const like of profilesToDraw ) {
			n++;
			if ( n > MAX_PROFILES ) { break; }

			// Info step
			// ---------------------------------------------------------
			HTML.showStepInfo( STEP_NAME, `Avatar for [(${n}/${MAX_PROFILES}) ${like.handle}]...` );
			const dataURL				= await findAvatar( like.did, like.handle );

			await new Promise( ( resolve, reject ) => {
				const image				= new Image();
				image.id				= `image-${like.did}`;
				// image.addEventListener("load", event => processImage( ctx, image, mediumHeight + n * 20, (n-1) * 20 + 2, 20, 20 ), false);
				image.addEventListener( "load", event => {
					if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX_IMAGE + `[did==${like.did}] [handle==${like.handle}]` );
					item				= bskyCanvas.getCanvasItem( n );
					if (window.BSKY.DEBUG) console.debug( PREFIX_IMAGE + `[item]`, COMMON.toJson(item) );
					const x				= item.offsetX( n );
					const y				= item.offsetY( n );
					image.width			= item.width;
					image.height		= item.height;
					if (window.BSKY.DEBUG) console.debug( PREFIX_IMAGE + `[x==${x}] [y==${y}] [image.width==${image.width}] [image.height==${image.height}]` );

					ctx.imageSmoothingEnabled	= false;
					ctx.fillStyle		= "rgb(0 0 200 / 50%)";
					ctx.fillRect(x + 2, y + 2, image.width, image.height );
					ctx.drawImage(image, x, y, image.width, image.height );

					// ctx.font			= "12px system-ui";
					// ctx.fillStyle		= "white";
					// ctx.textAlign		= "left";
					// ctx.fillText( like.handle, x, y );

					if (window.BSKY.DEBUG) console.debug( PREFIX_IMAGE + "-- END" );
					if (window.BSKY.GROUP_DEBUG) console.groupEnd();
					return resolve( dataURL );
				});
				image.src				= dataURL;
			});

		}
		downloadingProfileAvatars		= false;

	} else {
	  // canvas-unsupported code here
		if (window.BSKY.DEBUG) console.warn( PREFIX + "Canvas unsupported!" );
		COMMON.showInfo( "Canvas unsupported!" );
	}

	// Info step
	// ---------------------------------------------------------
	HTML.showStepInfo( STEP_NAME );

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
	return bskyCanvas;
}


/* --------------------------------------------------------
 * Process an image.
 * -------------------------------------------------------- */
async function processImage( ctx, image, x, y, width, height ) {
	const STEP_NAME						= "processImage";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	image.width							= width;
	image.height						= height;
	if (window.BSKY.DEBUG) console.debug( PREFIX + `[image.width==${image.width}]` );
	if (window.BSKY.DEBUG) console.debug( PREFIX + `[image.height==${image.height}]` );

	ctx.imageSmoothingEnabled			= false;
	ctx.fillStyle						= "rgb(0 0 200 / 50%)";
	ctx.fillRect(x + 2, y + 2, width, height);
	ctx.drawImage(image, x, y, image.width, image.height );

	ctx.font							= "12px system-ui";
	ctx.fillStyle						= "white";
	ctx.textAlign						= "right";
	ctx.fillText( BSKY.user.userHandle, width - 5, height - 5 );

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}

/**********************************************************
 * PUBLIC Functions
 **********************************************************/
/* --------------------------------------------------------
 * Allow to download the canvas as an image.
 * -------------------------------------------------------- */
export function downloadImage() {
	const STEP_NAME						= "downloadImage";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	if ( downloadingProfileAvatars ) {
		if (window.BSKY.DEBUG) console.debug( PREFIX + `Still downloading profiles!` );
		COMMON.showInfo( "Still downloading profiles!" );

		if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
		if (window.BSKY.GROUP_DEBUG) console.groupEnd();
		return;
	}

	// The canvas
	// ---------------------------------------------------------
	const canvas						= document.getElementById( HTML.DIV_CANVAS_RELATIONS );


	// The link
	// ---------------------------------------------------------
	try {
		// Prepare data
		const dataURL					= canvas.toDataURL( HTML.MIME_TYPE_PNG );
		const did						= canvas.dataset.did;
		const handle					= canvas.dataset.handle;
		const downloadedFileName		= `${canvasType} - ${handle}.png`;
		if (window.BSKY.DEBUG) console.debug( PREFIX + `[dataURL]`, dataURL );
		localStorage.setItem( downloadedFileName, dataURL );
		if (window.BSKY.DEBUG) console.debug( PREFIX + `Saved[LSKEY:${downloadedFileName}]` );

		// The link itself
		const link						= document.createElement('a');
		link.href						= dataURL;
		link.download					= downloadedFileName;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		if (window.BSKY.DEBUG) console.debug( PREFIX + `Generated[${downloadedFileName}::${HTML.MIME_TYPE_PNG}]` );
	} catch (error) {
		if (window.BSKY.DEBUG) console.error( PREFIX + "Detected error:", error );
	}

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * Functioni that allows to change among the different
 * types of canvases.
 * -------------------------------------------------------- */
export function changeCanvasType( target ) {
	const STEP_NAME						= "changeCanvasType";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX + `[id==${target.id}] [name==${target.name}] [value==${target.value}]` );

	const idCanvas						= HTML.DIV_CANVAS_RELATIONS;
	const idThisUser					= window.BSKY.user.profile.did;
	const handleThisUser				= window.BSKY.user.profile.handle;
	let collection						= null;
	const upper							= target.value.toUpperCase();
	switch ( upper ) {
		case CANVAS_TYPE_LIKES:		canvasType = CANVAS_TYPE_LIKES;		collection = window.BSKY.user.relations.likes; break;
		case CANVAS_TYPE_REPLIES:	canvasType = CANVAS_TYPE_REPLIES;	collection = window.BSKY.user.relations.feed.replys; break;
		case CANVAS_TYPE_REPOSTS:	canvasType = CANVAS_TYPE_REPOSTS;	collection = window.BSKY.user.relations.feed.reposts; break;
	}
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Drawing ${target.value} for ${window.BSKY.user.profile.handle}...` );
	const bskyCanvas					= drawCanvas( idCanvas, idThisUser, handleThisUser, collection );

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


/* --------------------------------------------------------
 * Cross-check relationships.
 * -------------------------------------------------------- */
export async function getTheRelations() {
	const STEP_NAME						= "getTheRelations";
	const PREFIX						= `[${MODULE_NAME}:${STEP_NAME}] `;
	const PREFIX_SUMMARY				= `${PREFIX}[SUMMARY] `;
	if (window.BSKY.GROUP_DEBUG) console.groupCollapsed( PREFIX );

	// Info step
	// ---------------------------------------------------------
	HTML.showStepInfo( STEP_NAME, `Cross-checking relationships with the user...` );

	// The favicon
	// ---------------------------------------------------------
	window.BSKY.faviconWorking();

	// Now, the relations.
	// ---------------------------------------------------------
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Let's retrieve the relationships...` );

	// Calculate "1 month ago" dates...
	// ---------------------------------------------------------
	const oneMonthAgo					= getOneMonthAgo();

	// Retrieve the User's Author Feed
	// SEE: https://docs.bsky.app/docs/api/app-bsky-feed-get-author-feed
	// Cogeremos los reposts.
	// ---------------------------------------------------------
	const authorFeed					= await getFeed( oneMonthAgo );

	// Retrieve the User's Author Likes
	// SEE: https://docs.bsky.app/docs/api/app-bsky-feed-get-actor-likes
	// Cogeremos los posts.
	// ---------------------------------------------------------
	const authorLikes					= await getLikes( oneMonthAgo );


	/* ****************************************************************************
	 * Tenemos que coger:
	 *
	 * + [POST] Del propio post
	 *   item.post.author.did && item.post.author.handle
	 *
	 * + [REASON] Si hay un "reason" ( item?.reason ), es un "repost". POR MI.
	 *
	 * + [REPLY] Si hay un "reply" ( item?.reply ), es una "respuesta" a un post. POR MI.
	 *   Cogemos:
	 *
	 *   + El autor del primer post: item.reply.root.author.did && item.reply.root.author.handle
	 *   + El autor del post anterior al mio: item.reply.parent.author.did && item.reply.parent.author.handle
	 *   + El autor del post anterior al anterior al mio: item.reply.grandparentAuthor.author.did && item.reply.grandparentAuthor.author.handle
	 *
		[FEED::authorFeed]
		El post: https://bsky.app/profile/did:plc:tjc27aje4uwxtw5ab6wwm4km/post/3llyvmm3coc23

		  + Tiene que venir esto:
			"post"
		  + Y la info de quien es el autor:
			"post.author.did"
			"post.author.handle"

		+ Si es un "post" mio, entonces:
			"post.author.did"		== BSKY.user.userDid
			"post.author.handle"	== BSKY.user.userHandle

		+ Si es un "repost" de un post de otro, entonces:
		  + Tiene que venir esto:
			"reason"
			"reason.$type" == "app.bsky.feed.defs#reasonRepost"
		  + Y la info de quien es el autor:
			"post.author.did"
			"post.author.handle"

		+ Si es un "reply" a un post de otro, entonces:
		  + Tiene que venir esto:
			"post.record.$type" == "app.bsky.feed.post"
			"reply"
		  + Y la info de quien es el autor:
			"reply.parent.author.did"
			"reply.parent.author.handle"


		[LIKE::authorLikes]
		En este caso es un like mío a este post: https://bsky.app/profile/did:plc:n4ia7itkxumdjzqrxo44mfh2/post/3llyvngw44k2i
		Si hay un reply: https://bsky.app/profile/did:plc:tjc27aje4uwxtw5ab6wwm4km/post/3llyvmm3coc23

		  "post"
		  "post.author.did"
		  "post.author.handle"


		[RESULTS]
		Los dejamos en: "BSKY.user.relations"
		+ BSKY.user.relations
		  + BSKY.user.relations.feed
		    + BSKY.user.relations.feed.mine
		    + BSKY.user.relations.feed.replys
		    + BSKY.user.relations.feed.reposts
		    + BSKY.user.relations.feed.others
		  + BSKY.user.relations.likes


		// TODO:
		Hay que coger los likes a mis posts: "getLikes" por cada post (de la primera llamada).
		https://docs.bsky.app/docs/api/app-bsky-feed-get-likes
		y coger los usuarios a quienes les ha gustado cada post

		Con todo esto, podríamos establecer el snapshot de las burbujitas
		o un mapa de relaciones por haber habido una relación.

		A parte de esto, podríamos crear otro mapa con las relaciones follow/follower
		entre todas las cuentas que se tienen.
	   **************************************************************************** */

	// Prepare the target object...
	// ---------------------------------------------------------
	if (window.BSKY.DEBUG) console.debug( PREFIX + `Analyzing the relationships...` );
	BSKY.user.relations					= {};
	BSKY.user.relations.feed			= {};
	BSKY.user.relations.likes			= [];	// An array of objects: { "did":<did>, "count":<count> }

	// Analyze data...
	// ---------------------------------------------------------
	analyzeAuthorFeed( authorFeed );
	analyzeAuthorLikes( authorLikes );

	// Got the figures. Sort and display.
	// ---------------------------------------------------------
	summary();

	// Finally, draw things
	// ---------------------------------------------------------
	const idCanvas						= HTML.DIV_CANVAS_RELATIONS;
	const idThisUser					= window.BSKY.user.profile.did;
	const handleThisUser				= window.BSKY.user.profile.handle;
	const collection					= window.BSKY.user.relations.likes;
	// const collection					= window.BSKY.user.relations.feed.replys;
	// const collection					= window.BSKY.user.relations.feed.reposts;
	const bskyCanvas					= drawCanvas( idCanvas, idThisUser, handleThisUser, collection );

	// The favicon
	// ---------------------------------------------------------
	window.BSKY.faviconStandBy();

	if (window.BSKY.DEBUG) console.debug( PREFIX + "-- END" );
	if (window.BSKY.GROUP_DEBUG) console.groupEnd();
}


