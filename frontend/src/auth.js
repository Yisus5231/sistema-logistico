import api from "./api";

export function setSession(data) {
  api.setSession(
    data.token,
    {
      id: data.id,
      dni: data.dni,
      nombre: data.nombre,
      rol: data.rol,
      area: data.area,
      cargo: data.cargo,
      primer_acceso: data.primer_acceso,
    },
    data.refresh_token
  );
}

export function getSession() {
  return { token: api.getToken(), user: api.getUser() };
}

export function clearSession() {
  api.clearSession();
}

export function getToken() {
  return api.getToken();
}

export function getUser() {
  return api.getUser();
}

export function isAuthenticated() {
  return !!api.getToken() && !!api.getUser();
}

export function getRolLabel(rol) {
  const labels = {
    gdh: "GDH",
    supervisor: "Supervisor",
    auxiliar: "Auxiliar",
    lider: "Lider",
    coordinador: "Coordinador",
  };
  return labels[rol?.toLowerCase()] || rol;
}

export function hasRole(allowedRoles) {
  const user = api.getUser();
  if (!user || !allowedRoles) return true;
  return allowedRoles.some((role) => role.toLowerCase() === user.rol?.toLowerCase());
}
