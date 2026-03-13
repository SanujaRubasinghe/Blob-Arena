import GameCanvas from "./game/GameCanvas";

export default function App() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      background: "#111",
      color: "#fff",
      fontFamily: "monospace"
    }}>
      <h2 style={{ marginBottom: 16, letterSpacing: 2 }}>🟦 BLOB WORLD</h2>
      <GameCanvas />
    </div>
  );
}