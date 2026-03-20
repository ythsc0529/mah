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
    const [availableActions, setAvailableActions] = useState<{ type: string; tiles?: Tile[][] }[]>([]);
    const [pendingActionTile, setPendingActionTile] = useState<{ tile: Tile, fromPlayerIndex: number } | null>(null);
    const [chowChoices, setChowChoices] = useState<Tile[][] | null>(null);
    const [lastDiscardedTileId, setLastDiscardedTileId] = useState<string | null>(null);
    const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
    const isDiscardingRef = useRef<boolean>(false);

    // Dealer Selection State
    const [selectingDealer, setSelectingDealer] = useState<boolean>(true);
    const [highlightedDealer, setHighlightedDealer] = useState<number | null>(null);
    const isFirstHandRef = useRef<boolean>(true);

    // Game Loop State
    const [message, setMessage] = useState<string>('等待開局...');
    const delayObj = useRef<any>(null);
    const intervalRef = useRef<any>(null);

    // Round State
    const [currentWind, setCurrentWind] = useState<string>('east');
    const [windRoundCount, setWindRoundCount] = useState<number>(0);
    const [isGameOver, setIsGameOver] = useState(false);
    const [consecutiveDealerCount, setConsecutiveDealerCount] = useState<number>(0);

    // Player Info Panel State
    const [showPlayerInfo, setShowPlayerInfo] = useState<boolean>(false);

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
        if (targetDealerIdx !== undefined) engine.dealerIndex = targetDealerIdx;
        
        // Reset engine deck and hands without nuking points entirely
        engine.deck = engine.generateDeck();
        engine.shuffle();
        engine.players.forEach(p => { p.hand = []; p.melds = []; p.discards = []; });
        setPlayers([...engine.players]);

        if (isFirstHandRef.current) {
            // Only show dealer selection animation on the very first hand
            isFirstHandRef.current = false;
            setSelectingDealer(true);
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
        } else {
            // Subsequent hands: skip animation, deal immediately
            setSelectingDealer(false);
            engine.dealTiles(engine.dealerIndex);
            setPlayers([...engine.players]);
            setIsStarted(true);
            startTurn(engine.dealerIndex);
        }
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
                 setPendingActionTile({ tile: null as any, fromPlayerIndex: pIdx });
            } else {
                 setAvailableActions([]);
            }

            updateState();
        }
    };

    const handleDiscard = (pIdx: number, tileId: string) => {
        engine.discardTile(pIdx, tileId);
        setLastDiscardedTileId(tileId);
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
                 const doer = npcActions.find(a => a.actions.some(ac => ac.type === actionType));
                 if (doer) highestPriorityAction = { npcIdx: doer.playerIndex, actionName: actionType };
            };
            
            checkAndSetPriority('hu');
            checkAndSetPriority('kong');
            checkAndSetPriority('pong');
            checkAndSetPriority('chow');
            checkAndSetPriority('add_kong');
            checkAndSetPriority('concealed_kong');

            if (highestPriorityAction) {
                delayObj.current = setTimeout(() => {
                    const { npcIdx, actionName } = highestPriorityAction as any;
                    
                    if (actionName === 'hu') {
                         triggerHu(npcIdx, false, pIdx, tile);
                         return;
                    }
                    
                    // NPCs just take the first combination if any
                    const actionData = npcActions.find(a => a.playerIndex === npcIdx)?.actions.find(ac => ac.type === actionName);
                    const combination = actionData?.tiles ? actionData.tiles[0] : undefined;

                    engine.executeAction(npcIdx, actionName, tile, pIdx, combination);
                    if (tile) setLastDiscardedTileId(null);
                    updateState();
                    setMessage(`${engine.players[npcIdx].name} ${actionName === 'pong' ? '碰' : actionName.includes('kong') ? '槓' : '吃'}！`);
                    
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
        if (engine.currentTurn !== 0 || availableActions.length > 0) return;
        if (isDiscardingRef.current) return; // prevent rapid multi-click

        if (selectedTileId === tileId) {
            // Second click on same tile → discard it
            isDiscardingRef.current = true;
            setSelectedTileId(null);
            handleDiscard(0, tileId);
            // Release lock after a short delay
            setTimeout(() => { isDiscardingRef.current = false; }, 800);
        } else {
            // First click → select the tile
            setSelectedTileId(tileId);
        }
    };

    // When turn changes away from player, clear selection
    useEffect(() => {
        if (engine.currentTurn !== 0) setSelectedTileId(null);
    }, [engine.currentTurn]);

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

    const handleAction = (actionType: string, selectedTiles?: Tile[]) => {
        if (actionType === 'chow' && !selectedTiles) {
            const actionData = availableActions.find(a => a.type === 'chow');
            if (actionData?.tiles && actionData.tiles.length > 1) {
                setChowChoices(actionData.tiles);
                return;
            } else if (actionData?.tiles && actionData.tiles.length === 1) {
                selectedTiles = actionData.tiles[0];
            }
        }

        setAvailableActions([]);
        setChowChoices(null);

        if (actionType === 'hu') {
            const isSelfDraw = !pendingActionTile || pendingActionTile.tile === null;
            const targetTile = pendingActionTile && pendingActionTile.tile ? pendingActionTile.tile : players[0].hand[players[0].hand.length - 1]; 
            triggerHu(0, isSelfDraw, pendingActionTile ? pendingActionTile.fromPlayerIndex : 0, targetTile);
            return;
        }

        if (actionType === 'skip') {
             // Resume normal flow if skipping
             const actTile = pendingActionTile;
             setAvailableActions([]);
             setPendingActionTile(null);
             
             if (actTile && (actTile.tile === null || actTile.fromPlayerIndex === 0)) {
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
        if (pendingActionTile || actionType === 'concealed_kong' || actionType === 'add_kong') {
            const fromPlayerIdx = pendingActionTile ? pendingActionTile.fromPlayerIndex : 0;
            const targetTile = pendingActionTile ? pendingActionTile.tile : null;
            
            engine.executeAction(0, actionType, targetTile, fromPlayerIdx, selectedTiles);
            if (targetTile) setLastDiscardedTileId(null);
            updateState();
            setPendingActionTile(null);
            
            // After action, local player must discard a tile
            setMessage('你的回合 (請打出一張牌)');
            
            // After a kong, check if another concealed kong is instantly available from the drawn replacement
            if (actionType.includes('kong')) {
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

            {/* Subtitles & Notifications - Only for important events now */}
            <div style={{ position: 'absolute', top: '100px', left: '50%', transform: 'translateX(-50%)', zIndex: 20 }}>
                <AnimatePresence mode="wait">
                    {(message.includes('流局') || message.includes('胡') || message.includes('獲勝') || message.includes('自摸')) && (
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
                    )}
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
                        style={{ position: 'absolute', top: '80px', right: '20px', zIndex: 15 }}
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

            <PlayerArea player={players[2]} position="top" lastDiscardedTileId={lastDiscardedTileId} isDealer={engine.dealerIndex === 2 && !selectingDealer} dealerStreak={consecutiveDealerCount} isCurrentTurn={engine.currentTurn === 2 && isStarted} />
            <PlayerArea player={players[1]} position="right" lastDiscardedTileId={lastDiscardedTileId} isDealer={engine.dealerIndex === 1 && !selectingDealer} dealerStreak={consecutiveDealerCount} isCurrentTurn={engine.currentTurn === 1 && isStarted} />
            <PlayerArea player={players[3]} position="left" lastDiscardedTileId={lastDiscardedTileId} isDealer={engine.dealerIndex === 3 && !selectingDealer} dealerStreak={consecutiveDealerCount} isCurrentTurn={engine.currentTurn === 3 && isStarted} />
            <PlayerArea player={players[0]} position="bottom" isLocal={true} lastDiscardedTileId={lastDiscardedTileId} selectedTileId={selectedTileId} isDealer={engine.dealerIndex === 0 && !selectingDealer} dealerStreak={consecutiveDealerCount} isCurrentTurn={engine.currentTurn === 0 && isStarted} onDiscard={onLocalDiscardTile} />

            {/* Local Dealer Indicator */}
            {!selectingDealer && engine.dealerIndex === 0 && (
                <div style={{ position: 'absolute', bottom: '100px', right: '20px', zIndex: 15 }}>
                    <div className="glass-panel" style={{ padding: '8px 16px', color: 'gold', fontWeight: 'bold', border: '1px solid gold', background: 'rgba(0,0,0,0.6)' }}>
                        你是莊家 {consecutiveDealerCount > 0 ? `連 ${consecutiveDealerCount}` : ''}
                    </div>
                </div>
            )}

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
                        style={{ position: 'absolute', bottom: chowChoices ? '200px' : '120px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '15px', zIndex: 50 }}
                    >
                        {availableActions.some(a => a.type === 'chow') && <ActionButton label="吃" color="#3b82f6" onClick={() => handleAction('chow')} />}
                        {availableActions.some(a => a.type === 'pong') && <ActionButton label="碰" color="#10b981" onClick={() => handleAction('pong')} />}
                        {availableActions.some(a => a.type === 'kong') && <ActionButton label="明槓" color="#eab308" onClick={() => handleAction('kong')} />}
                        {availableActions.some(a => a.type === 'concealed_kong') && <ActionButton label="暗槓" color="#ca8a04" onClick={() => handleAction('concealed_kong')} />}
                        {availableActions.some(a => a.type === 'add_kong') && <ActionButton label="加槓" color="#eab308" onClick={() => handleAction('add_kong')} />}
                        {availableActions.some(a => a.type === 'hu') && (
                            // pendingActionTile being null means this is a self-draw (自摸)
                            <ActionButton
                                label={!pendingActionTile || pendingActionTile.tile === null ? '自摸' : '胡'}
                                color="#ef4444"
                                onClick={() => handleAction('hu')}
                            />
                        )}
                        <ActionButton label="過" color="#6b7280" onClick={() => handleAction('skip')} />
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {chowChoices && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        style={{
                            position: 'absolute', bottom: '100px', left: '50%', transform: 'translateX(-50%)',
                            background: 'rgba(0,0,0,0.85)', padding: '20px', borderRadius: '15px',
                            display: 'flex', gap: '20px', zIndex: 51, border: '1px solid var(--primary)'
                        }}
                    >
                        {chowChoices.map((choice, i) => (
                            <div key={i} onClick={() => handleAction('chow', choice)} style={{ cursor: 'pointer', display: 'flex', gap: '5px' }}>
                                 {choice.map(t => <TileRender key={t.id} tile={t} isLocal={true} />)}
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Player Info Toggle Button - bottom left */}
            <div style={{ position: 'absolute', bottom: '20px', left: '20px', zIndex: 30 }}>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowPlayerInfo(v => !v)}
                    style={{
                        width: '44px', height: '44px', borderRadius: '50%',
                        background: 'rgba(0,0,0,0.7)', border: '1px solid var(--primary)',
                        color: 'var(--primary)', fontSize: '1.3rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 10px var(--primary-glow)'
                    }}
                    title="玩家資訊"
                >
                    👥
                </motion.button>
                <AnimatePresence>
                    {showPlayerInfo && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            style={{
                                position: 'absolute', bottom: '52px', left: '0',
                                background: 'rgba(0,0,0,0.9)', border: '1px solid var(--primary)',
                                borderRadius: '12px', padding: '12px', minWidth: '230px',
                                backdropFilter: 'blur(8px)', zIndex: 30
                            }}
                        >
                            <div style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '8px' }}>玩家資訊</div>
                            {players.map((p, i) => (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    padding: '6px 0',
                                    borderBottom: i < players.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none'
                                }}>
                                    <div style={{
                                        width: '32px', height: '32px', borderRadius: '50%',
                                        background: i === 0 ? 'var(--primary)' : '#444',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 'bold', fontSize: '0.85rem', flexShrink: 0,
                                        border: engine.dealerIndex === i ? '2px solid gold' : '2px solid transparent'
                                    }}>
                                        {p.name[0]}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: engine.dealerIndex === i ? 'gold' : '#fff' }}>
                                            {p.name}{engine.dealerIndex === i ? ' (莊)' : ''}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.points} pts</div>
                                    </div>
                                    {engine.currentTurn === i && isStarted && (
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 6px var(--primary-glow)' }} />
                                    )}
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

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

const PlayerArea = ({ player, position, isLocal = false, isCurrentTurn, isDealer, dealerStreak, onDiscard, lastDiscardedTileId, selectedTileId }: any) => {
    const isVertical = position === 'left' || position === 'right';
    const posStyles: Record<string, React.CSSProperties> = {
        bottom: { bottom: '20px', left: '50%', transform: 'translateX(-50%)', flexDirection: 'column' },
        top: { top: '20px', left: '50%', transform: 'translateX(-50%)', flexDirection: 'column-reverse' },
        left: { left: '20px', top: '50%', transform: 'translateY(-50%)', flexDirection: 'row-reverse' },
        right: { right: '20px', top: '50%', transform: 'translateY(-50%)', flexDirection: 'row' }
    };
    const discardPosStyles: Record<string, React.CSSProperties> = {
        bottom: { bottom: 'clamp(95px, 25vh, 155px)', left: '50%', transform: 'translateX(-50%)', width: 'clamp(180px, 45vw, 380px)', maxHeight: 'clamp(60px, 20vh, 120px)', overflowY: 'auto' },
        top: { top: 'clamp(95px, 25vh, 155px)', left: '50%', transform: 'translateX(-50%)', width: 'clamp(180px, 45vw, 380px)', maxHeight: 'clamp(60px, 20vh, 120px)', overflowY: 'auto' },
        left: { left: 'clamp(65px, 20vw, 155px)', top: '50%', transform: 'translateY(-50%)', width: 'clamp(80px, 25vw, 170px)', maxHeight: 'clamp(100px, 35vh, 300px)', overflowY: 'auto' },
        right: { right: 'clamp(65px, 20vw, 155px)', top: '50%', transform: 'translateY(-50%)', width: 'clamp(80px, 25vw, 170px)', maxHeight: 'clamp(100px, 35vh, 300px)', overflowY: 'auto' }
    };
    const meldHandContainerStyles: Record<string, React.CSSProperties> = {
        bottom: { flexDirection: 'column' },
        top: { flexDirection: 'column-reverse' },
        left: { flexDirection: 'row-reverse' },
        right: { flexDirection: 'row' }
    };

    return (
        <>
            <div style={{
                    position: 'absolute', display: 'flex', alignItems: 'center', gap: '20px', ...(posStyles[position] || {}), zIndex: 5,
                    borderRadius: '12px',
                    boxShadow: isCurrentTurn ? '0 0 18px var(--primary-glow)' : 'none',
                    transition: 'box-shadow 0.3s ease'
                }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', ...(meldHandContainerStyles[position] || {}) }}>
                    {isDealer && (
                         <div style={{ 
                             position: 'absolute', [position === 'bottom' ? 'bottom' : position === 'top' ? 'top' : 'top']: '-30px', 
                             color: 'gold', fontWeight: 'bold', textShadow: '0 0 10px rgba(255,215,0,0.5)', zIndex: 10,
                             display: 'flex', alignItems: 'center', gap: '4px'
                         }}>
                             <span>莊</span>
                             {dealerStreak > 0 && <span style={{fontSize: '0.8em'}}>連 {dealerStreak}</span>}
                         </div>
                    )}
                    {player.melds?.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: isVertical ? 'column' : 'row', gap: '5px' }}>
                            {player.melds.map((m: any, i: number) => (
                                <div key={i} style={{ display: 'flex', flexDirection: isVertical ? 'column' : 'row', gap: '1px' }}>
                                    {m.tiles.map((t: any) => (<TileRender key={t.id} tile={t} isLocal={isLocal} isVertical={isVertical} isMeld={true} isHidden={m.type === 'concealed_kong' && !isLocal} position={position} />))}
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
                                    isSelected={isLocal && isCurrentTurn && t.id === selectedTileId}
                                    isDealer={isDealer}
                                    onClick={() => isLocal && isCurrentTurn && onDiscard && onDiscard(t.id)}
                                    position={position}
                                />
                            ))}
                        </div>
                    </AnimatePresence>
                </div>
            </div>

            <div style={{ position: 'absolute', display: 'flex', flexWrap: 'wrap', gap: '2px', alignContent: 'flex-start', alignItems: 'flex-start', zIndex: 2, ...(discardPosStyles[position] || {}) }}>
                <AnimatePresence>
                    {player.discards?.map((t: any) => (
                        <TileRender key={t.id} tile={t} isLocal={true} isVertical={false} isDiscard={true} position={position} isLastDiscard={t.id === lastDiscardedTileId} />
                    ))}
                </AnimatePresence>
            </div>
        </>
    )
}

const getTileImageSrc = (tile: Tile): string => {
    if (!tile) return '';
    if (tile.type === 'character') return `/${tile.value}萬.png`;
    if (tile.type === 'bamboo') return `/${tile.value}條.png`;
    if (tile.type === 'dot') return `/${tile.value}筒.png`;
    const windMap: Record<string, string> = { east: '東', south: '南', west: '西', north: '北' };
    if (tile.type === 'wind' && typeof tile.value === 'string') return `/${windMap[tile.value]}.png`;
    const dragonMap: Record<string, string> = { red: '中', green: '發', white: '白板' };
    if (tile.type === 'dragon' && typeof tile.value === 'string') return `/${dragonMap[tile.value]}.png`;
    return '';
};

const TileRender = ({ tile, isLocal, isMeld = false, isDiscard = false, isInteractable = false, isSelected = false, onClick, isHidden = false, position = 'bottom', isLastDiscard = false }: any) => {
    let baseWidth = isLocal ? 'clamp(30px, 4vw, 48px)' : 'clamp(20px, 3vh, 32px)';
    let baseHeight = isLocal ? 'clamp(42px, 5.5vw, 64px)' : 'clamp(28px, 4.2vh, 45px)';

    if (isDiscard) {
        baseWidth = 'clamp(16px, 2.8vmin, 28px)';
        baseHeight = 'clamp(24px, 4.2vmin, 40px)';
    }

    const isHorizontalLayout = (position === 'left' || position === 'right') && !isDiscard;

    const width = isHorizontalLayout ? baseHeight : baseWidth;
    const height = isHorizontalLayout ? baseWidth : baseHeight;

    const isBack = (!isLocal && !isMeld && !isDiscard) || isHidden;

    let contentRotation = 0;
    if (!isDiscard) {
        if (position === 'left') contentRotation = 90;
        else if (position === 'right') contentRotation = -90;
        else if (position === 'top') contentRotation = 180;
    }

    const imgSrc = isBack ? '/牌背_粉2.png' : getTileImageSrc(tile);

    return (
        <motion.div
            layoutId={tile.id}
            initial={isDiscard ? { scale: 1.5, opacity: 0 } : { opacity: 0, y: 20 }}
            animate={{ 
                scale: 1, opacity: 1,
                y: isSelected ? -20 : 0,
                boxShadow: isSelected
                    ? '0 0 18px 4px #facc15'
                    : isLastDiscard ? '0 0 10px 2px var(--primary)' : 'none',
                borderColor: isSelected ? '#facc15' : isLastDiscard ? 'var(--primary)' : 'var(--glass-border)'
            }}
            whileHover={isInteractable ? { y: -15, scale: 1.05, filter: 'brightness(1.2)' } : {}}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onClick={onClick}
            style={{
                width, height,
                borderRadius: '6px',
                border: isSelected ? '2px solid #facc15' : isLastDiscard ? '2px solid var(--primary)' : '1px solid rgba(0,0,0,0.15)',
                boxShadow: isLastDiscard ? '0 0 15px var(--primary-glow)' : (isInteractable ? '0 5px 15px rgba(0,0,0,0.5)' : '0 2px 4px rgba(0,0,0,0.3)'),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: isInteractable ? 'pointer' : 'default',
                overflow: 'hidden',
                backgroundColor: 'transparent',
            }}
        >
            <img
                src={imgSrc}
                alt={isBack ? '牌背' : getTileFace(tile)}
                style={{
                    width: isHorizontalLayout ? height : width,
                    height: isHorizontalLayout ? width : height,
                    objectFit: 'cover',
                    transform: `rotate(${contentRotation}deg)`,
                    display: 'block',
                    borderRadius: '4px',
                }}
            />
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
