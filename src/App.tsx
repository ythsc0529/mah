import { useState } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { MainMenu } from './components/MainMenu';
import { CustomLobby } from './components/CustomLobby';
import type { RoomConfig } from './components/RoomLobby';
import { RoomLobby } from './components/RoomLobby';
import { GameBoard } from './components/GameBoard';

export type AppScreen = 'login' | 'mainMenu' | 'customLobby' | 'roomLobby' | 'game';

function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('login');
  const [roomId, setRoomId] = useState<string>('');
  const [isHost, setIsHost] = useState<boolean>(false);
  const [gameConfig, setGameConfig] = useState<RoomConfig | null>(null);

  const handleLoginSuccess = (method: string) => {
    console.log(`Logged in via ${method}`);
    setCurrentScreen('mainMenu');
  };

  const handleNavigate = (screen: 'lobby' | 'login') => {
    if (screen === 'lobby') setCurrentScreen('customLobby');
    if (screen === 'login') setCurrentScreen('login');
  };

  const handleCreateRoom = () => {
    // Generate 6 random digits
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setRoomId(code);
    setIsHost(true);
    setCurrentScreen('roomLobby');
  };

  const handleJoinRoom = (code: string) => {
    setRoomId(code);
    setIsHost(false);
    setCurrentScreen('roomLobby');
  };

  const handleStartGame = (config: RoomConfig) => {
    setGameConfig(config);
    setCurrentScreen('game');
  };

  return (
    <>
      {currentScreen === 'login' && <LoginScreen onLoginSuccess={handleLoginSuccess} />}
      {currentScreen === 'mainMenu' && <MainMenu onNavigate={handleNavigate} />}

      {currentScreen === 'customLobby' && (
        <CustomLobby
          onBack={() => setCurrentScreen('mainMenu')}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
        />
      )}

      {currentScreen === 'roomLobby' && (
        <RoomLobby
          roomId={roomId}
          isHost={isHost}
          onBack={() => setCurrentScreen('customLobby')}
          onStartGame={handleStartGame}
        />
      )}

      {currentScreen === 'game' && (
        <GameBoard config={gameConfig} onExit={() => setCurrentScreen('mainMenu')} />
      )}
    </>
  )
}

export default App
