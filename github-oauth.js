/**
 * github-auth.js
 *
 * copyright 2015, Jurgen Leschner - github.com/jldec - MIT license
**/

var debug   = require('debug')('pub:github');
var qs      = require('querystring');
var ms      = require('ms');

module.exports = function githubOAuth(server) {

  if (!(this instanceof githubOAuth)) return new githubOAuth(server);
  var self = this;

  var app  = server.app;

  var opts = server.opts.github || {};

  var request = require('request')
    .defaults({ timeout:('timeout' in opts ? ms(opts.timeout) : 4000) });

  var url  = opts.url || process.env.GHU || '/server/auth/github';

  require('assert')(process.env.GHID && process.env.GHCS);
  debug('guthub-oauth client ID: ' + process.env.GHID);

  // start here to establish session - auto-redirects to github oauth login
  // ref parameter = qualified url to redirect to after auth, defaults to referrer
  app.get(url, function(req, res) {
    if (req.session) {
      req.session.github = req.session.github || {};
      var ref = req.query.ref || req.get('Referer');
      if (ref) { req.session.github.ref = ref };
    }
    res.redirect('https://github.com/login/oauth/authorize' +
      '?client_id=' + process.env.GHID + '&scope=repo,user:email');
  });

  // github should be configured to redirect here after oauth login
  // calls github api to turn temporary code into access token
  app.get(url + '/callback', function(req, res) {
    debug('code: ' + req.query.code);
    authenticate(req.query.code, function(err, result) {
      debug(err || result);
      if (req.session) {
        var gh = req.session.github;
        if (gh) {
          gh.auth = err || result;
          if (gh.ref) return res.redirect(gh.ref);
        }
      }
      res.send(err || result); // no ref/referrer/session -> return result
    });
  });

  // retrieve auth result stored in session
  app.get(url + '/status', function(req, res) {
    res.send(req.session && req.session.github && req.session.github.auth);
  });

  // get access token from github
  function authenticate(code, cb) {
    request.post(
      'https://github.com/login/oauth/access_token',
      { form:
        { client_id: process.env.GHID,      // don't store credentials in opts
          client_secret: process.env.GHCS,  // get them straight from process.env
          code: code } },
      function(err, resp, body) {
        if (err) return cb(err);
        cb(null, qs.parse(body));
    });
  }

}
