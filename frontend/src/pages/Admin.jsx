import AnunciosFeed from "../components/AnunciosFeed";
import api from "../api";

export default function Admin() {
  const user = api.getUser();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Panel GDH - Anuncios</h1>
      <AnunciosFeed userId={user.id} userName={user.nombre} />
    </div>
  );
}
