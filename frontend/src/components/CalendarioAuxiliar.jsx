import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  MapPin,
  MessageSquareText,
  RotateCcw,
  UserRound,
  X,
} from "lucide-react";
import api from "../api";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const WEEKDAYS = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

const STATUS = {
  M: {
    label: "Turno Dia",
    icon: "☀️",
    className: "bg-yellow-100 text-yellow-900 border-yellow-300 ring-yellow-200",
    dot: "bg-yellow-400",
    group: "trabajados",
  },
  N: {
    label: "Turno Noche",
    icon: "🌙",
    className: "bg-blue-950 text-white border-blue-800 ring-blue-200",
    dot: "bg-blue-950",
    group: "noche",
  },
  T: {
    label: "Turno Tarde",
    icon: "🌤️",
    className: "bg-orange-100 text-orange-900 border-orange-300 ring-orange-200",
    dot: "bg-orange-400",
    group: "tarde",
  },
  V: {
    label: "Vacaciones",
    icon: "🏖️",
    className: "bg-teal-100 text-teal-900 border-teal-300 ring-teal-200",
    dot: "bg-teal-400",
    group: "vacaciones",
  },
  F: {
    label: "Falta Injustificada",
    icon: "❌",
    className: "bg-red-600 text-white border-red-700 ring-red-200",
    dot: "bg-red-600",
    group: "faltas",
  },
  FJ: {
    label: "Falta Justificada",
    icon: "✅",
    className: "bg-green-100 text-green-900 border-green-300 ring-green-200",
    dot: "bg-green-500",
    group: "faltasJustificadas",
  },
  P: {
    label: "Permiso Medico",
    icon: "🩺",
    className: "bg-emerald-100 text-emerald-900 border-emerald-300 ring-emerald-200",
    dot: "bg-emerald-400",
    group: "permisos",
  },
  FE: {
    label: "Feriado No Trabajado",
    icon: "🎉",
    className: "bg-amber-100 text-amber-950 border-amber-300 ring-amber-200",
    dot: "bg-amber-400",
    group: "feriados",
  },
  FT: {
    label: "Feriado Trabajado",
    icon: "🛠️",
    className: "bg-red-900 text-white border-red-950 ring-red-200",
    dot: "bg-red-900",
    group: "feriados",
  },
  D: {
    label: "Descanso semanal",
    icon: "😴",
    className: "bg-slate-100 text-slate-700 border-slate-300 ring-slate-200",
    dot: "bg-slate-400",
    group: "descansos",
  },
  DT: {
    label: "Descanso semanal trabajado",
    icon: "🛠️",
    className: "bg-indigo-900 text-white border-indigo-950 ring-indigo-200",
    dot: "bg-indigo-900",
    group: "descansos",
  },
  BAP: {
    label: "Beneficio Asuntos Personales",
    icon: "🧾",
    className: "bg-purple-100 text-purple-900 border-purple-300 ring-purple-200",
    dot: "bg-purple-500",
    group: "permisos",
  },
  BCM: {
    label: "Chequeo Medico",
    icon: "🏥",
    className: "bg-cyan-100 text-cyan-900 border-cyan-300 ring-cyan-200",
    dot: "bg-cyan-400",
    group: "permisos",
  },
  BM: {
    label: "Beneficio Matrimonio",
    icon: "💍",
    className: "bg-pink-100 text-pink-900 border-pink-300 ring-pink-200",
    dot: "bg-pink-400",
    group: "permisos",
  },
  LSG: {
    label: "Licencia Sin Goce",
    icon: "📄",
    className: "bg-zinc-700 text-white border-zinc-800 ring-zinc-200",
    dot: "bg-zinc-700",
    group: "licencias",
  },
  RE: {
    label: "Renuncia / Retirado",
    icon: "🚪",
    className: "bg-zinc-950 text-white border-black ring-zinc-300",
    dot: "bg-zinc-950",
    group: "retiros",
  },
};

const DEFAULT_STATUS = {
  label: "Sin registro",
  icon: "•",
  className: "bg-slate-50 text-slate-400 border-slate-200 ring-slate-100",
  dot: "bg-slate-300",
  group: "sinRegistro",
};

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase();
}

