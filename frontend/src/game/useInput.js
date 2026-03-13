import { useEffect } from "react";
import { getSocket } from "../socket/socket";

export function useInput(camRef) {
  useEffect(() => {
    const keys = { up: false, down: false, left: false, right: false };
    const aim  = { x: 0, y: 0 };

    const send = (shoot = false) => {
      const ws = getSocket();
      if (ws.readyState !== WebSocket.OPEN) return;
      ws.send(JSON.stringify({
        type: "input",
        ...keys,
        shoot,
        aim_x: aim.x,
        aim_y: aim.y
      }));
    };

    const onKeyDown = (e) => {
      if (e.key === "ArrowUp"    || e.key === "w") keys.up    = true;
      if (e.key === "ArrowDown"  || e.key === "s") keys.down  = true;
      if (e.key === "ArrowLeft"  || e.key === "a") keys.left  = true;
      if (e.key === "ArrowRight" || e.key === "d") keys.right = true;
      if (e.code === "Space") { e.preventDefault(); send(true); return; }
      send();
    };

    const onKeyUp = (e) => {
      if (e.key === "ArrowUp"    || e.key === "w") keys.up    = false;
      if (e.key === "ArrowDown"  || e.key === "s") keys.down  = false;
      if (e.key === "ArrowLeft"  || e.key === "a") keys.left  = false;
      if (e.key === "ArrowRight" || e.key === "d") keys.right = false;
      send();
    };

    const onMouseMove = (e) => {
      const canvas = document.querySelector("canvas");
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      aim.x = (e.clientX - rect.left) + (camRef.current?.x ?? 0);
      aim.y = (e.clientY - rect.top)  + (camRef.current?.y ?? 0);
    };

    const onMouseDown = (e) => {
      if (e.button === 0) send(true);
    };

    const onMouseUp = (e) => {
      if (e.button === 0) send(false);
    };

    window.addEventListener("keydown",   onKeyDown);
    window.addEventListener("keyup",     onKeyUp);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup",   onMouseUp);

    return () => {
      window.removeEventListener("keydown",   onKeyDown);
      window.removeEventListener("keyup",     onKeyUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup",   onMouseUp);
    };
  }, [camRef]);
}