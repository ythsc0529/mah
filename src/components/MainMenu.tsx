import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Swords, Trophy, Settings, LogOut, Gamepad2, UserPlus } from 'lucide-react';

interface MainMenuProps {
    onNavigate: (screen: 'lobby' | 'login') => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onNavigate }) => {
    const [showFriends, setShowFriends] = useState(false);

    return (
        <div className="app-container" style={{ flexDirection: 'row', padding: '1rem', gap: '1rem' }}>

            {/* Sidebar: User Info & Actions */}
            <motion.div
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="glass-panel"
                style={{ width: '250px', display: 'flex', flexDirection: 'column', padding: '1.5rem', justifyContent: 'space-between' }}
            >
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                        <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>
                            P1
                        </div>
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Player One</div>
                            <div style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>Level 12</div>
                        </div>
                    </div>

                    <button className="btn-secondary" style={{ width: '100%', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => setShowFriends(!showFriends)}>
                        <Users size={18} />
                        好友系統
                    </button>

                    <button className="btn-secondary" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Settings size={18} />
                        設定
                    </button>
                </div>

                <button
                    className="btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-red)', borderColor: 'rgba(225, 29, 72, 0.3)' }}
                    onClick={() => onNavigate('login')}
                >
                    <LogOut size={18} />
                    登出
                </button>
            </motion.div>

            {/* Main Content Area */}
            <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}
            >
                <div style={{ flex: 1, display: 'flex', gap: '1.5rem', justifyContent: 'center', alignItems: 'center' }}>

                    {/* Locked Modes */}
                    <ModeCard
                        title="排位賽"
                        subtitle="Ranked Match"
                        icon={<Trophy size={48} />}
                        locked={true}
                        color="#8b5cf6"
                    />

                    <ModeCard
                        title="匹配模式"
                        subtitle="Quick Match"
                        icon={<Swords size={48} />}
                        locked={true}
                        color="#3b82f6"
                    />

                    {/* Custom Game */}
                    <ModeCard
                        title="自訂對局"
                        subtitle="Custom Game"
                        icon={<Gamepad2 size={48} />}
                        locked={false}
                        color="var(--primary)"
                        onClick={() => onNavigate('lobby')}
                    />

                </div>
            </motion.div>

            {/* Friends Sidebar Drawer */}
            <AnimatePresence>
                {showFriends && (
                    <motion.div
                        initial={{ x: 300, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 300, opacity: 0 }}
                        className="glass-panel"
                        style={{ width: '300px', position: 'absolute', right: '1rem', top: '1rem', bottom: '1rem', padding: '1.5rem', zIndex: 10 }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ color: 'var(--primary)' }}>好友列表 (Friends)</h3>
                            <button className="btn-secondary" style={{ padding: '8px' }}>
                                <UserPlus size={18} />
                            </button>
                        </div>

                        <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '3rem' }}>
                            目前沒有好友在線上。
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};

interface ModeCardProps {
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    locked: boolean;
    color: string;
    onClick?: () => void;
}

const ModeCard: React.FC<ModeCardProps> = ({ title, subtitle, icon, locked, color, onClick }) => {
    return (
        <motion.div
            whileHover={locked ? {} : { y: -10, scale: 1.02 }}
            whileTap={locked ? {} : { scale: 0.98 }}
            onClick={!locked ? onClick : undefined}
            className="glass-panel"
            style={{
                width: '280px',
                height: '400px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: locked ? 'not-allowed' : 'pointer',
                position: 'relative',
                overflow: 'hidden',
                border: locked ? '1px solid rgba(255,255,255,0.05)' : `1px solid ${color}`,
                boxShadow: locked ? 'none' : `0 10px 30px rgba(0,0,0,0.5), inset 0 0 20px ${color}22`,
                opacity: locked ? 0.6 : 1
            }}
        >
            <div style={{ color: locked ? 'var(--text-muted)' : color, marginBottom: '2rem' }}>
                {icon}
            </div>
            <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: locked ? '#666' : '#fff' }}>{title}</h2>
            <div style={{ color: 'var(--text-muted)', letterSpacing: '2px', fontSize: '0.9rem' }}>{subtitle}</div>

            {locked && (
                <div style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    background: 'rgba(0,0,0,0.5)',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.3)'
                }}>
                    暫不開放 (Locked)
                </div>
            )}
        </motion.div>
    )
}
