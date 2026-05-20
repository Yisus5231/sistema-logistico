import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  History,
  Megaphone,
  MessageCircle,
  Sparkles,
  TrendingUp,
  Upload,
  UserCheck,
  Users,
} from "lucide-react";
import api from "../api";
import { getRolLabel } from "../auth";
import AdeccoLogo from "../components/AdeccoLogo";

export default function Dashboard() {
  const user = api.getUser();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      setLoading(true);
      setError("");
      try {
        const [dashStats, profile] = await Promise.all([
          api.getDashboardStats(),
          api.getMiPerfil().catch(() => null),
        ]);
        if (!mounted) return;
        setStats(dashStats);
        setPerfil(profile);
      } catch (err) {
        if (!mounted) return;
        setError(err.normalized?.message || "No se pudo cargar el dashboard");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const role = user?.rol?.toLowerCase();
  const isGDH = role === "gdh";
  const isSupervisor = ["supervisor", "lider", "coordinador"].includes(role);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos dias";
    if (hour < 18) return "Buenas tardes";
    return "Buenas noches";
  }, []);

  const metrics = useMemo(() => {
    if (!stats) return [];

    if (isGDH) {
      return [
        { icon: UserCheck, label: "Activos", value: stats.activos ?? 0, tone: "emerald", detail: "Colaboradores habilitados", to: "/colaboradores?estado=activo" },
        { icon: Users, label: "Inactivos", value: stats.inactivos ?? 0, tone: "slate", detail: "Fuera de operacion", to: "/colaboradores?estado=inactivo" },
        { icon: Building2, label: "Areas", value: stats.areas ?? 0, tone: "blue", detail: "Unidades registradas", to: "/colaboradores?vista=areas" },
        { icon: Megaphone, label: "Anuncios hoy", value: stats.anuncios_hoy ?? 0, tone: "amber", detail: "Comunicados publicados", to: "/anuncios" },
        { icon: AlertCircle, label: "Pendientes", value: stats.obs_pendientes ?? 0, tone: "red", detail: "Observaciones abiertas", to: "/observaciones-gdh?estado=Pendiente" },
      ];
    }

    if (isSupervisor) {
      return [
        { icon: Users, label: "Equipo", value: stats.colaboradores ?? 0, tone: "blue", detail: stats.area || user?.area || "Area asignada", to: "/personal" },
        { icon: AlertCircle, label: "Pendientes", value: stats.obs_pendientes ?? 0, tone: "red", detail: "Observaciones por revisar", to: "/observaciones-supervisor?estado=Pendiente" },
        { icon: TrendingUp, label: "Cobertura", value: "100%", tone: "emerald", detail: "Vista filtrada por area", to: "/personal" },
      ];
    }

    return [
      { icon: Clock, label: "Tareo", value: stats.tareo_registros ?? 0, tone: "blue", detail: "Registros disponibles" },
      { icon: MessageCircle, label: "Observaciones", value: stats.observaciones ?? 0, tone: "red", detail: "Solicitudes creadas" },
    ];
  }, [stats, isGDH, isSupervisor, user?.area]);

  const actions = useMemo(() => {
    if (isGDH) {
      return [
        { icon: Upload, title: "Sincronizar Excel", desc: "Actualizar colaboradores, areas y cargos.", to: "/subir-excel" },
        { icon: Upload, title: "Subir tareo", desc: "Importar asistencia operativa desde Excel.", to: "/tareo-upload" },
        { icon: Users, title: "Colaboradores", desc: "Auditar personal activo e inactivo.", to: "/colaboradores" },
        { icon: MessageCircle, title: "Observaciones", desc: "Gestionar observaciones globales.", to: "/observaciones-gdh" },
        { icon: History, title: "Historial", desc: "Revisar trazabilidad de cambios.", to: "/historial" },
        { icon: Megaphone, title: "Anuncios", desc: "Publicar comunicados internos.", to: "/anuncios" },
      ];
    }

    if (isSupervisor) {
      return [
        { icon: Users, title: "Mi personal", desc: "Gestionar el equipo asignado.", to: "/personal" },
        { icon: MessageCircle, title: "Observaciones", desc: "Resolver solicitudes del area.", to: "/observaciones-supervisor" },
        { icon: Megaphone, title: "Anuncios", desc: "Comunicar novedades al equipo.", to: "/anuncios" },
      ];
    }

    return [
      { icon: Calendar, title: "Mi calendario", desc: "Consultar asistencia mensual.", to: "/calendario" },
      { icon: MessageCircle, title: "Observaciones", desc: "Crear y seguir solicitudes.", to: "/observaciones" },
      { icon: Megaphone, title: "Anuncios", desc: "Leer comunicados internos.", to: "/anuncios" },
    ];
  }, [isGDH, isSupervisor]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="overflow-hidden rounded-2xl border border-red-100 bg-white text-[#06264a] shadow-2xl shadow-slate-950/10">
        <div className="h-2 bg-gradient-to-r from-[#e30613] to-[#b90020]" />
        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_320px] lg:items-end">
          <div className="min-w-0">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#e30613]/15 bg-[#e30613]/8 px-3 py-1 text-xs font-black text-[#e30613]">
              <Sparkles size={14} />
              {getRolLabel(user?.rol)} workspace
            </div>
            <div className="mb-3">
              <AdeccoLogo className="text-[0.64rem]" />
            </div>
            <p className="text-sm font-bold text-slate-500">{greeting}</p>
            <h1 className="mt-1 max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">
              {user?.nombre || "Usuario"}
            </h1>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#e30613]">Contexto actual</p>
            <div className="mt-4 space-y-3">
              <ContextRow label="Rol" value={getRolLabel(user?.rol)} />
              <ContextRow label="Sede" value="Onsite Oslo, Punta Negra" />
              <ContextRow label="Cargo" value={user?.cargo || "No definido"} />
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <section className={`grid gap-3 animate-stagger ${metrics.length >= 5 ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-5" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} onClick={metric.to ? () => navigate(metric.to) : undefined} />
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-950">Acciones rapidas</h2>
              <p className="text-sm text-slate-500">Entradas principales segun tu rol.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 animate-stagger">
            {actions.map((action) => (
              <ActionCard key={action.title} {...action} onClick={() => navigate(action.to)} />
            ))}
          </div>
        </div>

          {!isGDH && !isSupervisor && perfil && (
            <div className="app-card rounded-2xl p-5">
              <h2 className="font-black text-slate-950">Resumen personal</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <InfoTile label="DNI" value={perfil.dni} />
                <InfoTile label="Ingreso" value={perfil.fecha_ingreso || "-"} />
                <InfoTile label="Vacaciones" value={`${perfil.vacaciones_pendientes ?? 0} dias`} />
                <InfoTile label="Estado" value={perfil.estado || "Activo"} />
              </div>
              <button
                type="button"
                onClick={() => navigate("/mi-perfil")}
                className="app-button mt-4 w-full border border-slate-200 bg-white text-slate-700 hover:border-[#e30613]/25 hover:text-[#e30613]"
              >
                Ver perfil
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="skeleton h-56 rounded-2xl" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="skeleton h-32 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div key={item} className="skeleton h-32 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, detail, tone, onClick }) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    slate: "bg-slate-50 text-slate-700 border-slate-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    red: "bg-red-50 text-[#e30613] border-red-100",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`app-card rounded-2xl p-4 text-left transition hover:-translate-y-0.5 hover:shadow-xl ${onClick ? "cursor-pointer hover:border-[#e30613]/25" : "cursor-default"}`}
    >
      <div className={`mb-4 grid h-11 w-11 place-items-center rounded-xl border ${tones[tone] || tones.slate}`}>
        <Icon size={20} />
      </div>
      <p className="text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-sm font-bold text-slate-700">{label}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
    </button>
  );
}

function ActionCard({ icon: Icon, title, desc, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="app-card group rounded-2xl p-4 text-left transition hover:-translate-y-0.5 hover:border-[#e30613]/25 hover:shadow-xl"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#06264a] text-white transition group-hover:bg-[#e30613]">
          <Icon size={19} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-sm font-black text-slate-950">
            <span className="truncate">{title}</span>
            <ArrowRight size={15} className="ml-auto text-slate-300 transition group-hover:text-[#e30613]" />
          </span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">{desc}</span>
        </span>
      </div>
    </button>
  );
}

function ContextRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="truncate font-black text-[#06264a]">{value}</span>
    </div>
  );
}

function HealthRow({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
      <span className="font-semibold text-slate-600">{label}</span>
      <span className="font-black text-emerald-600">{value}</span>
    </div>
  );
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 truncate font-black text-slate-800">{value}</p>
    </div>
  );
}
