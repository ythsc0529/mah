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
    const [countdown, setCountdown] = useState(10);
    const [showDetails, setShowDetails] = useState(false);

    const totalPoints = basePoints + (totalTai * taiPoints);

    useEffect(() => {
        const t1 = setTimeout(() => setShowDetails(true), 800);
        return () => clearTimeout(t1);
    }, []);

    useEffect(() => {
        if (countdown <= 0) { onClose(); return; }
        const t = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [countdown, onClose]);

    // Particle effect
    const particles = Array.from({ length: 15 });

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, // Using absolute to fit GameBoard exactly
                background: 'radial-gradient(circle at center, rgba(30,35,45,0.85) 0%, rgba(10,12,18,0.98) 100%)', 
                backdropFilter: 'blur(20px)',
                zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center',
                fontFamily: "'Noto Sans TC', sans-serif",
                perspective: '1200px'
            }}
            onClick={onClose}
        >
            {/* Ambient Glow */}
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                style={{
                    position: 'absolute',
                    width: '60vw', height: '60vw',
                    background: isSelfDraw 
                        ? 'radial-gradient(circle, rgba(250, 204, 21, 0.15) 0%, transparent 70%)'
                        : 'radial-gradient(circle, rgba(248, 113, 113, 0.1) 0%, transparent 70%)',
                    borderRadius: '50%',
                    pointerEvents: 'none',
                    top: '50%', left: '50%', transform: 'translate(-50%, -50%)'
                }}
            />

            {/* Particles */}
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                {particles.map((_, i) => (
                    <motion.div
                        key={i}
                        initial={{ 
                            opacity: 0, 
                            y: '110vh',
                            x: `${Math.random() * 100}vw`
                        }}
                        animate={{
                            opacity: [0, 0.8, 0],
                            y: '-10vh',
                            x: `${Math.random() * 100}vw`
                        }}
                        transition={{ 
                            duration: 4 + Math.random() * 4, 
                            repeat: Infinity, 
                            delay: Math.random() * 2,
                            ease: 'linear'
                        }}
                        style={{
                            position: 'absolute',
                            width: `${Math.random() * 6 + 2}px`,
                            height: `${Math.random() * 6 + 2}px`,
                            borderRadius: '50%',
                            background: isSelfDraw ? '#FACC15' : '#F87171',
                            boxShadow: `0 0 10px ${isSelfDraw ? '#FACC15' : '#F87171'}`,
                            filter: 'blur(1px)'
                        }}
                    />
                ))}
            </div>

            <motion.div
                initial={{ rotateX: 20, y: 80, opacity: 0, scale: 0.95 }}
                animate={{ rotateX: 0, y: 0, opacity: 1, scale: 1 }}
                transition={{ type: 'spring', damping: 22, stiffness: 100, mass: 0.8 }}
                onClick={e => e.stopPropagation()}
                style={{
                    width: 'min(680px, 92vw)',
                    maxHeight: '90vh',
                    position: 'relative',
                    background: 'linear-gradient(180deg, rgba(30,36,51,0.9) 0%, rgba(13,17,23,0.95) 100%)',
                    borderRadius: '24px',
                    border: `1px solid rgba(255,255,255,0.1)`,
                    boxShadow: `0 30px 60px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255,255,255,0.05) inset, 0 0 50px ${isSelfDraw ? 'rgba(250,204,21,0.15)' : 'rgba(239,68,68,0.1)'}`,
                    overflow: 'hidden',
                    display: 'flex', flexDirection: 'column'
                }}
            >
                {/* ─── Premium Header ─── */}
                <div style={{
                    position: 'relative',
                    padding: '36px 20px 24px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    background: isSelfDraw
                        ? 'linear-gradient(180deg, rgba(234,179,8,0.3) 0%, rgba(234,179,8,0) 100%)'
                        : 'linear-gradient(180deg, rgba(239,68,68,0.3) 0%, rgba(239,68,68,0) 100%)',
                    borderBottom: '1px solid rgba(255,255,255,0.05)'
                }}>
                    <motion.div
                        initial={{ scale: 2, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', bounce: 0.5, delay: 0.2 }}
                        style={{
                            fontSize: '4.5rem',
                            lineHeight: 1,
                            textShadow: `0 0 40px ${isSelfDraw ? 'rgba(250,204,21,0.6)' : 'rgba(239,68,68,0.6)'}`,
                            marginBottom: '12px'
                        }}
                    >
                        {isSelfDraw ? '🀄' : '🀄'}
                    </motion.div>
                    
                    <motion.h1
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        style={{
                            fontSize: 'clamp(2.5rem, 6vw, 3.5rem)',
                            fontWeight: '900',
                            color: '#fff',
                            margin: 0,
                            letterSpacing: '4px',
                            background: isSelfDraw
                                ? 'linear-gradient(to bottom, #FEF08A, #F59E0B)'
                                : 'linear-gradient(to bottom, #FECACA, #EF4444)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))'
                        }}
                    >
                        {isSelfDraw ? '自 摸' : '胡 牌'}
                    </motion.h1>
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        transition={{ delay: 0.5 }}
                        style={{
                            marginTop: '12px',
                            padding: '6px 20px',
                            background: 'rgba(0,0,0,0.4)',
                            borderRadius: '24px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'rgba(255,255,255,0.8)',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            letterSpacing: '4px',
                            textTransform: 'uppercase'
                        }}
                    >
                        {isSelfDraw ? 'Self Draw Victory' : 'Ron Victory'}
                    </motion.div>
                </div>

                <div style={{
                    padding: '28px 36px',
                    display: 'flex', flexDirection: 'column', gap: '28px',
                    overflowY: 'auto',
                    flex: 1
                }}>
                    {/* Winner / Loser Row */}
                    <AnimatePresence>
                        {showDetails && (
                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4 }}
                                style={{ display: 'flex', gap: '16px', alignItems: 'stretch' }}
                            >
                                {/* Winner Card */}
                                <div style={{
                                    flex: 1, borderRadius: '20px', padding: '24px 20px',
                                    background: 'linear-gradient(135deg, rgba(250,204,21,0.15) 0%, rgba(250,204,21,0.03) 100%)',
                                    border: '1px solid rgba(250,204,21,0.3)',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                                    position: 'relative', overflow: 'hidden',
                                    boxShadow: '0 8px 32px rgba(250,204,21,0.05)'
                                }}>
                                    {/* Shine */}
                                    <motion.div animate={{ x: ['-200%', '200%'] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)', transform: 'skewX(-20deg)' }} />
                                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', letterSpacing: '0.15em', fontWeight: 700 }}>WINNER</div>
                                    <div style={{ color: '#FCE72C', fontWeight: '900', fontSize: '1.6rem', textAlign: 'center', textShadow: '0 2px 10px rgba(250,204,21,0.4)' }}>
                                        {winnerName}
                                    </div>
                                    <div style={{
                                        marginTop: '8px',
                                        background: 'rgba(250,204,21,0.25)', borderRadius: '12px',
                                        padding: '8px 20px', color: '#FCE72C', fontWeight: '900',
                                        fontSize: '1.2rem', border: '1px solid rgba(250,204,21,0.3)',
                                        boxShadow: '0 4px 15px rgba(250,204,21,0.1)'
                                    }}>
                                        +{isSelfDraw ? totalPoints * 3 : totalPoints} 點
                                    </div>
                                </div>

                                {/* Divider / VS */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ 
                                        width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', 
                                        border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', 
                                        justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', fontWeight: 800,
                                        boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                                    }}>
                                        VS
                                    </div>
                                </div>

                                {/* Loser Card */}
                                <div style={{
                                    flex: 1, borderRadius: '20px', padding: '24px 20px',
                                    background: 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.03) 100%)',
                                    border: '1px solid rgba(239,68,68,0.25)',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                                    boxShadow: '0 8px 32px rgba(239,68,68,0.05)'
                                }}>
                                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', letterSpacing: '0.15em', fontWeight: 700 }}>
                                        {isSelfDraw ? 'ALL PLAYERS' : 'LOSER'}
                                    </div>
                                    <div style={{ color: '#FCA5A5', fontWeight: '900', fontSize: '1.6rem', textAlign: 'center' }}>
                                        {isSelfDraw ? '所有人' : loserName}
                                    </div>
                                    <div style={{
                                        marginTop: '8px',
                                        background: 'rgba(239,68,68,0.2)', borderRadius: '12px',
                                        padding: '8px 20px', color: '#FCA5A5', fontWeight: '900',
                                        fontSize: '1.2rem', border: '1px solid rgba(239,68,68,0.25)',
                                        boxShadow: '0 4px 15px rgba(239,68,68,0.1)'
                                    }}>
                                        −{totalPoints} 點{isSelfDraw ? ' (各)' : ''}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ─── Point Breakdown ─── */}
                    <AnimatePresence>
                        {showDetails && (
                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.15, duration: 0.4 }}
                                style={{
                                    borderRadius: '20px', overflow: 'hidden',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    background: 'rgba(0,0,0,0.4)',
                                    boxShadow: 'inset 0 2px 20px rgba(255,255,255,0.02)'
                                }}
                            >
                                <div style={{
                                    padding: '16px 24px',
                                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    background: 'rgba(255,255,255,0.03)'
                                }}>
                                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.1em' }}>台數明細 TAI BREAKDOWN</span>
                                </div>

                                <div style={{ maxHeight: '180px', overflowY: 'auto', padding: '12px 24px' }}>
                                    {taiReasons.map((r, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.25 + i * 0.05 }}
                                            style={{
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                padding: '12px 0',
                                                borderBottom: i < taiReasons.length - 1 ? '1px dashed rgba(255,255,255,0.1)' : 'none',
                                            }}
                                        >
                                            <span style={{ color: '#E2E8F0', fontSize: '1.05rem', fontWeight: 600 }}>{r.name}</span>
                                            <span style={{
                                                background: 'linear-gradient(135deg, rgba(250,204,21,0.25), rgba(217,119,6,0.25))',
                                                border: '1px solid rgba(250,204,21,0.4)',
                                                borderRadius: '8px', padding: '6px 14px',
                                                color: '#FDE047', fontWeight: '800', fontSize: '1rem',
                                                minWidth: '64px', textAlign: 'center',
                                                boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                                            }}>
                                                {r.tai} 台
                                            </span>
                                        </motion.div>
                                    ))}
                                </div>

                                <div style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '16px 24px',
                                    borderTop: '1px solid rgba(250,204,21,0.3)',
                                    background: 'linear-gradient(90deg, rgba(250,204,21,0.1), rgba(217,119,6,0.2))',
                                }}>
                                    <span style={{ color: '#fff', fontWeight: '800', fontSize: '1.1rem', letterSpacing: '0.05em' }}>總計 TOTAL</span>
                                    <span style={{ color: '#FACC15', fontWeight: '900', fontSize: '1.4rem', textShadow: '0 0 15px rgba(250,204,21,0.5)' }}>
                                        {totalTai} 台
                                    </span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ─── Total Points Big Display ─── */}
                    <AnimatePresence>
                        {showDetails && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ delay: 0.4, type: 'spring', bounce: 0.4 }}
                                style={{
                                    borderRadius: '20px', padding: '24px 32px',
                                    background: 'linear-gradient(135deg, rgba(217,119,6,0.25) 0%, rgba(180,83,9,0.5) 100%)',
                                    border: '1px solid rgba(250,204,21,0.5)',
                                    boxShadow: '0 15px 40px rgba(0,0,0,0.4), inset 0 2px 15px rgba(255,255,255,0.15)',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    position: 'relative', overflow: 'hidden'
                                }}
                            >
                                {/* Background texture/glow inside total box */}
                                <div style={{ position: 'absolute', right: '-20%', top: '-50%', width: '180px', height: '180px', background: 'rgba(250,204,21,0.4)', filter: 'blur(50px)', borderRadius: '50%' }} />
                                
                                <div style={{ zIndex: 1 }}>
                                    <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem', marginBottom: '8px', fontWeight: 600, letterSpacing: '0.05em' }}>
                                        底 {basePoints} + ({totalTai}台 × {taiPoints})
                                    </div>
                                    <div style={{ color: '#fff', fontWeight: '900', fontSize: '1.3rem', textShadow: '0 2px 4px rgba(0,0,0,0.5)', letterSpacing: '0.05em' }}>
                                        最終得分 FINAL SCORE
                                    </div>
                                </div>
                                <motion.div
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: 'spring', bounce: 0.6, delay: 0.6 }}
                                    style={{
                                        fontSize: 'clamp(2.5rem, 6vw, 3.5rem)',
                                        fontWeight: '900',
                                        color: '#FEF08A',
                                        textShadow: '0 4px 25px rgba(217,119,6,0.9), 0 0 15px rgba(250,204,21,0.6)',
                                        zIndex: 1,
                                        display: 'flex', alignItems: 'baseline', gap: '6px'
                                    }}
                                >
                                    {totalPoints}
                                    <span style={{ fontSize: '1.2rem', opacity: 0.9, fontWeight: 800 }}>點</span>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* ─── Footer ─── */}
                <div style={{ 
                    padding: '24px 36px', 
                    background: 'rgba(0,0,0,0.5)', 
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex', gap: '20px', alignItems: 'center' 
                }}>
                    <motion.button
                        whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.2)' }}
                        whileTap={{ scale: 0.97 }}
                        onClick={onClose}
                        style={{
                            flex: 1, padding: '18px 24px',
                            borderRadius: '16px', border: '1px solid rgba(255,255,255,0.25)',
                            background: 'rgba(255,255,255,0.1)',
                            color: '#fff', fontWeight: '800', fontSize: '1.2rem', letterSpacing: '0.05em',
                            cursor: 'pointer',
                            boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
                            backdropFilter: 'blur(8px)',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                    >
                        繼續下一局 NEXT GAME
                    </motion.button>

                    {/* Circular Countdown Ring */}
                    <div style={{ position: 'relative', width: '60px', height: '60px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="60" height="60" viewBox="0 0 60 60" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
                            <circle cx="30" cy="30" r="26" fill="rgba(0,0,0,0.6)" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
                            <motion.circle
                                cx="30" cy="30" r="26" fill="none"
                                stroke="#FACC15" strokeWidth="4"
                                strokeDasharray={`${2 * Math.PI * 26}`}
                                strokeDashoffset={`${2 * Math.PI * 26 * (1 - countdown / 10)}`}
                                strokeLinecap="round"
                                style={{ transition: 'stroke-dashoffset 1s linear' }}
                            />
                        </svg>
                        <div style={{
                            color: '#FACC15', fontWeight: '900', fontSize: '1.3rem', textShadow: '0 0 12px rgba(250,204,21,0.6)'
                        }}>
                            {countdown}
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};
