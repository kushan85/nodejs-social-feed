// config/auth.js
module.exports = {
  'development': {
    'facebook': {
      'consumerKey': '1916688881890763',
      'consumerSecret': 'c94dd319daf5af0a49abc59268fd8424',
      'callbackUrl': 'http://kshah-authenticator.com:8000/auth/facebook/callback'
    },
    'twitter': {
      'consumerKey': 'ba8E9BowkpTc4YLGuT4rIj1Tw',
      'consumerSecret': 'K4K4IZGgVafmZeNZz5suphuhIjlGj8k9a65szdyLFv5GH019VA',
      'callbackUrl': 'http://kshah-authenticator.com:8000/auth/twitter/callback'
    },
    'google': {
      'consumerKey': '446585441765-unda5mjs6307q1pqobvhiqj87m9m2kh1.apps.googleusercontent.com',
      'consumerSecret': '...',
      'callbackUrl': 'http://kshah-authenticator.com:8000/auth/google/callback'
    }
  }
}
