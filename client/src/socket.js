// Singleton socket instance — import this everywhere instead of creating new sockets
import { io } from 'socket.io-client';

const socket = io({
  autoConnect: true,
});

export default socket;
