import random
import uuid
from models import (
    WORLD_WIDTH,
    WORLD_HEIGHT,
    COLORS,
    NAMES,
    PLAYER_MAX_HP,
    BULLET_SPEED,
)
from fastapi import WebSocket


class GameState:
    def __init__(self):
        self.players = {}
        self.connections = {}
        self.bullets = {}

    def add_player(self, player_id: str, websocket: WebSocket | None = None):
        player = {
            "id": player_id,
            "name": random.choice(NAMES) + str(random.randint(10, 99)),
            "x": float(random.randint(100, WORLD_WIDTH - 100)),
            "y": float(random.randint(100, WORLD_HEIGHT - 100)),
            "color": random.choice(COLORS),
            "hp": PLAYER_MAX_HP,
            "max_hp": PLAYER_MAX_HP,
            "shoot_cooldown": 0.0,
            "vx": 0.0,
            "vy": 0.0,
            "inputs": {
                "up": False,
                "down": False,
                "left": False,
                "right": False,
                "shoot": False,
                "aim_x": 0.0,
                "aim_y": 0.0,
            },
        }
        self.players[player_id] = player
        if websocket:
            self.connections[player_id] = websocket
        return player

    def remove_player(self, player_id: str):
        self.players.pop(player_id, None)
        self.connections.pop(player_id, None)

    def respawn_player(self, player_id: str):
        if player_id not in self.players:
            return
        p = self.players[player_id]
        p["x"] = float(random.randint(100, WORLD_WIDTH - 100))
        p["y"] = float(random.randint(100, WORLD_HEIGHT - 100))
        p["hp"] = PLAYER_MAX_HP

    def update_input(self, player_id: str, msg: dict):
        if player_id in self.players:
            p_in = self.players[player_id]["inputs"]
            p_in["up"] = msg.get("up", False)
            p_in["down"] = msg.get("down", False)
            p_in["left"] = msg.get("left", False)
            p_in["right"] = msg.get("right", False)
            p_in["shoot"] = msg.get("shoot", False)
            p_in["aim_x"] = float(msg.get("aim_x", 0.0))
            p_in["aim_y"] = float(msg.get("aim_y", 0.0))

    def register_socket(self, player_id: str, websocket: WebSocket):
        self.connections[player_id] = websocket

    def spawn_bullet(self, owner_id: str, ox: float, oy: float, tx: float, ty: float):
        import math

        dx = tx - ox
        dy = ty - oy
        dist = math.hypot(dx, dy)
        if dist == 0:
            return

        nx = dx / dist
        ny = dy / dist

        bullet_id = str(uuid.uuid4())
        self.bullets[bullet_id] = {
            "id": bullet_id,
            "owner_id": owner_id,
            "x": ox,
            "y": oy,
            "vx": nx * BULLET_SPEED,
            "vy": ny * BULLET_SPEED,
            "lifetime": 0.0,
            "color": self.players[owner_id]["color"],
        }

    async def broadcast(self, message: str):
        dead = []
        for pid, ws in list(self.connections.items()):
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(pid)

        for pid in dead:
            self.remove_player(pid)
