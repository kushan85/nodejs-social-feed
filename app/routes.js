let _ = require('lodash')
let isLoggedIn = require('./middlewares/isLoggedIn')
let Twitter = require('twitter')
let FB = require('fb')
let then = require('express-then')
let authConfig = require('../config/auth')
const NODE_ENV = process.env.NODE_ENV ? process.env.NODE_ENV : 'development'

let networks = {
    twitter: {
        icon: 'twitter',
        name: 'twitter',
        class: 'btn-info'
    },
    facebook: {
        icon: 'facebook',
        name: 'facebook',
        class: 'btn-primary'
    }
}

module.exports = (app) => {
    let passport = app.passport
    let twitterConfig = authConfig[NODE_ENV].twitter
    let fbConfig = authConfig[NODE_ENV].facebook

    FB.options({
        	appId: fbConfig.consumerKey,
        	appSecret: fbConfig.consumerSecret,
        	redirectUri: fbConfig.redirectUri
    	})

    app.get('/', (req, res) => res.render('index.ejs'))

    app.get('/profile', isLoggedIn, (req, res) => {
        res.render('profile.ejs', {
            user: req.user,
            message: req.flash('error')
        })
    })

    app.get('/logout', (req, res) => {
        req.logout()
        res.redirect('/')
    })

    app.get('/login', (req, res) => {
        res.render('login.ejs', {message: req.flash('error')})
    })

    app.get('/signup', (req, res) => {
        res.render('signup.ejs', {message: req.flash('error') })
    })

    /**
     *	Timeline for twitter and facebook
     */
    app.get('/timeline', isLoggedIn, then(async (req, res) => {
		console.log('timeline')
		let twitterClient = new Twitter({
            consumer_key: twitterConfig.consumerKey,
            consumer_secret: twitterConfig.consumerSecret,
            access_token_key: req.user.twitter.token,
            access_token_secret: req.user.twitter.secret
        })
        let [tweets,] = await twitterClient.promise.get('/statuses/home_timeline')
        tweets = tweets.map(tweet => {
            return {
                id: tweet.id_str,
                image: tweet.user.profile_image_url,
                text: tweet.text,
                name: tweet.user.name,
                username: '@' + tweet.user.screen_name,
                liked: tweet.favorited,
                network: networks.twitter
            }
        })
        
    	let userPicture
    	let posts
        try {
            posts = await FB.api.promise('/me/feed', {
                    fields: 'id,name,picture,message,likes,story',
                    limit: 10,
                    access_token: req.user.facebook.token
                })
        } catch (e) {
        	// not sure why its going into catch
            posts = e.data
        }

        // try {
        //     userPicture = await FB.api.promise('/me/picture',{
        //     	access_token: req.user.facebook.token,
        //     })
        // } catch (err) {
        // 	console.log(err)
        // }
        let fbposts = []
        for (let post of posts) {
        	let liked = false
        	if (post.likes) {
	            liked = true
	        }
        	fbposts.push({
                id: post.id,
                image: userPicture,
                text: post.message,
                name: post.name,
                liked: liked,
                network: networks.facebook
            })
        }
        let aggregatedPosts = _.union(fbposts, tweets)
        res.render('timeline.ejs', {
                posts: aggregatedPosts
        })
 	}))

    /**
     *	Compose post view
     */
    app.get('/compose', isLoggedIn, (req, res) => {
        res.render('compose.ejs')
    })

    /**
     *	Compose post message to post to twitter/facebook
     */
    app.post('/compose', isLoggedIn, then(async(req, res) => {
        console.log('req.body', req.body)
        let text = req.body.reply
        let postTo = req.body.postTo
        if (postTo.length == 0) {
            return req.flash('error', 'You have to at least pick one network')
        }

        if (text.length > 140) {
            return req.flash('error', 'status is over 140 chars')
        }
        if (!text.length) {
            return req.flash('error', 'status is empty')
        }
        let twitterClient = new Twitter({
            consumer_key: twitterConfig.consumerKey,
            consumer_secret: twitterConfig.consumerSecret,
            access_token_key: req.user.twitter.token,
            access_token_secret: req.user.twitter.secret
        })
        if (postTo.indexOf('twitter') >= 0) {
            console.log('posting to twitter')
            try {
                await twitterClient.promise.post('statuses/update', {
                    status: text
                })
            } catch (e) {
                console.log(e)
            }
        }
        if (postTo.indexOf('facebook') >= 0) {
            console.log('posting to facebook')
            try {
                await FB.api.promise(`${req.user.facebook.id}/feed`, 'post', {
                    access_token: req.user.facebook.token,
                    message: text
                })
            } catch (e) {
                console.log("><e", e)
            }
        }
        return res.redirect('/timeline')
    }))

    /**
     *	FB like and unlike
     */
    app.post('/facebook/like/:id', isLoggedIn, then(async(req, res) => {
        let id = req.params.id
        let uri = `/${id}/likes`
        try {
            await FB.api.promise(uri, 'post', {
                access_token: req.user.facebook.token
            })
        } catch (e) {
        	console.log(e)
        }
        res.end()
    }))

    app.post('/facebook/unlike/:id', isLoggedIn, then(async(req, res) => {
        let id = req.params.id
        let uri = `/${id}/likes`
        try {
            await FB.api.promise(uri, 'delete', {
                access_token: req.user.facebook.token
            })
        } catch (e) {
        	console.log(e)
        }
        res.end()
    }))

    /**
	 *	Twitter like post
	 */
    app.post('/twitter/like/:id', isLoggedIn, then(async(req, res) => {
        let twitterClient = new Twitter({
            consumer_key: twitterConfig.consumerKey,
            consumer_secret: twitterConfig.consumerSecret,
            access_token_key: req.user.twitter.token,
            access_token_secret: req.user.twitter.secret
        })
        let id = req.params.id

        await twitterClient.promise.post('favorites/create', {
            id
        })

        res.end()
    }))

    /**
	 *	Twitter unlike post
	 */
    app.post('/twitter/unlike/:id', isLoggedIn, then(async(req, res) => {
        let twitterClient = new Twitter({
            consumer_key: twitterConfig.consumerKey,
            consumer_secret: twitterConfig.consumerSecret,
            access_token_key: req.user.twitter.token,
            access_token_secret: req.user.twitter.secret
        })
        let id = req.params.id

        await twitterClient.promise.post('favorites/destroy', {
            id
        })

        res.end()
    }))

    /**
     *	Twitter reply view (GET)
     */
    app.get('/twitter/reply/:id', isLoggedIn, then(async(req, res) => {
        let twitterClient = new Twitter({
            consumer_key: twitterConfig.consumerKey,
            consumer_secret: twitterConfig.consumerSecret,
            access_token_key: req.user.twitter.token,
            access_token_secret: req.user.twitter.secret
        })
        console.log('params', req.params)
        let id = req.params.id
        let [tweet, ] = await twitterClient.promise.get('/statuses/show/' + id)

        tweet = {
            id: tweet.id_str,
            image: tweet.user.profile_image_url,
            text: tweet.text,
            name: tweet.user.name,
            username: '@' + tweet.user.screen_name,
            liked: tweet.favorited,
            network: networks.twitter
        }

        res.render('reply.ejs', {
            post: tweet
        })
    }))

    /**
     *	Twitter reply (post)
     */
    app.post('/twitter/reply/:id', isLoggedIn, then(async(req, res) => {
        let twitterClient = new Twitter({
            consumer_key: twitterConfig.consumerKey,
            consumer_secret: twitterConfig.consumerSecret,
            access_token_key: req.user.twitter.token,
            access_token_secret: req.user.twitter.secret
        })
        let id = req.params.id
        let text = req.body.reply
        if (text.length > 140) {
            return req.flash('error', 'status is over 140 chars')
        }
        if (!text.length) {
            return req.flash('error', 'status is empty')
        }

        console.log('Reply to id ' + id)
        await twitterClient.promise.post('/statuses/update', {
            status: '@kushan85 ' + text,
            in_reply_to_status_id: id
        })
        return res.end()
    }))


    /**
     *	Facebook share get
     */
    app.get('/facebook/share/:id', isLoggedIn, then(async(req, res) => {
        let id = req.params.id
        let post = {
            id: id,
            text: req.query.text, //post.story || post.message,
            name: req.query.name, //post.from.name,
            image: decodeURIComponent(req.query.img) + '',
            network: networks.facebook
        }

        res.render('share.ejs', {
            post: post
        })
    }))

    app.post('/facebook/share/:id', isLoggedIn, then(async(req, res) => {
        let id = req.params.id
        let text = req.body.share
        if (!text.length) {
            return req.flash('error', 'status is empty')
        }
        let uri = `/${id}/sharedposts`
        try {
            await FB.api.promise(uri, 'post', {
                access_token: req.user.facebook.token,
                message: text
            })
        } catch (e) {
            console.log("e", e)
        }
        res.end()
    }))

    /**
     *	twitter share get
     */
    app.get('/twitter/share/:id', isLoggedIn, then(async(req, res) => {
        let twitterClient = new Twitter({
            consumer_key: twitterConfig.consumerKey,
            consumer_secret: twitterConfig.consumerSecret,
            access_token_key: req.user.twitter.token,
            access_token_secret: req.user.twitter.secret
        })
        let id = req.params.id
        let [tweet, ] = await twitterClient.promise.get('/statuses/show/' + id)

        tweet = {
            id: tweet.id_str,
            image: tweet.user.profile_image_url,
            text: tweet.text,
            name: tweet.user.name,
            username: '@' + tweet.user.screen_name,
            liked: tweet.favorited,
            network: networks.twitter
        }

        res.render('share.ejs', {
            post: tweet
        })
    }))


    /**
     *	Twitter post share
     */
    app.post('/twitter/share/:id', isLoggedIn, then(async(req, res) => {
        let twitterClient = new Twitter({
            consumer_key: twitterConfig.consumerKey,
            consumer_secret: twitterConfig.consumerSecret,
            access_token_key: req.user.twitter.token,
            access_token_secret: req.user.twitter.secret
        })
        let id = req.params.id
        console.log('req.body', req.body)
        let text = req.body.share
        if (text.length > 140) {
            return req.flash('error', 'status is over 140 chars')
        }
        if (!text.length) {
            return req.flash('error', 'status is empty')
        }
        try {
            await twitterClient.promise.post('/statuses/retweet/' + id, {
                text
            })
        } catch (e) {
            console.log(e)
        }
        return res.end()
    }))

	app.post('/login', passport.authenticate('local', {
	    successRedirect: '/profile',
	    failureRedirect: '/',
	    failureFlash: true
	}))

	// process the signup form
	app.post('/signup', passport.authenticate('local-signup', {
	    successRedirect: '/profile',
	    failureRedirect: '/',
	    failureFlash: true
	}))


    let scope = 'email, user_posts, user_likes, publish_actions'
    app.get('/auth/facebook', passport.authenticate('facebook', {scope}))
	app.get('/auth/facebook/callback', passport.authenticate('facebook', {
    	successRedirect: '/profile',
    	failureRedirect: '/profile',
    	failureFlash: true
	}))

	// Authorization route & Callback URL
	app.get('/connect/facebook', passport.authorize('facebook', {scope}))
	app.get('/connect/facebook/callback', passport.authorize('facebook', {
    	successRedirect: '/profile',
    	failureRedirect: '/profile',
    	failureFlash: true
	}))

	app.get('/auth/twitter', passport.authenticate('twitter', {scope}))
	app.get('/auth/twitter/callback', passport.authenticate('twitter', {
    	successRedirect: '/profile',
    	failureRedirect: '/profile',
    	failureFlash: true
	}))

	// Authorization route & Callback URL
	app.get('/connect/twitter', passport.authorize('twitter', {scope}))
	app.get('/connect/twitter/callback', passport.authorize('twitter', {
    	successRedirect: '/profile',
    	failureRedirect: '/profile',
    	failureFlash: true
	}))
}