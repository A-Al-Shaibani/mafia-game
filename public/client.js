class MafiaGameClient {
    constructor() {
        // ⭐ الخادم الافتراضي على Render
        this.DEFAULT_SERVER = "mafia-game-bxwz.onrender.com";
        this.ws = null;
        this.playerId = null;
        this.isHost = false;
        this.gameState = 'LOBBY';
        this.players = [];
        this.currentPhase = '';
        this.phaseTimer = null;
        this.currentPlayer = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
    }

    // الاتصال بالخادم
    connect(serverUrl, playerName) {
        // ⭐ إذا كان serverUrl فارغاً، استخدم الخادم الافتراضي
        let finalServerUrl = serverUrl;
        if (!serverUrl || serverUrl.trim() === '') {
            finalServerUrl = `wss://${this.DEFAULT_SERVER}`;
            console.log('🔗 اتصال تلقائي مع:', finalServerUrl);
        } else if (!serverUrl.startsWith('ws')) {
            // إذا أدخل رابط بدون ws:// أضفها تلقائياً
            finalServerUrl = `wss://${serverUrl}`;
        }
        
        console.log('جاري الاتصال بـ:', finalServerUrl);
        this.showMessage('جاري الاتصال بالخادم...', 'info');
        
        try {
            this.ws = new WebSocket(finalServerUrl);
            
            this.ws.onopen = () => {
                console.log('✅ تم الاتصال بالخادم بنجاح');
                this.reconnectAttempts = 0;
                this.send({
                    type: 'JOIN_GAME',
                    playerName: playerName
                });
                
                this.showScreen('waitingScreen');
                this.updatePlayerDisplayName(playerName);
                this.showMessage('تم الاتصال بالخادم بنجاح', 'success');
                
                // تحديث معلومات الاتصال في الواجهة
                this.updateConnectionInfo(serverUrl);
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('📨 رسالة واردة:', data.type, data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('❌ خطأ في معالجة الرسالة:', error);
                    this.showMessage('خطأ في استقبال البيانات', 'error');
                }
            };

            this.ws.onclose = (event) => {
                console.log('🔌 انقطع الاتصال بالخادم', event.code, event.reason);
                
                if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
                    // محاولة إعادة الاتصال
                    this.reconnectAttempts++;
                    this.showMessage(`محاولة إعادة الاتصال... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`, 'warning');
                    
                    setTimeout(() => {
                        if (this.gameState !== 'LOBBY') {
                            this.connect(serverUrl, playerName);
                        }
                    }, 3000);
                } else {
                    this.showMessage('انقطع الاتصال بالخادم', 'error');
                    this.showScreen('joinScreen');
                }
            };

            this.ws.onerror = (error) => {
                console.error('❌ خطأ في الاتصال:', error);
                this.showMessage('فشل الاتصال بالخادم - تأكد من الرابط', 'error');
            };

        } catch (error) {
            console.error('❌ خطأ في الاتصال:', error);
            this.showMessage('عنوان الخادم غير صحيح', 'error');
        }
    }

    // معالجة الرسائل الواردة من الخادم
    handleMessage(data) {
        switch (data.type) {
            case 'PLAYER_LIST':
                this.handlePlayerList(data);
                break;

            case 'GAME_STARTED':
                this.handleGameStart(data);
                break;

            case 'NIGHT_START':
                this.handleNightStart(data);
                break;

            case 'NIGHT_PHASE':
                this.handleNightPhase(data);
                break;

            case 'YOUR_TURN':
                this.handleYourTurn(data);
                break;

            case 'CHECK_RESULT':
                this.handleCheckResult(data);
                break;

            case 'DAY_START':
                this.handleDayStart(data);
                break;

            case 'VOTING_START':
                this.handleVotingStart(data);
                break;

            case 'VOTE_RESULTS':
                this.handleVoteResults(data);
                break;

            case 'HUNTER_CHOICE':
                this.handleHunterChoice(data);
                break;

            case 'HUNTER_RESULT':
                this.handleHunterResult(data);
                break;

            case 'GAME_END':
                this.handleGameEnd(data);
                break;

            case 'ERROR':
                this.handleError(data);
                break;

            default:
                console.warn('⚠️ رسالة غير معروفة:', data);
        }
    }

    // تحديث قائمة اللاعبين
    handlePlayerList(data) {
        this.players = data.players;
        
        // تحديث الواجهة
        this.updatePlayersList(this.players);
        
        // إذا كان مضيفاً، تحديث واجهة المضيف
        if (this.isHost && typeof updateLobbyDisplay === 'function') {
            updateLobbyDisplay(this.players, true);
        }
    }

    // بدء اللعبة
    handleGameStart(data) {
        this.gameState = 'NIGHT';
        this.playerId = data.yourId;
        this.isHost = data.isHost;
        
        console.log('🎮 بدأت اللعبة - دوري:', data.yourRole);
        this.showScreen('gameScreen');
        this.showMessage('🎬 بدأت اللعبة!', 'success');
        
        // تحديث الواجهة حسب نوع المستخدم
        if (this.isHost) {
            this.updateHostInterface({
                state: 'NIGHT',
                dayNumber: data.dayNumber,
                players: this.players
            });
        } else {
            this.updatePlayerInterface({
                state: 'NIGHT',
                dayNumber: data.dayNumber,
                players: this.players,
                yourRole: data.yourRole
            });
        }
    }

    // بدء الليل
    handleNightStart(data) {
        this.gameState = 'NIGHT';
        this.playSound(data.sound);
        
        this.showMessage('🌙 بدأ الليل - الأدوار تفعل مهامها', 'info');
        
        if (this.isHost) {
            this.updateHostInterface({
                state: 'NIGHT',
                dayNumber: data.dayNumber,
                players: this.players
            });
        } else {
            this.updatePlayerInterface({
                state: 'NIGHT',
                dayNumber: data.dayNumber,
                players: this.players
            });
        }
    }

    // مرحلة الليل
    handleNightPhase(data) {
        this.currentPhase = data.phase;
        this.playSound(data.sound);
        
        const phaseName = this.getPhaseName(data.phase);
        this.showMessage(`🎭 ${phaseName}`, 'info');
        this.startPhaseTimer(data.duration);
        
        if (!this.isHost) {
            this.updatePlayerInterface({
                state: 'NIGHT',
                phase: data.phase,
                players: this.players
            });
        }
    }

    // دور اللاعب الحالي
    handleYourTurn(data) {
        this.currentPhase = data.role;
        
        const action = this.getRoleAction(data.role);
        this.showMessage(`🎯 دورك الآن! ${action}`, 'success');
        
        this.updatePlayerInterface({
            state: 'NIGHT',
            phase: data.role,
            yourTurn: true,
            selectablePlayers: data.players,
            players: this.players
        });
    }

    // نتيجة تحقق زعيم الصالحين
    handleCheckResult(data) {
        const resultText = `${data.player} هو ${data.isMafia ? 'مافيا 🎭' : 'صالح 👼'}`;
        this.showMessage(`🔍 نتيجة التحقق: ${resultText}`, 'info');
        
        if (typeof showCheckResult === 'function') {
            showCheckResult(data.player, data.isMafia);
        }
    }

    // بدء النهار
    handleDayStart(data) {
        this.gameState = 'DAY';
        this.playSound(data.sound);
        
        let message = '';
        if (data.killedPlayer) {
            const killedPlayer = this.players.find(p => p.id === data.killedPlayer);
            message = `☠️ تم اغتيال ${killedPlayer ? killedPlayer.name : 'لاعب'}`;
        } else if (data.doctorSaved) {
            message = '🛡️ عملية اغتيال فاشلة';
        } else {
            message = '🌙 ليلة هادئة... لم يمت أحد';
        }

        this.showMessage(message, 'info');

        if (this.isHost) {
            this.updateHostInterface({
                state: 'DAY',
                dayNumber: data.dayNumber,
                players: this.players,
                nightResults: message
            });
        } else {
            this.updatePlayerInterface({
                state: 'DAY',
                dayNumber: data.dayNumber,
                players: this.players,
                statusMessage: message
            });
        }
    }

    // بدء التصويت
    handleVotingStart(data) {
        this.gameState = 'VOTING';
        this.showMessage('🗳️ وقت التصويت! صوت على من تريد إقصاءه', 'info');
        
        if (!this.isHost) {
            this.showVotingInterface(data.votablePlayers);
        }
    }

    // نتائج التصويت
    handleVoteResults(data) {
        this.showMessage(data.message, 'info');
        
        setTimeout(() => {
            if (this.isHost) {
                this.updateHostInterface({
                    state: 'NIGHT',
                    players: this.players,
                    voteResults: data.message
                });
            }
        }, 3000);
    }

    // تفعيل خيار الصياد
    handleHunterChoice(data) {
        this.showMessage('🎯 أنت الصياد! اختر من يخرج معك', 'info');
        
        if (!this.isHost) {
            this.showHunterInterface(data.players);
        }
    }

    // نتيجة اختيار الصياد
    handleHunterResult(data) {
        this.showMessage(data.message, 'info');
    }

    // نهاية اللعبة
    handleGameEnd(data) {
        this.gameState = 'END';
        const message = data.winner === 'MAFIA_WIN' ? 
            '🎭 المافيا فازت!' : '👼 الصالحون فازوا!';
        
        this.showMessage(message, 'success');
        
        setTimeout(() => {
            if (this.isHost) {
                this.showScreen('lobbyScreen');
            } else {
                this.showScreen('joinScreen');
            }
            this.resetGameState();
        }, 5000);
    }

    // معالجة الأخطاء
    handleError(data) {
        this.showMessage(data.message, 'error');
    }

    // تشغيل الصوت
    playSound(soundFile) {
        try {
            // إذا كان مجلد الأصوات موجوداً
            const audio = new Audio(`sounds/${soundFile}`);
            audio.volume = 0.7;
            audio.play().catch(e => {
                console.log('🔇 لا يمكن تشغيل الصوت:', e);
            });
        } catch (error) {
            console.error('❌ خطأ في تشغيل الصوت:', error);
        }
    }

    // بدء مؤقت المرحلة
    startPhaseTimer(duration) {
        this.clearPhaseTimer();
        
        let timeLeft = duration;
        this.updateTimerDisplay(timeLeft);
        
        this.phaseTimer = setInterval(() => {
            timeLeft--;
            this.updateTimerDisplay(timeLeft);
            
            if (timeLeft <= 0) {
                this.clearPhaseTimer();
                this.showMessage('⏰ انتهى الوقت', 'warning');
            }
        }, 1000);
    }

    // تحديث عرض المؤقت
    updateTimerDisplay(seconds) {
        const timerElement = document.getElementById('phaseTimer');
        if (timerElement) {
            const minutes = Math.floor(seconds / 60);
            const secs = seconds % 60;
            timerElement.textContent = `${minutes}:${secs.toString().padStart(2, '0')}`;
            
            // تغيير اللون عندما يقل الوقت
            if (seconds <= 10) {
                timerElement.style.color = '#dc3545';
            } else if (seconds <= 30) {
                timerElement.style.color = '#ffc107';
            } else {
                timerElement.style.color = '#4CAF50';
            }
        }
    }

    // مسح المؤقت
    clearPhaseTimer() {
        if (this.phaseTimer) {
            clearInterval(this.phaseTimer);
            this.phaseTimer = null;
        }
    }

    // إرسال رسالة للخادم
    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
            console.log('📤 رسالة مرسلة:', data);
        } else {
            console.error('❌ الاتصال غير متاح لإرسال الرسالة');
            this.showMessage('الاتصال غير متاح', 'error');
        }
    }

    // دوال مساعدة للواجهة
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
        }
    }

    showMessage(message, type = 'info') {
        console.log(`💬 ${type}: ${message}`);
        
        // عرض إشعار مؤقت
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            z-index: 1000;
            font-weight: bold;
            max-width: 300px;
            text-align: center;
            animation: slideIn 0.3s ease;
        `;
        
        const colors = {
            success: '#4CAF50',
            error: '#dc3545',
            info: '#17a2b8',
            warning: '#ffc107'
        };
        
        notification.style.background = colors[type] || colors.info;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 3000);
    }

    updatePlayerDisplayName(name) {
        const displayName = document.getElementById('playerDisplayName');
        if (displayName) {
            displayName.textContent = name;
        }
    }

    updateConnectionInfo(serverUrl) {
        const connectionInfo = document.getElementById('connectionInfo');
        if (connectionInfo) {
            if (!serverUrl) {
                connectionInfo.innerHTML = '<p>✅ متصل بالخادم الرئيسي</p>';
            } else {
                connectionInfo.innerHTML = `<p>✅ متصل بخادم مخصص</p>`;
            }
        }
    }

    updatePlayersList(players) {
        const playersList = document.getElementById('playersWaiting');
        const playersCount = document.getElementById('playersCount');
        
        if (playersCount) playersCount.textContent = players.length;
        
        if (playersList) {
            playersList.innerHTML = '';
            players.forEach(player => {
                const div = document.createElement('div');
                div.className = 'player-item';
                div.innerHTML = `
                    <span>${player.name}</span>
                    ${player.host ? '<span class="host-badge">👑</span>' : ''}
                `;
                playersList.appendChild(div);
            });
        }
    }

    // دوال مساعدة للأدوار
    getPhaseName(phase) {
        const names = {
            'MAFIA_INTRO': 'تعريف المافيا',
            'MAFIA': 'دور المافيا',
            'DOCTOR': 'دور المسعف',
            'SHERIFF': 'دور زعيم الصالحين',
            'VOTING': 'وقت التصويت'
        };
        return names[phase] || phase;
    }

    getRoleAction(role) {
        const actions = {
            'MAFIA': 'اختر لاعباً لاغتياله',
            'DOCTOR': 'اختر لاعباً لإنقاذه', 
            'SHERIFF': 'اختر لاعباً للتحقق منه'
        };
        return actions[role] || 'قم بالإجراء المطلوب';
    }

    // تحديث واجهة اللاعب
    updatePlayerInterface(gameData) {
        if (gameData.yourRole) {
            const roleName = document.getElementById('roleName');
            if (roleName) {
                const roleNames = {
                    'MAFIA_LEADER': 'زعيم المافيا',
                    'MAFIA': 'مافيا',
                    'SHERIFF': 'زعيم الصالحين',
                    'DOCTOR': 'المسعف',
                    'HUNTER': 'الصياد',
                    'CITIZEN': 'صالح'
                };
                roleName.textContent = roleNames[gameData.yourRole] || gameData.yourRole;
            }
        }
        
        const currentDay = document.getElementById('currentDay');
        const currentPhase = document.getElementById('currentPhase');
        
        if (currentDay) currentDay.textContent = gameData.dayNumber || 1;
        if (currentPhase) {
            currentPhase.textContent = gameData.state === 'NIGHT' ? 'ليلة' : 'نهار';
        }
        
        this.updatePlayersGrid(gameData.players);
    }

    // تحديث شبكة اللاعبين
    updatePlayersGrid(players) {
        const grid = document.getElementById('playersGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        players.forEach(player => {
            const playerCard = document.createElement('div');
            playerCard.className = `player-card ${!player.alive ? 'dead' : ''} ${player.id === this.playerId ? 'self' : ''}`;
            
            playerCard.innerHTML = `
                <div class="player-name">${player.name}</div>
                <div class="player-status">${player.alive ? 'حي' : 'ميت'}</div>
                ${player.id === this.playerId ? '<div class="player-you">أنت</div>' : ''}
            `;
            
            grid.appendChild(playerCard);
        });
    }

    // تحديث واجهة المضيف
    updateHostInterface(gameData) {
        const dayNumber = document.getElementById('dayNumber');
        const gameState = document.getElementById('gameState');
        
        if (dayNumber) dayNumber.textContent = gameData.dayNumber || 1;
        if (gameState) {
            gameState.textContent = gameData.state === 'NIGHT' ? 'ليلة' : 'نهار';
        }
    }

    // إعادة تعيين حالة اللعبة
    resetGameState() {
        this.gameState = 'LOBBY';
        this.players = [];
        this.currentPhase = '';
        this.isHost = false;
        this.playerId = null;
    }

    // دوال مساعدة للواجهات التفاعلية
    showVotingInterface(votablePlayers) {
        const votingInterface = document.getElementById('votingInterface');
        const votingPlayers = document.getElementById('votingPlayers');
        
        if (votingInterface && votingPlayers) {
            votingInterface.classList.remove('hidden');
            votingPlayers.innerHTML = '';
            
            votablePlayers.forEach(player => {
                const playerEl = document.createElement('div');
                playerEl.className = 'player-selectable';
                playerEl.textContent = player.name;
                playerEl.onclick = () => {
                    if (typeof selectPlayer === 'function') {
                        selectPlayer(player.id, playerEl);
                    }
                };
                votingPlayers.appendChild(playerEl);
            });
        }
    }

    showHunterInterface(players) {
        const hunterInterface = document.getElementById('hunterInterface');
        const hunterPlayers = document.getElementById('hunterPlayers');
        
        if (hunterInterface && hunterPlayers) {
            hunterInterface.classList.remove('hidden');
            hunterPlayers.innerHTML = '';
            
            players.forEach(player => {
                const playerEl = document.createElement('div');
                playerEl.className = 'player-selectable';
                playerEl.textContent = player.name;
                playerEl.onclick = () => {
                    if (typeof selectPlayer === 'function') {
                        selectPlayer(player.id, playerEl);
                    }
                };
                hunterPlayers.appendChild(playerEl);
            });
        }
    }
}

// إنشاء عميل عالمي
const gameClient = new MafiaGameClient();

// إضافة أنماط CSS للرسائل
if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        .notification {
            animation: slideIn 0.3s ease;
        }
    `;
    document.head.appendChild(style);
}