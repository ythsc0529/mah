import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { PlusCircle, Search, ArrowLeft, Delete } from 'lucide-react';

interface CustomLobbyProps {
    onBack: () => void;
    onCreateRoom: () => void;
    onJoinRoom: (roomId: string) => void;
}

export const CustomLobby: React.FC<CustomLobbyProps> = ({ onBack, onCreateRoom, onJoinRoom }) => {
    const [mode, setMode] = useState<'select' | 'join'>('select');
    const [roomCode, setRoomCode] = useState<string>('');

    const handleKeypad = (num: number | 'del') => {
        if (num === 'del') {
            setRoomCode(prev => prev.slice(0, -1));
        } else {
            if (roomCode.length < 6) {
                setRoomCode(prev => prev + num);
            }
        }
    };

    const handleJoinSubmit = () => {
        if (roomCode.length === 6) {
            onJoinRoom(roomCode);
        }
    };

    return (
        <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>

            <button
                className="btn-secondary"
                style={{ position: 'absolute', top: '2rem', left: '2rem', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 10 }}
                onClick={() => mode === 'join' ? setMode('select') : onBack()}
            >
                <ArrowLeft size={20} />
                返回
            </button>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="glass-panel mobile-modal"
                style={{ padding: '3rem', width: '500px', display: 'flex', flexDirection: 'column', gap: '2rem' }}
            >
                <h1 style={{ color: 'var(--primary)', textAlign: 'center', fontSize: '2rem' }}>
                    自訂對局
                </h1>

                {mode === 'select' && (
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onCreateRoom}
                            className="glass-panel"
                            style={{ flex: 1, height: '150px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--primary)', background: 'rgba(201, 147, 59, 0.1)' }}
                        >
                            <PlusCircle size={40} color="var(--primary)" style={{ marginBottom: '10px' }} />
                            <h3 style={{ color: 'var(--primary)' }}>創建房間</h3>
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => { setMode('join'); setRoomCode(''); }}
                            className="glass-panel"
                            style={{ flex: 1, height: '150px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--glass-border-highlight)' }}
                        >
                            <Search size={40} color="var(--text-light)" style={{ marginBottom: '10px' }} />
                            <h3 style={{ color: 'var(--text-light)' }}>加入房間</h3>
                        </motion.button>
                    </div>
                )}

                {mode === 'join' && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>

                        {/* 6 digits display */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            {[0, 1, 2, 3, 4, 5].map(idx => (
                                <div key={idx} style={{
                                    width: '50px', height: '60px',
                                    borderBottom: `3px solid ${roomCode.length === idx ? 'var(--primary)' : 'var(--glass-border-highlight)'}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold'
                                }}>
                                    {roomCode[idx] || ''}
                                </div>
                            ))}
                        </div>

                        {/* Keypad */}
                        <div className="keypad-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', width: '250px' }}>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                <button key={num} className="btn-secondary" style={{ padding: '15px' }} onClick={() => handleKeypad(num)}>
                                    {num}
                                </button>
                            ))}
                            <div />
                            <button className="btn-secondary" style={{ padding: '15px' }} onClick={() => handleKeypad(0)}>0</button>
                            <button className="btn-secondary" style={{ padding: '15px', color: 'var(--accent-red)' }} onClick={() => handleKeypad('del')}>
                                <Delete size={20} style={{ margin: 'auto' }} />
                            </button>
                        </div>

                        <button
                            className="btn-primary"
                            style={{ width: '250px', opacity: roomCode.length === 6 ? 1 : 0.5 }}
                            disabled={roomCode.length !== 6}
                            onClick={handleJoinSubmit}
                        >
                            進入房間
                        </button>
                    </div>
                )}

            </motion.div>
        </div>
    )
}
