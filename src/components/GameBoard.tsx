import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RoomConfig } from './RoomLobby';
import { MahjongEngine } from '../core/MahjongEngine';
import type { Player, Tile } from '../core/MahjongEngine';
import { WinValidator } from '../core/WinValidator';
import { TaiCalculator } from '../core/TaiCalculator';
import { SettlementScreen } from './SettlementScreen';

interface GameBoardProps {
    config: RoomConfig | null;
    onExit: () => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({ config, onExit }) => {
    const [engine] = useState(() => new MahjongEngine());
    const [players, setPlayers] = useState<Player[]>([]);
    const [isStarted, setIsStarted] = useState(false);
    const [availableActions, setAvailableActions] = useState<string[]>([]);
    const [pendingActionTile, setPendingActionTile] = useState<{ tile: Tile, fromPlayerIndex: number } | null>(null);

    // Dealer Selection State
    const [selectingDealer, setSelectingDealer] = useState<boolean>(true);
    const [highlightedDealer, setHighlightedDealer] = useState<number | null>(null);

    // Game Loop State
    const [message, setMessage] = useState<string>('等待開局...');
    const delayObj = useRef<any>(null);
    const intervalRef = useRef<any>(null);

    // Round State
    const [currentWind, setCurrentWind] = useState<string>('east');
    const [windRoundCount, setWindRoundCount] = useState<number>(0);
    const [isGameOver, setIsGameOver] = useState(false);
    const [consecutiveDealerCount, setConsecutiveDealerCount] = useState<number>(0);

    useEffect(() => {
        engine.initializePlayers("Player One", ["Bot Dong", "Bot Nan", "Bot Xi"]);
        setPlayers([...engine.players]);

        startNewHand(Math.floor(Math.random() * 4)); // Initial dealer
        
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (delayObj.current) clearTimeout(delayObj.current);
        };
    }, []);

