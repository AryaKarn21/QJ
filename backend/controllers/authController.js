const User = require('../models/User');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const { isOriginAllowed } = require('../config/corsOrigins');

// Verified live (2026-09) that this deployment's FRONTEND_URL was still set
// to the literal example placeholder from backend/.env.example
// ("https://your-frontend.vercel.app") — a domain nobody owns, so every
// redirect built from it 404s. That's a dashboard config value this code
// can't fix directly, but every Google OAuth redirect in this file used to
// build itself from `process.env.FRONTEND_URL || 'http://localhost:5173'`
// with no sanity check — so a misconfigured *or still-placeholder* value
// broke Google sign-in silently, in production, with no error surfaced
// anywhere. Treat an unset or placeholder-shaped value as unset and fall
// back to the actual known production frontend instead, so sign-in keeps
// working even before FRONTEND_URL gets corrected on Render. Once it's set
// correctly there, this fallback simply never triggers.
const KNOWN_PRODUCTION_FRONTEND_URL = 'https://qj-sigma.vercel.app';
function resolveFrontendUrl() {
  const configured = (process.env.FRONTEND_URL || '').trim();
  const looksLikePlaceholder = !configured || /your-frontend|example\.(com|org)/i.test(configured);
  if (looksLikePlaceholder) {
    if (configured) {
      console.warn(
        `Google OAuth: FRONTEND_URL ("${configured}") looks like an unfilled placeholder — ` +
        `falling back to ${process.env.NODE_ENV === 'production' ? KNOWN_PRODUCTION_FRONTEND_URL : 'http://localhost:5173'}. ` +
        `Fix FRONTEND_URL in this server's environment config to remove this warning.`
      );
    }
    return process.env.NODE_ENV === 'production' ? KNOWN_PRODUCTION_FRONTEND_URL : 'http://localhost:5173';
  }
  return configured;
}

// Google OAuth is optional-but-common: registering the strategy used to
// happen unconditionally at module load, which threw synchronously
// ("OAuth2Strategy requires a clientID option") the moment this file was
// required if GOOGLE_CLIENT_ID/SECRET weren't set — taking down the ENTIRE
// server (email/password auth included) on startup, not just Google
// login. Guarded the same way the AI features degrade gracefully without
// GEMINI_API_KEY, so a deployment that hasn't configured Google OAuth yet
// still boots and serves everything else.
const GOOGLE_OAUTH_CONFIGURED = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);

