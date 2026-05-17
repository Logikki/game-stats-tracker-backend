import { WebSocket, WebSocketServer } from 'ws';

let wss: WebSocketServer | null = null;
const leagueConnections = new Map<string, Set<WebSocket>>();

export function initWebSocketServer(server: WebSocketServer): void {
    wss = server;
}

export function getLeagueConnections(): Map<string, Set<WebSocket>> {
    return leagueConnections;
}

export function broadcastToLeague(leagueId: string, payload: object): void {
    const clients = leagueConnections.get(leagueId);
    if (!clients) return;
    const message = JSON.stringify(payload);
    for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    }
}