    const startNewHand = (targetDealerIdx?: number) => {
        setIsStarted(false);
        setSelectingDealer(true);
        if (targetDealerIdx !== undefined) engine.dealerIndex = targetDealerIdx;
        
        // Reset engine deck and hands without nuking points entirely
        engine.deck = engine.generateDeck();
        engine.shuffle();
        engine.players.forEach(p => { p.hand = []; p.melds = []; p.discards = []; });
        setPlayers([...engine.players]);

        let ticks = 0;
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => {
            setHighlightedDealer(ticks % 4);
            ticks++;
            if (ticks >= 20) {
                clearInterval(intervalRef.current);
                setHighlightedDealer(engine.dealerIndex);

                delayObj.current = setTimeout(() => {
                    setSelectingDealer(false);
                    engine.dealTiles(engine.dealerIndex);
                    setPlayers([...engine.players]);
                    setIsStarted(true);
                    startTurn(engine.dealerIndex);
                }, 1500);
            }
        }, 100);
    };

    const updateState = () => setPlayers([...engine.players]);

    const startTurn = (pIdx: number) => {
        engine.currentTurn = pIdx;
        const p = engine.players[pIdx];

        if (p.isNPC) {
            setMessage(`${p.name} 的回合 (NPC)`);
            updateState();
            delayObj.current = setTimeout(() => {
                // Smarter NPC AI: use getBestDiscard to filter terminals and isolated winds
                const bestDiscard = engine.getBestDiscard(pIdx);
                if (bestDiscard) {
                    handleDiscard(pIdx, bestDiscard.id);
                } else if (p.hand.length > 0) {
                     // Fallback
                    const discardTileId = p.hand[p.hand.length - 1].id;
                    handleDiscard(pIdx, discardTileId);
                }
            }, 1500);
        } else {
            setMessage('你的回合 (請打出一張牌)');
            
            // Check for player's own-turn actions like Concealed Kong (暗槓) and Hu (自摸)
            const selfActions = engine.getAvailableActions(pIdx, null);
            const localSelfActions = selfActions.find(a => a.playerIndex === pIdx);
            
            if (localSelfActions && localSelfActions.actions.length > 0) {
                 setAvailableActions(localSelfActions.actions);
                 // We don't have a specific `targetTile` for concealed kong yet in UI, 
                 // we will map it null for the pending state so it uses the executeAction fallback.
                 setPendingActionTile({ tile: null as any, fromPlayerIndex: pIdx });
            } else {
                 setAvailableActions([]);
            }

            updateState();
        }
    };

    const handleDiscard = (pIdx: number, tileId: string) => {
        engine.discardTile(pIdx, tileId);
        updateState();

        // Check for interruptions (Chow, Pong, Kong, Hu)
        const p = engine.players[pIdx];
        const tile = p.discards[p.discards.length - 1]; // The latest discard
        const actions = engine.getAvailableActions(pIdx, tile);
        
        // Check if the local player (index 0) has actions available
        const localActions = actions.find(a => a.playerIndex === 0);
        if (localActions && localActions.actions.length > 0 && tile) {
             setAvailableActions(localActions.actions);
             setPendingActionTile({ tile, fromPlayerIndex: pIdx });
             setMessage('有動作可以執行！');
             return; // Halt auto-progression, wait for user input
        }

        // Check if NPCs have actions
        // Priority: Hu > Kong > Pong > Chow
        const npcActions = actions.filter(a => a.playerIndex !== 0);
        if (npcActions.length > 0 && tile) {
            setMessage(`${engine.players[pIdx].name} 打出了牌`);
            
            // Sort by priority. We evaluate the highest priority action.
            let highestPriorityAction: { npcIdx: number, actionName: string } | null = null;
            
            const checkAndSetPriority = (actionType: string) => {
                 if (highestPriorityAction) return;
                 const doer = npcActions.find(a => a.actions.includes(actionType));
                 if (doer) highestPriorityAction = { npcIdx: doer.playerIndex, actionName: actionType };
            };
            
            checkAndSetPriority('hu');
            checkAndSetPriority('kong');
            checkAndSetPriority('pong');
            checkAndSetPriority('chow');

            if (highestPriorityAction) {
                delayObj.current = setTimeout(() => {
                    const { npcIdx, actionName } = highestPriorityAction as any;
                    
                    if (actionName === 'hu') {
                         triggerHu(npcIdx, false, pIdx, tile);
                         return;
                    }
                    
                    engine.executeAction(npcIdx, actionName, tile, pIdx);
                    updateState();
                    setMessage(`${engine.players[npcIdx].name} ${actionName === 'pong' ? '碰' : actionName === 'kong' ? '槓' : '吃'}！`);
                    
                    // After NPC acts, it's their turn. They must discard after a delay.
                    delayObj.current = setTimeout(() => {
                        const npc = engine.players[npcIdx];
                        if (npc.hand.length > 0) {
                            const discardTileId = npc.hand[npc.hand.length - 1].id;
                            handleDiscard(npcIdx, discardTileId);
                        }
                    }, 1500);
                }, 1000); // 1 second artificial thinking time before stealing
                return; // Halt normal drawing progression
            }
        }

        setMessage(`${engine.players[pIdx].name} 打出了牌`);

        delayObj.current = setTimeout(() => { // Pause to let others 'see'
            // Next player draws
            const nextIdx = (pIdx + 1) % 4;
            engine.currentTurn = nextIdx;
            const drawn = engine.drawTile(nextIdx);
            if (!drawn) {
                setMessage('流局 (Draw)!');
                
                delayObj.current = setTimeout(() => {
                     // Dealer stays on draw
                     advanceRound(null); // passing null signifies a draw
                }, 3000);
                return;
            }
            startTurn(nextIdx);
        }, 1000);
    };

    const triggerHu = (winnerIdx: number, isSelfDraw: boolean, fromPlayerIdx: number, targetTile?: Tile) => {
        const winResult = WinValidator.checkHu(players[winnerIdx].hand, players[winnerIdx].melds, isSelfDraw ? undefined : targetTile);
            
        if (winResult.isWin && winResult.combinations.length > 0) {
             const context = {
                  dealerIndex: engine.dealerIndex,
                  playerIndex: winnerIdx,
                  roundWind: engine.roundWind,
                  isSelfDraw: isSelfDraw,
                  winningTile: targetTile || players[winnerIdx].hand[0], // fallback if self draw
                  isFirstTurn: false, // Assume false for now, would need turn counting
                  baseHand: isSelfDraw ? players[winnerIdx].hand.filter(t => t.id !== (targetTile||players[winnerIdx].hand[players[winnerIdx].hand.length-1]).id) : players[winnerIdx].hand
             };
             const taiResult = TaiCalculator.calculate(winResult, players[winnerIdx], context);

             // Calculate actual points
             const baseP = parseInt(config?.points.split('/')[0] || '50');
             const taiP = parseInt(config?.points.split('/')[1] || '20');
             const totalWinPoints = baseP + (taiResult.totalTai * taiP);

             if (isSelfDraw) {
                 players.forEach((p, i) => {
                     if (i === winnerIdx) p.points += totalWinPoints * 3;
                     else p.points -= totalWinPoints;
                 });
             } else {
                 players[winnerIdx].points += totalWinPoints;
                 players[fromPlayerIdx].points -= totalWinPoints;
             }
             setPlayers([...players]);

             setSettlementData({
                  winnerName: players[winnerIdx].name,
                  loserName: isSelfDraw ? '所有人' : players[fromPlayerIdx].name,
                  isSelfDraw: isSelfDraw,
                  totalTai: taiResult.totalTai,
                  reasons: taiResult.reasons
             });
        }
    };

    const onLocalDiscardTile = (tileId: string) => {
        if (engine.currentTurn === 0 && availableActions.length === 0) {
            handleDiscard(0, tileId);
        }
    };

    const [tingOptions, setTingOptions] = useState<{ discard: Tile | null, waiting: { type: string, value: any }[] }[]>([]);

    useEffect(() => {
         if (!isStarted) {
             setTingOptions([]);
             return;
         }
         
         const p = engine.players[0];
         if (!p) return;

         if (engine.currentTurn === 0 && p.hand.length % 3 === 2) {
             // Turn to discard
             const options = [];
             const seen = new Set();
             for (const tile of p.hand) {
                 const key = `${tile.type}-${tile.value}`;
                 if (seen.has(key)) continue;
                 seen.add(key);
                 
                 const handWithoutTile = p.hand.filter(t => t.id !== tile.id);
                 const waitingFor = WinValidator.getWaitingTiles(handWithoutTile, p.melds);
                 if (waitingFor.length > 0) {
                     options.push({ discard: tile, waiting: waitingFor });
                 }
             }
             setTingOptions(options);
         } else if (p.hand.length % 3 === 1) {
             // Waiting for others
             const waitingFor = WinValidator.getWaitingTiles(p.hand, p.melds);
             if (waitingFor.length > 0) {
                  setTingOptions([{ discard: null, waiting: waitingFor }]);
             } else {
                  setTingOptions([]);
             }
         } else {
             setTingOptions([]);
         }
    }, [players, isStarted, engine.currentTurn]);

    const [settlementData, setSettlementData] = useState<{
        winnerName: string;
        loserName: string;
        isSelfDraw: boolean;
        totalTai: number;
        reasons: { name: string; tai: number }[];
    } | null>(null);

    const handleAction = (action: string) => {
        setAvailableActions([]);
        if (action === 'hu') {
            const isSelfDraw = !pendingActionTile;
            const targetTile = pendingActionTile ? pendingActionTile.tile : players[0].hand[players[0].hand.length - 1]; 
            triggerHu(0, isSelfDraw, pendingActionTile ? pendingActionTile.fromPlayerIndex : 0, targetTile);
            return;
        }

        if (action === 'skip') {
             // Resume normal flow if skipping
             const actTile = pendingActionTile;
             setAvailableActions([]);
             setPendingActionTile(null);
             
             if (actTile && actTile.tile === null) {
                 // Skip an own-turn action (e.g., concealed kong). Flow just continues as normal.
                 return;
             }

             if (actTile) {
                 const nextIdx = (actTile.fromPlayerIndex + 1) % 4;
                 engine.currentTurn = nextIdx;
                 const drawn = engine.drawTile(nextIdx);
                 if (!drawn) {
                     setMessage('流局 (Draw)!');
                     
                     delayObj.current = setTimeout(() => {
                          advanceRound(null); // Draw
                     }, 3000);
                     return;
                 }
                 startTurn(nextIdx);
             }
             return;
        }

        // Execute Chow/Pong/Kong
        if (pendingActionTile) {
            engine.executeAction(0, action, pendingActionTile.tile, pendingActionTile.fromPlayerIndex);
            updateState();
            setPendingActionTile(null);
            
            // After action, local player must discard a tile
            setMessage('你的回合 (請打出一張牌)');
            
            // After a kong, check if another concealed kong is instantly available from the drawn replacement
            if (action === 'kong' || action === 'concealed_kong') {
                 const selfActions = engine.getAvailableActions(0, null);
                 const localSelfActions = selfActions.find(a => a.playerIndex === 0);
                 if (localSelfActions && localSelfActions.actions.length > 0) {
                      setAvailableActions(localSelfActions.actions);
                      setPendingActionTile({ tile: null as any, fromPlayerIndex: 0 });
                 }
            }
        }
    };

    const advanceRound = (winnerName: string | null) => {
         const isDraw = winnerName === null;
         const winnerIdx = isDraw ? -1 : players.findIndex(p => p.name === winnerName);
         
         if (isDraw || winnerIdx === engine.dealerIndex) {
             // Dealer stays (連莊) or draw
             setConsecutiveDealerCount(prev => prev + 1);
             startNewHand(engine.dealerIndex);
         } else {
             // Dealer rotates
             setConsecutiveDealerCount(0);
             const newDealer = (engine.dealerIndex + 1) % 4;
             if (newDealer === 0) {
                 // Completed a wind round
                 const winds = ['east', 'south', 'west', 'north'];
                 const curReq = config?.rounds || '1圈';
                 
                 const curWindIdx = winds.indexOf(currentWind);
                 if (curWindIdx < 3 && curReq !== '1/4圈') {
                     setCurrentWind(winds[curWindIdx + 1]);
                     engine.roundWind = winds[curWindIdx + 1] as any;
                 } else {
                     if (curReq.includes('將') && windRoundCount === 0) {
                          setWindRoundCount(1);
                          setCurrentWind('east');
                          engine.roundWind = 'east';
                     } else {
                          // Game over
                          setIsGameOver(true);
                          return;
                     }
                 }
             }
             startNewHand(newDealer);
         }
    };

    if (players.length !== 4) return null;

    if (isGameOver) {
         return (
             <div className="app-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                 <h1 style={{ color: 'var(--primary)', fontSize: '3rem', textShadow: '0 0 20px var(--primary-glow)' }}>遊戲結束</h1>
                 <button className="btn-primary" onClick={onExit} style={{ marginTop: '20px', fontSize: '1.5rem', padding: '15px 40px' }}>返回大廳</button>
             </div>
         );
    }

    return (
        <div className="app-container" style={{ userSelect: 'none', overflow: 'hidden' }}>
            {/* Top Bar */}
            <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '20px', zIndex: 10 }}>
                <div className="glass-panel" style={{ padding: '8px 16px', color: 'var(--primary)', fontWeight: 'bold' }}>
                    規則: 台灣16張 ({config?.points || '50/20'}, {config?.rounds || '1圈'}) | 目前: {currentWind === 'east' ? '東' : currentWind === 'south' ? '南' : currentWind === 'west' ? '西' : '北'}風局
                </div>
                <button className="btn-secondary" onClick={onExit} style={{ padding: '8px 16px' }}>離開牌桌</button>
            </div>

            {/* Subtitles & Notifications */}
            <div style={{ position: 'absolute', top: '100px', left: '50%', transform: 'translateX(-50%)', zIndex: 20 }}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={message}
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 20, opacity: 0 }}
                        className="glass-panel"
                        style={{ padding: '10px 20px', color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.2rem', background: 'rgba(0,0,0,0.6)' }}
                    >
                        {message}
                    </motion.div>
                </AnimatePresence>
            </div>

            <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                width: '60%', height: '60%',
                border: '2px solid rgba(255,255,255,0.05)', borderRadius: '30px',
                background: 'rgba(0,0,0,0.3)',
                boxShadow: 'inset 0 0 50px rgba(0,0,0,0.8)',
                display: 'flex', justifyContent: 'center', alignItems: 'center'
            }}>
                <div style={{ position: 'absolute', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--bg-dark-panel)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--primary)', boxShadow: '0 0 20px var(--primary-glow)' }}>
                        <div style={{ color: 'var(--primary)', fontSize: '1.5rem', fontWeight: 'bold' }}> {currentWind === 'east' ? '東' : currentWind === 'south' ? '南' : currentWind === 'west' ? '西' : '北'}</div>
                        <div style={{ color: 'white', fontSize: '0.8rem' }}>剩 {engine.deck.length} 張</div>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {tingOptions.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        style={{ position: 'absolute', bottom: '270px', left: '50%', transform: 'translateX(-50%)', zIndex: 15 }}
                    >
                        <div className="glass-panel" style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: '5px', background: 'rgba(0,0,0,0.85)', border: '1px solid var(--primary)', borderRadius: '12px' }}>
                            <div style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '2px' }}>聽牌提示</div>
                            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                {tingOptions.map((opt, i) => (
                                    <div key={i} style={{ color: '#fff', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        {opt.discard && <span style={{ color: 'var(--text-muted)' }}>打 <b style={{color: '#fff'}}>{getTileFace(opt.discard)}</b> 聽</span>}
                                        {!opt.discard && <span style={{ color: 'var(--text-muted)' }}>聽</span>}
                                        <b style={{color: 'var(--primary)'}}>{opt.waiting.map(w => getTileFace({ type: w.type as any, value: w.value } as any)).join(', ')}</b>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <PlayerArea player={players[2]} position="top" isDealer={engine.dealerIndex === 2 && !selectingDealer} dealerStreak={consecutiveDealerCount} isCurrentTurn={engine.currentTurn === 2 && isStarted} />
            <PlayerArea player={players[1]} position="right" isDealer={engine.dealerIndex === 1 && !selectingDealer} dealerStreak={consecutiveDealerCount} isCurrentTurn={engine.currentTurn === 1 && isStarted} />
            <PlayerArea player={players[3]} position="left" isDealer={engine.dealerIndex === 3 && !selectingDealer} dealerStreak={consecutiveDealerCount} isCurrentTurn={engine.currentTurn === 3 && isStarted} />
            <PlayerArea player={players[0]} position="bottom" isLocal={true} isDealer={engine.dealerIndex === 0 && !selectingDealer} dealerStreak={consecutiveDealerCount} isCurrentTurn={engine.currentTurn === 0 && isStarted} onDiscard={onLocalDiscardTile} />

            <AnimatePresence>
                {selectingDealer && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
                            zIndex: 100, display: 'flex', flexDirection: 'column',
                            justifyContent: 'center', alignItems: 'center'
                        }}
                    >
                        <motion.h2
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            style={{ color: 'var(--primary)', fontSize: '2.5rem', marginBottom: '3rem', textShadow: '0 0 20px var(--primary-glow)' }}
                        >
                            決定起莊者...
                        </motion.h2>

                        <div style={{ display: 'flex', gap: '30px' }}>
                            {[0, 1, 2, 3].map(idx => (
                                <div key={idx} className="glass-panel" style={{
                                    width: '120px', height: '120px', display: 'flex', justifyContent: 'center', alignItems: 'center',
                                    fontSize: '1.2rem', fontWeight: 'bold', textAlign: 'center',
                                    border: highlightedDealer === idx ? '3px solid var(--primary)' : '1px solid var(--glass-border)',
                                    background: highlightedDealer === idx ? 'var(--primary-glow)' : 'var(--bg-dark-panel)',
                                    transform: highlightedDealer === idx ? 'scale(1.15)' : 'scale(1)',
                                    transition: 'all 0.1s ease',
                                    color: highlightedDealer === idx ? '#fff' : 'var(--text-muted)'
                                }}>
                                    {players[idx]?.name || `Player ${idx}`}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {availableActions.length > 0 && (
                    <motion.div
                        initial={{ y: 100, opacity: 0, scale: 0.8 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 50, opacity: 0, scale: 0.9 }}
                        style={{ position: 'absolute', bottom: '120px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '15px', zIndex: 50 }}
                    >
                        {availableActions.includes('chow') && <ActionButton label="吃" color="#3b82f6" onClick={() => handleAction('chow')} />}
                        {availableActions.includes('pong') && <ActionButton label="碰" color="#10b981" onClick={() => handleAction('pong')} />}
                        {availableActions.includes('kong') && <ActionButton label="明槓" color="#eab308" onClick={() => handleAction('kong')} />}
                        {availableActions.includes('concealed_kong') && <ActionButton label="暗槓" color="#ca8a04" onClick={() => handleAction('concealed_kong')} />}
                        {availableActions.includes('hu') && <ActionButton label="胡" color="#ef4444" onClick={() => handleAction('hu')} />}
                        <ActionButton label="過" color="#6b7280" onClick={() => handleAction('skip')} />
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {settlementData && (
                    <SettlementScreen
                        winnerName={settlementData.winnerName}
                        isSelfDraw={settlementData.isSelfDraw}
                        loserName={settlementData.loserName}
                        taiReasons={settlementData.reasons}
                        totalTai={settlementData.totalTai}
                        basePoints={parseInt(config?.points.split('/')[0] || '50')}
                        taiPoints={parseInt(config?.points.split('/')[1] || '20')}
                        onClose={() => {
                            setSettlementData(null);
                            advanceRound(settlementData.winnerName);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

const ActionButton = ({ label, color, onClick }: { label: string, color: string, onClick: () => void }) => (
    <motion.button
        whileHover={{ scale: 1.1, y: -5 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: `radial-gradient(circle at 30% 30%, ${color}, #000)`, color: '#fff', fontSize: '2rem', fontWeight: 'bold', border: `2px solid ${color}`, boxShadow: `0 10px 20px rgba(0,0,0,0.5), 0 0 15px ${color}88`, cursor: 'pointer', textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
        }}
    >
        {label}
    </motion.button>
);

const PlayerArea = ({ player, position, isLocal = false, isDealer, dealerStreak, isCurrentTurn, onDiscard }: any) => {
    const isVertical = position === 'left' || position === 'right';
    const posStyles: Record<string, React.CSSProperties> = {
        bottom: { bottom: '20px', left: '50%', transform: 'translateX(-50%)', flexDirection: 'column' },
        top: { top: '20px', left: '50%', transform: 'translateX(-50%)', flexDirection: 'column-reverse' },
        left: { left: '20px', top: '50%', transform: 'translateY(-50%)', flexDirection: 'row-reverse' },
        right: { right: '20px', top: '50%', transform: 'translateY(-50%)', flexDirection: 'row' }
    };
    const discardPosStyles: Record<string, React.CSSProperties> = {
        bottom: { bottom: '150px', left: '50%', transform: 'translateX(-50%)', width: '300px' },
        top: { top: '150px', left: '50%', transform: 'translateX(-50%)', width: '300px' },
        left: { left: '150px', top: '50%', transform: 'translateY(-50%)', width: '150px' },
        right: { right: '150px', top: '50%', transform: 'translateY(-50%)', width: '150px' }
    };

    return (
        <>
            <div style={{ position: 'absolute', display: 'flex', alignItems: 'center', gap: '20px', ...(posStyles[position] || {}), zIndex: 5 }}>
                <div className="glass-panel" style={{
                    padding: '10px', display: 'flex', flexDirection: isVertical ? 'column' : 'row', alignItems: 'center', gap: '10px',
                    boxShadow: isCurrentTurn ? '0 0 20px var(--primary-glow)' : 'none',
                    border: isCurrentTurn ? '1px solid var(--primary)' : '1px solid var(--glass-border)'
                }}>
                    <div style={{ width: '40px', height: '40px', background: isLocal ? 'var(--primary)' : '#333', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{player.name[0]}</div>
                    <div style={{ textAlign: isVertical ? 'center' : 'left' }}>
                        <div style={{ fontSize: '0.9rem', color: isDealer ? 'var(--primary)' : '#fff', fontWeight: 'bold' }}>
                            {player.name} {isDealer && `(莊)${dealerStreak > 0 ? `[連${dealerStreak}]` : ''}`}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{player.points} pts</div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: isVertical ? 'column' : 'row', gap: '10px', alignItems: 'center' }}>
                    {player.melds?.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: isVertical ? 'column' : 'row', gap: '5px', paddingRight: isVertical ? '0' : '15px' }}>
                            {player.melds.map((m: any, i: number) => (
                                <div key={i} style={{ display: 'flex', flexDirection: isVertical ? 'column' : 'row', gap: '1px' }}>
                                    {m.tiles.map((t: any) => (<TileRender key={t.id} tile={t} isLocal={isLocal} isVertical={isVertical} isMeld={true} isHidden={m.type === 'concealed_kong' && !isLocal} />))}
                                </div>
                            ))}
                        </div>
                    )}
                    <AnimatePresence>
                        <div style={{ display: 'flex', flexDirection: isVertical ? 'column' : 'row', gap: '2px' }}>
                            {player.hand.map((t: any) => (
                                <TileRender
                                    key={t.id} tile={t} isLocal={isLocal} isVertical={isVertical}
                                    isInteractable={isLocal && isCurrentTurn}
                                    onClick={() => isLocal && isCurrentTurn && onDiscard && onDiscard(t.id)}
                                />
                            ))}
                        </div>
                    </AnimatePresence>
                </div>
            </div>

            <div style={{ position: 'absolute', display: 'flex', flexWrap: 'wrap', gap: '3px', alignContent: 'flex-start', zIndex: 2, ...(discardPosStyles[position] || {}) }}>
                <AnimatePresence>
                    {player.discards?.map((t: any) => (
                        <TileRender key={t.id} tile={t} isLocal={true} isVertical={false} isDiscard={true} />
                    ))}
                </AnimatePresence>
            </div>
        </>
    )
}

const TileRender = ({ tile, isLocal, isVertical, isMeld = false, isDiscard = false, isInteractable = false, onClick, isHidden = false }: any) => {
    let width = isVertical ? 'clamp(20px, 3vh, 30px)' : (isLocal || isMeld ? 'clamp(32px, 4.5vw, 48px)' : 'clamp(20px, 3vw, 30px)');
    let height = isVertical ? 'clamp(28px, 4vh, 40px)' : (isLocal || isMeld ? 'clamp(44px, 6vw, 64px)' : 'clamp(28px, 4vw, 40px)');
    let fontSize = isLocal || isMeld ? 'clamp(0.9rem, 1.5vw, 1.2rem)' : 'clamp(0.7rem, 1vw, 1rem)';

    if (isDiscard) {
        width = 'clamp(22px, 2.5vw, 30px)'; 
        height = 'clamp(33px, 3.5vw, 45px)'; 
        fontSize = 'clamp(0.7rem, 1vw, 1rem)';
    }

    const face = getTileFace(tile);
    let color = '#000'; // Default black for winds and white dragons
    if (face.includes('萬') || face === '中') color = '#ef4444'; // Red
    else if (face.includes('條') || face === '發') color = '#10b981'; // Green
    else if (face.includes('筒')) color = '#3b82f6'; // Blue

    return (
        <motion.div
            layoutId={tile.id}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            whileHover={isInteractable ? { y: -10 } : {}}
            onClick={onClick}
            style={{
                width, height,
                background: (!isLocal && !isMeld && !isDiscard) ? 'linear-gradient(135deg, #4b5563, #374151)' : 'linear-gradient(135deg, #f3f4f6, #d1d5db)',
                borderRadius: '6px',
                border: '1px solid rgba(0,0,0,0.3)',
                boxShadow: isInteractable ? '0 5px 15px rgba(0,0,0,0.5)' : '0 2px 4px rgba(0,0,0,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column',
                color, fontWeight: '900', fontSize,
                cursor: isInteractable ? 'pointer' : 'default',
            }}
        >
            {(!isLocal && !isMeld && !isDiscard) || isHidden ? '' : (
                <>
                    <span>{face.slice(0, 1)}</span>
                    {face.length > 1 && <span style={{ fontSize: '0.7em', color: '#000' }}>{face.slice(1)}</span>}
                </>
            )}
        </motion.div>
    )
}

const getTileFace = (tile: Tile) => {
    if (!tile) return '';
    if (tile.type === 'character') return `${tile.value}萬`;
    if (tile.type === 'bamboo') return `${tile.value}條`;
    if (tile.type === 'dot') return `${tile.value}筒`;
    const windMap: Record<string, string> = { east: '東', south: '南', west: '西', north: '北' };
    if (tile.type === 'wind' && typeof tile.value === 'string') return windMap[tile.value];
    const dragonMap: Record<string, string> = { red: '中', green: '發', white: '白' };
    if (tile.type === 'dragon' && typeof tile.value === 'string') return dragonMap[tile.value];
    return '?';
}
