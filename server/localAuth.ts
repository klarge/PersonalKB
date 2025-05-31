import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import type { Express } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import crypto from "crypto";
import { storage } from "./storage";

// Simple local authentication for self-hosted deployments
export function setupLocalAuth(app: Express) {
  // Prevent duplicate setup
  if (app.get('local-auth-configured')) {
    return;
  }
  
  // Only setup session if it hasn't been set up already (by other auth methods)
  if (!app.get('session-configured')) {
    // Setup session store using PostgreSQL
    const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
    const pgStore = connectPg(session);
    const sessionStore = new pgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
      ttl: sessionTtl,
      tableName: "sessions",
    });

    const sessionSettings: session.SessionOptions = {
      secret: process.env.SESSION_SECRET || crypto.randomUUID(),
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: false, // Allow cookies over HTTP for local development
        maxAge: sessionTtl,
        sameSite: 'lax',
      },
    };

    app.set("trust proxy", 1);
    app.use(session(sessionSettings));
    app.use(passport.initialize());
    app.use(passport.session());
    app.set('session-configured', true);
  }

  // Local strategy for username/password authentication
  passport.use(new LocalStrategy(
    { usernameField: 'email' },
    async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);
        if (!user) {
          return done(null, false, { message: 'User not found' });
        }

        const isValid = await bcrypt.compare(password, user.passwordHash || '');
        if (!isValid) {
          return done(null, false, { message: 'Invalid password' });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Login route
  app.post('/api/login', (req, res, next) => {
    console.log('Login attempt for:', req.body.email);
    passport.authenticate('local', (err, user, info) => {
      if (err) {
        console.error('Authentication error:', err);
        return res.status(500).json({ message: 'Login failed' });
      }
      if (!user) {
        console.log('Authentication failed:', info?.message);
        return res.status(401).json({ message: info?.message || 'Invalid credentials' });
      }

      console.log('User authenticated, logging in:', user.id);
      req.login(user, (err) => {
        if (err) {
          console.error('req.login error:', err);
          return res.status(500).json({ message: 'Login failed' });
        }
        console.log('Login successful, session ID:', req.sessionID);
        console.log('User in session:', req.user?.id);
        res.json(user);
      });
    })(req, res, next);
  });

  // Register route
  app.post('/api/register', async (req, res) => {
    try {
      console.log('Registration attempt started');
      const { email, password, firstName, lastName } = req.body;

      // Validate required fields
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }

      // Validate password length
      if (password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters' });
      }

      console.log('Checking if user exists...');
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      console.log('Hashing password...');
      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      console.log('Creating user...');
      // Create user
      const user = await storage.createLocalUser({
        email,
        passwordHash,
        firstName,
        lastName
      });

      console.log('User created, attempting login...');
      // Log them in
      req.login(user, (err) => {
        if (err) {
          console.error('Login after registration failed:', err);
          return res.status(500).json({ message: 'Registration successful but login failed' });
        }
        console.log('Registration completed successfully');
        res.status(201).json(user);
      });
    } catch (error) {
      console.error('Registration error details:', error);
      res.status(500).json({ 
        message: 'Registration failed', 
        error: process.env.NODE_ENV === 'development' ? String(error) : undefined 
      });
    }
  });

  // Logout route
  app.post('/api/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: 'Logout failed' });
      }
      res.sendStatus(200);
    });
  });

  // Mark local auth as configured
  app.set('local-auth-configured', true);
}