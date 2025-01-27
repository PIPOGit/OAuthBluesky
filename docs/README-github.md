
Bluesky OAuth2 Client, with Vanilla JavaScript
===================================================

## Bluesky OAuth2 Client, with Vanilla JavaScript

Hi, there! ;^)

### Introduction
This repo is about integrating **Bluesky Authentication** (***OAuth** + **DPoP***) in a "*serverless*" client application, ruled with only "*Vanilla JavaScript*".
Fine for You? Ok... Let's go!

### DISCLAIMER
This post is merely to illustrate "*how-to*". It's not a "*working example*"; mainly 'cause the tokens expire! ;^)

If you see any error, please don't doubt on contacting me.

The article that explains "*how-to*" has been posted in [**dev.to**](https://dev.to/pipodev/bluesky-oauth2-client-with-vanilla-javascript-1f6h)


## Download and install

Just download the repo in a local folder and take note about the directory/folder where You have placed it.

Once downloaded, you need an Apache Server instance to run it, and configure it to be served.
Here, We will use a "**`Location`**" directive, but can be configure using a "*Virtual Host*" either. No differences.

```apacheconf
Alias /neocities "[path_to_your_local_folder]"
<Directory "[path_to_your_local_folder]">
	AllowOverride None
	Require all granted
</Directory>
```

## Configure

After that, if you need to tune-up the configuration file, the file is located in: [[path_to_your_local_folder]/js/data/config.json](./js/data/config.json)

But it should work "*ootb*": "*out-of-the-box*"

## Run
And that's it!

After that, it's as easy as to point to: http://localhost/neocities/index.html

Enjoy!
