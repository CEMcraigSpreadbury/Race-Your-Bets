// Singleton socket instance — import this everywhere instead of creating new sockets
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  autoConnect: true,
});

export default socket;
