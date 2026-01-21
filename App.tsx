
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ObjectionModule from './components/ObjectionModule';
import Simulator from './components/Simulator';
import Leaderboard from './components/Leaderboard';
import Auth from './components/Auth';
import Profile from './components/Profile';
import QuickReplyGame from './components/QuickReplyGame';
import FixErrorGame from './components/FixErrorGame';
import SellProductGame from './components/SellProductGame';
import AdminPanel from './components/AdminPanel';
import { UserProfile, UserRole } from './types';

const INITIAL_USER: UserProfile = {
  id: 'RBT-TEMP',
  name: 'Новый Сотрудник',
  position: 'Продавец-консультант',
  store: 'Челябинск',
  level: UserRole.JUNIOR,
  xp: 0,
  modulesCompleted: 0,
  avgRating: 0,
  achievements: []
};

const ROLE_MAP = {
  [UserRole.JUNIOR]: 'Стажер (Junior)',
  [UserRole.MIDDLE]: 'Специалист (Middle)',
  [UserRole.SENIOR]: 'Мастер (Senior)',
  [UserRole.EXPERT]: 'Эксперт (Expert)'
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile>(INITIAL_USER);
  const [avatar, setAvatar] = useState('Pulse');

  // Улучшенная синхронизация с реестром для GitHub Pages (LocalStorage)
  const syncToRegistry = (userData: UserProfile, avatarSeed: string) => {
    if (!userData.name || userData.name === 'ADMIN' || userData.name === 'Новый Сотрудник') return;
    
    try {
      const rawRegistry = localStorage.getItem('rbt_academy_registry');
      const registry = rawRegistry ? JSON.parse(rawRegistry) : {};
      
      const existingData = registry[userData.name] || {};
      
      registry[userData.name] = {
        ...existingData,
        name: userData.name,
        xp: userData.xp,
        level: ROLE_MAP[userData.level] || 'Стажер (Junior)',
        store: userData.store,
        avatar: avatarSeed,
        lastActive: new Date().toISOString()
      };
      localStorage.setItem('rbt_academy_registry', JSON.stringify(registry));
    } catch (e) {
      console.error("Registry sync failed", e);
    }
  };

  useEffect(() => {
    // Инициализация при загрузке (GitHub Pages friendly)
    try {
      const savedUser = localStorage.getItem('rbt_academy_user');
      const savedAvatar = localStorage.getItem('rbt_academy_avatar');
      
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed && parsed.name) {
          setUser(parsed);
          setAvatar(savedAvatar || 'Pulse');
          setIsAuthenticated(true);
          if (parsed.name === 'ADMIN') setIsAdmin(true);
        }
      }
    } catch (e) {
      console.error("Auth initialization failed", e);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user.name !== 'ADMIN') {
      localStorage.setItem('rbt_academy_user', JSON.stringify(user));
      localStorage.setItem('rbt_academy_avatar', avatar);
      syncToRegistry(user, avatar);
    }
  }, [user, isAuthenticated, avatar]);

  const handleLogin = (name: string, store: string, avatarSeed: string, pass: string) => {
    if (name.toUpperCase() === 'ADMIN') {
      if (pass === '4545') {
        const adminUser = { ...INITIAL_USER, name: 'ADMIN', store: 'Центральный офис', level: UserRole.EXPERT };
        setUser(adminUser);
        setAvatar('admin-core');
        setIsAdmin(true);
        setIsAuthenticated(true);
        setCurrentView('admin');
        localStorage.setItem('rbt_academy_user', JSON.stringify(adminUser));
        localStorage.setItem('rbt_academy_avatar', 'admin-core');
        return;
      } else {
        alert('Неверный пароль администратора!');
        return;
      }
    }

    // Попытка найти существующего пользователя в реестре
    const rawRegistry = localStorage.getItem('rbt_academy_registry');
    const registry = rawRegistry ? JSON.parse(rawRegistry) : {};
    
    let userData: UserProfile;
    if (registry[name]) {
      // Если пользователь есть — восстанавливаем прогресс
      const reg = registry[name];
      userData = { 
        ...INITIAL_USER, 
        name, 
        store: reg.store || store, 
        xp: reg.xp || 0,
        level: Object.keys(ROLE_MAP).find(key => ROLE_MAP[key as UserRole] === reg.level) as UserRole || UserRole.JUNIOR
      };
    } else {
      // Новый пользователь
      userData = { ...INITIAL_USER, name, store };
    }

    setUser(userData);
    setAvatar(avatarSeed);
    setIsAdmin(false);
    setIsAuthenticated(true);
    setCurrentView('dashboard');
  };

  const handleScoreUpdate = (xp: number) => {
    const now = new Date();
    const historyKey = 'rbt_learning_history';
    try {
      const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
      history.push({ date: now.toISOString(), xp });
      localStorage.setItem(historyKey, JSON.stringify(history.slice(-100))); // Храним последние 100 записей
    } catch (e) { console.error(e); }

    setUser(prev => {
      const newXp = Math.max(0, prev.xp + xp);
      let newLevel = prev.level;
      let newAchievements = [...prev.achievements];

      if (newXp >= 3000) newLevel = UserRole.EXPERT;
      else if (newXp >= 2000) newLevel = UserRole.SENIOR;
      else if (newXp >= 1000) newLevel = UserRole.MIDDLE;

      if (prev.modulesCompleted + 1 === 1 && !newAchievements.includes('Первый шаг')) {
        newAchievements.push('Первый шаг');
      }
      if (newXp >= 1000 && !newAchievements.includes('Марафонец')) {
        newAchievements.push('Марафонец');
      }

      return { 
        ...prev, 
        xp: newXp, 
        level: newLevel, 
        modulesCompleted: prev.modulesCompleted + 1, 
        achievements: newAchievements 
      };
    });
  };

  const handleLogout = () => {
    if (confirm("Вы уверены, что хотите выйти? Прогресс сохранен в этом браузере.")) {
      setIsAuthenticated(false);
      setIsAdmin(false);
      localStorage.removeItem('rbt_academy_user');
      localStorage.removeItem('rbt_academy_avatar');
      setUser(INITIAL_USER);
      setCurrentView('dashboard');
    }
  };

  if (!isAuthenticated) return <Auth onLogin={handleLogin} />;

  const renderContent = () => {
    if (activeGame === 'quick') return <QuickReplyGame onScore={handleScoreUpdate} onClose={() => setActiveGame(null)} />;
    if (activeGame === 'fix') return <FixErrorGame onScore={handleScoreUpdate} onClose={() => setActiveGame(null)} />;
    if (activeGame === 'sell') return <SellProductGame onScore={handleScoreUpdate} onClose={() => setActiveGame(null)} />;
    if (currentView === 'admin' && isAdmin) return <AdminPanel onClose={() => setCurrentView('dashboard')} />;

    switch (currentView) {
      case 'dashboard': return <Dashboard user={user} onShowProfile={() => setCurrentView('profile')} />;
      case 'profile': return <Profile user={user} avatar={avatar} />;
      case 'objections': return <ObjectionModule onScore={handleScoreUpdate} />;
      case 'simulator': return <Simulator onScore={handleScoreUpdate} />;
      case 'leaderboard': return <Leaderboard user={user} />;
      case 'games':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-10 animate-in fade-in">
            {[
              { id: 'quick', title: 'Быстрый ответ', icon: 'fa-bolt', desc: 'Таймер 10 сек. Выбери идеальный вариант.', color: 'bg-amber-500' },
              { id: 'fix', title: 'Исправь ошибку', icon: 'fa-spell-check', desc: 'Продавец ошибся. Исправь его!', color: 'bg-blue-500' },
              { id: 'sell', title: 'Продай товар', icon: 'fa-sack-dollar', desc: 'Сложный клиент. Доведи до оплаты.', color: 'bg-emerald-500' },
            ].map(game => (
              <div 
                key={game.id} onClick={() => setActiveGame(game.id)}
                className="glass-card p-10 rounded-[3rem] group cursor-pointer hover:scale-[1.02] transition-all relative overflow-hidden flex flex-col h-full"
              >
                <div className={`w-16 h-16 ${game.color} text-white rounded-3xl flex items-center justify-center text-2xl mb-8 shadow-xl group-hover:rotate-12 transition-transform`}>
                  <i className={`fas ${game.icon}`}></i>
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-3 italic tracking-tight">{game.title}</h3>
                <p className="text-slate-500 font-medium text-sm leading-relaxed mb-8 flex-grow">{game.desc}</p>
                <div className="flex items-center gap-2 text-slate-900 font-black text-[10px] uppercase tracking-widest group-hover:gap-4 transition-all">
                  Запустить <i className="fas fa-play text-rbt-red"></i>
                </div>
              </div>
            ))}
          </div>
        );
      default: return <Dashboard user={user} onShowProfile={() => setCurrentView('profile')} />;
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 selection:bg-rbt-red selection:text-white">
      <Sidebar currentView={currentView} onNavigate={setCurrentView} xp={user.xp} level={ROLE_MAP[user.level]} />
      <main className="flex-1 ml-72 p-8 min-h-screen relative flex items-center justify-center overflow-x-hidden">
        <div className="max-w-6xl w-full">{renderContent()}</div>
      </main>
      <div className="fixed bottom-8 right-8 z-50">
         <button onClick={handleLogout} className="w-14 h-14 bg-white shadow-xl rounded-full border border-slate-100 flex items-center justify-center text-slate-400 hover:text-rbt-red transition-all hover:scale-110 active:scale-95">
            <i className="fas fa-power-off"></i>
         </button>
      </div>
    </div>
  );
};

export default App;