const WORKED_SHIFT_CODES = new Set(["M", "T", "N"]);

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const PERU_NATIONAL_HOLIDAYS = {
  "01-01": "Año Nuevo",
  "05-01": "Día del Trabajo",
  "06-07": "Batalla de Arica y Día de la Bandera",
  "06-29": "Día de San Pedro y San Pablo",
  "07-23": "Día de la Fuerza Aérea del Perú",
  "07-28": "Fiestas Patrias",
  "07-29": "Fiestas Patrias",
  "08-06": "Batalla de Junín",
  "08-30": "Santa Rosa de Lima",
  "10-08": "Combate de Angamos",
  "11-01": "Día de Todos los Santos",
  "12-08": "Inmaculada Concepción",
  "12-09": "Batalla de Ayacucho",
  "12-25": "Navidad",
};

function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function peruHolidayName(date) {
  const monthDay = `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  if (PERU_NATIONAL_HOLIDAYS[monthDay]) return PERU_NATIONAL_HOLIDAYS[monthDay];

  const easter = easterSunday(date.getFullYear());
  const holyThursday = new Date(easter);
  holyThursday.setDate(easter.getDate() - 3);
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);

  if (formatDate(date) === formatDate(holyThursday)) return "Jueves Santo";
  if (formatDate(date) === formatDate(goodFriday)) return "Viernes Santo";
  return null;
}

function parseApiDate(value) {
  if (!value) return null;
  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function monthBounds(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start, end };
}

function isSameDay(a, b) {
  return a && b && formatDate(a) === formatDate(b);
}

export default function CalendarioAuxiliar() {
  const user = api.getUser();
  const role = user?.rol?.toLowerCase();
  const canSelectWorker = ["gdh", "supervisor", "lider", "coordinador"].includes(role);

  const [cursor, setCursor] = useState(() => new Date());
  const [registros, setRegistros] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [selectedDni, setSelectedDni] = useState(user?.dni || "");
  const [selectedDay, setSelectedDay] = useState(null);
  const [loading, setLoading] = useState(false);
  const [workerLoading, setWorkerLoading] = useState(false);
  const [showFullLegend, setShowFullLegend] = useState(false);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const today = new Date();
  const todayKey = formatDate(today);
  const { start, end } = monthBounds(cursor);
  const startKey = formatDate(start);
  const endKey = formatDate(end);

  useEffect(() => {
    if (!canSelectWorker) return;
    let mounted = true;

    async function loadWorkers() {
      setWorkerLoading(true);
      try {
        const data = await api.getColaboradores(undefined, "activo");
        if (!mounted) return;
        setColaboradores(data || []);
        if (!selectedDni && data?.[0]?.dni) setSelectedDni(data[0].dni);
      } catch {
        if (mounted) setColaboradores([]);
      } finally {
        if (mounted) setWorkerLoading(false);
      }
    }

    loadWorkers();
    return () => {
      mounted = false;
    };
  }, [canSelectWorker, selectedDni]);

  useEffect(() => {
    let mounted = true;

    async function loadCalendar() {
      setLoading(true);
      try {
        const dni = canSelectWorker ? selectedDni : undefined;
        const data = await api.getTareo(dni, startKey, endKey, 1000);
        if (!mounted) return;
        setRegistros(Array.isArray(data) ? data : []);
      } catch {
        if (mounted) setRegistros([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (!canSelectWorker || selectedDni) loadCalendar();
    return () => {
      mounted = false;
    };
  }, [canSelectWorker, selectedDni, startKey, endKey]);

  const selectedWorker = useMemo(() => {
    if (!canSelectWorker) return user;
    return colaboradores.find((item) => item.dni === selectedDni) || null;
  }, [canSelectWorker, colaboradores, selectedDni, user]);

  const recordsByDate = useMemo(() => {
    const map = new Map();
    registros.forEach((record) => {
      const parsed = parseApiDate(record.fecha);
      if (!parsed) return;
      map.set(formatDate(parsed), record);
    });
    return map;
  }, [registros]);

  const calendarDays = useMemo(() => {
    const first = new Date(year, month, 1);
    const firstWeekday = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];

    for (let i = 0; i < firstWeekday; i += 1) {
      cells.push({ key: `empty-${i}`, empty: true });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      const key = formatDate(date);
      const record = recordsByDate.get(key);
      const holidayName = peruHolidayName(date);
      const isWeeklyRest = date.getDay() === 0;
      const missingAttendance = !record && key < todayKey && !holidayName && !isWeeklyRest;
      const recordedCode = record ? normalizeCode(record.asistencia) : "";
      const weeklyRestCode = isWeeklyRest ? (WORKED_SHIFT_CODES.has(recordedCode) ? "DT" : "D") : "";
      const holidayCode = holidayName ? (WORKED_SHIFT_CODES.has(recordedCode) ? "FT" : "FE") : "";
      const inferredCode = missingAttendance ? "F" : "";
      const code = weeklyRestCode || holidayCode || recordedCode || inferredCode;
      const status = STATUS[code] || (record ? { ...DEFAULT_STATUS, label: code || "Registro" } : DEFAULT_STATUS);
      cells.push({
        key, day, date, record, code, status, holidayName, isWeeklyRest, missingAttendance, empty: false,
      });
    }

    while (cells.length % 7 !== 0) {
      cells.push({ key: `tail-${cells.length}`, empty: true });
    }

    return cells;
  }, [month, recordsByDate, todayKey, year]);

  const stats = useMemo(() => {
    const base = {
      faltas: 0,
      trabajados: 0,
      vacaciones: 0,
      permisos: 0,
      noche: 0,
      tarde: 0,
      dia: 0,
    };

    calendarDays.forEach((day) => {
      if (day.empty) return;
      const code = day.code;
      const status = STATUS[code];
      if (!status) return;
      if (["M", "N", "T", "FT", "DT"].includes(code)) base.trabajados += 1;
      if (code === "M") base.dia += 1;
      if (code === "N") base.noche += 1;
      if (code === "T") base.tarde += 1;
      if (code === "F") base.faltas += 1;
      if (code === "V") base.vacaciones += 1;
      if (["P", "BAP", "BCM", "BM", "LSG", "FJ"].includes(code)) base.permisos += 1;
    });

    return base;
  }, [calendarDays]);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 9 }, (_, index) => currentYear - 4 + index);
  }, []);

  const usedStatuses = useMemo(() => {
    const used = new Set(calendarDays.map((day) => day.code).filter(Boolean));
    const ordered = Object.entries(STATUS).filter(([code]) => used.has(code));
    return ordered.length ? ordered : Object.entries(STATUS);
  }, [calendarDays]);

  const goToday = () => {
    const current = new Date();
    setCursor(new Date(current.getFullYear(), current.getMonth(), 1));
    document.querySelector("[data-calendar-grid]")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 animate-fade-in">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
        <div className="h-2 bg-gradient-to-r from-[#e30613] via-[#e30613] to-[#06264a]" />
        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(220px,0.72fr)_minmax(520px,1.28fr)] lg:items-center">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-black text-[#e30613]">
              <CalendarDays size={14} />
              Calendario inteligente
            </div>
            <h1 className="text-2xl font-black tracking-tight text-[#06264a] sm:text-[2rem] lg:text-3xl">
              Asistencia mensual
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold leading-5 text-slate-500 sm:text-sm">
              <MapPin size={14} className="text-[#e30613]" />
              <span>Onsite Oslo, Punta Negra</span>
              {selectedWorker?.nombre && (
                <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 sm:max-w-[260px]">
                  <UserRound size={13} />
                  <span className="truncate">{selectedWorker.nombre}</span>
                </span>
              )}
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
            {canSelectWorker && (
              <label className="relative">
                <Filter size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  className="h-11 w-full min-w-0 truncate rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-sm font-bold text-[#06264a] outline-none transition focus:border-[#e30613] focus:ring-4 focus:ring-red-100"
                  value={selectedDni}
                  onChange={(event) => setSelectedDni(event.target.value)}
                  disabled={workerLoading}
                >
                  {workerLoading && <option>Cargando personal...</option>}
                  {!workerLoading && colaboradores.map((person) => (
                    <option key={person.dni} value={person.dni}>
                      {person.nombre}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="flex min-w-[270px] items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setCursor(new Date(year, month - 1, 1))}
                className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-white hover:text-[#e30613] hover:shadow-sm"
                aria-label="Mes anterior"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="flex min-w-[178px] items-center justify-center gap-1 px-1">
                <select
                  aria-label="Cambiar mes"
                  className="h-8 max-w-[92px] rounded-lg border border-transparent bg-transparent px-1 text-center text-sm font-black text-[#06264a] outline-none transition hover:bg-white focus:border-[#e30613]"
                  value={month}
                  onChange={(event) => setCursor(new Date(year, Number(event.target.value), 1))}
                >
                  {MONTHS.map((item, index) => (
                    <option key={item} value={index}>{item}</option>
                  ))}
                </select>
                <select
                  aria-label="Cambiar año"
                  className="h-8 max-w-[72px] rounded-lg border border-transparent bg-transparent px-1 text-center text-sm font-black text-[#06264a] outline-none transition hover:bg-white focus:border-[#e30613]"
                  value={year}
                  onChange={(event) => setCursor(new Date(Number(event.target.value), month, 1))}
                >
                  {yearOptions.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => setCursor(new Date(year, month + 1, 1))}
                className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-white hover:text-[#e30613] hover:shadow-sm"
                aria-label="Mes siguiente"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <button
              type="button"
              onClick={goToday}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#06264a] px-4 text-sm font-black text-white shadow-lg shadow-[#06264a]/15 transition hover:-translate-y-0.5 hover:bg-[#001b3f]"
            >
              <RotateCcw size={16} />
              Hoy
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <StatCard label="Trabajados" value={stats.trabajados} tone="navy" />
        <StatCard label="Faltas" value={stats.faltas} tone="red" />
        <StatCard label="Vacaciones" value={stats.vacaciones} tone="teal" />
        <StatCard label="Permisos" value={stats.permisos} tone="green" />
        <StatCard label="Noche" value={stats.noche} tone="blue" />
        <StatCard label="Tarde / Dia" value={`${stats.tarde}/${stats.dia}`} tone="yellow" />
      </section>

      <section className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-900/5 sm:p-4">
          <div className="mb-3 grid grid-cols-7 gap-1.5">
            {WEEKDAYS.map((weekday) => (
              <div key={weekday} className="rounded-lg bg-slate-50 py-2 text-center text-[11px] font-black uppercase tracking-wider text-slate-500">
                {weekday}
              </div>
            ))}
          </div>

          <motion.div
            key={`${year}-${month}-${selectedDni}`}
            data-calendar-grid
            className="grid grid-cols-7 gap-1.5 sm:gap-2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
          >
            {calendarDays.map((item) => (
              <CalendarCell
                key={item.key}
                item={item}
                today={today}
                loading={loading}
                onClick={() => !item.empty && setSelectedDay(item)}
              />
            ))}
          </motion.div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-900/5 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-black uppercase tracking-[0.16em] text-[#06264a]">
              Leyenda
            </h2>
            <button
              type="button"
              onClick={() => setShowFullLegend((value) => !value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-600 transition hover:border-[#e30613]/25 hover:text-[#e30613]"
            >
              {showFullLegend ? "Ver menos" : "Ver todo"}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {(showFullLegend ? usedStatuses : usedStatuses.slice(0, 8)).map(([code, status]) => (
              <LegendChip key={code} code={code} status={status} />
            ))}
            {!showFullLegend && usedStatuses.length > 8 && (
              <button
                type="button"
                onClick={() => setShowFullLegend(true)}
                className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs font-black text-slate-500 transition hover:border-[#e30613]/30 hover:text-[#e30613]"
              >
                +{usedStatuses.length - 8} mas
              </button>
            )}
          </div>

          <p className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold leading-5 text-[#06264a]">
            Haz click en cualquier dia para revisar asistencia, turno, observaciones, horas extras y comentarios RH.
          </p>
        </div>
      </section>

      <AnimatePresence>
        {selectedDay && (
          <DayModal day={selectedDay} onClose={() => setSelectedDay(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function CalendarCell({ item, today, loading, onClick }) {
  if (item.empty) return <div className="min-h-[58px] rounded-xl sm:min-h-[76px]" />;

  const status = item.status || DEFAULT_STATUS;
  const hasStatus = Boolean(item.code);
  const isToday = isSameDay(item.date, today);
  const tooltip = hasStatus
    ? `${status.label}${item.holidayName ? ` - ${item.holidayName}` : ""}${item.record?.comentario_gdh ? ` - ${item.record.comentario_gdh}` : ""}`
    : "Sin registro";

  return (
    <motion.button
      type="button"
      title={tooltip}
      onClick={onClick}
      className={`group relative min-h-[58px] rounded-xl border p-1.5 text-left transition sm:min-h-[76px] sm:p-2 ${
        hasStatus
          ? `${status.className} shadow-sm hover:-translate-y-0.5 hover:shadow-lg`
          : "border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300 hover:bg-white"
      } ${isToday ? "ring-2 ring-[#e30613]/30" : ""}`}
      whileTap={{ scale: 0.98 }}
    >
      {loading && <div className="absolute inset-0 rounded-xl bg-white/45 backdrop-blur-[1px]" />}
      <span className="flex items-center justify-between gap-1">
        <span className="text-sm font-black sm:text-base">{item.day}</span>
        {isToday && <span className="h-2 w-2 rounded-full bg-[#e30613]" />}
      </span>

      <span className="mt-1 flex items-center gap-1 sm:mt-2">
        <span className="text-base leading-none sm:text-lg">{hasStatus ? status.icon : ""}</span>
        {hasStatus && (
          <span className="rounded-md bg-white/55 px-1.5 py-0.5 text-[10px] font-black leading-none backdrop-blur">
            {item.code}
          </span>
        )}
      </span>

      {hasStatus && (
        <span className="mt-1 hidden truncate text-[10px] font-bold opacity-80 sm:block">
          {status.label}
        </span>
      )}
    </motion.button>
  );
}

function DayModal({ day, onClose }) {
  const record = day.record;
  const status = day.status || DEFAULT_STATUS;
  const dateLabel = day.date.toLocaleDateString("es-PE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/60 bg-white shadow-2xl"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
          <div>
            <div className={`mb-3 inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-black ${status.className}`}>
              <span>{status.icon}</span>
              <span>{day.code || "SR"}</span>
              <span>{status.label}</span>
            </div>
            <h2 className="text-xl font-black capitalize text-[#06264a]">{dateLabel}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Detalle laboral del dia seleccionado
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-[#e30613]"
            aria-label="Cerrar detalle"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2">
          <DetailTile icon={CalendarDays} label="Fecha" value={formatDate(day.date)} />
          <DetailTile icon={Clock3} label="Turno" value={status.label} />
          <DetailTile label="Asistencia" value={day.code || "Sin registro"} />
          {day.holidayName && <DetailTile label="Feriado" value={day.holidayName} />}
          <DetailTile label="Horas extras" value={record?.horas_extras || record?.horas_extra || "0"} />
          <DetailTile label="Estado" value={record?.estado || record?.estado_revision || "Pendiente de cierre"} />
          <DetailTile label="Aprobacion" value={record?.aprobado ? "Aprobado" : record?.rechazado ? "Rechazado" : "Sin revision"} />
          <div className="sm:col-span-2">
            <DetailTile
              icon={MessageSquareText}
              label="Observaciones / Comentarios RH"
              value={record?.comentario_gdh || record?.observacion || record?.comentario || "Sin comentarios registrados"}
              multiline
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function DetailTile({ icon: Icon, label, value, multiline = false }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
        {Icon && <Icon size={14} className="text-[#e30613]" />}
        {label}
      </div>
      <p className={`font-black text-[#06264a] ${multiline ? "whitespace-pre-wrap text-sm leading-6" : "truncate text-sm"}`}>
        {value ?? "-"}
      </p>
    </div>
  );
}

function LegendChip({ code, status }) {
  return (
    <div className="inline-flex min-w-0 items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-2.5 py-2">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${status.dot}`} />
      <span className="grid h-7 min-w-8 place-items-center rounded-lg border border-slate-200 bg-white px-1.5 text-[11px] font-black text-[#06264a]">
        {code}
      </span>
      <span className="max-w-[180px] truncate text-xs font-bold text-slate-700">
        {status.icon} {status.label}
      </span>
    </div>
  );
}

function StatCard({ label, value, tone }) {
  const tones = {
    navy: "border-[#06264a]/15 bg-[#06264a] text-white",
    red: "border-red-200 bg-red-50 text-[#e30613]",
    teal: "border-teal-200 bg-teal-50 text-teal-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    blue: "border-blue-200 bg-blue-50 text-blue-800",
    yellow: "border-yellow-200 bg-yellow-50 text-yellow-800",
  };

  return (
    <motion.div
      className={`rounded-2xl border p-4 shadow-sm ${tones[tone] || tones.navy}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <p className="text-xs font-black uppercase tracking-[0.14em] opacity-75">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </motion.div>
  );
}
