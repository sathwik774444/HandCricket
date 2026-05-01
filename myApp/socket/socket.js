import { io } from 'socket.io-client';

const SOCKET_URL = 'http://192.168.31.173:5000';
// const SOCKET_URL = 'http://localhost:5000';

export const socket = io(SOCKET_URL);