let mongoose = require('mongoose')
let crypto = require('crypto')

let userSchema = mongoose.Schema({
    local: {
	    email: {
	      type: String,
	      required: true
	    },
	    password: {
	      type: String,
	      required: true
	    }
  },

  facebook: {
	    id: String,
	    token: String,
	    email: String,
	    name: String,
	    account: {
	    }
  },

  twitter: {
	    id: String,
	    token: String,
	    username: String,
	    displayname: String,
	    secret: String,
	  },
})

module.exports = mongoose.model('User', userSchema)