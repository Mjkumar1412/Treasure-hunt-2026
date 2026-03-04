import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("treasure.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    mode TEXT NOT NULL, -- 'team' or 'individual'
    status TEXT DEFAULT 'scheduled', -- 'scheduled', 'active', 'finished'
    startTime TEXT,
    winnerId TEXT,
    qrStyle TEXT, -- JSON string of QRStyle
    scannerStyle TEXT, -- JSON string of ScannerStyle
    allowedThemes TEXT, -- JSON string of ThemeType[]
    allowUserThemeChange INTEGER DEFAULT 1,
    defaultTheme TEXT DEFAULT 'classic'
  );

  CREATE TABLE IF NOT EXISTS clues (
    id TEXT PRIMARY KEY,
    gameId TEXT NOT NULL,
    sequence INTEGER NOT NULL,
    content TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    teamId TEXT, -- NULL for individual mode or shared clues
    qrStyle TEXT, -- JSON string of QRStyle
    FOREIGN KEY(gameId) REFERENCES games(id)
  );

  CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    gameId TEXT NOT NULL,
    loginId TEXT NOT NULL UNIQUE,
    name TEXT,
    members TEXT, -- JSON string
    currentClueSequence INTEGER DEFAULT 1,
    lastScanTime TEXT,
    isLoggedIn INTEGER DEFAULT 0,
    socketId TEXT,
    qrStyle TEXT, -- JSON string of QRStyle
    FOREIGN KEY(gameId) REFERENCES games(id)
  );

  CREATE TABLE IF NOT EXISTS scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teamId TEXT NOT NULL,
    clueId TEXT NOT NULL,
    scanTime TEXT NOT NULL,
    FOREIGN KEY(teamId) REFERENCES teams(id),
    FOREIGN KEY(clueId) REFERENCES clues(id)
  );

  CREATE TABLE IF NOT EXISTS admins (
    username TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    isMain INTEGER DEFAULT 0
  );
