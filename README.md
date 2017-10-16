# ssb-electroparty-download-server
_Custom-made, yet generic desktop application binaries for Secure Scuttlebutt_

This is a download server for desktop applications based on ssb-electroparty.

## Why?

Building multi-platform client applications for Secure Scuttlebutt is hard. You need to have access to all of the target operating systems in all architectures you want to support. For example, you'd need to install Windows in a 32bit and a 64bit version, if you wnat your application to support these architectures. It doesn't end here, you also need to have a working C/C++ build environment on each platform in order to build the native npm modules that Scuttlebot depends on.

This module explores an alternative approach. As a community we collaborate on building _one_ executable per platform and share it among applications! This works for applications that don't need anything else but a vanilla sbot with no custom plugins.

## Features

- Support for multiple platforms and profiles (e.g. "end user" or "kiosk system")
- Embeds a customized config file on the fly, during download
- Download URL contains configuration data

# Workflow

1. You generate a 'magic file' as a placeholder for the config data you want to embed

2. You build ssb-electroparty for the platforms you want to support (chances are. somebody already did that for you.) Note, the electroparty build output is platform-specific, but not application-specifi!

3. You place the magic file into the build output, and call it 'config' (or any other name you like)

4. You pack and zip the build output along with the magic file.

5. You prepare an application-specific config file (called a "profile"). This is an ssb-client/sbot config files with some extra properties that configure Electron's BrowserWindow and stuff like that). You also put your application-specific configuration here. You can have mutliple application profiles for dufferent applications or different use cases of the same application (for a kisok mode, for example)

6. You copy the platform files from step 4 and the application profiles from step 5 to your download server.

7. For each user you want to invite to your application

  - 7a. You create a user-specific config file. This file will be "overlayed" on top of the application profile, so you don't have to repeat properties, and you can override them. (The two config objects are deep-merged)

  - 7b. Create a user-specific download link and share it with your soon-to-be new user.

## How it works

- When the linke is clicked, the download server extracts the user-specific config from the url. It then merges it with the application-profile, a reference to which is also found in the URL.
- The server starts streaming the zip file to the user, warching the stream for the beginning of the magic data.
- When it sees the magic data, it replaces it with the merged configuration.

## What you can do with this

### Invites Links and Automatic Onboarding

### Bootloading your client code from a Blob

 
