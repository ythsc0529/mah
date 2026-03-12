import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

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

    // Auto-close after 5 seconds per requirements
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const totalPoints = basePoints + (totalTai * taiPoints);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
                zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center'
            }}
        >
            <motion.div
                initial={{ scale: 0.8, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', bounce: 0.4 }}
                className="glass-panel"
                style={{
                    width: '600px', padding: '3rem', border: '2px solid var(--primary)',
                    boxShadow: '0 0 50px rgba(201, 147, 59, 0.4)', textAlign: 'center'
                }}
            >
                <h1 style={{ color: 'var(--primary)', fontSize: '3rem', marginBottom: '1rem', textShadow: '0 0 20px var(--primary-glow)' }}>
                    {isSelfDraw ? '自摸 (Self Draw)!' : '胡牌 (Ron)!'}
                </h1>

                <div style={{ fontSize: '1.5rem', color: '#fff', marginBottom: '2rem' }}>
                    <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{winnerName}</span>
                    {isSelfDraw ? ' 摸到了勝利的牌' : ` 抓到了 ${loserName} 的放槍`}
                </div>

                <div style={{
                    background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '1.5rem',
                    display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '2rem',
                    border: '1px solid rgba(255,255,255,0.05)'
                }}>
                    <h3 style={{ color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                        台數結算 (Tai Breakdown)
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                        {taiReasons.map((r, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', color: '#e5e7eb' }}>
                                <span>{r.name}</span>
                                <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{r.tai} 台</span>
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontWeight: 'bold', fontSize: '1.2rem', marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed rgba(255,255,255,0.2)' }}>
                        <span>總台數 (Total Tai)</span>
                        <span style={{ color: 'var(--primary)' }}>{totalTai} 台</span>
                    </div>
                </div>

                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ef4444', textShadow: '0 2px 10px rgba(239, 68, 68, 0.5)' }}>
                    總計贏得: {totalPoints} 點
                </div>

                <div style={{ color: 'var(--text-muted)', marginTop: '2rem', fontSize: '0.9rem' }}>
                    ( {basePoints} 底 + {totalTai}台 x {taiPoints} ) <br />
                    畫面將於 5 秒後自動關閉...
                </div>
            </motion.div>
        </motion.div>
    );
};
