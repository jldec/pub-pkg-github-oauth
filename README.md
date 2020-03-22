# pub-pkg-github-oauth

> NOTE: this package is no longer being maintained

This module provides a [pub-server](https://github.com/jldec/pub-server) style plugin for github oauth.

It is used by [pub-gatekeeper](https://github.com/jldec/pub-gatekeeper) to mediate oauth access, allowing static sites hosted on github pages to be edited from the browser.

### flow

1. Browsers start by checking for an existing oauth access token at `/server/auth/github/status` using JSONP or similar mechanism. The first time they do this, it initiates a session with the pub-gatekeeper server, and the server returns a JSON object with no access_token.

2. To start a new authentication process, browsers then navigate to `/server/auth/github?ref={fully-qualified url}`. The `ref` parameter specifies where to direct the browser after authentication. The server will immediately redirect to github's oauth page at https://github.com/login/oauth/authorize. New users will be asked to login, and confirm the scope of the auth request.

3. After the user has confirmed oauth access, github will redirect back to the gatekeeper server at `server/auth/github/callback`. This triggers the 2nd step in the authentication process, in which the server requests a user-specific access token from github.

4. When the response with the access token comes back, the gatekeeper stores this in the browser's session, and then redirects back to the `ref` parameter location from step 1, adding a temporary `code` parameter for fetching the access token.

5. Step 1 is repeated with the temporary code, and this time, the request returns an access token. This token opens the door to perform commits or reads on the user's repo on github.

## api

```js
require('pub-pkg-github-oauth')(server);
```

- `server.app` : express application used to mount routes
- `server.opts.github.url` : route prefix defaults to `'/server/auth/github'`
- `server.opts.github.timeout` : [ms](https://github.com/rauchg/ms.js) value defaults to `'4s'`.
- `server.opts.github.expire` : ms for browser to fetch token


## GitHub credentials
GitHub developer application credentials must be exported in the following environment variables.

```sh
export GHID={github client ID}
export GHCD={github client secret}
```
