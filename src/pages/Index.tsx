import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

const SAVE_KEY = "urban_game_save";

function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GameState;
  } catch {
    return null;
  }
}

function saveGame(state: GameState) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) { console.warn("Save error", e); }
}

type Tab = "dashboard" | "work" | "shop" | "casino" | "property";

interface GameState {
  balance: number;
  level: number;
  xp: number;
  xpMax: number;
  energy: number;
  energyMax: number;
  inventory: string[];
  properties: string[];
}

const LEVEL_TITLES: Record<number, string> = {
  1: "Новичок",
  2: "Стажёр",
  3: "Работяга",
  4: "Специалист",
  5: "Профи",
  6: "Эксперт",
  7: "Мастер",
  8: "Элита",
  9: "Магнат",
  10: "Легенда",
};

function xpForLevel(level: number) {
  return Math.floor(300 * Math.pow(1.6, level - 1));
}

const JOBS = [
  { id: "courier", name: "Курьер", reward: 50, energyCost: 10, time: "2 мин", icon: "Bike", color: "#4ADE80", minLevel: 1 },
  { id: "driver", name: "Таксист", reward: 120, energyCost: 20, time: "5 мин", icon: "Car", color: "#60A5FA", minLevel: 2 },
  { id: "programmer", name: "Фрилансер", reward: 300, energyCost: 35, time: "12 мин", icon: "Code", color: "#A78BFA", minLevel: 3 },
  { id: "trader", name: "Трейдер", reward: 600, energyCost: 50, time: "25 мин", icon: "TrendingUp", color: "#F59E0B", minLevel: 5 },
  { id: "investor", name: "Инвестор", reward: 1500, energyCost: 70, time: "1 час", icon: "BarChart2", color: "#F472B6", minLevel: 7 },
  { id: "tycoon", name: "Магнат", reward: 4000, energyCost: 90, time: "3 часа", icon: "Crown", color: "#FB923C", minLevel: 9 },
];

const SHOP_ITEMS = [
  { id: "coffee", name: "Кофе", desc: "+20 энергии", price: 30, icon: "Coffee", tag: "расходник" },
  { id: "laptop", name: "Ноутбук", desc: "+15% к доходу от фриланса", price: 1200, icon: "Laptop", tag: "апгрейд" },
  { id: "car_upg", name: "Тюнинг авто", desc: "+20% к доходу таксиста", price: 2500, icon: "Wrench", tag: "апгрейд" },
  { id: "vip", name: "VIP карта", desc: "+5% казино бонус", price: 5000, icon: "Star", tag: "премиум" },
  { id: "energy_drink", name: "Энергетик", desc: "+50 энергии", price: 80, icon: "Zap", tag: "расходник" },
  { id: "briefcase", name: "Портфель", desc: "+10% ко всем доходам", price: 3500, icon: "Briefcase", tag: "апгрейд" },
];

const PROPERTIES = [
  { id: "room", name: "Комната", desc: "+30₽/мин пассивно", price: 5000, icon: "Home", incomePerMin: 30 },
  { id: "flat", name: "Квартира", desc: "+100₽/мин пассивно", price: 18000, icon: "Building", incomePerMin: 100 },
  { id: "office", name: "Офис", desc: "+350₽/мин пассивно", price: 55000, icon: "Building2", incomePerMin: 350 },
];

const DEFAULT_GAME: GameState = {
  balance: 500,
  level: 1,
  xp: 0,
  xpMax: 300,
  energy: 80,
  energyMax: 100,
  inventory: [],
  properties: [],
};

