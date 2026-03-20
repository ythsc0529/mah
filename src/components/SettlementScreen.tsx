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
        const t1 = setTimeout(() => setShowDetails(true), 400);
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
            transition={{ duration: 0.3 }}
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(12px)',
                zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center',
                fontFamily: "'Inter', 'Noto Sans TC', sans-serif",
                padding: '20px'
            }}
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', damping: 24, stiffness: 200 }}
                onClick={e => e.stopPropagation()}
                style={{
                    width: '100%',
                    maxWidth: '460px',
                    maxHeight: '85vh',
                    background: '#ffffff',
                    borderRadius: '24px',
                    boxShadow: '0 24px 48px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
                    display: 'flex', flexDirection: 'column',
                    overflow: 'hidden'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '32px 32px 24px',
                    textAlign: 'center',
                    background: isSelfDraw 
                        ? 'linear-gradient(to bottom, #fffbeb, #ffffff)' 
                        : 'linear-gradient(to bottom, #fef2f2, #ffffff)'
                }}>
                    <div style={{ 
                        fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.05em',
                        color: isSelfDraw ? '#d97706' : '#dc2626', marginBottom: '12px' 
                    }}>
                        {isSelfDraw ? '自 摸 結 算' : '胡 牌 結 算'}
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111827', marginBottom: '8px' }}>
                        {winnerName} 勝出
                    </div>
                    {!isSelfDraw && loserName && (
                        <div style={{ fontSize: '0.95rem', color: '#6b7280', fontWeight: 500 }}>
                            來自 <span style={{ color: '#374151', fontWeight: 600 }}>{loserName}</span> 的放槍
                        </div>
                    )}
                </div>

                {/* Content */}
                <div style={{
                    padding: '0 32px 24px',
                    flex: 1,
                    overflowY: 'auto',
                    display: 'flex', flexDirection: 'column', gap: '20px'
                }}>
                    <AnimatePresence>
                        {showDetails && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div style={{ 
                                    fontSize: '1.05rem', fontWeight: 700, color: '#111827', 
                                    marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' 
                                }}>
                                    台數明細
                                    <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
                                </div>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {taiReasons.map((r, i) => (
                                        <div key={i} style={{ 
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '10px 16px', background: '#f9fafb', borderRadius: '12px',
                                            border: '1px solid #f3f4f6'
                                        }}>
                                            <span style={{ color: '#4b5563', fontWeight: 500 }}>{r.name}</span>
                                            <span style={{ color: '#111827', fontWeight: 600 }}>{r.tai} 台</span>
                                        </div>
                                    ))}
                                    
                                    <div style={{ 
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '16px 16px 8px', marginTop: '4px' 
                                    }}>
                                        <span style={{ color: '#374151', fontWeight: 700 }}>總台數</span>
                                        <span style={{ color: '#111827', fontWeight: 800, fontSize: '1.1rem' }}>{totalTai} 台</span>
                                    </div>
                                </div>

                                <div style={{ 
                                    marginTop: '24px', padding: '24px', borderRadius: '16px', 
                                    background: isSelfDraw ? '#fffdf0' : '#fff5f5',
                                    border: isSelfDraw ? '1px solid #fef08a' : '1px solid #fecaca'
                                }}>
                                    <div style={{ 
                                        display: 'flex', justifyContent: 'space-between', marginBottom: '12px', 
                                        fontSize: '0.9rem', color: '#6b7280', fontWeight: 500 
                                    }}>
                                        <span>底分 ({basePoints}) + 台分 ({totalTai} × {taiPoints})</span>
                                        <span>共 {totalPoints} 點</span>
                                    </div>
                                    
                                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#374151', paddingBottom: '4px' }}>
                                            最終得分
                                        </span>
                                        <div style={{ textAlign: 'right' }}>
                                            <span style={{ 
                                                fontSize: '2.5rem', fontWeight: 800, 
                                                color: isSelfDraw ? '#d97706' : '#dc2626', 
                                                lineHeight: 1, letterSpacing: '-0.02em'
                                            }}>
                                                +{isSelfDraw ? totalPoints * 3 : totalPoints}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div style={{ 
                                        textAlign: 'right', fontSize: '0.9rem', color: '#6b7280', 
                                        marginTop: '8px', fontWeight: 500 
                                    }}>
                                        {isSelfDraw ? `各家支付 ${totalPoints} 點` : `${loserName} 支付 ${totalPoints} 點`}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '20px 32px 32px',
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            width: '100%', padding: '16px',
                            background: '#111827', color: '#ffffff',
                            border: 'none', borderRadius: '14px',
                            fontSize: '1rem', fontWeight: 600, letterSpacing: '0.02em',
                            cursor: 'pointer', transition: 'all 0.2s ease',
                            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.15)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                        }}
                        onMouseDown={e => {
                            e.currentTarget.style.transform = 'translateY(1px)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                        }}
                    >
                        準備下一局 ({countdown}s)
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};
