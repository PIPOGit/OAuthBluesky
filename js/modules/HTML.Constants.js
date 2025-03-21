/**********************************************************
 * Module imports
 *
 * PKCE HELPER FUNCTIONS
 * See: https://gist.github.com/ahmetgeymen/a9dcd656a1527f6c73d9c712ea2d9d7e
 *
 **********************************************************/
// Global configuration
import CONFIGURATION					from "../data/config.json" with { type: "json" };
// Common MimeTypes Operations
import MIMETYPES						from "../data/MimeTypes.json" with { type: "json" };
export *	 							from "../data/MimeTypes.json" with { type: "json" };
// Common functions
import * as COMMON						from "./common.functions.js";


/**********************************************************
 * Module Constants
 **********************************************************/
// Module SELF constants

// Inner constants

// Other constants
export const BLANK_IMAGE				= "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
export const CONST_BLACK_IMAGE			= "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
export const CONST_GRAY_IMAGE			= "data:image/png;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==";
export const CONST_GRAY2_IMAGE			= "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkmHeuHgAD/wHtl6zvXQAAAABJRU5ErkJggg==";
export const CONST_WHITE_IMAGE			= "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=";
export const DESC_MAX_CHARS				= 60;

// Locale constants
export const LOCALE_SPAIN				= 'es-ES';
export const LOCALE_OPTIONS				= { year: "2-digit", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true };

// HTML Dataset constants
export const DATASET_PREFIX				= "data-bsky-";

// HTML App Version Constants
export const APP_NAME					= "appName";
export const APP_VERSION				= "appVersion";
export const DIV_VERSION				= "panelVersion";

// HTML Login Form Constants
export const USER_HANDLE				= "userHandle";
export const BTN_LOGIN					= "buttonLogin";

// HTML Root Panel
export const DIV_ROOT_PANEL				= "rootPanel";

// HTML Info & Error Panels
export const DIV_PANEL_INFO				= "panelInfo";
export const DIV_PANEL_ERROR			= "panelError";
export const DIV_PANEL_INFO_STEP		= `${DIV_PANEL_INFO}Step`;
export const DIV_ERROR					= "error";
export const DIV_ERROR_DESCRIPTION		= "errorDescription";

// HTML Auth
export const DIV_ISS					= "iss";
export const DIV_STATE					= "state";
export const DIV_CODE					= "code";
export const DIV_DPOP_NONCE				= "dpopNonce";

// HTML Token, Date/Time, Geo
export const DIV_TOKEN_TIMEOUT			= "currentTokenTimeout";
export const DIV_DATE_TIME				= "currentDateTime";
export const DIV_GEOLOCATION			= "currentGeolocation";
export const DIV_CLIENT_ID				= "clientId";
export const DIV_BTN_CLIENT_ID			= "buttonClientId";
export const DIV_BTN_DID_DOCUMENT		= "buttonDIDDocument";
export const DIV_ACCESS_TOKEN_JSON		= "accessTokenJson";
export const DIV_ACCESS_TOKEN_JWT		= "accessTokenJwt";

// HTML Git
export const DIV_GIT_INFO				= "gitInfo";
export const DIV_GIT_INFO_JSON			= "gitInfoContents";

// HTML Toasts
export const DIV_TOAST_WELCOME			= "toastWelcome";
export const DIV_TOAST_INFO				= "toastInformation";

// HTML Profile
export const DIV_PROFILE_AVATAR			= "profileAvatar";
export const DIV_PROFILE_AVATAR_TOP		= "profileAvatarTop";
export const DIV_PROFILE_DESCRIPTION	= "profileDescription";
export const DIV_PROFILE_FOLLOWERS		= "profileFollowers";
export const DIV_PROFILE_FOLLOWING		= "profileFollowing";
export const DIV_PROFILE_HANDLE			= "profileHandle";
export const DIV_PROFILE_HANDLE_LINK	= "profileHandleLink";
export const DIV_PROFILE_HANDLE_TOP		= "profileHandleTop";
export const DIV_PROFILE_NAME			= "profileName";
export const DIV_PROFILE_NAME_TOP		= "profileNameTop";
export const DIV_PROFILE_POSTS			= "profilePosts";

// HTML Modal Constants
export const DIV_MODAL_SETTINGS			= "modalSettings";
export const DIV_MODAL_VERSION			= "modalVersion";
export const DIV_MODAL_SEARCH_USER		= "modalSearchUser";
export const DIV_MODAL_SEARCH_PATTERN	= "modalSearchProfilePattern";
export const DIV_MODAL_SEARCH_OUTPUT	= "modalSearchProfileResults";

// HTML User Profile
export const DIV_MODAL_USER_PROFILE		= "modalUserProfile";
export const RELATION_FOLLOW			= "relation-follow";
export const RELATION_BLOCKED			= "relation-blocked";
export const RELATION_MUTED				= "relation-muted";

// HTML normal DIVs/Placeholders constants
export const DIV_TAB_MUTED_BADGE		= "pill-muting-badge";
export const DIV_TAB_MY_LISTS_BADGE		= "pill-my-lists-badge";
export const DIV_TABLE_MY_LISTS			= "table-my-lists";
export const DIV_TABLE_MUTING			= "table-muting";
export const DIV_TRENDING_TOPICS		= "trendingTopics";
export const DIV_TABLE_MY_MOD_M_LISTS	= "table-my-mod-muting-lists";
export const DIV_TABLE_MY_MOD_B_LISTS	= "table-my-mod-blocking-lists";

// HTML Notifications constants
export const DIV_TAB_NOTIS_BADGE		= "pill-notifications-badge";
export const DIV_PANEL_NOTIFICATIONS	= "panelNotifications";
export const DIV_NOTIFICATIONS			= "notifications";

// HTML Following constants
export const DIV_TAB_FOLLOWING_BADGE	= "pill-following-badge";
export const DIV_TAB_FOLLOWING_TOTAL	= "formFollowingTotal";
export const DIV_PANEL_FOLLOWING		= "panelFollowing";
export const DIV_TABLE_FOLLOWING		= "tableFollowing";

// HTML Followers constants
export const DIV_TAB_FOLLOWERS_BADGE	= "pill-followers-badge";
export const DIV_TAB_FOLLOWERS_TOTAL	= "formFollowersTotal";
export const DIV_PANEL_FOLLOWERS		= "panelFollowers";
export const DIV_TABLE_FOLLOWERS		= "tableFollowers";

// HTML Blocking constants
export const DIV_TAB_BLOCKS_BADGE		= "pill-blocking-badge";
export const DIV_PANEL_BLOCKING			= "panelBlocking";
export const DIV_TABLE_BLOCKING			= "tableBlocking";

// Common MIME Types
export const MIME_TYPE_JSON				= MIMETYPES.filter( x => x.mime === "application/json" )[0];