export default function Index() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [game, setGame] = useState<GameState>(() => loadGame() ?? DEFAULT_GAME);

  useEffect(() => {
    saveGame(game);
  }, [game]);

  const [passiveMsg, setPassiveMsg] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setGame(g => {
        if (g.properties.length === 0) return g;
        const totalIncome = g.properties.reduce((sum, propId) => {
          const prop = PROPERTIES.find(p => p.id === propId);
          return sum + (prop?.incomePerMin ?? 0);
        }, 0);
        if (totalIncome === 0) return g;
        setPassiveMsg(`+${totalIncome}₽ пассивный доход`);
        setTimeout(() => setPassiveMsg(null), 2500);
        return { ...g, balance: g.balance + totalIncome };
      });
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const [workingJob, setWorkingJob] = useState<string | null>(null);
  const [casinoResult, setCasinoResult] = useState<string | null>(null);
  const [casinoBet, setCasinoBet] = useState(50);
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [slotResults, setSlotResults] = useState<string[]>([]);
  const [shopMsg, setShopMsg] = useState<string | null>(null);
  const [levelUpMsg, setLevelUpMsg] = useState<string | null>(null);

  const tryLevelUp = (g: GameState): GameState => {
    let updated = { ...g };
    while (updated.xp >= updated.xpMax) {
      const newLevel = updated.level + 1;
      const overflow = updated.xp - updated.xpMax;
      const newXpMax = xpForLevel(newLevel);
      const newEnergyMax = updated.energyMax + 10;
      updated = {
        ...updated,
        level: newLevel,
        xp: overflow,
        xpMax: newXpMax,
        energyMax: newEnergyMax,
        energy: Math.min(updated.energy + 30, newEnergyMax),
      };
      setLevelUpMsg(`Уровень ${newLevel} — ${LEVEL_TITLES[newLevel] ?? "Легенда"}! +10 макс. энергии`);
      setTimeout(() => setLevelUpMsg(null), 3500);
    }
    return updated;
  };

  const doWork = (job: typeof JOBS[0]) => {
    if (game.energy < job.energyCost || game.level < job.minLevel) return;
    setWorkingJob(job.id);
    setTimeout(() => {
      setGame(g => {
        const gained = job.reward;
        const gainedXp = Math.floor(gained / 8);
        const next = { ...g, balance: g.balance + gained, energy: Math.max(0, g.energy - job.energyCost), xp: g.xp + gainedXp };
        return tryLevelUp(next);
      });
      setWorkingJob(null);
    }, 1500);
  };

  const buyItem = (item: typeof SHOP_ITEMS[0]) => {
    if (game.balance < item.price) {
      setShopMsg("Недостаточно средств");
      setTimeout(() => setShopMsg(null), 2000);
      return;
    }
    if (item.id === "coffee") {
      setGame(g => ({ ...g, balance: g.balance - item.price, energy: Math.min(g.energyMax, g.energy + 20) }));
    } else if (item.id === "energy_drink") {
      setGame(g => ({ ...g, balance: g.balance - item.price, energy: Math.min(g.energyMax, g.energy + 50) }));
    } else {
      setGame(g => ({ ...g, balance: g.balance - item.price, inventory: [...g.inventory, item.id] }));
    }
    setShopMsg(`${item.name} куплен!`);
    setTimeout(() => setShopMsg(null), 2000);
  };

  const buyProperty = (prop: typeof PROPERTIES[0]) => {
    if (game.balance < prop.price || game.properties.includes(prop.id)) return;
    setGame(g => ({ ...g, balance: g.balance - prop.price, properties: [...g.properties, prop.id] }));
  };

  const playDice = () => {
    if (game.balance < casinoBet) { setCasinoResult("Недостаточно средств"); return; }
    const roll = Math.floor(Math.random() * 6) + 1;
    const win = roll >= 4;
    setDiceValue(roll);
    const delta = win ? casinoBet * 2 : -casinoBet;
    setGame(g => ({ ...g, balance: g.balance + delta }));
    setCasinoResult(win ? `+${casinoBet * 2}₽ — Победа! (${roll})` : `-${casinoBet}₽ — Поражение (${roll})`);
    setTimeout(() => setCasinoResult(null), 3000);
  };

  const SLOT_ICONS = ["🍒", "🍋", "🔔", "⭐", "💎", "7️⃣"];
  const playSlots = () => {
    if (game.balance < casinoBet) { setCasinoResult("Недостаточно средств"); return; }
    const results = [0, 1, 2].map(() => SLOT_ICONS[Math.floor(Math.random() * SLOT_ICONS.length)]);
    setSlotResults(results);
    const win = results[0] === results[1] && results[1] === results[2];
    const bigWin = win && results[0] === "💎";
    const mult = bigWin ? 10 : win ? 5 : 0;
    const delta = mult > 0 ? casinoBet * mult : -casinoBet;
    setGame(g => ({ ...g, balance: g.balance + delta }));
    setCasinoResult(mult > 0 ? `+${casinoBet * mult}₽ — ${bigWin ? "ДЖЕКПОТ!" : "Победа!"}` : `-${casinoBet}₽ — Не повезло`);
    setTimeout(() => setCasinoResult(null), 3000);
  };

  const playCoinflip = (choice: "heads" | "tails") => {
    if (game.balance < casinoBet) { setCasinoResult("Недостаточно средств"); return; }
    const result = Math.random() > 0.5 ? "heads" : "tails";
    const win = result === choice;
    const delta = win ? casinoBet : -casinoBet;
    setGame(g => ({ ...g, balance: g.balance + delta }));
    setCasinoResult(win ? `+${casinoBet}₽ — Угадал!` : `-${casinoBet}₽ — Не угадал`);
    setTimeout(() => setCasinoResult(null), 3000);
  };

  const navItems: { id: Tab; label: string; icon: string }[] = [
    { id: "dashboard", label: "Главная", icon: "LayoutDashboard" },
    { id: "work", label: "Работа", icon: "Briefcase" },
    { id: "property", label: "Имущество", icon: "Building2" },
    { id: "shop", label: "Магазин", icon: "ShoppingBag" },
    { id: "casino", label: "Казино", icon: "Dice5" },
  ];

  return (
    <div className="min-h-screen bg-[var(--c-bg)] text-[var(--c-text)] font-rubik flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-[var(--c-surface)] border-b border-[var(--c-border)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-black tracking-tight text-[var(--c-accent)]">URBAN</span>
          <span className="text-[10px] bg-[var(--c-accent)]/15 text-[var(--c-accent)] px-2 py-0.5 rounded-full font-semibold">LVL {game.level}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[var(--c-surface2)] px-2.5 py-1.5 rounded-full">
            <span className="text-yellow-400 text-xs">⚡</span>
            <span className="text-xs font-medium text-[var(--c-muted)]">{game.energy}/{game.energyMax}</span>
          </div>
          <div className="flex items-center gap-1 bg-[var(--c-accent)]/10 px-2.5 py-1.5 rounded-full border border-[var(--c-accent)]/20">
            <span className="text-green-400 text-xs font-bold">₽</span>
            <span className="text-sm font-black text-[var(--c-accent)]">{game.balance.toLocaleString()}</span>
          </div>
        </div>
      </header>

      {levelUpMsg && tab !== "dashboard" && (
        <div className="fixed top-16 left-4 right-4 z-50 bg-[var(--c-accent)] text-black text-sm font-black rounded-xl px-4 py-3 text-center animate-fade-in shadow-lg">
          🎉 {levelUpMsg}
        </div>
      )}
      {passiveMsg && (
        <div className="fixed top-16 left-4 right-4 z-50 bg-green-500/90 text-white text-sm font-black rounded-xl px-4 py-3 text-center animate-fade-in shadow-lg flex items-center justify-center gap-2">
          <Icon name="Building2" size={14} />
          {passiveMsg}
        </div>
      )}

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        {tab === "dashboard" && (
          <div className="p-4 space-y-4 animate-fade-in">
            {levelUpMsg && (
              <div className="bg-[var(--c-accent)] text-black text-sm font-black rounded-xl px-4 py-3 text-center animate-fade-in shadow-lg">
                🎉 {levelUpMsg}
              </div>
            )}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--c-accent)] to-[var(--c-accent2)] p-6 text-black">
              <div className="absolute top-0 right-0 w-36 h-36 bg-black/5 rounded-full -translate-y-10 translate-x-10" />
              <div className="absolute bottom-0 left-0 w-28 h-28 bg-black/5 rounded-full translate-y-10 -translate-x-10" />
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm opacity-60 font-medium">Баланс</p>
                <span className="text-xs font-black opacity-70 bg-black/10 px-2 py-0.5 rounded-full">{LEVEL_TITLES[game.level] ?? "Легенда"}</span>
              </div>
              <p className="text-4xl font-black tracking-tight">{game.balance.toLocaleString()}<span className="text-2xl ml-1">₽</span></p>
              <div className="mt-4 flex items-center gap-2">
                <div className="flex-1 bg-black/15 rounded-full h-1.5">
                  <div className="bg-black/70 rounded-full h-1.5 transition-all duration-500" style={{ width: `${(game.xp / game.xpMax) * 100}%` }} />
                </div>
                <span className="text-xs opacity-60 font-medium">{game.xp}/{game.xpMax} XP</span>
              </div>
            </div>

            {(() => {
              const totalPassive = game.properties.reduce((sum, pid) => {
                const p = PROPERTIES.find(x => x.id === pid);
                return sum + (p?.incomePerMin ?? 0);
              }, 0);
              return (
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Уровень" value={`${game.level}`} sub="опыт накапливается" icon="Trophy" color="#F59E0B" />
                  <StatCard label="Энергия" value={`${game.energy}`} sub={`из ${game.energyMax}`} icon="Zap" color="#4ADE80" />
                  <StatCard label="Имущество" value={`${game.properties.length}`} sub={totalPassive > 0 ? `+${totalPassive}₽/мин` : "нет объектов"} icon="Building2" color="#60A5FA" />
                  <StatCard label="Инвентарь" value={`${game.inventory.length}`} sub="предметов" icon="Package" color="#A78BFA" />
                </div>
              );
            })()}

            <div className="space-y-2">
              <p className="text-[11px] font-bold text-[var(--c-muted)] uppercase tracking-widest">Быстрые действия</p>
              <div className="grid grid-cols-2 gap-2">
                <QuickBtn label="Работать" icon="Briefcase" onClick={() => setTab("work")} />
                <QuickBtn label="Магазин" icon="ShoppingBag" onClick={() => setTab("shop")} />
                <QuickBtn label="Казино" icon="Dice5" onClick={() => setTab("casino")} />
                <QuickBtn label="Имущество" icon="Building2" onClick={() => setTab("property")} />
              </div>
            </div>

            <button
              onClick={() => { if (confirm("Сбросить весь прогресс?")) { localStorage.removeItem(SAVE_KEY); setGame(DEFAULT_GAME); } }}
              className="w-full py-2 rounded-xl text-[11px] font-semibold text-[var(--c-muted)] border border-[var(--c-border)] hover:border-red-500/30 hover:text-red-400 transition-all"
            >
              Сбросить прогресс
            </button>
          </div>
        )}

        {tab === "work" && (
          <div className="p-4 space-y-3 animate-fade-in">
            <SectionHeader title="Работа" sub={`⚡ Энергия: ${game.energy}/${game.energyMax}`} />
            {JOBS.map(job => {
              const locked = game.level < job.minLevel;
              return (
                <button
                  key={job.id}
                  onClick={() => doWork(job)}
                  disabled={workingJob === job.id || game.energy < job.energyCost || locked}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all active:scale-[0.98] disabled:cursor-not-allowed ${locked ? "bg-[var(--c-surface2)] border-[var(--c-border)] opacity-50" : "bg-[var(--c-surface)] border-[var(--c-border)] hover:border-[var(--c-accent)]/40 disabled:opacity-40"}`}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: locked ? "#ffffff08" : job.color + "18" }}>
                    {locked ? <Icon name="Lock" size={18} className="text-[var(--c-muted)]" /> : <Icon name={job.icon} size={22} style={{ color: job.color }} />}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm">{job.name}</p>
                      {locked && <span className="text-[10px] bg-[var(--c-surface2)] text-[var(--c-muted)] px-1.5 py-0.5 rounded font-semibold">LVL {job.minLevel}</span>}
                    </div>
                    <p className="text-xs text-[var(--c-muted)] mt-0.5">
                      {locked ? `Откроется на ${job.minLevel} уровне` : `⚡ ${job.energyCost} · ⏱ ${job.time}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {workingJob === job.id ? (
                      <span className="text-xs text-[var(--c-accent)] animate-pulse font-medium">Работаю...</span>
                    ) : (
                      <span className={`text-base font-black ${locked ? "text-[var(--c-muted)]" : "text-green-400"}`}>+{job.reward}₽</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {tab === "shop" && (
          <div className="p-4 space-y-3 animate-fade-in">
            <SectionHeader title="Магазин" sub="Предметы и улучшения" />
            {shopMsg && (
              <div className={`text-sm rounded-xl px-4 py-2.5 text-center font-medium border ${shopMsg.includes("Недостаточно") ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-[var(--c-accent)]/10 border-[var(--c-accent)]/30 text-[var(--c-accent)]"}`}>
                {shopMsg}
              </div>
            )}
            {SHOP_ITEMS.map(item => {
              const owned = game.inventory.includes(item.id);
              const canBuy = game.balance >= item.price && !owned;
              return (
                <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)]">
                  <div className="w-12 h-12 rounded-xl bg-[var(--c-surface2)] flex items-center justify-center shrink-0">
                    <Icon name={item.icon} size={22} className="text-[var(--c-accent)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm">{item.name}</p>
                      <span className="text-[10px] bg-[var(--c-surface2)] text-[var(--c-muted)] px-1.5 py-0.5 rounded font-medium">{item.tag}</span>
                    </div>
                    <p className="text-xs text-[var(--c-muted)] mt-0.5">{item.desc}</p>
                  </div>
                  <button
                    onClick={() => buyItem(item)}
                    disabled={!canBuy}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${owned ? "bg-green-500/15 text-green-400 border border-green-500/30" : "bg-[var(--c-accent)] text-black hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"}`}
                  >
                    {owned ? "✓" : `${item.price}₽`}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {tab === "property" && (
          <div className="p-4 space-y-3 animate-fade-in">
            <SectionHeader title="Недвижимость" sub="Пассивный доход" />
            {game.properties.length > 0 && (() => {
              const totalIncome = game.properties.reduce((sum, pid) => {
                const p = PROPERTIES.find(x => x.id === pid);
                return sum + (p?.incomePerMin ?? 0);
              }, 0);
              return (
                <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
                  <Icon name="TrendingUp" size={16} className="text-green-400 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-green-400">Активный доход</p>
                    <p className="text-sm font-black text-green-300">+{totalIncome}₽ каждую минуту</p>
                  </div>
                </div>
              );
            })()}
            {PROPERTIES.map(prop => {
              const owned = game.properties.includes(prop.id);
              return (
                <div key={prop.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${owned ? "bg-[var(--c-accent)]/5 border-[var(--c-accent)]/25" : "bg-[var(--c-surface)] border-[var(--c-border)]"}`}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${owned ? "bg-[var(--c-accent)]/15" : "bg-[var(--c-surface2)]"}`}>
                    <Icon name={prop.icon} size={22} className={owned ? "text-[var(--c-accent)]" : "text-[var(--c-muted)]"} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm">{prop.name}</p>
                    <p className="text-xs text-[var(--c-muted)] mt-0.5">{prop.desc}</p>
                  </div>
                  <button
                    onClick={() => buyProperty(prop)}
                    disabled={owned || game.balance < prop.price}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${owned ? "bg-green-500/15 text-green-400 border border-green-500/30" : "bg-[var(--c-accent)] text-black hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"}`}
                  >
                    {owned ? "✓ Куплено" : `${prop.price.toLocaleString()}₽`}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {tab === "casino" && (
          <div className="p-4 space-y-4 animate-fade-in">
            <SectionHeader title="Казино" sub="Рискуй и выигрывай" />

            <div className="bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl p-4">
              <p className="text-[11px] font-bold text-[var(--c-muted)] uppercase tracking-widest mb-3">Ставка</p>
              <div className="flex gap-2 flex-wrap">
                {[25, 50, 100, 250, 500].map(v => (
                  <button
                    key={v}
                    onClick={() => setCasinoBet(v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${casinoBet === v ? "bg-[var(--c-accent)] text-black" : "bg-[var(--c-surface2)] text-[var(--c-muted)] hover:text-[var(--c-text)]"}`}
                  >
                    {v}₽
                  </button>
                ))}
              </div>
            </div>

            {casinoResult && (
              <div className={`text-center py-3 rounded-xl text-sm font-black border transition-all ${casinoResult.includes("+") ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-red-500/10 border-red-500/30 text-red-400"}`}>
                {casinoResult}
              </div>
            )}

            <div className="bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm">🎲 Кубик</p>
                  <p className="text-xs text-[var(--c-muted)]">Выпадет 4–6 — победа × 2</p>
                </div>
                {diceValue && (
                  <div className="w-10 h-10 rounded-xl bg-[var(--c-surface2)] flex items-center justify-center text-2xl">
                    {["⚀","⚁","⚂","⚃","⚄","⚅"][diceValue - 1]}
                  </div>
                )}
              </div>
              <button onClick={playDice} className="w-full py-2.5 rounded-xl bg-[var(--c-accent)] text-black text-sm font-black hover:opacity-90 transition-opacity active:scale-[0.98]">
                Бросить · {casinoBet}₽
              </button>
            </div>

            <div className="bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl p-4 space-y-3">
              <div>
                <p className="font-bold text-sm">🎰 Слоты</p>
                <p className="text-xs text-[var(--c-muted)]">3 одинаковых × 5 · 💎💎💎 — джекпот × 10</p>
              </div>
              {slotResults.length === 3 && (
                <div className="flex gap-2 justify-center py-1">
                  {slotResults.map((s, i) => (
                    <div key={i} className="w-14 h-14 rounded-xl bg-[var(--c-surface2)] border border-[var(--c-border)] flex items-center justify-center text-2xl">{s}</div>
                  ))}
                </div>
              )}
              <button onClick={playSlots} className="w-full py-2.5 rounded-xl bg-[var(--c-accent)] text-black text-sm font-black hover:opacity-90 transition-opacity active:scale-[0.98]">
                Крутить · {casinoBet}₽
              </button>
            </div>

            <div className="bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl p-4 space-y-3">
              <div>
                <p className="font-bold text-sm">🪙 Монетка</p>
                <p className="text-xs text-[var(--c-muted)]">Угадай сторону — победа × 2</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => playCoinflip("heads")} className="py-2.5 rounded-xl bg-[var(--c-surface2)] text-sm font-bold hover:bg-[var(--c-accent)]/15 transition-colors border border-[var(--c-border)] hover:border-[var(--c-accent)]/40">
                  Орёл
                </button>
                <button onClick={() => playCoinflip("tails")} className="py-2.5 rounded-xl bg-[var(--c-surface2)] text-sm font-bold hover:bg-[var(--c-accent)]/15 transition-colors border border-[var(--c-border)] hover:border-[var(--c-accent)]/40">
                  Решка
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[var(--c-surface)] border-t border-[var(--c-border)] flex items-center px-1 z-50">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`relative flex-1 flex flex-col items-center gap-0.5 py-3 transition-all ${tab === item.id ? "text-[var(--c-accent)]" : "text-[var(--c-muted)] hover:text-[var(--c-text)]"}`}
          >
            <Icon name={item.icon} size={20} />
            <span className="text-[9px] font-semibold tracking-wide">{item.label}</span>
            {tab === item.id && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-[var(--c-accent)]" />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}

function StatCard({ label, value, sub, icon, color }: { label: string; value: string; sub: string; icon: string; color: string }) {
  return (
    <div className="bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-[var(--c-muted)] font-semibold uppercase tracking-wide">{label}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + "18" }}>
          <Icon name={icon} size={14} style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-[10px] text-[var(--c-muted)] mt-0.5">{sub}</p>
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-1">
      <h2 className="text-2xl font-black tracking-tight">{title}</h2>
      {sub && <p className="text-xs text-[var(--c-muted)] mt-0.5">{sub}</p>}
    </div>
  );
}

function QuickBtn({ label, icon, onClick }: { label: string; icon: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--c-surface)] border border-[var(--c-border)] hover:border-[var(--c-accent)]/40 transition-all active:scale-[0.98]">
      <div className="w-8 h-8 rounded-lg bg-[var(--c-accent)]/10 flex items-center justify-center shrink-0">
        <Icon name={icon} size={16} className="text-[var(--c-accent)]" />
      </div>
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );
}