import { useEffect, useRef, useState } from "react";
import { getSocket } from "../socket/socket";
import { useInput } from "./useInput";

const VIEWPORT_W = 800;
const VIEWPORT_H = 600;
const BULLET_SIZE = 8;
const KILL_FEED_MAX = 5;
const KILL_FEED_TTL = 4000;

// Minimap constants
const MM_W = 160;
const MM_H = 160;
const MM_PAD = 12;          // distance from canvas edge
const MM_X = VIEWPORT_W - MM_W - MM_PAD;
const MM_Y = VIEWPORT_H - MM_H - MM_PAD;
const MM_BORDER = 2;
const MM_PLAYER_SIZE = 4;
const MM_BULLET_SIZE = 2;
const MM_VIEWPORT_ALPHA = 0.15;

export default function GameCanvas() {
  const canvasRef   = useRef(null);
  const playersRef  = useRef([]);
  const bulletsRef  = useRef([]);
  const myIdRef     = useRef(null);
  const worldRef    = useRef({ width: 2000, height: 2000 });
  const camRef      = useRef({ x: 0, y: 0 });
  const killFeedRef = useRef([]);

  const [playerCount, setPlayerCount] = useState(0);

  useInput(camRef);

  useEffect(() => {
    const ws = getSocket();

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === "init") {
        myIdRef.current = msg.your_id;
        worldRef.current = { width: msg.world_width, height: msg.world_height };
      }

      if (msg.type === "state") {
        playersRef.current = msg.players;
        bulletsRef.current = msg.bullets;
        setPlayerCount(msg.players.length);
      }

      if (msg.type === "kill") {
        killFeedRef.current = [
          { text: `${msg.killer_name} eliminated ${msg.victim_name}`, ts: Date.now() },
          ...killFeedRef.current
        ].slice(0, KILL_FEED_MAX);
      }
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animId;

    // --- Minimap draw helper ---
    const drawMinimap = (camX, camY) => {
      const world = worldRef.current;
      const scaleX = MM_W / world.width;
      const scaleY = MM_H / world.height;

      // Convert world coords to minimap-local coords
      const toMM = (wx, wy) => ({
        x: MM_X + wx * scaleX,
        y: MM_Y + wy * scaleY
      });

      // ---- Background ----
      ctx.fillStyle = "rgba(10, 10, 20, 0.82)";
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = MM_BORDER;
      ctx.beginPath();
      ctx.roundRect(MM_X, MM_Y, MM_W, MM_H, 6);
      ctx.fill();
      ctx.stroke();

      // ---- Grid lines (4x4) ----
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      const gridCols = 4;
      const gridRows = 4;
      for (let i = 1; i < gridCols; i++) {
        const x = MM_X + (MM_W / gridCols) * i;
        ctx.beginPath();
        ctx.moveTo(x, MM_Y);
        ctx.lineTo(x, MM_Y + MM_H);
        ctx.stroke();
      }
      for (let i = 1; i < gridRows; i++) {
        const y = MM_Y + (MM_H / gridRows) * i;
        ctx.beginPath();
        ctx.moveTo(MM_X, y);
        ctx.lineTo(MM_X + MM_W, y);
        ctx.stroke();
      }

      // ---- Viewport rectangle (where camera is looking) ----
      const vpX = MM_X + camX * scaleX;
      const vpY = MM_Y + camY * scaleY;
      const vpW = VIEWPORT_W * scaleX;
      const vpH = VIEWPORT_H * scaleY;
      ctx.fillStyle = `rgba(255,255,255,${MM_VIEWPORT_ALPHA})`;
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.rect(
        Math.max(MM_X, vpX),
        Math.max(MM_Y, vpY),
        Math.min(vpW, MM_W - (vpX - MM_X)),
        Math.min(vpH, MM_H - (vpY - MM_Y))
      );
      ctx.fill();
      ctx.stroke();

      // ---- Clip everything else to minimap bounds ----
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(MM_X, MM_Y, MM_W, MM_H, 6);
      ctx.clip();

      // ---- Bullets ----
      for (const b of bulletsRef.current) {
        const { x, y } = toMM(b.x, b.y);
        ctx.fillStyle = b.color;
        ctx.fillRect(x - MM_BULLET_SIZE / 2, y - MM_BULLET_SIZE / 2, MM_BULLET_SIZE, MM_BULLET_SIZE);
      }

      // ---- Other players ----
      for (const p of playersRef.current) {
        if (p.id === myIdRef.current) continue;
        const { x, y } = toMM(p.x, p.y);
        ctx.fillStyle = p.color;
        ctx.fillRect(x - MM_PLAYER_SIZE / 2, y - MM_PLAYER_SIZE / 2, MM_PLAYER_SIZE, MM_PLAYER_SIZE);
      }

      // ---- Self — white diamond ----
      const me = playersRef.current.find(p => p.id === myIdRef.current);
      if (me) {
        const { x, y } = toMM(me.x, me.y);
        const d = MM_PLAYER_SIZE + 2;
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = me.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x,     y - d);   // top
        ctx.lineTo(x + d, y    );   // right
        ctx.lineTo(x,     y + d);   // bottom
        ctx.lineTo(x - d, y    );   // left
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();

      // ---- Label ----
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.font = "9px monospace";
      ctx.textAlign = "left";
      ctx.fillText("MINIMAP", MM_X + 5, MM_Y + MM_H - 5);

      // ---- Player count badge ----
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.beginPath();
      ctx.roundRect(MM_X + MM_W - 36, MM_Y + MM_H - 16, 34, 13, 3);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "9px monospace";
      ctx.textAlign = "right";
      ctx.fillText(`${playersRef.current.length} online`, MM_X + MM_W - 4, MM_Y + MM_H - 5);
    };

    const draw = () => {
      ctx.clearRect(0, 0, VIEWPORT_W, VIEWPORT_H);

      const me = playersRef.current.find(p => p.id === myIdRef.current);
      const camX = me ? me.x - VIEWPORT_W / 2 : 0;
      const camY = me ? me.y - VIEWPORT_H / 2 : 0;
      camRef.current = { x: camX, y: camY };

      // ---- Background ----
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, VIEWPORT_W, VIEWPORT_H);

      // ---- Grid ----
      ctx.strokeStyle = "#2a2a4e";
      ctx.lineWidth = 1;
      const gridSize = 50;
      const startX = -((camX % gridSize) + gridSize) % gridSize;
      const startY = -((camY % gridSize) + gridSize) % gridSize;
      for (let x = startX; x < VIEWPORT_W; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, VIEWPORT_H); ctx.stroke();
      }
      for (let y = startY; y < VIEWPORT_H; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VIEWPORT_W, y); ctx.stroke();
      }

      // ---- Bullets ----
      for (const b of bulletsRef.current) {
        const sx = b.x - camX;
        const sy = b.y - camY;
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 8;
        ctx.fillRect(sx, sy, BULLET_SIZE, BULLET_SIZE);
        ctx.shadowBlur = 0;
      }

      // ---- Players ----
      for (const p of playersRef.current) {
        const sx = p.x - camX;
        const sy = p.y - camY;
        const isSelf = p.id === myIdRef.current;

        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(sx + 4, sy + 4, p.size, p.size);

        ctx.fillStyle = p.color;
        ctx.fillRect(sx, sy, p.size, p.size);

        if (isSelf) {
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 2;
          ctx.strokeRect(sx, sy, p.size, p.size);
        }

        ctx.fillStyle = "#fff";
        ctx.font = "11px monospace";
        ctx.textAlign = "center";
        ctx.fillText(p.name, sx + p.size / 2, sy - 14);

        const barW = p.size;
        const barH = 4;
        const barX = sx;
        const barY = sy - 8;
        ctx.fillStyle = "#333";
        ctx.fillRect(barX, barY, barW, barH);
        const hpPct = Math.max(0, p.hp / p.max_hp);
        ctx.fillStyle = hpPct > 0.5 ? "#2ecc71" : hpPct > 0.25 ? "#f39c12" : "#e74c3c";
        ctx.fillRect(barX, barY, barW * hpPct, barH);
      }

      // ---- Kill feed ----
      const now = Date.now();
      killFeedRef.current = killFeedRef.current.filter(k => now - k.ts < KILL_FEED_TTL);
      ctx.font = "12px monospace";
      ctx.textAlign = "left";
      killFeedRef.current.forEach((entry, i) => {
        const alpha = Math.max(0, 1 - ((now - entry.ts) / KILL_FEED_TTL) * 1.5);
        ctx.fillStyle = `rgba(255,80,80,${alpha})`;
        ctx.fillText(entry.text, 10, 20 + i * 18);
      });

      // ---- Minimap (drawn last so it sits on top of everything) ----
      drawMinimap(camX, camY);

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <canvas
        ref={canvasRef}
        width={VIEWPORT_W}
        height={VIEWPORT_H}
        style={{ display: "block", border: "2px solid #333", cursor: "crosshair" }}
      />
      <div style={{
        position: "absolute", top: 8, right: 12,
        color: "#aaa", fontFamily: "monospace", fontSize: 13
      }}>
        Players: {playerCount}
      </div>
      <div style={{
        position: "absolute", bottom: 8, left: 12,
        color: "#555", fontFamily: "monospace", fontSize: 11
      }}>
        WASD to move · Click or Space to shoot
      </div>
    </div>
  );
}