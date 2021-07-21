const fs = require('fs');
const axios = require('axios');
const moment = require('moment');
const util = require('util');
const { PubSubClient } = require('twitch-pubsub-client');
const { ApiClient } = require('twitch');
const { RefreshableAuthProvider, StaticAuthProvider } = require('twitch-auth');
const { ChatClient } = require('twitch-chat-client');

class Main {
    redirectURI = "http://localhost:9090/callback"
    authorizeURI = "https://id.twitch.tv/oauth2/authorize"
    tokenURI = "https://id.twitch.tv/oauth2/token"
    apiURI = "https://api.twitch.tv/helix"

    settings = {}

    redeems = {}

    start() {
        fs.readFile("settings.json", "utf8", (err, data) => {
            if (err) {
                return console.log(err)
            } else {
                this.settings = JSON.parse(data)
                this.settings.token.expires_at = moment(this.settings.token.expires_at)

                this.loadRedeems()

                this.initPubsub()
            }
        });
    }

    async loadRedeems() {
        await fs.readFile("redeems.json", "utf8", (err, data) => {
            if (err) {
                return console.log(err)
            } else {
                this.redeems = JSON.parse(data)

                Object.keys(this.redeems).map((key, index) => {
                    this.redeems[key].expires_at = moment(this.redeems[key].expires_at)

                    if (this.redeems[key].expires_at.isBefore(moment())) {
                        this.unvip(this.redeems[key])
                        delete this.redeems[key]
                    }
                })

                this.saveRedeems()

                this.settings.token.expires_at = moment(this.settings.token.expires_at)

                setInterval(this.checkExpiredRedeems.bind(this), 1000);
            }
        });
    }

    refreshToken() {
        uri = util.format(
            "%s?grant_type=refresh_token&refresh_token=%s&client_id=%s&client_secret=%s",
            this.tokenURI,
            this.settings.token.refresh_token,
            this.settings.client_id,
            this.settings.client_secret,
        )

        axios.post(uri, {})
            .then((resp) => {
                this.settings.token = {
                    access_token: resp.data.access_token,
                    refresh_token: resp.data.refresh_token,
                    expires_at: moment().add(resp.data.expires_in, "s"),
                }

                console.log("Refreshed Token...")

                fs.writeFile("settings.json", JSON.stringify(this.settings), (err) => {
                    if (err) {
                        console.log(err)
                    } else {
                        this.initPubsub()
                    }
                })
            })
    }

    async initPubsub() {
        
        this.authProvider = new RefreshableAuthProvider(new StaticAuthProvider(this.settings.client_id, this.settings.token.access_token),
            {
                clientSecret: this.settings.client_secret,
                refreshToken: this.settings.token.refresh_token,
                expiry: this.settings.token.expires_at.toDate(),
                onRefresh: async ({ accessToken, refreshToken, expiryDate }) => {
                    this.settings.token = {
                        access_token: accessToken,
                        refresh_token: refreshToken,
                        expires_at: expiryDate === null ? null : expiryDate.getTime()
                    }
                    
                    await fs.writeFile("settings.json", JSON.stringify(this.settings), (err) => {
                        if (err) {
                            console.log(err)
                        } else {
                            console.log("Saved settings")
                        }
                    })
                }
            }
        )

        this.apiClient = new ApiClient({ authProvider: this.authProvider })
        
        let pubSubClient = new PubSubClient();

        await pubSubClient.registerUserListener(this.apiClient, this.settings.user.id);

        this.listener = await pubSubClient.onRedemption(this.settings.user.id, (redeem) => {
            if (redeem.rewardId == this.settings.reward.id) {
                if (this.redeems[redeem.userId]) {
                    let temp = this.redeems[redeem.userId]
                    temp.expires_at = temp.expires_at.add(this.settings.duration, 's')
                    temp.redeem = {
                            id: redeem.id,
                            display_name: redeem.userDisplayName,
                            user_id: redeem.userId,
                            username: redeem.userName
                        }
                    this.redeems[redeem.userId] = temp
                } else {
                    this.redeems[redeem.userId] = {
                        expires_at: moment().add(this.settings.duration, 's'),
                        redeem: {
                            id: redeem.id,
                            display_name: redeem.userDisplayName,
                            user_id: redeem.userId,
                            username: redeem.userName
                        }
                    }
                    
                    this.vip(this.redeems[redeem.userId])
                }

                this.saveRedeems()
                
                console.log(redeem.userDisplayName+" has redeemed "+this.settings.reward.title)
            }
        });
        
    }
    
    async saveRedeems() {
        await fs.writeFile("redeems.json", JSON.stringify(this.redeems), (err) => {
            if (err) {
                console.log(err)
            } else {
                console.log("Redeems has been saved.")
            }
        })
    }

    test() {
        console.log(this.redeems)
    }

    checkExpiredRedeems() {
        Object.keys(this.redeems).map((key, index) => {
            if (this.redeems[key].expires_at.isBefore(moment())) {
                this.unvip(this.redeems[key])
                delete this.redeems[key]

                this.saveRedeems()
            }
        })
    }

    async unvip(redeem) {
        const chatClient = new ChatClient(this.authProvider, { channels: [this.settings.user.login] });

        await chatClient.connect()

        chatClient.onMessage(async (channel, user, message, msg) => {
            console.log(message)
        });

        chatClient.onAuthenticationFailure((message) => {
            // console.log(message)
            this.unvip(redeem)
        })

        chatClient.onJoin(async (channel, user) => {
            await chatClient.removeVip(this.settings.user.login, redeem.redeem.username).catch((reason) => {
                console.log(reason)
            })

            chatClient.quit()
        })

        await chatClient.onRegister

        await chatClient.onDisconnect

        console.log("UNVIP "+redeem.redeem.display_name)
    }

    async vip(redeem) {
        const chatClient = new ChatClient(this.authProvider, { channels: [this.settings.user.login] });

        await chatClient.connect()

        chatClient.onMessage(async (channel, user, message, msg) => {
            console.log(message)
        });

        chatClient.onAuthenticationFailure((message) => {
            console.log(message)
            this.vip(redeem)
        })

        chatClient.onJoin(async (channel, user) => {
            await chatClient.addVip(this.settings.user.login, redeem.redeem.username).catch((reason) => {
                console.log(reason)
            })

            chatClient.quit()
        })

        await chatClient.onRegister

        await chatClient.onDisconnect

        console.log("VIP "+redeem.redeem.display_name)
    }
}

module.exports = { Main }