# 🟦 BLOB ARENA

A fast-paced, real-time 2D multiplayer battle arena where you control a blob and compete against others. Built with modern web technologies, this project features high-performance Canvas rendering and a robust FastAPI backend.

![Project Preview](https://via.placeholder.com/800x450/1a1a2e/ffffff?text=BLOB+ARENA)

## 🚀 Features

- **Real-time Multiplayer**: Seamless combat powered by WebSockets.
- **Dynamic Minimap**: Track your position, enemies, and project bullets in real-time.
- **High-Performance Rendering**: Smooth 60FPS gameplay using the HTML5 Canvas API.
- **Combat System**: Health bars, shooting mechanics, and a live kill feed.
- **Responsive Camera**: Smart viewport follows your player smoothly across the large arena.
- **Modern Tech Stack**: React + Vite for a blazing fast frontend and FastAPI for a high-performance backend.

## 🛠️ Technology Stack

### Frontend
- **Framework**: [React](https://reactjs.org/) (Vite)
- **Rendering**: HTML5 Canvas API
- **State Management**: React Hooks (useRef, useEffect, useState)
- **Communication**: WebSockets

### Backend
- **Language**: [Python](https://www.python.org/)
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/)
- **Concurrency**: `asyncio`
- **Networking**: WebSockets for real-time state synchronization

## 🎮 Controls

- **WASD / Arrow Keys**: Move your blob
- **Mouse Click / Spacebar**: Shoot
- **Minimap**: Check the bottom-right corner for local awareness

## 📂 Project Structure

```text
blob-arena-multiplayer/
├── frontend/           # React + Vite application
│   ├── src/
│   │   ├── game/       # Game rendering and input logic
│   │   └── socket/     # WebSocket connection handling
├── backend/            # FastAPI + Python server
│   ├── main.py         # Entry point and WebSocket routes
│   ├── game_loop.py    # Server-side game physics and state updates
│   └── game_state.py   # Multiplayer state management
└── README.md           # Root documentation
```

## ⚙️ Setup & Installation

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Python 3.10+](https://www.python.org/)

### 2. Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

The game will be available at `http://localhost:5173` (or your local Vite port).

## 📜 License
MIT License. Feel free to use and modify for your own projects!
