class GameLogic {
    constructor() {
        this.phaseTimers = new Map();
        this.gameHistory = [];
        this.nightActions = new Map();
    }

    // بدء مؤقت للمرحلة
    startPhaseTimer(phase, duration, callback) {
        this.clearPhaseTimer(phase);
        
        console.log(`⏰ بدء مؤقت ${phase} لمدة ${duration} ثانية`);
        
        const timer = setTimeout(() => {
            console.log(`⏰ انتهى وقت ${phase}`);
            callback();
            this.phaseTimers.delete(phase);
        }, duration * 1000);
        
        this.phaseTimers.set(phase, timer);
    }

    // إيقاف المؤقت
    clearPhaseTimer(phase) {
        if (this.phaseTimers.has(phase)) {
            clearTimeout(this.phaseTimers.get(phase));
            this.phaseTimers.delete(phase);
            console.log(`⏰ تم إيقاف مؤقت ${phase}`);
        }
    }

    // إيقاف جميع المؤقتات
    clearAllTimers() {
        this.phaseTimers.forEach((timer, phase) => {
            clearTimeout(timer);
            console.log(`⏰ تم إيقاف مؤقت ${phase}`);
        });
        this.phaseTimers.clear();
    }

    // التحقق من نهاية اللعبة
    checkGameEnd(players) {
        const alivePlayers = Array.from(players.values()).filter(p => p.alive);
        const mafiaPlayers = alivePlayers.filter(p => p.role === 'MAFIA_LEADER' || p.role === 'MAFIA');
        const citizenPlayers = alivePlayers.filter(p => p.role !== 'MAFIA_LEADER' && p.role !== 'MAFIA');

        console.log(`🎯 فحص نهاية اللعبة: ${mafiaPlayers.length} مافيا, ${citizenPlayers.length} صالحين`);

        if (mafiaPlayers.length === 0) {
            console.log('🎉 الصالحون فازوا!');
            return {
                winner: 'CITIZENS_WIN',
                message: '🎉 الصالحون فازوا! لقد تخلصتم من جميع المافيا',
                reason: 'تم القضاء على جميع المافيا'
            };
        } else if (mafiaPlayers.length >= citizenPlayers.length) {
            console.log('🎭 المافيا فازت!');
            return {
                winner: 'MAFIA_WIN',
                message: '🎭 المافيا فازت! سيطرت المافيا على البلدة',
                reason: 'أصبح عدد المافيا مساوياً أو أكثر من الصالحين'
            };
        }
        
        return null;
    }

    // معالجة اختيارات الليل
    processNightActions(actions, players) {
        console.log('🌙 معالجة اختيارات الليل:', actions);
        
        const results = {
            killed: null,
            saved: null,
            checked: null,
            message: ''
        };

        // اختيار المافيا
        const mafiaTarget = actions.get('MAFIA_TARGET');
        if (mafiaTarget) {
            results.killed = mafiaTarget;
            const targetPlayer = players.get(mafiaTarget);
            console.log(`🎭 المافيا اختارت: ${targetPlayer?.name}`);
        }

        // اختيار المسعف
        const doctorSave = actions.get('DOCTOR_SAVE');
        if (doctorSave) {
            results.saved = doctorSave;
            const savedPlayer = players.get(doctorSave);
            console.log(`🏥 المسعف أنقذ: ${savedPlayer?.name}`);
        }

        // اختيار زعيم الصالحين
        const sheriffCheck = actions.get('SHERIFF_CHECK');
        if (sheriffCheck) {
            results.checked = sheriffCheck;
            const checkedPlayer = players.get(sheriffCheck);
            console.log(`🔍 زعيم الصالحين تحقق من: ${checkedPlayer?.name}`);
        }

        // تحديد من مات
        if (results.killed && results.killed !== results.saved) {
            const killedPlayer = players.get(results.killed);
            if (killedPlayer) {
                results.message = `☠️ تم اغتيال ${killedPlayer.name}`;
                console.log(results.message);
            }
        } else if (results.killed && results.killed === results.saved) {
            const savedPlayer = players.get(results.saved);
            results.message = `🛡️ عملية اغتيال فاشلة - تم إنقاذ ${savedPlayer?.name}`;
            results.killed = null; // لا أحد مات
            console.log(results.message);
        } else if (mafiaTarget) {
            results.message = '🌙 ليلة هادئة... لم يمت أحد';
            console.log(results.message);
        } else {
            results.message = '🌙 ليلة هادئة... لم يمت أحد';
            console.log(results.message);
        }

        // تسجيل في السجل
        this.recordNightAction(results);

        return results;
    }

