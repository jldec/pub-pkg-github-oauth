/**
 * pub-pkg github-oauth.js
 *
 * copyright 2015, Jurgen Leschner - github.com/jldec - MIT license
**/

var debug   = require('debug')('pub:github');
var qs      = require('querystring');
var ms      = require('ms');
var u       = require('pub-util');
var inspect = require('util').inspect;

module.exports = function githubOAuth(server) {

  if (!(this instanceof githubOAuth)) return new githubOAuth(server);
  var self = this;

  var app  = server.app;
  var log  = server.opts.log;
  var opts = server.opts.github || {};

  var request = require('request')
    .defaults(
      { timeout: ('timeout' in opts ? ms(opts.timeout) : 4000),
        headers: { 'User-agent':'pub-gatekeeper' } }
    );

  var url  = opts.url || process.env.GHU || '/server/auth/github';

  require('assert')(process.env.GHID && process.env.GHCS,
    'pub-pkg-github-oauth missing environment variables: GHID and GHCS');

  debug('guthub-oauth client ID: ' + process.env.GHID);


  // start here to establish session - auto-redirects to github oauth login
  // ref parameter = qualified url to redirect to after auth, defaults to referrer
  app.get(url, function(req, res) {
    if (req.session) {
      var gh = req.session.github = req.session.github || {};
      var ref = (req.query.ref || req.get('Referer') || '').replace(/\?.*/, '');
      if (ref) {
        gh.ref = ref
        if (gh.auth) {
          debug('session already authenticated: ' + gh.auth.user);
          gh.statusCnt = 0;
          gh.ts = Date.now();
          return res.redirect(ref + '?code=' + u.uqt(req.sessionID));
        }
      };
    }
    res.redirect('https://github.com/login/oauth/authorize' +
      '?client_id=' + process.env.GHID + '&scope=repo,user:email');
  });


  // github should be configured to redirect here after oauth login
  // calls github api to turn temporary code into access token
  app.get(url + '/callback', function(req, res) {
    authenticate(req, function(err, result) {
      if (req.session) {
        var gh = req.session.github;
        if (gh) {
          log('github-oauth %s %s', result.user, gh.ref);
          gh.auth = err || result;
          gh.ua = req.get('user-agent'); // use to prevent snooping
          gh.statusCnt = 0;
          gh.ts = Date.now();
          if (gh.ref) return res.redirect(gh.ref + '?code=' + u.uqt(req.sessionID));
        }
      }
      res.send(err || result); // no ref/referrer/session -> return result
    });
  });


  // retrieve auth result stored in session
  app.get(url + '/status', function(req, res) {

    // first time request returns empty object
    if (!req.sessionStore || !req.query.code) return res.send({});

    // after auth, use code parameter to lookup session in sessionStore
    req.sessionStore.get(req.query.code, function(err, session) {
      var gh = session && session.github;
      if (!gh || gh.statusCnt || gh.ua !== req.get('user-agent') || !gh.auth ||
       (opts.expire && (Date.now() - gh.ts > ms(opts.expire)))) {
        log('github-oauth status refused: ' + inspect(gh));
        return res.send({});
      }
      debug('/status ok');
      gh.statusCnt++;  // only serve back once
      res.send(gh.auth);
    });

  })


  // get access token from github
  function authenticate(req, cb) {
    request.post(
      'https://github.com/login/oauth/access_token',
      { form:
        { client_id: process.env.GHID,      // don't store credentials in opts
          client_secret: process.env.GHCS,  // get them straight from process.env
          code: req.query.code } },
      function(err, resp, body) {
        if (err) return cb(err);
        var result = qs.parse(body);
        getUser(req, result, function() {
          cb(null, result);
        });
      }
    );
  }

  // try to get email for authz/ACLs - doesn't overwrite session.user
  function getUser(req, result, cb) {
    if (!result || !result.access_token) return process.nextTick(cb);
    request.get(
      'https://api.github.com/user/emails?access_token=' + result.access_token,
      { headers:{ 'Accept':'application/vnd.github.v3+json' } },
      function(err, resp, body) {
        if (err) { debug(err); return cb(err); }
        var list = JSON.parse(body); debug(list);
        var email = u.find(list, function(entry) { return entry.primary; });
        if (email) {
          email = email.email;
          if (req.session && !req.session.user) { req.session.user = email; }
          result.user = email;
        }
        cb();
    });
  }

}
