import { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface SenhasTurnos {
  turnoA: string;
  turnoB: string;
  turnoC: string;
  turnoD: string;
}

interface EstadoEdicao {
  turnoA: boolean;
  turnoB: boolean;
  turnoC: boolean;
  turnoD: boolean;
}

// ─── Constantes ──────────────────────────────────────────────────────────────
const COLECAO = "configuracoes";
const DOCUMENTO = "senhas_turnos";

const SENHAS_PADRAO: SenhasTurnos = {
  turnoA: "102279",
  turnoB: "TurnoB",
  turnoC: "TurnoC",
  turnoD: "TurnoD",
};

const LABELS: Record<keyof SenhasTurnos, string> = {
  turnoA: "Turno A",
  turnoB: "Turno B",
  turnoC: "Turno C",
  turnoD: "Turno D",
};

// ─── Componente principal ─────────────────────────────────────────────────────
export default function GerenciarSenhasTurnos() {
  const [senhas, setSenhas] = useState<SenhasTurnos>(SENHAS_PADRAO);
  const [novasSenhas, setNovasSenhas] = useState<SenhasTurnos>(SENHAS_PADRAO);
  const [editando, setEditando] = useState<EstadoEdicao>({
    turnoA: false,
    turnoB: false,
    turnoC: false,
    turnoD: false,
  });
  const [visivel, setVisivel] = useState<EstadoEdicao>({
    turnoA: false,
    turnoB: false,
    turnoC: false,
    turnoD: false,
  });
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState<keyof SenhasTurnos | null>(null);
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

  // ─── Cargar contraseñas desde Firestore al montar ─────────────────────────
  useEffect(() => {
    const carregarSenhas = async () => {
      try {
        const ref = doc(db, COLECAO, DOCUMENTO);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() as SenhasTurnos;
          setSenhas(data);
          setNovasSenhas(data);
        } else {
          // Si no existe, crear con las contraseñas por defecto
          await setDoc(ref, SENHAS_PADRAO);
          setSenhas(SENHAS_PADRAO);
          setNovasSenhas(SENHAS_PADRAO);
        }
      } catch (err) {
        console.error("Erro ao carregar senhas:", err);
        mostrarMensagem("erro", "Erro ao carregar senhas da nuvem.");
      } finally {
        setCarregando(false);
      }
    };
    carregarSenhas();
  }, []);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const mostrarMensagem = (tipo: "sucesso" | "erro", texto: string) => {
    setMensagem({ tipo, texto });
    setTimeout(() => setMensagem(null), 3500);
  };

  const toggleEditar = (turno: keyof SenhasTurnos) => {
    setEditando((prev) => ({ ...prev, [turno]: !prev[turno] }));
    // Resetear campo si se cancela
    if (editando[turno]) {
      setNovasSenhas((prev) => ({ ...prev, [turno]: senhas[turno] }));
    }
  };

  const toggleVisivel = (turno: keyof SenhasTurnos) => {
    setVisivel((prev) => ({ ...prev, [turno]: !prev[turno] }));
  };

  // ─── Guardar contraseña individual en Firestore ───────────────────────────
  const salvarSenha = async (turno: keyof SenhasTurnos) => {
    const novaSenha = novasSenhas[turno].trim();
    if (!novaSenha) {
      mostrarMensagem("erro", "A senha não pode ser vazia.");
      return;
    }
    if (novaSenha.length < 4) {
      mostrarMensagem("erro", "A senha deve ter ao menos 4 caracteres.");
      return;
    }

    setSalvando(turno);
    try {
      const ref = doc(db, COLECAO, DOCUMENTO);
      const senhasAtualizadas = { ...senhas, [turno]: novaSenha };
      await setDoc(ref, senhasAtualizadas, { merge: true });
      setSenhas(senhasAtualizadas);
      setEditando((prev) => ({ ...prev, [turno]: false }));
      mostrarMensagem("sucesso", `Senha do ${LABELS[turno]} atualizada com sucesso!`);
    } catch (err) {
      console.error("Erro ao salvar senha:", err);
      mostrarMensagem("erro", "Erro ao salvar senha. Tente novamente.");
    } finally {
      setSalvando(null);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  if (carregando) {
    return (
      <div className="flex items-center justify-center p-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <span className="ml-3 text-gray-600">Carregando senhas...</span>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Gerenciar Senhas dos Turnos</h2>
      <p className="text-sm text-gray-500 mb-6">
        As senhas são salvas na nuvem (Firestore) e sincronizadas automaticamente.
      </p>

      {/* Mensagem de feedback */}
      {mensagem && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
            mensagem.tipo === "sucesso"
              ? "bg-green-100 text-green-800 border border-green-300"
              : "bg-red-100 text-red-800 border border-red-300"
          }`}
        >
          {mensagem.tipo === "sucesso" ? "✅" : "❌"} {mensagem.texto}
        </div>
      )}

      {/* Cards de cada turno */}
      <div className="space-y-4">
        {(Object.keys(LABELS) as Array<keyof SenhasTurnos>).map((turno) => (
          <div
            key={turno}
            className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-gray-700 text-base">{LABELS[turno]}</span>
              {!editando[turno] && (
                <button
                  onClick={() => toggleEditar(turno)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium px-3 py-1 rounded-lg hover:bg-blue-50 transition"
                >
                  ✏️ Editar
                </button>
              )}
            </div>

            {editando[turno] ? (
              /* ── Modo edición ── */
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type={visivel[turno] ? "text" : "password"}
                    value={novasSenhas[turno]}
                    onChange={(e) =>
                      setNovasSenhas((prev) => ({ ...prev, [turno]: e.target.value }))
                    }
                    onKeyDown={(e) => e.key === "Enter" && salvarSenha(turno)}
                    placeholder="Nova senha..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => toggleVisivel(turno)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                    title={visivel[turno] ? "Ocultar" : "Mostrar"}
                  >
                    {visivel[turno] ? "🙈" : "👁️"}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => salvarSenha(turno)}
                    disabled={salvando === turno}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium py-2 rounded-lg transition"
                  >
                    {salvando === turno ? "Salvando..." : "💾 Salvar"}
                  </button>
                  <button
                    onClick={() => toggleEditar(turno)}
                    disabled={salvando === turno}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2 rounded-lg transition"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              /* ── Modo visualización ── */
              <div className="flex items-center gap-2">
                <input
                  type={visivel[turno] ? "text" : "password"}
                  value={senhas[turno]}
                  readOnly
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 cursor-default"
                />
                <button
                  onClick={() => toggleVisivel(turno)}
                  className="text-gray-400 hover:text-gray-700 px-2"
                  title={visivel[turno] ? "Ocultar" : "Mostrar"}
                >
                  {visivel[turno] ? "🙈" : "👁️"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="mt-6 text-xs text-gray-400 text-center">
        Documento Firestore: <code className="bg-gray-100 px-1 rounded">{COLECAO}/{DOCUMENTO}</code>
      </p>
    </div>
  );
}
