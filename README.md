# passport-minecraft

[![NPM](https://nodei.co/npm/passport-minecraft.png)](https://nodei.co/npm/passport-minecraft/)

[Passport](https://github.com/jaredhanson/passport) strategy for authenticating
with [Xbox Live](http://xboxlive.com/) and get Minecraft Account information

## Installation

```bash
$ npm install passport-minecraft
```

## Basic Usage

```javascript
const MinecraftStrategy = require("passport-minecraft").Strategy;

passport.use(
  new MinecraftStrategy(
    {
      clientID: "client-id",
      clientSecret: "secret",
      callbackURL: "http://localhost:3000/auth/minecraft/callback",
      scope: "Xboxlive.signin",
    },

    function (accessToken, refreshToken, profile, done) {
      User.findOne({ identifier }, function (err, user) {
        return done(err, user);
      });
    }
  )
);
```

You can create a Microsoft App through Azure App Registrations. Creating the client secret is an extra step.

Once you've registered an App, go to Certificates & Secrets and create a secret. The value column contains the secret.

#### Authenticate Requests

Use `passport.authenticate()`, specifying the `'minecraft'` strategy, to
authenticate requests.

For example, as route middleware in an [Express](http://expressjs.com/)
application:

```javascript
app
  .get("/auth/minecraft", passport.authenticate("minecraft"))
  .get(
    "/auth/minecraft/callback",
    passport.authenticate("minecraft", { failureRedirect: "/login" }),
    function (req, res) {
      res.json(req.user);
    }
  );
```
