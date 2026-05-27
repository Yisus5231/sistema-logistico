import { useEffect, useMemo, useState } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Calendar,
  ChevronLeft,
  Clock,
  History,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Upload,
  User,
  Users,
  X,
  BarChart3,
} from "lucide-react";
import Notificaciones from "./Notificaciones";
import api from "../api";
import { getRolLabel } from "../auth";
import AdeccoLogo from "./AdeccoLogo";

const NAV_ITEMS = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/personal", icon: Users, label: "Mi personal", roles: ["Supervisor"] },
  { to: "/colaboradores", icon: Users, label: "Colaboradores", roles: ["gdh", "Lider", "Coordinador"] },
  { to: "/anuncios", icon: Megaphone, label: "Anuncios" },
  { to: "/observaciones", icon: MessageCircle, label: "Mis observaciones", roles: ["Auxiliar"] },
  { to: "/observaciones-supervisor", icon: MessageCircle, label: "Observaciones", roles: ["Supervisor"] },
  { to: "/observaciones-gdh", icon: MessageCircle, label: "Observaciones", roles: ["gdh"] },
  { to: "/subir-excel", icon: Upload, label: "Sincronizar Excel", roles: ["gdh"] },
  { to: "/tareo", icon: Clock, label: "Registro tareo", roles: ["gdh"] },
  { to: "/calendario", icon: Calendar, label: "Calendario" },
  { to: "/historial", icon: History, label: "Historial", roles: ["gdh"] },
  { to: "/mi-perfil", icon: User, label: "Mi perfil" },
];

const ROLE_STYLES = {
  gdh: "bg-[#e30613] text-white",
  supervisor: "bg-[#06264a] text-white",
  auxiliar: "bg-emerald-600 text-white",
  lider: "bg-violet-600 text-white",
  coordinador: "bg-cyan-700 text-white",
};

function canSee(item, role) {
  if (!item.roles) return true;
  return item.roles.some((allowedRole) => allowedRole.toLowerCase() === role?.toLowerCase());
}

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = api.getUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const closeWithEscape = (event) => {
      if (event.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", closeWithEscape);
    return () => window.removeEventListener("keydown", closeWithEscape);
  }, []);

  const filteredItems = useMemo(
    () => NAV_ITEMS.filter((item) => canSee(item, user?.rol)),
    [user?.rol]
  );

  const currentPage = filteredItems
    .slice()
    .sort((a, b) => b.to.length - a.to.length)
    .find((item) => location.pathname.startsWith(item.to));

  const roleKey = user?.rol?.toLowerCase();
  const roleClass = ROLE_STYLES[roleKey] || ROLE_STYLES.auxiliar;
  const userPositionLabel = roleKey === "auxiliar" ? user?.cargo || "Cargo no definido" : getRolLabel(user?.rol);
  const initials = user?.nombre
    ?.split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "U";

  const handleLogout = () => {
    api.clearSession();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f6f9] text-[#001b3f]">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Cerrar menu"
          className="fixed inset-0 sidebar-overlay z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[#b90012] bg-gradient-to-b from-[#e30613] to-[#b90012] text-white shadow-2xl shadow-red-950/20 transition-all duration-300 lg:static ${
          collapsed ? "w-[78px]" : "w-[280px]"
        } ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="flex h-20 items-center justify-between border-b border-white/15 px-4">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className={`flex min-w-0 items-center ${collapsed ? "justify-center" : "gap-3"}`}
            aria-label="Ir al dashboard"
          >
            {!collapsed && (
              <span className="min-w-0 text-left">
                <AdeccoLogo variant="white" className="text-[0.72rem]" />
                <span className="block truncate text-[11px] font-bold uppercase tracking-[0.16em] text-white/75">
                  Onsite Oslo, Punta Negra
                </span>
              </span>
            )}
            {collapsed && (
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-sm font-black text-[#e30613] shadow-lg">
                A
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Cerrar menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="hidden border-b border-white/15 px-3 py-2 lg:block">
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="flex w-full items-center justify-center rounded-lg px-3 py-2 text-white/75 transition hover:bg-white/15 hover:text-white"
            title={collapsed ? "Expandir menu" : "Colapsar menu"}
          >
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {filteredItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `group flex h-11 items-center rounded-xl text-sm font-semibold transition ${
                  collapsed ? "justify-center px-0" : "gap-3 px-3"
                } ${
                  isActive
                    ? "bg-white text-[#06264a] shadow-lg shadow-red-950/10"
                    : "text-white/78 hover:bg-white/14 hover:text-white"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={18} className={isActive ? "text-[#e30613]" : "text-current"} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/15 p-3">
          <div className={`mb-3 flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-bold ${roleClass}`}>
              {initials}
            </span>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">{user?.nombre || "Usuario"}</p>
                <p className="truncate text-xs font-medium text-white/70">{userPositionLabel}</p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className={`flex h-10 w-full items-center rounded-xl text-sm font-semibold text-white/75 transition hover:bg-white/15 hover:text-white ${
              collapsed ? "justify-center px-0" : "gap-2 px-3"
            }`}
            title="Cerrar sesion"
          >
            <LogOut size={17} />
            {!collapsed && "Cerrar sesion"}
          </button>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl lg:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="hidden rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 md:inline-flex"
            aria-label="Volver"
          >
            <ChevronLeft size={19} />
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold uppercase tracking-[0.18em] text-[#e30613]">
              Onsite Oslo, Punta Negra
            </p>
            <h1 className="truncate text-base font-black text-[#06264a]">
              {currentPage?.label || "Sistema de gestion"}
            </h1>
          </div>

          <Notificaciones />

          <button
            type="button"
            onClick={() => navigate("/mi-perfil")}
            className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 shadow-sm transition hover:border-slate-300 sm:flex"
          >
            <span className={`grid h-8 w-8 place-items-center rounded-lg text-xs font-bold ${roleClass}`}>{initials}</span>
            <span className="hidden max-w-[120px] truncate text-sm font-bold text-slate-700 md:block">
              {user?.nombre?.split(" ")[0] || "Perfil"}
            </span>
          </button>
        </header>

        <div className="flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