`);

// Seed main admin if not exists
const seedAdmin = db.prepare("INSERT OR IGNORE INTO admins (username, password, isMain) VALUES (?, ?, ?)");
seedAdmin.run("MJK", "Mjk@1412", 1);
// Ensure the requested admin exists and has the correct password
db.prepare("UPDATE admins SET password = ? WHERE username = ?").run("Mjk@1412", "MJK");

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });

  app.use(express.json());

  // --- API Routes ---

  // Auth
  app.post("/api/login", (req, res) => {
    const { loginId } = req.body;
    const team = db.prepare("SELECT * FROM teams WHERE loginId = ?").get(loginId) as any;
    
    if (!team) return res.status(404).json({ error: "Invalid Login ID" });
    
    // Enforce single login
    if (team.isLoggedIn) {
      // We could disconnect the previous socket here if we had the socketId
      io.to(team.socketId).emit("force_logout", { message: "Logged in from another device" });
    }

    res.json(team);
  });

  app.post("/api/admin/login", (req, res) => {
    const { username, password } = req.body;
    const admin = db.prepare("SELECT * FROM admins WHERE username = ? AND password = ?").get(username, password) as any;
    if (!admin) return res.status(401).json({ error: "Invalid credentials" });
    res.json({
      ...admin,
      isMain: !!admin.isMain
    });
  });

  // Admin Management (Main Admin Only)
  app.get("/api/admins", (req, res) => {
    const { requester } = req.query;
    const admin = db.prepare("SELECT * FROM admins WHERE username = ?").get(requester) as any;
    if (!admin || !admin.isMain) return res.status(403).json({ error: "Unauthorized" });

    const admins = db.prepare("SELECT username, isMain FROM admins").all();
    res.json(admins.map((a: any) => ({ ...a, isMain: !!a.isMain })));
  });

  app.post("/api/admins", (req, res) => {
    const { requester, username, password } = req.body;
    const admin = db.prepare("SELECT * FROM admins WHERE username = ?").get(requester) as any;
    if (!admin || !admin.isMain) return res.status(403).json({ error: "Unauthorized" });

    try {
      db.prepare("INSERT INTO admins (username, password, isMain) VALUES (?, ?, 0)").run(username, password);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: "Username already exists" });
    }
  });

  app.delete("/api/admins/:username", (req, res) => {
    const { requester } = req.query;
    const admin = db.prepare("SELECT * FROM admins WHERE username = ?").get(requester) as any;
    if (!admin || !admin.isMain) return res.status(403).json({ error: "Unauthorized" });

    if (req.params.username === requester) return res.status(400).json({ error: "Cannot delete yourself" });

    db.prepare("DELETE FROM admins WHERE username = ?").run(req.params.username);
    res.json({ success: true });
  });

  // Game Management
  app.get("/api/games", (req, res) => {
    const games = db.prepare("SELECT * FROM games").all();
    res.json(games);
  });

  app.get("/api/games/:id", (req, res) => {
    const game = db.prepare("SELECT * FROM games WHERE id = ?").get(req.params.id);
    if (!game) return res.status(404).json({ error: "Game not found" });
    res.json(game);
  });

  app.delete("/api/games/:id", (req, res) => {
    db.prepare("DELETE FROM clues WHERE gameId = ?").run(req.params.id);
    db.prepare("DELETE FROM teams WHERE gameId = ?").run(req.params.id);
    db.prepare("DELETE FROM games WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.patch("/api/games/:id", (req, res) => {
    const { startTime, qrStyle, scannerStyle, allowedThemes, allowUserThemeChange, defaultTheme, requester } = req.body;
    const admin = db.prepare("SELECT * FROM admins WHERE username = ?").get(requester) as any;
    if (!admin || !admin.isMain) return res.status(403).json({ error: "Unauthorized" });

    const updates: string[] = [];
    const params: any[] = [];

    if (startTime !== undefined) { updates.push("startTime = ?"); params.push(startTime); }
    if (qrStyle !== undefined) { updates.push("qrStyle = ?"); params.push(JSON.stringify(qrStyle)); }
    if (scannerStyle !== undefined) { updates.push("scannerStyle = ?"); params.push(JSON.stringify(scannerStyle)); }
    if (allowedThemes !== undefined) { updates.push("allowedThemes = ?"); params.push(JSON.stringify(allowedThemes)); }
    if (allowUserThemeChange !== undefined) { updates.push("allowUserThemeChange = ?"); params.push(allowUserThemeChange ? 1 : 0); }
    if (defaultTheme !== undefined) { updates.push("defaultTheme = ?"); params.push(defaultTheme); }

    if (updates.length === 0) return res.json({ success: true });

    params.push(req.params.id);
    db.prepare(`UPDATE games SET ${updates.join(", ")} WHERE id = ?`).run(...params);
    res.json({ success: true });
  });

  app.post("/api/games", (req, res) => {
    const { id, name, mode, startTime, requester } = req.body;
    
    // Check if sub-admin is trying to schedule
    if (startTime) {
      const admin = db.prepare("SELECT * FROM admins WHERE username = ?").get(requester) as any;
      if (!admin || !admin.isMain) return res.status(403).json({ error: "Only main admin can schedule games" });
    }

    db.prepare("INSERT INTO games (id, name, mode, startTime) VALUES (?, ?, ?, ?)").run(id, name, mode, startTime);
    res.json({ success: true });
  });

  app.post("/api/games/:id/start", (req, res) => {
    const { requester } = req.body;
    const game = db.prepare("SELECT * FROM games WHERE id = ?").get(req.params.id) as any;
    
    if (!game) return res.status(404).json({ error: "Game not found" });

    // Allow start if:
    // 1. Requester is main admin
    // 2. Scheduled time has passed
    let authorized = false;
    
    if (requester) {
      const admin = db.prepare("SELECT * FROM admins WHERE username = ?").get(requester) as any;
      if (admin && admin.isMain) authorized = true;
    }

    if (!authorized && game.startTime) {
      const startTime = new Date(game.startTime).getTime();
      if (Date.now() >= startTime) authorized = true;
    }

    if (!authorized) return res.status(403).json({ error: "Only main admin can manually start games before scheduled time" });

    db.prepare("UPDATE games SET status = 'active' WHERE id = ?").run(req.params.id);
    io.emit("game_started", { gameId: req.params.id });
    res.json({ success: true });
  });

  // Clues
  app.get("/api/games/:id/clues", (req, res) => {
    const clues = db.prepare("SELECT * FROM clues WHERE gameId = ? ORDER BY sequence ASC").all(req.params.id);
    res.json(clues);
  });

  app.delete("/api/clues/:id", (req, res) => {
    db.prepare("DELETE FROM clues WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/clues", (req, res) => {
    const { id, gameId, sequence, content, code, teamId, qrStyle } = req.body;
    db.prepare("INSERT INTO clues (id, gameId, sequence, content, code, teamId, qrStyle) VALUES (?, ?, ?, ?, ?, ?, ?)").run(id, gameId, sequence, content, code, teamId || null, qrStyle ? JSON.stringify(qrStyle) : null);
    res.json({ success: true });
  });

  app.put("/api/clues/:id", (req, res) => {
    const { content, code, teamId, qrStyle } = req.body;
    db.prepare("UPDATE clues SET content = ?, code = ?, teamId = ?, qrStyle = ? WHERE id = ?").run(content, code, teamId || null, qrStyle ? JSON.stringify(qrStyle) : null, req.params.id);
    res.json({ success: true });
  });

  // Teams
  app.get("/api/games/:id/teams", (req, res) => {
    const teams = db.prepare("SELECT * FROM teams WHERE gameId = ?").all(req.params.id);
    res.json(teams);
  });

  app.post("/api/teams", (req, res) => {
    const { id, gameId, loginId } = req.body;
    db.prepare("INSERT INTO teams (id, gameId, loginId) VALUES (?, ?, ?)").run(id, gameId, loginId);
    res.json({ success: true });
  });

  app.patch("/api/teams/:id", (req, res) => {
    const { name, members, qrStyle } = req.body;
    const updates: string[] = [];
    const params: any[] = [];

    if (name !== undefined) { updates.push("name = ?"); params.push(name); }
    if (members !== undefined) { updates.push("members = ?"); params.push(JSON.stringify(members)); }
    if (qrStyle !== undefined) { updates.push("qrStyle = ?"); params.push(JSON.stringify(qrStyle)); }

    if (updates.length === 0) return res.json({ success: true });

    params.push(req.params.id);
    db.prepare(`UPDATE teams SET ${updates.join(", ")} WHERE id = ?`).run(...params);
    res.json({ success: true });
  });

  // Scanning Logic
  app.post("/api/scan", (req, res) => {
    const { teamId, code } = req.body;
    const team = db.prepare("SELECT * FROM teams WHERE id = ?").get(teamId) as any;
    const game = db.prepare("SELECT * FROM games WHERE id = ?").get(team.gameId) as any;

    if (game.status !== 'active') return res.status(400).json({ error: "Game is not active" });

    // Find the clue with this code
    const clue = db.prepare("SELECT * FROM clues WHERE code = ? AND gameId = ?").get(code, game.id) as any;

    if (!clue) return res.status(404).json({ error: "Invalid QR Code" });

    // Check if it's the right team (for team mode)
    if (game.mode === 'team' && clue.teamId && clue.teamId !== team.id) {
      return res.status(403).json({ error: "This clue is not for your team!" });
    }

    // Check sequence
    if (clue.sequence !== team.currentClueSequence) {
      if (clue.sequence < team.currentClueSequence) {
        return res.status(400).json({ error: "You already solved this clue!" });
      }
      return res.status(400).json({ error: "Solve your previous clues first!" });
    }

    // Success!
    const now = new Date().toISOString();
    db.prepare("INSERT INTO scans (teamId, clueId, scanTime) VALUES (?, ?, ?)").run(team.id, clue.id, now);
    
    // Check if it was the final clue
    const totalClues = db.prepare("SELECT COUNT(*) as count FROM clues WHERE gameId = ? AND (teamId = ? OR teamId IS NULL)").get(game.id, team.id) as any;
    
    if (clue.sequence === totalClues.count) {
      // WINNER!
      db.prepare("UPDATE games SET status = 'finished', winnerId = ? WHERE id = ?").run(team.id, game.id);
      db.prepare("UPDATE teams SET currentClueSequence = currentClueSequence + 1, lastScanTime = ? WHERE id = ?").run(now, team.id);
      io.emit("game_over", { winnerId: team.id, winnerName: team.name || team.loginId });
      return res.json({ status: "winner", clue });
    }

    db.prepare("UPDATE teams SET currentClueSequence = currentClueSequence + 1, lastScanTime = ? WHERE id = ?").run(now, team.id);
    
    // Notify admin for real-time monitoring
    io.emit("team_progress", { teamId: team.id, sequence: team.currentClueSequence + 1 });

    res.json({ status: "success", clue });
  });

  // History
  app.get("/api/teams/:id/history", (req, res) => {
    const history = db.prepare(`
      SELECT c.*, s.scanTime 
      FROM scans s 
      JOIN clues c ON s.clueId = c.id 
      WHERE s.teamId = ? 
      ORDER BY c.sequence ASC
    `).all(req.params.id);
    res.json(history);
  });

  app.get("/api/teams/:id/current-clue", (req, res) => {
    const team = db.prepare("SELECT * FROM teams WHERE id = ?").get(req.params.id) as any;
    if (!team) return res.status(404).json({ error: "Team not found" });
    
    const clue = db.prepare("SELECT * FROM clues WHERE gameId = ? AND sequence = ? AND (teamId = ? OR teamId IS NULL)").get(team.gameId, team.currentClueSequence, team.id) as any;
    res.json(clue || null);
  });

  // --- Socket.io ---
  io.on("connection", (socket) => {
    socket.on("register_team", (teamId) => {
      db.prepare("UPDATE teams SET isLoggedIn = 1, socketId = ? WHERE id = ?").run(socket.id, teamId);
      socket.join(`team_${teamId}`);
    });

    socket.on("disconnect", () => {
      db.prepare("UPDATE teams SET isLoggedIn = 0, socketId = NULL WHERE socketId = ?").run(socket.id);
    });
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => res.sendFile(path.resolve(__dirname, "dist", "index.html")));
  }

  const PORT = 3000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