    // تسجيل إجراءات الليل
    recordNightAction(results) {
        const record = {
            timestamp: new Date().toISOString(),
            killed: results.killed,
            saved: results.saved,
            checked: results.checked,
            message: results.message
        };
        
        this.gameHistory.push(record);
        console.log('📝 تم تسجيل إجراء الليل:', record);
    }

    // معالجة نتائج التصويت
    processVoteResults(votes, players) {
        console.log('🗳️ معالجة نتائج التصويت:', votes);
        
        const voteCount = new Map();
        
        // حساب الأصوات
        votes.forEach((targetId, voterId) => {
            const voter = players.get(voterId);
            const target = players.get(targetId);
            
            if (voter && target && voter.alive && target.alive) {
                voteCount.set(targetId, (voteCount.get(targetId) || 0) + 1);
                console.log(`✅ ${voter.name} صوت ضد ${target.name}`);
            }
        });

        // العثور على اللاعب الأكثر تصويتاً
        let maxVotes = 0;
        let eliminatedPlayerId = null;
        let tie = false;

        voteCount.forEach((votes, playerId) => {
            if (votes > maxVotes) {
                maxVotes = votes;
                eliminatedPlayerId = playerId;
                tie = false;
            } else if (votes === maxVotes) {
                tie = true;
            }
        });

        const results = {
            eliminated: null,
            message: '',
            isTie: tie,
            voteCount: Object.fromEntries(voteCount)
        };

        if (!tie && eliminatedPlayerId && maxVotes > 0) {
            const eliminatedPlayer = players.get(eliminatedPlayerId);
            if (eliminatedPlayer) {
                eliminatedPlayer.alive = false;
                results.eliminated = eliminatedPlayerId;
                results.message = `تم إقصاء ${eliminatedPlayer.name}`;
                
                console.log(`❌ ${results.message}`);
                
                // إذا كان الصياد، نحتاج لتخزين هذه المعلومة
                if (eliminatedPlayer.role === 'HUNTER') {
                    results.hunterEliminated = true;
                    console.log('🎯 الصياد تم إقصاؤه - سينتقم!');
                }
            }
        } else if (tie) {
            results.message = 'تعادل في التصويت - لم يتم إقصاء أحد';
            console.log('🤝 تعادل في التصويت');
        } else {
            results.message = 'لم يصوت أحد - لم يتم إقصاء أحد';
            console.log('🚫 لم يصوت أحد');
        }

        return results;
    }

    // معالجة اختيار الصياد
    processHunterChoice(hunterId, targetId, players) {
        console.log(`🎯 معالجة اختيار الصياد: ${hunterId} ضد ${targetId}`);
        
        const hunter = players.get(hunterId);
        const target = players.get(targetId);
        
        if (!hunter || !target) {
            console.log('❌ خطأ في بيانات الصياد أو الهدف');
            return {
                success: false,
                message: 'خطأ في البيانات'
            };
        }

        if (!hunter.alive && hunter.role === 'HUNTER') {
            target.alive = false;
            
            const result = {
                success: true,
                message: `${hunter.name} (الصياد) أخرج ${target.name} معه`,
                hunter: hunterId,
                target: targetId
            };
            
            console.log(`✅ ${result.message}`);
            return result;
        }
        
        console.log('❌ الصياد غير ميت أو ليس صياداً');
        return {
            success: false,
            message: 'لا يمكن تنفيذ اختيار الصياد'
        };
    }

