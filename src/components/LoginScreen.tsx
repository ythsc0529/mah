import React from 'react';
import { motion } from 'framer-motion';
import { lockScreenOrientation, isMobileDevice } from '../utils/mobileLock';
import { User, Chrome } from 'lucide-react';

interface LoginScreenProps {
    onLoginSuccess: (method: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
    const handleLogin = async (method: string) => {
        if (isMobileDevice()) {
            await lockScreenOrientation();
        }
        onLoginSuccess(method);
    };

    return (
        <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="glass-panel"
                style={{
                    padding: '3rem',
                    textAlign: 'center',
                    maxWidth: '400px',
                    width: '90%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2rem'
                }}
            >
                <div>
                    <motion.h1
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        style={{
                            color: 'var(--primary)',
                            fontSize: '3rem',
                            letterSpacing: '2px',
                            textShadow: '0 0 20px var(--primary-glow)'
                        }}
                    >
                        隨便你胡
                    </motion.h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', letterSpacing: '1px' }}>
                        TAIWANESE MAHJONG
                    </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <button
                        className="btn-primary"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                        onClick={() => handleLogin('guest')}
                    >
                        <User size={20} />
                        遊客登入 (Guest)
                    </button>

                    <button
                        className="btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                        onClick={() => handleLogin('google')}
                    >
                        <Chrome size={20} />
                        Google 登入
                    </button>
                </div>

            </motion.div>

            {/* Background purely aesthetic floating elements */}
            <motion.div
                animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                style={{
                    position: 'absolute',
                    bottom: '10%',
                    left: '10%',
                    width: '60px',
                    height: '80px',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    transform: 'rotate(-15deg)',
                    zIndex: -1
                }}
            />
        </div>
    );
};
