import express from "express";
import cors from "cors";
import "dotenv/config";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.error("CRITICAL: SUPABASE_URL or SUPABASE_ANON_KEY is missing from environment variables!");
} else {
  console.log("Supabase client initialized with URL:", supabaseUrl);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function bootstrapAdmin() {
  console.log("[Bootstrap] Starting admin synchronization...");
  const adminsToBootstrap = [
    { username: "medisetty.kumar00@gmail.com", password: "Mjk@1412" },
    { username: "medisetty.kumar8@gmail.com", password: "Mjk@1412" }
  ];

  for (const adminData of adminsToBootstrap) {
    try {
      const { data: existing, error: findError } = await supabase
        .from("admins")
        .select("*")
        .eq("username", adminData.username)
        .single();

      if (findError) {
        if (findError.code === 'PGRST116') {
          console.log(`[Bootstrap] Admin ${adminData.username} not found, creating...`);
          const { error: insertError } = await supabase
            .from("admins")
            .insert({ username: adminData.username, password: adminData.password, isMain: true });
          
          if (insertError) {
            console.error(`[Bootstrap] Failed to create ${adminData.username}:`, insertError.message);
          } else {
            console.log(`[Bootstrap] Admin ${adminData.username} created successfully.`);
          }
        } else {
          console.error(`[Bootstrap] Database error checking ${adminData.username}:`, findError.message, findError.code);
          if (findError.message.includes('relation "admins" does not exist')) {
            console.error("[Bootstrap] CRITICAL: The 'admins' table does not exist in your Supabase database. Please run the migration SQL.");
          }
        }
        continue;
      }

      if (existing) {
        const { error: updateError } = await supabase
          .from("admins")
          .update({ password: adminData.password, isMain: true })
          .eq("username", adminData.username);
        
        if (updateError) {
          console.error(`[Bootstrap] Failed to sync ${adminData.username}:`, updateError.message);
        } else {
          console.log(`[Bootstrap] Admin ${adminData.username} synchronized.`);
        }
      }
    } catch (err) {
      console.error(`[Bootstrap] Unexpected failure for ${adminData.username}:`, err);
    }
  }
}

async function startServer() {
  console.log("[Server] Starting server initialization...");
  await bootstrapAdmin();
  const app = express();
  app.use(cors());
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });

  app.use(express.json());

  // --- API Routes ---

  // Auth
  app.post("/api/login", async (req, res) => {
    const { loginId } = req.body;
    const { data: team, error } = await supabase
      .from("teams")
      .select("*")
      .eq("loginId", loginId)
      .single();
    
    if (error || !team) return res.status(404).json({ error: "Invalid Login ID" });
    
    if (team.isLoggedIn) {
      io.to(team.socketId).emit("force_logout", { message: "Logged in from another device" });
    }

    res.json(team);
  });

  // Health Check
  app.get("/api/health", async (req, res) => {
    let dbStatus = "unknown";
    let dbError = null;
    try {
      const { error } = await supabase.from("admins").select("count").limit(1);
      if (error) {
        dbStatus = "error";
        dbError = error.message;
      } else {
        dbStatus = "connected";
      }
    } catch (err: any) {
      dbStatus = "crash";
      dbError = err.message;
    }

    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      database: dbStatus,
      dbError: dbError,
      env: {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey
      }
    });
  });

  app.post("/api/admin/login", async (req, res) => {
    const { username, password } = req.body;
    console.log(`[Admin Login] Attempt for: ${username}`);
    
    if (!username || !password) {
      return res.status(400).json({ error: "Credentials required" });
    }

    try {
      const { data: admin, error } = await supabase
        .from("admins")
        .select("*")
        .ilike("username", username)
        .single();

      if (error) {
        console.error("[Login] Database error for user:", username, error);
        if (error.code === 'PGRST116') {
          return res.status(401).json({ error: "Account not found. Please check your username." });
        }
        if (error.message.includes('relation "admins" does not exist')) {
          return res.status(500).json({ error: "System authentication failure: 'admins' table missing. Please run the migration SQL in Supabase." });
        }
        return res.status(500).json({ error: "System authentication failure. Please try again later." });
      }
      
      if (admin.password !== password) {
        console.warn(`[Admin Login] Invalid password attempt for ${username}`);
        return res.status(401).json({ error: "Invalid access key. Please verify your password." });
      }

      console.log("[Login] Successful login for:", admin.username);
      res.json({
        ...admin,
        isMain: !!admin.isMain
      });
    } catch (err) {
      console.error("[Admin Login] Unexpected error:", err);
      res.status(500).json({ error: "Internal server error during login." });
    }
  });

  app.get("/api/admin/stats", async (req, res) => {
    const { requester } = req.query;
    const { data: admin } = await supabase
      .from("admins")
      .select("*")
      .eq("username", requester)
      .single();

    if (!admin) return res.status(403).json({ error: "Unauthorized" });

    const { data: games } = await supabase.from("games").select("status");
    const { data: teams } = await supabase.from("teams").select("id");

    res.json({
      totalGames: games?.length || 0,
      activeGames: games?.filter(g => g.status === 'active').length || 0,
      totalTeams: teams?.length || 0
    });
  });

  // Terms and Conditions
  app.get("/api/terms/active", async (req, res) => {
    const { data: terms, error } = await supabase
      .from("terms_versions")
      .select("*")
      .eq("isActive", true)
      .order("createdDate", { ascending: false })
      .limit(1)
      .single();
    res.json(terms);
  });

  app.post("/api/teams/:id/accept-terms", async (req, res) => {
    const { id } = req.params;
    const { version, ipAddress, userAgent } = req.body;
    
    const { error } = await supabase
      .from("teams")
      .update({
        termsAccepted: true,
        termsAcceptedDate: new Date().toISOString(),
        termsVersion: version,
        termsIpAddress: ipAddress,
        termsUserAgent: userAgent
      })
      .eq("id", id);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.get("/api/admin/terms", async (req, res) => {
    const { requester } = req.query;
    const { data: admin } = await supabase
      .from("admins")
      .select("*")
      .eq("username", requester)
      .single();

    if (!admin) return res.status(403).json({ error: "Unauthorized" });

    const { data: versions } = await supabase
      .from("terms_versions")
      .select("*")
      .order("createdDate", { ascending: false });

    const { data: teams } = await supabase
      .from("teams")
      .select("termsAccepted");

    const stats = {
      total: teams?.length || 0,
      accepted: teams?.filter(t => t.termsAccepted).length || 0
    };
    
    const { data: logs } = await supabase
      .from("teams")
      .select("id, name, termsAcceptedDate, termsVersion, termsIpAddress")
      .eq("termsAccepted", true)
      .order("termsAcceptedDate", { ascending: false });

    res.json({ versions, stats, logs });
  });

  app.post("/api/admin/terms", async (req, res) => {
    const { requester, content, version } = req.body;
    const { data: admin } = await supabase
      .from("admins")
      .select("*")
      .eq("username", requester)
      .single();

    if (!admin) return res.status(403).json({ error: "Unauthorized" });

    // Deactivate current active versions
    await supabase
      .from("terms_versions")
      .update({ isActive: false })
      .eq("isActive", true);

    // Insert new version
    const id = Math.random().toString(36).substring(2, 11);
    const { error } = await supabase
      .from("terms_versions")
      .insert({
        id,
        version,
        content,
        createdDate: new Date().toISOString(),
        isActive: true
      });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  // Admin Management (Main Admin Only)
  app.get("/api/admins", async (req, res) => {
    const { requester } = req.query;
    const { data: admin } = await supabase
      .from("admins")
      .select("*")
      .eq("username", requester)
      .single();

    if (!admin || !admin.isMain) return res.status(403).json({ error: "Unauthorized" });

    const { data: admins } = await supabase
      .from("admins")
      .select("username, isMain");

    res.json(admins?.map((a: any) => ({ ...a, isMain: !!a.isMain })));
  });

  app.post("/api/admins", async (req, res) => {
    const { requester, username, password } = req.body;
    const { data: admin } = await supabase
      .from("admins")
      .select("*")
      .eq("username", requester)
      .single();

    if (!admin || !admin.isMain) return res.status(403).json({ error: "Unauthorized" });

    const { error } = await supabase
      .from("admins")
      .insert({ username, password, isMain: false });

    if (error) return res.status(400).json({ error: "Username already exists" });
    res.json({ success: true });
  });

  app.delete("/api/admins/:username", async (req, res) => {
    const { requester } = req.query;
    const { data: admin } = await supabase
      .from("admins")
      .select("*")
      .eq("username", requester)
      .single();

    if (!admin || !admin.isMain) return res.status(403).json({ error: "Unauthorized" });
    if (req.params.username === requester) return res.status(400).json({ error: "Cannot delete yourself" });

    const { error } = await supabase
      .from("admins")
      .delete()
      .eq("username", req.params.username);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  // Game Management
  app.get("/api/games", async (req, res) => {
    const { data: games } = await supabase.from("games").select("*");
    res.json(games || []);
  });

  app.get("/api/games/:id", async (req, res) => {
    const { data: game, error } = await supabase
      .from("games")
      .select("*")
      .eq("id", req.params.id)
      .single();
    if (error || !game) return res.status(404).json({ error: "Game not found" });
    res.json(game);
  });

  app.delete("/api/games/:id", async (req, res) => {
    // Delete related data first (or rely on cascade if set up)
    await supabase.from("clues").delete().eq("gameId", req.params.id);
    await supabase.from("teams").delete().eq("gameId", req.params.id);
    const { error } = await supabase.from("games").delete().eq("id", req.params.id);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.patch("/api/games/:id", async (req, res) => {
    const { 
      startTime, qrStyle, scannerStyle, allowedThemes, allowUserThemeChange, defaultTheme, 
      pdfEnabled, websiteOnlyScanning, fallbackMode, fallbackMessage,
      requester 
    } = req.body;
    
    const { data: admin } = await supabase
      .from("admins")
      .select("*")
      .eq("username", requester)
      .single();

    if (!admin || !admin.isMain) return res.status(403).json({ error: "Unauthorized" });

    const updates: any = {};
    if (startTime !== undefined) updates.startTime = startTime;
    if (qrStyle !== undefined) updates.qrStyle = JSON.stringify(qrStyle);
    if (scannerStyle !== undefined) updates.scannerStyle = JSON.stringify(scannerStyle);
    if (allowedThemes !== undefined) updates.allowedThemes = JSON.stringify(allowedThemes);
    if (allowUserThemeChange !== undefined) updates.allowUserThemeChange = !!allowUserThemeChange;
    if (defaultTheme !== undefined) updates.defaultTheme = defaultTheme;
    if (pdfEnabled !== undefined) updates.pdfEnabled = !!pdfEnabled;
    if (websiteOnlyScanning !== undefined) updates.websiteOnlyScanning = !!websiteOnlyScanning;
    if (fallbackMode !== undefined) updates.fallbackMode = !!fallbackMode;
    if (fallbackMessage !== undefined) updates.fallbackMessage = fallbackMessage;

    const { error } = await supabase
      .from("games")
      .update(updates)
      .eq("id", req.params.id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.post("/api/games", async (req, res) => {
    const { id, name, mode, startTime, requester, pdfEnabled, websiteOnlyScanning, fallbackMode, fallbackMessage, qrStyle, scannerStyle } = req.body;
    
    if (startTime) {
      const { data: admin } = await supabase
        .from("admins")
        .select("*")
        .eq("username", requester)
        .single();
      if (!admin || !admin.isMain) return res.status(403).json({ error: "Only main admin can schedule games" });
    }

    const { error } = await supabase
      .from("games")
      .insert({
        id, name, mode, startTime,
        pdfEnabled: pdfEnabled !== undefined ? !!pdfEnabled : true,
        websiteOnlyScanning: websiteOnlyScanning !== undefined ? !!websiteOnlyScanning : true,
        fallbackMode: !!fallbackMode,
        fallbackMessage: fallbackMessage || null,
        qrStyle: qrStyle ? JSON.stringify(qrStyle) : null,
        scannerStyle: scannerStyle ? JSON.stringify(scannerStyle) : null
      });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.post("/api/games/:id/start", async (req, res) => {
    const { requester } = req.body;
    const { data: game } = await supabase
      .from("games")
      .select("*")
      .eq("id", req.params.id)
      .single();
    
    if (!game) return res.status(404).json({ error: "Game not found" });

    let authorized = false;
    if (requester) {
      const { data: admin } = await supabase
        .from("admins")
        .select("*")
        .eq("username", requester)
        .single();
      if (admin && admin.isMain) authorized = true;
    }

    if (!authorized && game.startTime) {
      const startTime = new Date(game.startTime).getTime();
      if (Date.now() >= startTime) authorized = true;
    }

    if (!authorized) return res.status(403).json({ error: "Only main admin can manually start games before scheduled time" });

    await supabase.from("games").update({ status: 'active' }).eq("id", req.params.id);
    io.emit("game_started", { gameId: req.params.id });
    res.json({ success: true });
  });

  app.post("/api/games/:id/stop", async (req, res) => {
    const { requester } = req.body;
    const { data: admin } = await supabase
      .from("admins")
      .select("*")
      .eq("username", requester)
      .single();
    
    if (!admin || !admin.isMain) return res.status(403).json({ error: "Unauthorized" });

    await supabase.from("games").update({ status: 'finished' }).eq("id", req.params.id);
    io.emit("game_stopped", { gameId: req.params.id });
    res.json({ success: true });
  });

  // Clues
  app.get("/api/games/:id/clues", async (req, res) => {
    const { data: clues } = await supabase
      .from("clues")
      .select("*")
      .eq("gameId", req.params.id)
      .order("sequence", { ascending: true });
    res.json(clues || []);
  });

  app.delete("/api/clues/:id", async (req, res) => {
    const { error } = await supabase.from("clues").delete().eq("id", req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.post("/api/clues", async (req, res) => {
    const { id, gameId, sequence, content, code, teamId, qrStyle } = req.body;
    const { error } = await supabase
      .from("clues")
      .insert({
        id, gameId, sequence, content, code,
        teamId: teamId || null,
        qrStyle: qrStyle ? JSON.stringify(qrStyle) : null
      });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.put("/api/clues/:id", async (req, res) => {
    const { content, code, teamId, qrStyle } = req.body;
    const { error } = await supabase
      .from("clues")
      .update({
        content, code,
        teamId: teamId || null,
        qrStyle: qrStyle ? JSON.stringify(qrStyle) : null
      })
      .eq("id", req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  // Teams
  app.get("/api/games/:id/teams", async (req, res) => {
    const { data: teams } = await supabase
      .from("teams")
      .select("*")
      .eq("gameId", req.params.id);
    res.json(teams || []);
  });

  app.post("/api/teams", async (req, res) => {
    const { id, gameId, loginId } = req.body;
    const { error } = await supabase
      .from("teams")
      .insert({ id, gameId, loginId });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.patch("/api/teams/:id", async (req, res) => {
    const { name, members, qrStyle } = req.body;
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (members !== undefined) updates.members = JSON.stringify(members);
    if (qrStyle !== undefined) updates.qrStyle = JSON.stringify(qrStyle);

    const { error } = await supabase
      .from("teams")
      .update(updates)
      .eq("id", req.params.id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  // Scanning Logic
  app.post("/api/scan", async (req, res) => {
    const { teamId, code } = req.body;
    const { data: team } = await supabase.from("teams").select("*").eq("id", teamId).single();
    if (!team) return res.status(404).json({ error: "Team not found" });

    const { data: game } = await supabase.from("games").select("*").eq("id", team.gameId).single();
    if (!game || game.status !== 'active') return res.status(400).json({ error: "Game is not active" });

    const actualCode = code.startsWith("HUNT-") ? code.substring(5) : code;
    const { data: clue } = await supabase
      .from("clues")
      .select("*")
      .eq("code", actualCode)
      .eq("gameId", game.id)
      .single();

    if (!clue) return res.status(404).json({ error: "Invalid QR Code" });

    if (game.mode === 'team' && clue.teamId && clue.teamId !== team.id) {
      return res.status(403).json({ error: "This clue is not for your team!" });
    }

    if (clue.sequence !== team.currentClueSequence) {
      if (clue.sequence < team.currentClueSequence) {
        return res.status(400).json({ error: "You already solved this clue!" });
      }
      return res.status(400).json({ error: "Solve your previous clues first!" });
    }

    const now = new Date().toISOString();
    await supabase.from("scans").insert({ teamId: team.id, clueId: clue.id, scanTime: now });
    
    const { data: cluesCount } = await supabase
      .from("clues")
      .select("id", { count: 'exact' })
      .eq("gameId", game.id)
      .or(`teamId.eq.${team.id},teamId.is.null`);
    
    const totalClues = cluesCount?.length || 0;
    
    if (clue.sequence === totalClues) {
      await supabase.from("games").update({ status: 'finished', winnerId: team.id }).eq("id", game.id);
      await supabase.from("teams").update({ currentClueSequence: team.currentClueSequence + 1, lastScanTime: now }).eq("id", team.id);
      io.emit("game_over", { winnerId: team.id, winnerName: team.name || team.loginId });
      return res.json({ status: "winner", clue });
    }

    await supabase.from("teams").update({ currentClueSequence: team.currentClueSequence + 1, lastScanTime: now }).eq("id", team.id);
    io.emit("team_progress", { teamId: team.id, sequence: team.currentClueSequence + 1 });

    res.json({ status: "success", clue });
  });

  // History
  app.get("/api/teams/:id/history", async (req, res) => {
    const { data: history } = await supabase
      .from("scans")
      .select(`
        scanTime,
        clues (*)
      `)
      .eq("teamId", req.params.id)
      .order("clues(sequence)", { ascending: true });
    
    // Flatten the result to match expected format
    const formattedHistory = history?.map((h: any) => ({
      ...h.clues,
      scanTime: h.scanTime
    })) || [];

    res.json(formattedHistory);
  });

  app.get("/api/teams/:id/current-clue", async (req, res) => {
    const { data: team } = await supabase.from("teams").select("*").eq("id", req.params.id).single();
    if (!team) return res.status(404).json({ error: "Team not found" });
    
    const { data: clue } = await supabase
      .from("clues")
      .select("*")
      .eq("gameId", team.gameId)
      .eq("sequence", team.currentClueSequence)
      .or(`teamId.eq.${team.id},teamId.is.null`)
      .limit(1)
      .single();

    res.json(clue || null);
  });

  // --- Socket.io ---
  io.on("connection", (socket) => {
    socket.on("register_team", async (teamId) => {
      await supabase.from("teams").update({ isLoggedIn: true, socketId: socket.id }).eq("id", teamId);
      socket.join(`team_${teamId}`);
    });

    socket.on("disconnect", async () => {
      await supabase.from("teams").update({ isLoggedIn: false, socketId: null }).eq("socketId", socket.id);
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
