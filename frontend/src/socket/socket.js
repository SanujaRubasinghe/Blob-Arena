let socket = null;

const WS_URL = import.meta.env.VITE_WS_URL || `ws://${window.location.host}/ws`;

export function getSocket() {
  if (!socket || socket.readyState > 1) {
    socket = new WebSocket(WS_URL);
  }
  return socket;
}