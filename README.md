# pub-pkg-github-oauth

This module provides a [pub-server](https://github.com/jldec/pub-server) style plugin for github oauth.

It is used by [pub-gatekeeper](https://github.com/jldec/pub-gatekeeper) to mediate oauth access, allowing static sites hosted on github pages to be edited from the browser.

### flow

1. Browsers start by visiting `/server/auth/github?ref={fully-qualified url}`. This initiates a session with the pub-gatekeeper server. The `ref` parameter specifies where to return the browser after authentication.

2. Browsers are immediately redirected from the gatekeeper to github's oauth page at https://github.com/login/oauth/authorize. The first time this happens, users will be asked to login, and confirm the scope of the auth request.

3. After the user confirms access, github will redirect back to the gatekeeper server at `server/auth/github/callback`. This triggers the 2nd step in the authentication process, in which the server requests a user-specific access token from github.

4. When the response with the access token comes back, the gatekeeper stores this in the browser's session, and then redirects back to the `ref` parameter location from step 1.

5. Javascript running in the browser can then GET the access token at `/server/auth/github/status` using the session established earlier. This token opens the door to perform commits or reads on the user's repo on github.

## api

```js
require('pub-pkg-github-oauth')(server);
```

- `server.app` : express application used to mount routes
- `server.opts.github.url` : route prefix defaults to `'/server/auth/github'`
- `server.opts.github.timeout` : [ms](https://github.com/rauchg/ms.js) value defaults to `'4s'`.


## Github credentials
Github developer application credentials must be exported in the following environment variables.

```sh
export GHID={github client ID}
export GHCD={github client secret}
```
