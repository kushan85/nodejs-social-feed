let passport = require('passport')
let wrap = require('nodeifyit')
let LocalStrategy = require('passport-local').Strategy
let FacebookStrategy = require('passport-facebook').Strategy
let TwitterStrategy = require('passport-twitter').Strategy
let crypto = require('crypto')
let SALT = 'CodePathHeartNodeJS'
let User = require('../models/user')

require('songbird')

passport.use('local', new LocalStrategy({
    usernameField: 'email',
    failureFlash: true // Enables error messaging
}, wrap(async (email, password) => {
	let user = await User.findOne({'local.email':email}).exec()
 	if (email !== user.local.email) {
     return [false, {message: 'Invalid username'}]
 	}

  let passwordHash = await crypto.promise.pbkdf2(password, SALT, 4096, 512, 'sha256')
 	if (passwordHash.toString('hex') !== user.password) {
     return [false, {message: 'Invalid password'}]
 	}
 	return user
}, {spread: true})))

passport.use('local-signup', new LocalStrategy({
   usernameField: 'email'
}, wrap(async (email, password) => {
    email = (email || '').toLowerCase()

    if (await User.findOne({'local.email': email})) {
        return [false, {message: 'That email is already taken.'}]
    }

    let user = new User()
    user.local.email = email

    // Store password as a hash instead of plain-text
    user.local.password = (await crypto.promise.pbkdf2(password, SALT, 4096, 512, 'sha256')).toString('hex')
    return await user.save()
}, {spread: true})))

function loadPassportStrategy(OauthStrategy, config, accountType) {
    config.passReqToCallback = true
  
  	passport.use(new OauthStrategy(config, wrap(authCB, {spread: true})))

	  async function authCB(req, token, _ignored_, account) {
		console.log('authCB() is called')
	  	console.log('token: ' + token)

	  	if(accountType === 'facebook') {
	  		let user = await User.findOne({'facebook.id': account.id})
		  	if(!user) {
		  		let user = req.user
				user.facebook.id = account.id
				user.facebook.email = account.emails[0].value
				user.facebook.token = token
				user.facebook.name = account.username
				console.log('saving facebook user: ' + JSON.stringify(user))
				try {
					await user.save()
					user.facebook.account = account
					req.user = user
					return user
				} catch (e) {
					console.log(e)
					return [false, {message: e.message}]
				}
			} else {
				return user
			}
	  	} else if(accountType === 'twitter') {
	  		//console.log(account)
	  		let user = await User.findOne({'twitter.id': account.id})
	  		if(!user) {
		  		let user = req.user
				user.twitter.id = account.id
				user.twitter.token = token
				user.twitter.displayname = account.displayName
				user.twitter.username = account.username
				user.twitter.secret = _ignored_
				console.log('saving twitter user: ' + JSON.stringify(user))
				try {
					await user.save()
					user.twitter.account = account
					req.user = user
					return user
				} catch (e) {
					console.log(e)
					return [false, {message: e.message}]
				}
			} else {
				return user
			}
	  	}
	  }
}

passport.serializeUser(wrap(async (user) => user.local.email))

passport.deserializeUser(wrap(async (email) => {
    return await User.findOne({'local.email': email}).exec()
}))

function configure(authConfig) {

	loadPassportStrategy(FacebookStrategy, {
		clientID: authConfig.facebook.consumerKey,
		clientSecret: authConfig.facebook.consumerSecret,
		callbackURL: authConfig.facebook.callbackUrl,
		profileFields: ['id', 'email', 'gender', 'link', 'locale', 'name', 'timezone', 'updated_time', 'verified'],
	}, 'facebook')

	loadPassportStrategy(TwitterStrategy, {
		consumerKey: authConfig.twitter.consumerKey,
		consumerSecret: authConfig.twitter.consumerSecret,
		callbackURL: authConfig.twitter.callbackUrl,
		profileFields: ['id', 'email', 'gender', 'link', 'locale', 'name', 'timezone', 'updated_time', 'verified'],
	}, 'twitter')
}

module.exports = {passport, configure}
