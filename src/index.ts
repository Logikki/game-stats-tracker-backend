import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { PORT, JWT_SECRET } from './utils/config';
import { TokenPayload } from './common/interfaces/express';
import { League } from './models/league/League';
import { initWebSocketServer, getLeagueConnections } from './utils/websocket';
import app from './app';

const port = PORT ?? 3001;
const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });
initWebSocketServer(wss);

server.on('upgrade', async (request, socket, head) => {
    try {
        const url = new URL(request.url ?? '', `http://localhost`);
        const token = url.searchParams.get('token');
        const leagueId = url.searchParams.get('leagueId');

        if (!token || !leagueId) {
            socket.destroy();
            return;
        }

        let payload: TokenPayload;
        try {
            payload = jwt.verify(token, JWT_SECRET as string) as TokenPayload;
        } catch {
            socket.destroy();
            return;
        }

        const league = await League.findById(leagueId);
        if (!league) {
            socket.destroy();
            return;
        }

        const isMember = league.users.some((id) => id.toString() === payload.id);
        if (!isMember) {
            socket.destroy();
            return;
        }

        wss.handleUpgrade(request, socket, head, (ws) => {
            const connections = getLeagueConnections();
            if (!connections.has(leagueId)) {
                connections.set(leagueId, new Set());
            }
            connections.get(leagueId)!.add(ws);

            ws.on('close', () => {
                connections.get(leagueId)?.delete(ws);
            });
        });
    } catch {
        socket.destroy();
    }
});

server.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
});
