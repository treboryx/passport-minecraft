const util = require("util");
const OAuth2Strategy = require("passport-oauth2");
const InternalOAuthError = require("passport-oauth2").InternalOAuthError;
const fetch = require("node-fetch");

/**
 * `Strategy` constructor.
 *
 * @param { Object }   options
 * @param { Function } verify
 * @api public
 */

function MinecraftStrategy(options, verify) {
  options = options || {};
  options.authorizationURL =
    options.authorizationURL || "https://login.live.com/oauth20_authorize.srf";
  options.tokenURL =
    options.tokenURL || "https://login.live.com/oauth20_token.srf";
  options.scopeSeparator = options.scopeSeparator || " ";
  options.customHeaders = options.customHeaders || {};

  OAuth2Strategy.call(this, options, verify);

  this.name = "minecraft";
}

/**
 * Inherit from `OAuth2Strategy`.
 */
util.inherits(MinecraftStrategy, OAuth2Strategy);

/**
 * Retrieve Minecraft profile through Xbox.
 *
 * @param { String }   accessToken
 * @param { Function } done
 * @api protected
 */
MinecraftStrategy.prototype.userProfile = async function (accessToken, done) {
  this._oauth2.useAuthorizationHeaderforGET(true);
  const data = {
    RelyingParty: "http://auth.xboxlive.com",
    TokenType: "JWT",
    Properties: {
      AuthMethod: "RPS",
      SiteName: "user.auth.xboxlive.com",
      RpsTicket: `d=${accessToken}`,
    },
  };

  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  };

  // Authenticate with XBL
  const xAuth = await fetch(
    "https://user.auth.xboxlive.com/user/authenticate",
    options
  )
    .then((res) => res.json())
    .then((res) => {
      if (!res.DisplayClaims || res.DisplayClaims === undefined) {
        return done(
          new InternalOAuthError("Failed to pass authorization layer.", err)
        );
      }

      return res;
    })
    .catch((err) => {
      if (err) {
        return done(
          new InternalOAuthError("Failed to pass authorization layer.", err)
        );
      }
    });

  Authorize(xAuth.Token, done);
};

const Authorize = async (authenticateToken, done) => {
  const data = {
    RelyingParty: "rp://api.minecraftservices.com/",
    TokenType: "JWT",
    Properties: {
      SandboxId: "RETAIL",
      UserTokens: [authenticateToken],
    },
  };

  // Authenticate with XSTS
  const xstsOptions = {
    method: "POST",
    body: JSON.stringify(data),
  };

  const xsts = await fetch(
    "https://xsts.auth.xboxlive.com/xsts/authorize",
    xstsOptions
  )
    .then((res) => res.json())
    .then((res) => {
      if (!res.DisplayClaims || res.DisplayClaims === undefined) {
        return done(
          new InternalOAuthError("Failed to pass authorization layer.", err)
        );
      }

      return {
        token: `XBL3.0 x=${res.DisplayClaims.xui[0].uhs};${res.Token}`,
      };
    })
    .catch((err) => {
      if (err) {
        return done(
          new InternalOAuthError("Failed to pass authorization layer.", err)
        );
      }
    });

  const mcAuthOptions = {
    method: "POST",
    body: JSON.stringify({
      ensureLegacyEnabled: true,
      identityToken: xsts.token,
    }),
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  };
  // Authenticate with Minecraft
  const mcAuth = await fetch(
    "https://api.minecraftservices.com/authentication/login_with_xbox",
    mcAuthOptions
  ).then((r) => r.json());

  const basicOptions = {
    method: "GET",
    headers: {
      Authorization: `Bearer ${mcAuth.access_token}`,
    },
  };

  // Check if the user owns Minecraft
  const checkOwnership = await fetch(
    "https://api.minecraftservices.com/entitlements/mcstore",
    basicOptions
  ).then((r) => r.json());
  if (!checkOwnership.items.length)
    return done(null, { premium: false, token: mcAuth.access_token });

  // A way to find out when the account was created is hit this endpoint, it'll show the initial name's creation date
  const nameChange = await fetch(
    "https://api.minecraftservices.com/minecraft/profile/namechange",
    basicOptions
  ).then((r) => r.json());

  // Finally get the profile's information (uuid, username, skins, capes)
  const mcProfile = await fetch(
    "https://api.minecraftservices.com/minecraft/profile",
    basicOptions
  ).then((r) => r.json());

  mcProfile.token = mcAuth.access_token;
  mcProfile.premium = true;
  mcProfile.createdAt = nameChange.createdAt;
  return done(null, mcProfile);
};

/**
 * Expose `Strategy`.
 */
module.exports = MinecraftStrategy;
