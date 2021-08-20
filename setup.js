const readline = require('readline');
const url = require('url');
const util = require('util');
const moment = require('moment');
const { default: axios } = require('axios');
const fs = require('fs');
const { Main } = require("./main")


setup = {
    redirectURI: "http://localhost:9090/callback",
    authorizeURI: "https://id.twitch.tv/oauth2/authorize",
    tokenURI: "https://id.twitch.tv/oauth2/token",
    apiURI: "https://api.twitch.tv/helix",

    clientID: "",
    clientSecret: "",
    scope: [
        "chat:read",
        "chat:edit",
        "channel:moderate",
        "channel:read:redemptions",
    ],

    start: function() {
        console.log("You need a Client ID and Client Secret from https://dev.twitch.tv/");

        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        this.requestClientID();
    },
    
    requestClientID: function () {
        this.rl.question("Twitch Client ID: \n", (clientID) => {
            this.clientID = clientID

            this.requestClientSecret()
        });
    },

    requestClientSecret: function () {
        this.rl.question("Twitch Client Secret: \n", (clientSecret) => {
            this.clientSecret = clientSecret

            this.generateOAuthURI()
        });
    },

    generateOAuthURI: function () {
        scope = encodeURIComponent(this.scope.join(" "))
        uri = util.format("%s?client_id=%s&redirect_uri=%s&response_type=code&scope=%s", this.authorizeURI, this.clientID, encodeURIComponent(this.redirectURI), scope)
        console.log(uri);
        
        this.requestOAuthRedirectURI()
    },

    requestOAuthRedirectURI: function () {
        this.rl.question("Paste Redirected URL Here: \n", (redirected_url) => {
            code = new URL(redirected_url).searchParams.get("code");

            this.exchangeCode(code)
            // this.token = this.client.exchange(code, this.parseExchangedCode);
        });
    },

    exchangeCode: function (code) {
        uri = util.format(
            "%s?client_id=%s&client_secret=%s&code=%s&grant_type=authorization_code&redirect_uri=%s",
            this.tokenURI,
            this.clientID,
            this.clientSecret,
            code,
            this.redirectURI
        )

        axios.post(uri, {})
            .then((resp) => {
                this.token = {
                    access_token: resp.data.access_token,
                    refresh_token: resp.data.refresh_token,
                    expires_at: moment().add(resp.data.expires_in, "s"),
                }

                axios.defaults.headers.common['Client-Id'] = this.clientID
                axios.defaults.headers.common['Authorization'] = "Bearer " + this.token.access_token

                this.getUser()
            });
    },

    getUser: function () {
        axios.get(this.apiURI+"/users")
            .then((resp) => {
                this.user = resp.data.data[0]
                
                this.getRewards()
            })
    },

    getRewards: function () {
        axios.get(this.apiURI + "/channel_points/custom_rewards?broadcaster_id="+this.user.id)
            .then((resp) => {
                this.rewards = resp.data.data;
                
                this.chooseReward()
            })
    },

    chooseReward: function () {
        for (let x = 0; x < this.rewards.length; x++) {
            const reward = this.rewards[x];

            console.log((x+1)+": "+reward.title)
        }

        this.rl.question("Enter numer of reward to auto VIP for: \n", (choice) => {
            this.reward = this.rewards[choice - 1]
            
            this.requestDuration()
        });
    },

    requestDuration: function () {
        this.rl.question("How long should they have VIP for? (Seconds): \n", (choice) => {
            this.duration = choice

            this.saveSettings()
        })
    },

    saveSettings: function () {
        this.settings = {
            client_id: this.clientID,
            client_secret: this.clientSecret,
            user: this.user,
            token: this.token,
            reward: this.reward,
            duration: this.duration
        }

        fs.writeFile("settings.json", JSON.stringify(this.settings), (err) => {
            if (err) {
                console.log(err)
            }
        })

        this.rl.close()

        console.log("Settings have been saved, you can now run the bot.")

        m = new Main()
        m.start()
    }
}

module.exports = { setup };