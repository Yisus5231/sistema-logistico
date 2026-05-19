import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowRight, Eye, EyeOff, LockKeyhole, MapPin, ShieldCheck } from "lucide-react";
import api from "../api";
import { getUser, setSession } from "../auth";
import AdeccoLogo from "../components/AdeccoLogo";

export default function Login() {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (getUser()) navigate("/dashboard", { replace: true });
  }, [navigate]);

  const login = async (event) => {
    event.preventDefault();
    const cleanUser = usuario.trim();
    const cleanPassword = password.trim();

    if (!cleanUser || !cleanPassword) {
      toast.error("Ingresa usuario y contrasena");
      return;
    }

    setLoading(true);
    try {
      const data = await api.login(cleanUser, cleanPassword);
      setSession(data);
      toast.success(`Bienvenido, ${data.nombre?.split(" ")[0] || "usuario"}`);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      toast.error(err.normalized?.message || "Error de conexion con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f3f5f8] text-[#001b3f]">
      <div className="h-7 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-5 text-[11px] font-black uppercase tracking-wide text-[#001b3f]">
          <span>Peru (Punta Negra)</span>
        </div>
      </div>

      <header className="bg-gradient-to-r from-[#e30613] to-[#b90020] shadow-lg shadow-red-900/15">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5">
          <AdeccoLogo variant="white" className="text-[0.82rem]" />
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-100px)] max-w-7xl items-center gap-8 px-5 py-8 lg:grid-cols-[1fr_440px]">
        <div className="relative overflow-hidden rounded-2xl bg-white p-7 shadow-2xl shadow-slate-900/10 sm:p-10">
          <div className="absolute inset-y-0 right-0 hidden w-[34%] bg-gradient-to-br from-[#f8d8d8] via-white to-[#dbe7f6] lg:block" />
          <div className="relative max-w-3xl">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#e30613]/15 bg-[#e30613]/8 px-3 py-1 text-xs font-black text-[#e30613]">
              <MapPin size={14} />
              Onsite Oslo, Punta Negra
            </div>

            <h1 className="max-w-2xl text-4xl font-black leading-tight tracking-tight text-[#06264a] sm:text-5xl">
              Gestion de asistencia y colaboradores
            </h1>
            <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-[#06264a]">
              Plataforma de control de tareo.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <Feature label="Tareo" value="Asistencia diaria" />
              <Feature label="GDH" value="Gestion central" />
              <Feature label="Supervision" value="Flujo por area" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/10">
          <div className="mb-7">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-[#06264a]">
              <ShieldCheck size={14} className="text-[#e30613]" />
              Acceso seguro
            </div>
            <h2 className="text-3xl font-black tracking-tight text-[#06264a]">Iniciar sesion</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Ingresa tus credenciales para continuar.
            </p>
          </div>

          <form onSubmit={login} className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-[#06264a]">
                Usuario
              </span>
              <input
                className="h-12 w-full rounded-xl border border-[#06264a]/25 bg-white px-4 text-sm font-bold text-[#06264a] placeholder:text-slate-400 transition focus:border-[#e30613] focus:outline-none focus:ring-4 focus:ring-[#e30613]/10"
                placeholder="DNI o usuario"
                value={usuario}
                onChange={(event) => setUsuario(event.target.value)}
                autoComplete="username"
                autoFocus
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-[#06264a]">
                Contraseña
              </span>
              <span className="relative block">
                <input
                  type={showPassword ? "text" : "password"}
                  className="h-12 w-full rounded-xl border border-[#06264a]/25 bg-white px-4 pr-12 text-sm font-bold text-[#06264a] placeholder:text-slate-400 transition focus:border-[#e30613] focus:outline-none focus:ring-4 focus:ring-[#e30613]/10"
                  placeholder="Tu contrasena"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-[#e30613]"
                  aria-label={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="app-button h-12 w-full bg-[#06264a] text-white shadow-lg shadow-[#06264a]/20 hover:bg-[#001b3f] disabled:opacity-60"
            >
              {loading ? (
                <span className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <>
                  <LockKeyhole size={17} />
                  Ingresar
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs font-semibold text-slate-500">
            Adecco Onsite Oslo, Punta Negra
          </p>
        </div>
      </section>
    </main>
  );
}

function Feature({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/90 p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#e30613]">{label}</p>
      <p className="mt-1 text-sm font-black text-[#06264a]">{value}</p>
    </div>
  );
}
