import asyncio
import uuid
import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from game_state import GameState
from game_loop import start_game_loop
from models import WORLD_HEIGHT, WORLD_WIDTH

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("game")

state = GameState()

@asynccontextmanager
async def lifespan(app: FastAPI):
    loop_task = asyncio.create_task(start_game_loop(state))
    logger.info("Game loop started.")
    yield

    loop_task.cancel()
    try:
        await loop_task
    except asyncio.CancelledError:
        logger.info("Game loop stopped cleanly.")

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    player_id = str(uuid.uuid4())
    player = state.add_player(player_id)
    state.register_socket(player_id, websocket)

    await websocket.send_text(json.dumps({
        "type": "init",
        "your_id": player_id,
        "world_width": WORLD_WIDTH,
        "world_height": WORLD_HEIGHT
    }))

    logger.info(f"Player joined: {player['name']} ({player_id})")

    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
            except json.JSONDecodeError:
                continue

            if msg.get("type") == "input":
                state.update_input(player_id, msg)
    except WebSocketDisconnect:
        state.remove_player(player_id)
        logger.info(f"Player left: {player_id}")
        await state.broadcast(json.dumps({
            "type": "player_left",
            "id": player_id
        }))


