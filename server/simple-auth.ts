import { Express } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { pool } from "./db";

async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12);
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  if (!stored) return false;
  return await bcrypt.compare(supplied, stored);
}

export function setupSimpleAuth(app: Express) {
  // Session configuration
  const PostgresStore = connectPg(session);
  const sessionStore = new PostgresStore({
    pool,
    createTableIfMissing: false,
    tableName: "sessions"
  });

  app.use(session({
    secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  }));

  // Registration endpoint
  app.post("/auth/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Check if this is the first user - if so, make them admin
      const existingUsers = await storage.getAllUsers();
      const isFirstUser = existingUsers.length === 0;

      const passwordHash = await hashPassword(password);
      const user = await storage.createUser({
        email,
        firstName,
        lastName,
        passwordHash,
        isAdmin: isFirstUser,
      });

      // Set user session
      (req.session as any).userId = user.id;

      res.status(201).json({ 
        user: { 
          id: user.id, 
          email: user.email, 
          firstName: user.firstName, 
          lastName: user.lastName 
        } 
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Login endpoint
  app.post("/auth/login", async (req, res) => {
    try {
      const { email, password, deviceType } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValid = await comparePasswords(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // For mobile devices, create and return an API token
      if (deviceType === 'mobile') {
        const crypto = await import('crypto');
        const token = crypto.randomBytes(32).toString('hex');
        const tokenName = `Mobile App - ${new Date().toLocaleDateString()}`;
        
        const apiToken = await storage.createApiToken({
          userId: user.id,
          token,
          name: tokenName,
        });

        return res.json({ 
          user: { 
            id: user.id, 
            email: user.email, 
            firstName: user.firstName, 
            lastName: user.lastName 
          },
          apiToken: token
        });
      }

      // For web, use session-based auth
      (req.session as any).userId = user.id;

      res.json({ 
        user: { 
          id: user.id, 
          email: user.email, 
          firstName: user.firstName, 
          lastName: user.lastName 
        } 
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Get current user
  app.get("/auth/user", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      res.json({ 
        id: user.id, 
        email: user.email, 
        firstName: user.firstName, 
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Change password endpoint
  app.put("/auth/password", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters long" });
      }

      // Get current user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      if (!user.passwordHash || !await comparePasswords(currentPassword, user.passwordHash)) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const newPasswordHash = await hashPassword(newPassword);

      // Update password
      await storage.resetUserPassword(userId, newPasswordHash);

      res.json({ message: "Password updated successfully" });
    } catch (error: any) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Logout endpoint
  app.post("/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie('connect.sid');
      res.json({ message: "Logged out" });
    });
  });
}

export function requireSimpleAuth(req: any, res: any, next: any) {
  const userId = (req.session as any)?.userId;
  
  if (!userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  // Add userId to request for easy access
  req.userId = userId;
  next();
}