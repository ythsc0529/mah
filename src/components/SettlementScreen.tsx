import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SettlementScreenProps {
    winnerName: string;
    loserName?: string; // If undefined, it's a self-draw (自摸)
    isSelfDraw: boolean;
    taiReasons: { name: string, tai: number }[];
    totalTai: number;
    basePoints: number;
    taiPoints: number;
    onClose: () => void;
}

export const SettlementScreen: React.FC<SettlementScreenProps> = ({
    winnerName, loserName, isSelfDraw, taiReasons, totalTai, basePoints, taiPoints, onClose
}) => {
    const [countdown, setCountdown] = useState(8);
    const [showDetails, setShowDetails] = useState(false);

    const totalPoints = basePoints + (totalTai * taiPoints);

    useEffect(() => {
        // Show details after animation
        const t1 = setTimeout(() => setShowDetails(true), 600);
        return () => clearTimeout(t1);
    }, []);

    useEffect(() => {
        if (countdown <= 0) { onClose(); return; }
        const t = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [countdown, onClose]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)',
                zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center',
                fontFamily: "'Noto Sans TC', sans-serif",
            }}
            onClick={onClose}
        >
            {/* Background particles / glow effects */}
            <div style={{
                position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none'
            }}>
                {[...Array(8)].map((_, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{
                            opacity: [0, 0.6, 0],
                            scale: [0.5, 2, 3],
                            x: `${(Math.random() - 0.5) * 100}vw`,
                            y: `${(Math.random() - 0.5) * 100}vh`,
                        }}
                        transition={{ duration: 3, delay: i * 0.2, ease: 'easeOut' }}
                        style={{
                            position: 'absolute', top: '50%', left: '50%',
                            width: '200px', height: '200px', borderRadius: '50%',
                            background: isSelfDraw
                                ? 'radial-gradient(circle, rgba(251,191,36,0.3) 0%, transparent 70%)'
                                : 'radial-gradient(circle, rgba(201,147,59,0.3) 0%, transparent 70%)',
                        }}
                    />
                ))}
            </div>

            <motion.div
                initial={{ scale: 0.75, y: 60, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                transition={{ type: 'spring', bounce: 0.35, duration: 0.7 }}
                onClick={e => e.stopPropagation()}
                style={{
                    width: 'min(680px, 92vw)',
                    maxHeight: '90vh',
                    display: 'flex', flexDirection: 'column', gap: '0',
                    borderRadius: '24px',
                    border: `2px solid ${isSelfDraw ? '#fbbf24' : 'var(--primary)'}`,
                    boxShadow: `0 0 60px ${isSelfDraw ? 'rgba(251,191,36,0.5)' : 'rgba(201,147,59,0.45)'}, 0 20px 60px rgba(0,0,0,0.8)`,
                    overflow: 'hidden',
                }}
            >
                {/* ─── Header Banner ─── */}
                <div style={{
                    background: isSelfDraw
                        ? 'linear-gradient(135deg, #92400e, #d97706, #fbbf24)'
                        : 'linear-gradient(135deg, #451a03, #c9933b, #f59e0b)',
                    padding: '28px 32px 20px',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    {/* Shine sweep */}
                    <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: '200%' }}
                        transition={{ duration: 1.2, delay: 0.3, ease: 'easeInOut' }}
                        style={{
                            position: 'absolute', inset: 0,
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
                            pointerEvents: 'none',
                        }}
                    />

                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', bounce: 0.6, delay: 0.15 }}
                        style={{ fontSize: 'clamp(2rem, 6vw, 3.5rem)', fontWeight: '900', color: '#fff', textShadow: '0 2px 12px rgba(0,0,0,0.6)', lineHeight: 1 }}
                    >
                        {isSelfDraw ? '🀄 自摸！' : '🀄 胡牌！'}
                    </motion.div>
                    <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 'clamp(0.75rem, 2vw, 0.95rem)', marginTop: '6px', letterSpacing: '0.05em' }}>
                        {isSelfDraw ? 'SELF DRAW' : 'RON'}
                    </div>
                </div>

                {/* ─── Main Content ─── */}
                <div style={{
                    background: 'linear-gradient(180deg, #111827 0%, #0d1117 100%)',
                    padding: '24px 28px',
                    display: 'flex', flexDirection: 'column', gap: '20px',
                    overflowY: 'auto',
                }}>

                    {/* Winner / Loser Row */}
                    <AnimatePresence>
                        {showDetails && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{ display: 'flex', gap: '12px', alignItems: 'stretch' }}
                            >
                                {/* Winner */}
                                <div style={{
                                    flex: 1, borderRadius: '16px', padding: '16px',
                                    background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(21,128,61,0.08))',
                                    border: '1px solid rgba(34,197,94,0.4)',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px'
                                }}>
                                    <div style={{ fontSize: '1.8rem' }}>🏆</div>
                                    <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem', letterSpacing: '0.08em' }}>贏家</div>
                                    <div style={{ color: '#4ade80', fontWeight: '800', fontSize: 'clamp(1rem, 3vw, 1.25rem)', textAlign: 'center' }}>
                                        {winnerName}
                                    </div>
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', delay: 0.3 }}
                                        style={{
                                            background: 'rgba(34,197,94,0.2)', borderRadius: '20px',
                                            padding: '4px 14px', color: '#4ade80', fontWeight: '700',
                                            fontSize: 'clamp(0.85rem, 2.5vw, 1rem)',
                                        }}
                                    >
                                        +{isSelfDraw ? totalPoints * 3 : totalPoints} 點
                                    </motion.div>
                                </div>

                                {/* Arrow */}
                                <div style={{ display: 'flex', alignItems: 'center', fontSize: '1.5rem', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
                                    {isSelfDraw ? '←→' : '←'}
                                </div>

                                {/* Loser */}
                                <div style={{
                                    flex: 1, borderRadius: '16px', padding: '16px',
                                    background: 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(153,27,27,0.08))',
                                    border: '1px solid rgba(239,68,68,0.35)',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px'
                                }}>
                                    <div style={{ fontSize: '1.8rem' }}>{isSelfDraw ? '😞😞😞' : '😞'}</div>
                                    <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem', letterSpacing: '0.08em' }}>
                                        {isSelfDraw ? '放槍者' : '放槍'}
                                    </div>
                                    <div style={{ color: '#f87171', fontWeight: '800', fontSize: 'clamp(1rem, 3vw, 1.25rem)', textAlign: 'center' }}>
                                        {isSelfDraw ? '所有玩家' : loserName}
                                    </div>
                                    <div style={{
                                        background: 'rgba(239,68,68,0.15)', borderRadius: '20px',
                                        padding: '4px 14px', color: '#f87171', fontWeight: '700',
                                        fontSize: 'clamp(0.85rem, 2.5vw, 1rem)',
                                    }}>
                                        −{totalPoints} 點{isSelfDraw ? ' 各' : ''}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ─── Point Breakdown ─── */}
                    <AnimatePresence>
                        {showDetails && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.15 }}
                                style={{
                                    borderRadius: '16px', overflow: 'hidden',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    background: 'rgba(255,255,255,0.03)',
                                }}
                            >
                                {/* Header */}
                                <div style={{
                                    padding: '12px 18px',
                                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                }}>
                                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', letterSpacing: '0.06em' }}>台數明細</span>
                                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>台數</span>
                                </div>

                                {/* Tai reasons list */}
                                <div style={{ maxHeight: '160px', overflowY: 'auto', padding: '4px 0' }}>
                                    {taiReasons.map((r, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.2 + i * 0.06 }}
                                            style={{
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                padding: '9px 18px',
                                                borderBottom: i < taiReasons.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                                            }}
                                        >
                                            <span style={{ color: '#e5e7eb', fontSize: '0.9rem' }}>{r.name}</span>
                                            <span style={{
                                                background: 'rgba(251,191,36,0.15)',
                                                border: '1px solid rgba(251,191,36,0.35)',
                                                borderRadius: '12px', padding: '2px 10px',
                                                color: '#fbbf24', fontWeight: '700', fontSize: '0.85rem',
                                                minWidth: '52px', textAlign: 'center',
                                            }}>
                                                {r.tai} 台
                                            </span>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Total tai row */}
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '12px 18px',
                                    borderTop: '1px solid rgba(255,255,255,0.1)',
                                    background: 'rgba(251,191,36,0.05)',
                                }}>
                                    <span style={{ color: '#fff', fontWeight: '700', fontSize: '0.95rem' }}>總台數</span>
                                    <span style={{ color: '#fbbf24', fontWeight: '800', fontSize: '1.1rem' }}>{totalTai} 台</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ─── Total Points Big Display ─── */}
                    <AnimatePresence>
                        {showDetails && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.3, type: 'spring', bounce: 0.4 }}
                                style={{
                                    borderRadius: '16px', padding: '18px 24px',
                                    background: 'linear-gradient(135deg, rgba(201,147,59,0.2), rgba(251,191,36,0.1))',
                                    border: '1px solid rgba(251,191,36,0.4)',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                }}
                            >
                                <div>
                                    <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem', marginBottom: '4px' }}>
                                        計算方式： {basePoints}底 + {totalTai}台 × {taiPoints}
                                    </div>
                                    <div style={{ color: '#fff', fontWeight: '700', fontSize: '1.05rem' }}>
                                        總計贏得
                                    </div>
                                </div>
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', bounce: 0.6, delay: 0.45 }}
                                    style={{
                                        fontSize: 'clamp(1.8rem, 5vw, 2.5rem)',
                                        fontWeight: '900',
                                        color: '#fbbf24',
                                        textShadow: '0 0 20px rgba(251,191,36,0.6)',
                                    }}
                                >
                                    {totalPoints}
                                    <span style={{ fontSize: '0.45em', marginLeft: '4px', verticalAlign: 'middle', opacity: 0.8 }}>點</span>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ─── Footer ─── */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={onClose}
                            style={{
                                flex: 1, padding: '14px 24px',
                                borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)',
                                background: 'rgba(255,255,255,0.07)',
                                color: '#fff', fontWeight: '700', fontSize: '1rem',
                                cursor: 'pointer',
                            }}
                        >
                            繼續下一局
                        </motion.button>

                        {/* Countdown ring */}
                        <div style={{ position: 'relative', width: '48px', height: '48px', flexShrink: 0 }}>
                            <svg width="48" height="48" viewBox="0 0 48 48" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
                                <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                                <motion.circle
                                    cx="24" cy="24" r="20" fill="none"
                                    stroke="#fbbf24" strokeWidth="3"
                                    strokeDasharray={`${2 * Math.PI * 20}`}
                                    strokeDashoffset={`${2 * Math.PI * 20 * (1 - countdown / 8)}`}
                                    strokeLinecap="round"
                                    style={{ transition: 'stroke-dashoffset 1s linear' }}
                                />
                            </svg>
                            <div style={{
                                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fbbf24', fontWeight: '700', fontSize: '1rem'
                            }}>
                                {countdown}
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};
