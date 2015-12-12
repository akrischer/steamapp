# steamapp

### What is it?

Parse Cloud code repository for an application to help find Steam users find a game in their library to play. Specifically, this repo is the API defined [here](http://docs.hcisteamapp.apiary.io/#).

### Why do I care?

This API gives the following functionalities:

  - Get a Steam user's public library information, including what games they like to play and their associated tags.
  - Filter out games from a user's libraries based on game id or Steam tags
  - Use predefined questions/criteria to help filter out games a user may or may not want to play
  - Notion of sessions, so that a user's preferences can be saved, updated, and retrieved on demand
  - Doing all the heavy-lifting for collecting all Steam-specific information

### How do I use it?

At this time, the code is tightly coupled with the Parse framework (that most likely will not change), but more importantly I don't have an open-facing API for the public. Also, not all of the API is completely developed in order to 'release' it. **This is being worked on.**

Currently, there is a pseudo-REST API to interact with. What I am currently working on is wrapping it in a real RESTful-URL-style API. Similarly, some functionality needs to be updated/implemented regarding creating/getting users.

