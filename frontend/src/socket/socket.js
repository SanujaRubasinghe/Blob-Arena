let socket = null;

export function getSocket() {
  if (!socket || socket.readyState > 1) {
    socket = new WebSocket(`ws://${window.location.host}/ws`);
  }
  return socket;
}