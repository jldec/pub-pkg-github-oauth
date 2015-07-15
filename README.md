## pub-pkg-github-oauth

- pub-server style plugin for github oauth
- asks for repo and user:email scope, does not validate actual scopes granted
- requires process.env.GHID and process.env.GHCS
- won't work on localhost unless also running localtunnel or similar
- stores redirect .ref and .auth results in session.github
- designed for use by pub-gatekeeper e.g. from static-hosted editor
- tries to use redirects to make extra pub-gatekeeper round-trips transparent

Routes all start with the same prefix settable via `opts.github.url`

- `/server/auth/github` - initiate session, set redirect ref, redir to github
- `/server/auth/github/callback` - github redirs here, try to redir back to ref
- `/server/auth/github/status` - simply return session.github.access
