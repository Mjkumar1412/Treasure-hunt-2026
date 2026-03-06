-- Migration for Supabase (PostgreSQL)
-- Run this in your Supabase SQL Editor

-- Games Table
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  mode TEXT NOT NULL,
  status TEXT DEFAULT 'scheduled',
  "startTime" TEXT,
  "winnerId" TEXT,
  "qrStyle" TEXT,
  "scannerStyle" TEXT,
  "allowedThemes" TEXT,
  "allowUserThemeChange" BOOLEAN DEFAULT TRUE,
  "defaultTheme" TEXT DEFAULT 'classic',
  "pdfEnabled" BOOLEAN DEFAULT TRUE,
  "websiteOnlyScanning" BOOLEAN DEFAULT TRUE,
  "fallbackMode" BOOLEAN DEFAULT FALSE,
  "fallbackMessage" TEXT
);

-- Clues Table
CREATE TABLE IF NOT EXISTS clues (
  id TEXT PRIMARY KEY,
  "gameId" TEXT NOT NULL REFERENCES games(id),
  sequence INTEGER NOT NULL,
  content TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  "teamId" TEXT,
  "qrStyle" TEXT
);

-- Teams Table
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  "gameId" TEXT NOT NULL REFERENCES games(id),
  "loginId" TEXT NOT NULL UNIQUE,
  name TEXT,
  members TEXT,
  "currentClueSequence" INTEGER DEFAULT 1,
  "lastScanTime" TEXT,
  "isLoggedIn" BOOLEAN DEFAULT FALSE,
  "socketId" TEXT,
  "qrStyle" TEXT,
  "termsAccepted" BOOLEAN DEFAULT FALSE,
  "termsAcceptedDate" TEXT,
  "termsVersion" TEXT,
  "termsIpAddress" TEXT,
  "termsUserAgent" TEXT
);

-- Terms Versions Table
CREATE TABLE IF NOT EXISTS terms_versions (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  content TEXT NOT NULL,
  "createdDate" TEXT NOT NULL,
  "isActive" BOOLEAN DEFAULT TRUE
);

-- Scans Table
CREATE TABLE IF NOT EXISTS scans (
  id BIGSERIAL PRIMARY KEY,
  "teamId" TEXT NOT NULL REFERENCES teams(id),
  "clueId" TEXT NOT NULL REFERENCES clues(id),
  "scanTime" TEXT NOT NULL
);

-- Admins Table
CREATE TABLE IF NOT EXISTS admins (
  username TEXT PRIMARY KEY,
  password TEXT NOT NULL,
  "isMain" BOOLEAN DEFAULT FALSE
);

-- Seed Initial Admin
INSERT INTO admins (username, password, "isMain") 
VALUES ('MJK', 'Mjk@1412', TRUE)
ON CONFLICT (username) DO UPDATE SET password = 'Mjk@1412';

-- Seed Initial Terms
INSERT INTO terms_versions (id, version, content, "createdDate", "isActive")
VALUES ('v1', '1.0', '# TREASURE HUNT - TERMS & CONDITIONS\n\n## SECTION 1: GAME RULES\n1.1 Players must use their unique 4-digit Login ID to access the game.\n1.2 Only one device can be logged in per team at any time.\n1.3 Clues must be scanned in the correct sequence.\n1.4 The first team to scan the final QR code wins the treasure.\n1.5 Game ends immediately when final code is scanned by any team.\n\n## SECTION 2: CODE OF CONDUCT\n2.1 Players must be respectful to other teams and event staff.\n2.2 No physical contact or aggressive behavior allowed.\n2.3 Do not block or hide QR codes from other teams.\n2.4 Fair play is expected from all participants.\n\n## SECTION 3: SAFETY GUIDELINES\n3.1 Players participate at their own risk.\n3.2 Stay within designated game areas.\n3.3 Be aware of surroundings (traffic, obstacles, etc.).\n3.4 In case of emergency, contact event staff immediately.', NOW(), TRUE)
ON CONFLICT (id) DO NOTHING;
