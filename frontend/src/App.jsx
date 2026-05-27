import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Colaboradores from "./pages/Colaboradores";
import ColaboradorDetalle from "./pages/ColaboradorDetalle";
import SubirExcel from "./pages/SubirExcel";
import Historial from "./pages/Historial";
import MiPerfil from "./pages/MiPerfil";
import TareoUpload from "./pages/TareoUpload";
import Tareo from "./pages/Tareo";
import Calendario from "./pages/Calendario";
import AnunciosFeed from "./pages/AnunciosFeed";
import Personal from "./pages/Personal";
import ObservacionesAuxiliar from "./pages/ObservacionesAuxiliar";
import ObservacionesSupervisor from "./pages/ObservacionesSupervisor";
import ObservacionesGDH from "./pages/ObservacionesGDH";
import PanelRH from "./pages/PanelRH";
import MiTareo from "./pages/MiTareo";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={
          <ProtectedRoute roles={["gdh"]}>
            <Admin />
          </ProtectedRoute>
        } />
        <Route path="/panel-rh" element={
          <ProtectedRoute roles={["gdh"]}>
            <PanelRH />
          </ProtectedRoute>
        } />
        <Route path="/mi-tareo" element={
          <ProtectedRoute roles={["Auxiliar"]}>
            <MiTareo />
          </ProtectedRoute>
        } />
        <Route path="/colaboradores" element={
          <ProtectedRoute roles={["gdh", "Supervisor", "Lider", "Coordinador"]}>
            <Colaboradores />
          </ProtectedRoute>
        } />
        <Route path="/colaborador/:dni" element={<ColaboradorDetalle />} />
        <Route path="/subir-excel" element={
          <ProtectedRoute roles={["gdh"]}>
            <SubirExcel />
          </ProtectedRoute>
        } />
        <Route path="/historial" element={
          <ProtectedRoute roles={["gdh"]}>
            <Historial />
          </ProtectedRoute>
        } />
        <Route path="/tareo-upload" element={
          <ProtectedRoute roles={["gdh"]}>
            <TareoUpload />
          </ProtectedRoute>
        } />
        <Route path="/tareo" element={
          <ProtectedRoute roles={["gdh"]}>
            <Tareo />
          </ProtectedRoute>
        } />
        <Route path="/calendario" element={<Calendario />} />
        <Route path="/anuncios" element={<AnunciosFeed />} />
        <Route path="/personal" element={
          <ProtectedRoute roles={["Supervisor"]}>
            <Personal />
          </ProtectedRoute>
        } />
        <Route path="/observaciones" element={
          <ProtectedRoute roles={["Auxiliar"]}>
            <ObservacionesAuxiliar />
          </ProtectedRoute>
        } />
        <Route path="/observaciones-supervisor" element={
          <ProtectedRoute roles={["Supervisor"]}>
            <ObservacionesSupervisor />
          </ProtectedRoute>
        } />
        <Route path="/observaciones-gdh" element={
          <ProtectedRoute roles={["gdh"]}>
            <ObservacionesGDH />
          </ProtectedRoute>
        } />
        <Route path="/mi-perfil" element={<MiPerfil />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
