import asyncio
import json
import time
import logging
from models import (
    WORLD_WIDTH,
    WORLD_HEIGHT,
    PLAYER_SPEED,
    PLAYER_SIZE,
    TICK_RATE,
    BULLET_SIZE,
    BULLET_LIFETIME,
    BULLET_DAMAGE,
    SHOOT_COOLDOWN,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("game")

def check_bullet_hit(bullet: dict, player: dict) -> bool:
    return (
        bullet["x"] < player["x"] + PLAYER_SIZE
        and bullet["x"] + BULLET_SIZE > player["x"]
        and bullet["y"] < player["y"] + PLAYER_SIZE
        and bullet["y"] + BULLET_SIZE > player["y"]
    )


async def start_game_loop(state):
    tick_interval = 1.0 / TICK_RATE
    last_time = time.monotonic()

    while True:
        try:
            now = time.monotonic()
            dt = now - last_time
            last_time = now

            for player in (state.players.values()):
                inp = player["inputs"]
                vx = 0.0
                vy = 0.0

                if inp["left"]:
                    vx -= PLAYER_SPEED
                if inp["right"]:
                    vx += PLAYER_SPEED
                if inp["up"]:
                    vy -= PLAYER_SPEED
                if inp["down"]:
                    vy += PLAYER_SPEED

                player["x"] = max(0, min(WORLD_WIDTH - PLAYER_SIZE, player["x"] + vx * dt))
                player["y"] = max(0, min(WORLD_HEIGHT - PLAYER_SIZE, player["y"] + vy * dt))

                if player["shoot_cooldown"] > 0:
                    player["shoot_cooldown"] -= dt

                if inp["shoot"] and player["shoot_cooldown"] <= 0:
                    ox = player["x"] + PLAYER_SIZE / 2
                    oy = player["y"] + PLAYER_SIZE / 2
                    state.spawn_bullet(
                        owner_id=player["id"],
                        ox=ox,
                        oy=oy,
                        tx=inp["aim_x"],
                        ty=inp["aim_y"],
                    )
                    player["shoot_cooldown"] = SHOOT_COOLDOWN

            to_remove = []
            kill_events = []

            for bullet_id, bullet in list(state.bullets.items()):
                bullet["x"] += bullet["vx"] * dt
                bullet["y"] += bullet["vy"] * dt
                bullet["lifetime"] += dt

                out_of_bounds = (
                    bullet["x"] < 0
                    or bullet["x"] > WORLD_WIDTH
                    or bullet["y"] < 0
                    or bullet["y"] > WORLD_HEIGHT
                )

                if bullet["lifetime"] >= BULLET_LIFETIME or out_of_bounds:
                    to_remove.append(bullet_id)
                    continue

                for player in state.players.values():
                    if player["id"] == bullet["owner_id"]:
                        continue
                    if check_bullet_hit(bullet, player):
                        player["hp"] -= BULLET_DAMAGE
                        to_remove.append(bullet_id)

                        if player["hp"] <= 0:
                            kill_events.append(
                                {
                                    "killer_id": bullet["owner_id"],
                                    "victim_id": player["id"],
                                }
                            )
                        break

            for bid in set(to_remove):
                state.bullets.pop(bid)

            for event in kill_events:
                victim_id = event["victim_id"]
                state.respawn_player(victim_id)
                await state.broadcast(
                    json.dumps(
                        {
                            "type": "kill",
                            "killer_id": event["killer_id"],
                            "victim_id": victim_id,
                            "killer_name": state.players.get(event["killer_id"], {}).get(
                                "name", "?"
                            ),
                            "victim_name": state.players.get(victim_id, {}).get(
                                "name", "?"
                            ),
                        }
                    )
                )

            snapshot = json.dumps(
                {
                    "type": "state",
                    "players": [
                        {
                            "id": p["id"],
                            "name": p["name"],
                            "x": p["x"],
                            "y": p["y"],
                            "color": p["color"],
                            "size": PLAYER_SIZE,
                            "hp": p["hp"],
                            "max_hp": p["max_hp"],
                        }
                        for p in state.players.values()
                    ],
                    "bullets": [
                        {"id": b["id"], "x": b["x"], "y": b["y"], "color": b["color"]}
                        for b in state.bullets.values()
                    ],
                }
            )

            await state.broadcast(snapshot)
        
        except Exception as e:
            logger.error(f"Game loop error: {e}", exc_info=True)

        await asyncio.sleep(tick_interval)