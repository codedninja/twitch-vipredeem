# Twitch VIP redeem

## About

Twitch channels have channel points, you can use those points to redeem a reward. Some streamers give them an option to redeem a VIP for a certain period of time. This automates that process.

## Prerequisite

- NodeJS
- Ability to run setup process in a terminal
- Twitch Developer Client ID & Client Secret
- Twitch Application with callback redirect set to "http://localhost:9090/callback"

## Inital setup

```terminal
# npm install

# node app.js --setup
Twitch Client ID: xxxxxxxxxxxxxxxxxxx
Twitch Client Secret: xxxxxxxxxxxxxxxxxxx
Visit the URL for the auth dialog: https://id.twitch.tv/oauth2/authorize?client_id=xxxxxxxxxxxxxxxxxxx&redirect_uri=http%3A%2F%2Flocalhost%3A9090%2Fcallback&response_type=code&scope=chat%3Aread%20chat%3Aedit%20channel%3Amoderate%20channel%3Aread%3Aredemptions
Paste URL Here: http://localhost:9090/callback?code=xxxxxxxxxxxxxxxxxxx&scope=chat%3Aread+chat%3Aedit+channel%3Amoderate+channel%3Aread%3Aredemptions
1: Another reward
2: VIP for a week
Enter numer of reward to auto VIP for: 2
How long should they have VIP for? (Seconds): 60
Settings have been saved, you can now run the bot.
```

## Run

```terminal
node app.js
```