if (GOOGLE_OAUTH_CONFIGURED) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.BACKEND_URL}/api/auth/google/callback`,
    passReqToCallback: true,
    proxy: true
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      // Look up by googleId first, then fall back to email so a Google
      // sign-in for an address that already has a password account links
      // onto it instead of trying to insert a second User with the same
      // email — `email` has a unique index (models/User.js), so that
      // insert would throw a duplicate-key error and this strategy would
      // fail every time for that person (silently locking them out of
      // Google login, no duplicate identity created, just broken). Mirrors
      // the account-linking already done correctly in
      // verifyGoogleTokenMobile below.
      const email = profile.emails?.[0]?.value;
      let user = await User.findOne({ googleId: profile.id });

      if (!user && email) {
        user = await User.findOne({ email });
      }

      if (user) {
        user.googleId = profile.id;
        user.authMethod = user.authMethod === 'email' ? 'both' : 'google';
        user.emailVerified = true;
        user.lastLogin = new Date();
        await user.save();
      } else {
        user = await User.create({
          name: profile.displayName,
          email,
          googleId: profile.id,
          emailVerified: true,
          isVerified: true,
          authMethod: 'google',
          role: 'jobseeker',
          lastLogin: new Date(),
        });
      }

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }
  ));
} else {
  console.warn(
    'Google OAuth is not configured (GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET missing) — ' +
    '"Sign in with Google" will be unavailable until backend/.env sets both.'
  );
}

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Generate JWT — payload contains only id and role (minimal surface area).
// name/email are NOT embedded: they can change, and the frontend fetches
// the full profile separately when it needs those fields.
const generateToken = (user) => {
  const expiresIn = (user.role === 'admin' || user.role === 'superadmin')
    ? (process.env.JWT_EXPIRES_IN_ADMIN || '1d')
    : (process.env.JWT_EXPIRES_IN_USER || '7d');

  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn }
  );
};

// Google OAuth authentication
const googleAuth = (req, res, next) => {
  if (!GOOGLE_OAUTH_CONFIGURED) {
    return res.status(503).json({ message: 'Google sign-in is not configured on this server.' });
  }

  // Validate the requested redirect_uri's origin against the same trusted
  // list CORS uses (config/corsOrigins.js) before honoring it as the OAuth
  // `state` value. Without this, anyone could send a victim to
  // /api/auth/google?redirect_uri=https://evil.example/callback and, once
  // they complete Google sign-in, have their JWT delivered straight to an
  // attacker-controlled page (the token is appended to this URL in
  // googleAuthCallback below) — a classic OAuth open-redirect token theft.
  // An untrusted or malformed redirect_uri silently falls back to
  // FRONTEND_URL instead of failing the request outright.
  const frontendFallback = `${resolveFrontendUrl()}/auth/callback`;
  let redirectUri = frontendFallback;
  if (req.query.redirect_uri) {
    try {
      const parsedOrigin = new URL(req.query.redirect_uri).origin;
      if (isOriginAllowed(parsedOrigin)) {
        redirectUri = req.query.redirect_uri;
      } else {
        console.warn(`Google OAuth: rejected untrusted redirect_uri origin "${parsedOrigin}" — falling back to FRONTEND_URL.`);
      }
    } catch {
      console.warn('Google OAuth: malformed redirect_uri query param — falling back to FRONTEND_URL.');
    }
  }
  req.session.redirect_uri = redirectUri;

  const auth = passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
    state: redirectUri,
  });

  auth(req, res, next);
};

// Verify Google token from mobile app
const verifyGoogleTokenMobile = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Without a configured client ID, `audience: undefined` below would
    // make verifyIdToken skip audience validation entirely — accepting a
    // valid Google ID token issued to ANY app, not just this one. Fail
    // closed instead of silently disabling that check.
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({ message: 'Google sign-in is not configured on this server.' });
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (verifyError) {
      console.error('Google idToken verification failed:', verifyError.message);
      return res.status(401).json({ message: 'Invalid Google token' });
    }

    if (!payload.email_verified) {
      return res.status(401).json({ message: 'Google email not verified' });
    }

    const { email, name, picture: photoUrl, sub: googleId } = payload;

    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        name,
        email,
        googleId,
        emailVerified: true,
        isVerified: true,
        authMethod: 'google',
        role: 'jobseeker',
        profilePicture: photoUrl,
      });
      await user.save();
    } else {
      user.googleId = googleId;
      user.authMethod = 'google';
      user.emailVerified = true;
      user.isVerified = true;
      if (photoUrl) user.profilePicture = photoUrl;
      user.lastLogin = new Date();
      await user.save();
    }

    const token = generateToken(user);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    console.error('Google token verification error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Google OAuth callback
const googleAuthCallback = (req, res, next) => {
  const frontendFallback = resolveFrontendUrl();
  if (!GOOGLE_OAUTH_CONFIGURED) {
    return res.redirect(`${frontendFallback}/login?error=${encodeURIComponent('Google sign-in is not configured.')}`);
  }

  passport.authenticate('google', (err, user) => {
    const redirectUri = req.session.redirect_uri || `${resolveFrontendUrl()}/auth/callback`;
    const frontendUrl = resolveFrontendUrl();

    if (err || !user) {
      return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent('Authentication failed')}`);
    }

    try {
      const token = generateToken(user);
      return res.redirect(`${frontendUrl}/auth/callback?token=${token}&role=${user.role}`);
    } catch (error) {
      console.error('Error generating token:', error);
      return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent('Authentication error')}`);
    }
  })(req, res, next);
};

// Get current user
const getCurrentUser = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  res.json({
    id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
  });
};

// Logout
// passport@0.7 requires a callback — req.logout() with no argument throws
// synchronously ("req#logout requires a callback function") instead of
// tearing down the session, so this route always errored out.
const logout = (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ message: 'Failed to log out. Please try again.' });
    }
    res.json({ message: 'Logged out successfully' });
  });
};

module.exports = {
  googleAuth,
  googleAuthCallback,
  verifyGoogleTokenMobile,
  getCurrentUser,
  logout,
};