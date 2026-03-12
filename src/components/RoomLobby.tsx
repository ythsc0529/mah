import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Play, Settings2, Users } from 'lucide-react';

export interface RoomConfig {
    points: string;
    rounds: string;
}

interface RoomLobbyProps {
    roomId: string;
    isHost: boolean;
    onBack: () => void;
    onStartGame: (config: RoomConfig) => void;
}

export const RoomLobby: React.FC<RoomLobbyProps> = ({ roomId, isHost, onBack, onStartGame }) => {
    const [points, setPoints] = useState('50/20');
    const [rounds, setRounds] = useState('1圈');
    const [players, setPlayers] = useState([
        { id: 'p0', name: 'Player One', isHost: true, type: 'human' },
        // Mock connecting players or NPCs
        { id: 'p1', name: '等待加入...', isHost: false, type: 'empty' },
        { id: 'p2', name: '等待加入...', isHost: false, type: 'empty' },
        { id: 'p3', name: '等待加入...', isHost: false, type: 'empty' }
    ]);

    const pointOptions = ['10/10', '30/10', '50/20', '100/20', '100/50'];
    const roundOptions = ['1/4圈', '1圈', '1將'];

    const addNPC = () => {
        const emptySlot = players.findIndex(p => p.type === 'empty');
        if (emptySlot !== -1) {
            const newPlayers = [...players];
            newPlayers[emptySlot] = { id: `npc_${Date.now()}`, name: `NPC 電腦 ${emptySlot}`, isHost: false, type: 'npc' };
            setPlayers(newPlayers);
        }
    };

    return (
        <div className="app-container" style={{ padding: '2rem' }}>

            <button
                className="btn-secondary"
                style={{ position: 'absolute', top: '2rem', left: '2rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                onClick={onBack}
            >
                <ArrowLeft size={20} />
                離開房間
            </button>

            <div className="mobile-room-layout" style={{ display: 'flex', gap: '2rem', height: '100%', marginTop: '4rem' }}>

                {/* Players Area */}
                <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h2 style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Users /> 房間號碼: <span style={{ color: 'var(--primary)', letterSpacing: '4px' }}>{roomId}</span>
                    </h2>

                    <div className="mobile-card-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', flex: 1 }}>
                        {players.map((p, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="glass-panel"
                                style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    border: p.type === 'empty' ? '1px dashed var(--glass-border-highlight)' : '1px solid var(--glass-border)'
                                }}
                            >
                                {p.type === 'empty' ? (
                                    <>
                                        <div style={{ color: 'var(--text-muted)' }}>等待玩家加入...</div>
                                        {isHost && (
                                            <button className="btn-secondary" style={{ marginTop: '1rem', padding: '8px 16px', fontSize: '0.9rem' }} onClick={addNPC}>
                                                加入 NPC
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: p.type === 'npc' ? '#374151' : 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '10px' }}>
                                            {p.name.charAt(0)}
                                        </div>
                                        <h3 style={{ color: '#fff' }}>{p.name}</h3>
                                        {p.isHost && <div style={{ color: 'var(--primary)', fontSize: '0.8rem', marginTop: '5px' }}>房主</div>}
                                    </>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Settings Area */}
                <div className="glass-panel" style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column' }}>
                    <h2 style={{ color: 'var(--primary)', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Settings2 /> 房間設定
                    </h2>

                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '10px' }}>底/台 設定 (Points)</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            {pointOptions.map(opt => (
                                <button
                                    key={opt}
                                    className={points === opt ? 'btn-primary' : 'btn-secondary'}
                                    style={{ padding: '8px 16px', fontSize: '1rem' }}
                                    onClick={() => isHost && setPoints(opt)}
                                    disabled={!isHost}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ marginBottom: 'auto' }}>
                        <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '10px' }}>圈數 (Rounds)</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            {roundOptions.map(opt => (
                                <button
                                    key={opt}
                                    className={rounds === opt ? 'btn-primary' : 'btn-secondary'}
                                    style={{ padding: '8px 16px', fontSize: '1rem' }}
                                    onClick={() => isHost && setRounds(opt)}
                                    disabled={!isHost}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        className="btn-primary"
                        style={{ width: '100%', padding: '20px', fontSize: '1.2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}
                        onClick={() => onStartGame({ points, rounds })}
                        disabled={!isHost}
                    >
                        <Play /> {isHost ? '開始遊戲 (自動補齊NPC)' : '等待房主開始'}
                    </button>
                </div>

            </div>
        </div>
    )
}
