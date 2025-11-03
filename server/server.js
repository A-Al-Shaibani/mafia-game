const WebSocket = require('ws');
const http = require('http');

const server = http.createServer((req, res) => {
    // رد على طلبات HTTP العادية
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Mafia Game Server is Running!');
});

const wss = new WebSocket.Server({ server });

// كود الخادم الأساسي
class MafiaGameServer {
    constructor() {
        this.players = new Map();
        this.gameState = 'LOBBY';
        this.roles = new Map();
        this.votes = new Map();
        this.mafiaTarget = null;
        this.doctorSave = null;
        this.sheriffCheck = null;
        this.hunterChoice = null;
        this.dayNumber = 0;
    }

    addPlayer(ws, playerName) {
        const player = {
            id: Math.random().toString(36).substr(2, 9),
            ws: ws,
            name: playerName,
            role: null,
            alive: true,
            host: this.players.size === 0
        };
        
        this.players.set(player.id, player);
        ws.playerId = player.id;
        
        console.log(`🎮 لاعب جديد: ${playerName} (${player.id})`);
        this.broadcastPlayerList();
        return player;
    }

    broadcastPlayerList() {
        const playerList = Array.from(this.players.values()).map(p => ({
            id: p.id,
            name: p.name,
            host: p.host,
            alive: p.alive,
            role: p.role
        }));
        
        this.broadcast({
            type: 'PLAYER_LIST',
            players: playerList
        });
    }

    broadcast(message) {
        this.players.forEach(player => {
            if (player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(JSON.stringify(message));
            }
        });
    }

    sendToPlayer(playerId, message) {
        const player = this.players.get(playerId);
        if (player && player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(JSON.stringify(message));
        }
    }
}

const gameServer = new MafiaGameServer();

wss.on('connection', (ws, req) => {
    console.log('🔌 عميل متصل جديد');
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('📨 رسالة:', data.type);
            
            if (data.type === 'JOIN_GAME') {
                gameServer.addPlayer(ws, data.playerName);
            }
            
        } catch (error) {
            console.error('❌ خطأ في معالجة الرسالة:', error);
        }
    });

    ws.on('close', () => {
        console.log('🔌 عميل انقطع');
        if (ws.playerId) {
            gameServer.players.delete(ws.playerId);
            gameServer.broadcastPlayerList();
        }
    });

    ws.on('error', (error) => {
        console.error('❌ خطأ في WebSocket:', error);
    });
});

// ⭐ الإعدادات الهامة لـ Render
const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
    console.log(`🎮 جاهز لاستقبال اتصالات WebSocket`);
    console.log(`📡 العنوان: wss://mafia-game-bxwz.onrender.com`);
});

// معالجة الإغلاق النظيف
process.on('SIGTERM', () => {
    console.log('🔄 استقبال إشارة إيقاف...');
    server.close(() => {
        console.log('❌ الخادم متوقف');
        process.exit(0);
    });
});
const WebSocket = require('ws');
const http = require('http');

const server = http.createServer((req, res) => {
    // رد على طلبات HTTP العادية
    if (req.url === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            status: 'OK', 
            message: 'Mafia Game Server is Running',
            timestamp: new Date().toISOString(),
            players: gameServer.players.size
        }));
        return;
    }
    
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('🎭 Mafia Game Server - Use WebSocket connection');
});

const wss = new WebSocket.Server({ server });

// كود الخادم الأساسي (نفس الكود السابق)
class MafiaGameServer {
    constructor() {
        this.players = new Map();
        this.gameState = 'LOBBY';
        this.roles = new Map();
        this.votes = new Map();
        this.mafiaTarget = null;
        this.doctorSave = null;
        this.sheriffCheck = null;
        this.hunterChoice = null;
        this.dayNumber = 0;
    }

    addPlayer(ws, playerName) {
        const player = {
            id: Math.random().toString(36).substr(2, 9),
            ws: ws,
            name: playerName,
            role: null,
            alive: true,
            host: this.players.size === 0
        };
        
        this.players.set(player.id, player);
        ws.playerId = player.id;
        
        console.log(`🎮 لاعب جديد: ${playerName} (${player.id})`);
        this.broadcastPlayerList();
        return player;
    }

    broadcastPlayerList() {
        const playerList = Array.from(this.players.values()).map(p => ({
            id: p.id,
            name: p.name,
            host: p.host,
            alive: p.alive,
            role: this.gameState === 'LOBBY' ? null : p.role
        }));
        
        this.broadcast({
            type: 'PLAYER_LIST',
            players: playerList
        });
    }

    broadcast(message) {
        this.players.forEach(player => {
            if (player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(JSON.stringify(message));
            }
        });
    }
}

const gameServer = new MafiaGameServer();

wss.on('connection', (ws, req) => {
    console.log('🔌 عميل متصل جديد');
    
    // إبقاء الاتصال نشطاً
    const pingInterval = setInterval(() => {
        if (ws.readyState === ws.OPEN) {
            ws.ping();
        }
    }, 25000);

    ws.on('pong', () => {
        // اتصال نشط
    });

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('📨 رسالة:', data.type);
            
            if (data.type === 'JOIN_GAME') {
                gameServer.addPlayer(ws, data.playerName);
            }
            
        } catch (error) {
            console.error('❌ خطأ في معالجة الرسالة:', error);
        }
    });

    ws.on('close', () => {
        console.log('🔌 عميل انقطع');
        clearInterval(pingInterval);
        if (ws.playerId) {
            gameServer.players.delete(ws.playerId);
            gameServer.broadcastPlayerList();
        }
    });

    ws.on('error', (error) => {
        console.error('❌ خطأ في WebSocket:', error);
        clearInterval(pingInterval);
    });
});

// ⭐ استخدم المنفذ الذي يحدده Railway
const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
    console.log(`🎮 جاهز لاستقبال اتصالات WebSocket`);
    console.log(`📡 Railway يدعم WebSockets تلقائياً`);
});

// Health check داخلي
setInterval(() => {
    console.log('❤️  الخادم نشط - اللاعبون:', gameServer.players.size);
}, 60000);