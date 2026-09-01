const User = require('../models/User');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

  const redirectUri = req.query.redirect_uri || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback`;
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
  const frontendFallback = process.env.FRONTEND_URL || 'http://localhost:5173';
  if (!GOOGLE_OAUTH_CONFIGURED) {
    return res.redirect(`${frontendFallback}/login?error=${encodeURIComponent('Google sign-in is not configured.')}`);
  }

  passport.authenticate('google', (err, user) => {
    const redirectUri = req.session.redirect_uri || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback`;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

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