    // توزيع الأدوار
    assignRoles(players, settings) {
        console.log('🎭 توزيع الأدوار:', settings);
        
        const playerList = Array.from(players.values());
        let roles = [];
        
        // زعيم المافيا
        roles.push('MAFIA_LEADER');
        console.log(`➕ زعيم المافيا`);
        
        // أعضاء المافيا الإضافيين
        for (let i = 1; i < settings.mafiaCount; i++) {
            roles.push('MAFIA');
            console.log(`➕ مافيا ${i}`);
        }
        
        // زعيم الصالحين
        roles.push('SHERIFF');
        console.log(`➕ زعيم الصالحين`);
        
        // المسعف
        if (settings.hasMedic) {
            roles.push('DOCTOR');
            console.log(`➕ المسعف`);
        }
        
        // الصياد
        if (settings.hasHunter) {
            roles.push('HUNTER');
            console.log(`➕ الصياد`);
        }
        
        // إكمال العدد بالصالحين
        const citizensNeeded = playerList.length - roles.length;
        for (let i = 0; i < citizensNeeded; i++) {
            roles.push('CITIZEN');
            console.log(`➕ صالح ${i + 1}`);
        }
        
        // خلط الأدوار
        roles = this.shuffleArray(roles);
        console.log('🔀 تم خلط الأدوار');
        
        // توزيع الأدوار
        const assignments = {};
        playerList.forEach((player, index) => {
            player.role = roles[index];
            player.alive = true;
            assignments[player.id] = {
                role: player.role,
                alive: player.alive
            };
            console.log(`👤 ${player.name}: ${this.getRoleName(player.role)}`);
        });

        return assignments;
    }

    // خلط المصفوفة
    shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    // الحصول على اسم الدور
    getRoleName(role) {
        const roleNames = {
            'MAFIA_LEADER': 'زعيم المافيا',
            'MAFIA': 'مافيا',
            'SHERIFF': 'زعيم الصالحين',
            'DOCTOR': 'المسعف',
            'HUNTER': 'الصياد',
            'CITIZEN': 'صالح'
        };
        return roleNames[role] || role;
    }

    // التحقق من صحة الإعدادات
    validateGameSettings(settings, playerCount) {
        const errors = [];
        
        if (playerCount < 4) {
            errors.push('يحتاج اللعبة إلى 4 لاعبين على الأقل');
        }
        
        if (settings.mafiaCount < 1) {
            errors.push('يجب أن يكون هناك مافيا واحد على الأقل');
        }
        
        const maxMafia = Math.floor(playerCount / 3);
        if (settings.mafiaCount > maxMafia) {
            errors.push(`عدد المافيا لا يمكن أن يزيد عن ${maxMafia} لهذا العدد من اللاعبين`);
        }
        
        const requiredRoles = 2 + settings.mafiaCount - 1; // زعيم مافيا + مافيا إضافية + زعيم صالحين
        const optionalRoles = (settings.hasMedic ? 1 : 0) + (settings.hasHunter ? 1 : 0);
        const totalRoles = requiredRoles + optionalRoles;
        
        if (totalRoles > playerCount) {
            errors.push('عدد الأدوار أكثر من عدد اللاعبين');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // الحصول على إحصائيات اللعبة
    getGameStats(players) {
        const alivePlayers = Array.from(players.values()).filter(p => p.alive);
        const deadPlayers = Array.from(players.values()).filter(p => !p.alive);
        
        const mafiaCount = alivePlayers.filter(p => p.role === 'MAFIA_LEADER' || p.role === 'MAFIA').length;
        const citizenCount = alivePlayers.filter(p => p.role !== 'MAFIA_LEADER' && p.role !== 'MAFIA').length;
        
        return {
            totalPlayers: players.size,
            alivePlayers: alivePlayers.length,
            deadPlayers: deadPlayers.length,
            mafiaCount: mafiaCount,
            citizenCount: citizenCount,
            gameHistory: this.gameHistory.length
        };
    }

    // إعادة تعيين اللعبة
    resetGame() {
        this.clearAllTimers();
        this.gameHistory = [];
        this.nightActions.clear();
        console.log('🔄 تم إعادة تعيين اللعبة');
    }
}

module.exports = GameLogic;