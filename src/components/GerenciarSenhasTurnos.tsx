import { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface SenhasTurnos {
  turnoA: string;
  turnoB: string;
  turnoC: string;
  turnoD: string;
}

type TurnoKey = keyof SenhasTurnos;

const TURNOS: TurnoKey[] = ["turnoA", "turnoB", "turnoC", "turnoD"];

const LABELS: Record<TurnoKey, string> = {
  turnoA: "Turno A",
  turnoB: "Turno B",
  turnoC: "Turno C",
  turnoD: "Turno D",
};

const FIRESTORE_COLECAO = "configuracoes";
const FIRESTORE_DOCUMENTO = "senhas_turnos";

const VAZIO: SenhasTurnos = { turnoA: "", turnoB: "", turnoC: "", turnoD: "" };
const BOOL_VAZIO = { turnoA: false, turnoB: false, turnoC: false, turnoD: false };

// ─── Componente ───────────────────────────────────────────────────────────────
export default function GerenciarSenhasTurnos() {
  // Contraseñas actuales cargadas desde Firestore (nunca en código)
  const [senhas, setSenhas] = useState<SenhasTurnos>(VAZIO);
  // Valores de los inputs de edición
  const [inputs, setInputs] = useState<SenhasTurnos>(VAZIO);

  const [editando, setEditando] = useState({ ...BOOL_VAZIO });
  const [visivel, setVisivel] = useState({ ...BOOL_VAZIO });
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState<TurnoKey | null>(null);
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  // ─── Cargar desde Firestore al montar ───────────────────────────────────────
  useEffect(() => {
    const carregar = async () => {
      try {
        const snap = await getDoc(doc(db, FIRESTORE_COLECAO, FIRESTORE_DOCUMENTO));
        if (snap.exists()) {
          const data = snap.data() as SenhasTurnos;
          setSenhas(data);
          // Los inputs permanecen vacíos — el usuario debe escribir la nueva contraseña
        }
        // Si no existe el documento aún, se crea al guardar la primera contraseña
      } catch (err) {
        console.error("Erro ao carregar:", err);
        aviso("erro", "Erro ao carregar dados da nuvem.");
      } finally {
        setCarregando(false);
      }
    };
    carregar();
  }, []);

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const aviso = (tipo: "ok" | "erro", texto: string) => {
    setMensagem({ tipo, texto });
    setTimeout(() => setMensagem(null), 3500);
  };

  const abrirEdicao = (turno: TurnoKey) => {
    // Al abrir edición el input siempre empieza vacío — la contraseña actual NO se expone
    setInputs((prev) => ({ ...prev, [turno]: "" }));
    setEditando((prev) => ({ ...prev, [turno]: true }));
    setVisivel((prev) => ({ ...prev, [turno]: false }));
  };

  const cancelarEdicao = (turno: TurnoKey) => {
    setInputs((prev) => ({ ...prev, [turno]: "" }));
    setEditando((prev) => ({ ...prev, [turno]: false }));
    setVisivel((prev) => ({ ...prev, [turno]: false }));
  };

  const toggleVisivel = (turno: TurnoKey) =>
    setVisivel((prev) => ({ ...prev, [turno]: !prev[turno] }));

  // ─── Guardar en Firestore ────────────────────────────────────────────────────
  const salvar = async (turno: TurnoKey) => {
    const nova = inputs[turno].trim();
    if (!nova) {
      aviso("erro", "Digite a nova senha antes de salvar.");
      return;
    }
    if (nova.length < 4) {
      aviso("erro", "A senha deve ter pelo menos 4 caracteres.");
      return;
    }

    setSalvando(turno);
    try {
      await setDoc(
        doc(db, FIRESTORE_COLECAO, FIRESTORE_DOCUMENTO),
        { [turno]: nova },
        { merge: true }
      );
      // Actualizar estado local sin exponer en código
      setSenhas((prev) => ({ ...prev, [turno]: nova }));
      cancelarEdicao(turno);
      aviso("ok", `Senha do ${LABELS[turno]} atualizada com sucesso!`);
    } catch (err) {
      console.error("Erro ao salvar:", err);
      aviso("erro", "Erro ao salvar. Verifique a conexão e tente novamente.");
    } finally {
      setSalvando(null);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  if (carregando) {
    return (
      <div className="flex items-center justify-center p-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <span className="ml-3 text-gray-500 text-sm">Carregando...</span>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-1">Senhas dos Turnos</h2>
      <p className="text-xs text-gray-400 mb-5">
        As senhas ficam armazenadas exclusivamente na nuvem.
        Nenhuma senha aparece no código-fonte.
      </p>

      {/* Feedback */}
      {mensagem && (
        <div
          className={`mb-4 px-4 py-2 rounded-lg text-sm font-medium ${
            mensagem.tipo === "ok"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {mensagem.tipo === "ok" ? "✅" : "❌"} {mensagem.texto}
        </div>
      )}

      <div className="space-y-3">
        {TURNOS.map((turno) => (
          <div
            key={turno}
            className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
          >
            {/* Cabecera del turno */}
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-gray-700">{LABELS[turno]}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  senhas[turno]
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {senhas[turno] ? "● Definida" : "○ Não definida"}
              </span>
            </div>

            {editando[turno] ? (
              /* ── Modo edición ── */
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type={visivel[turno] ? "text" : "password"}
                    value={inputs[turno]}
                    onChange={(e) =>
                      setInputs((prev) => ({ ...prev, [turno]: e.target.value }))
                    }
                    onKeyDown={(e) => e.key === "Enter" && salvar(turno)}
                    placeholder="Digite a nova senha..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    autoFocus
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => toggleVisivel(turno)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-base"
                    title={visivel[turno] ? "Ocultar" : "Mostrar"}
                  >
                    {visivel[turno] ? "🙈" : "👁️"}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => salvar(turno)}
                    disabled={salvando === turno}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition"
                  >
                    {salvando === turno ? "Salvando..." : "💾 Salvar"}
                  </button>
                  <button
                    onClick={() => cancelarEdicao(turno)}
                    disabled={salvando === turno}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium py-2 rounded-lg transition"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              /* ── Modo visualización ── */
              <button
                onClick={() => abrirEdicao(turno)}
                className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium py-1.5 rounded-lg hover:bg-blue-50 transition text-left px-1"
              >
                ✏️ Alterar senha
              </button>
            )}
          </div>
        ))}
      </div>

      <p className="mt-5 text-xs text-gray-300 text-center">
        Firestore: <code>{FIRESTORE_COLECAO}/{FIRESTORE_DOCUMENTO}</code>
      </p>
    </div>
  );
}
