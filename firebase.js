import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";

import {
  getDatabase,
  ref,
  onValue,
  set
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBuCWEqHNXOetDkyrjg22TrkBQfgA9liwg",
  authDomain: "casamento-8d134.firebaseapp.com",
  databaseURL: "https://casamento-8d134-default-rtdb.firebaseio.com",
  projectId: "casamento-8d134",
  storageBucket: "casamento-8d134.firebasestorage.app",
  messagingSenderId: "466465762717",
  appId: "1:466465762717:web:b205160b6093179c051374"
};

// Inicialização do Firebase
const app = initializeApp(firebaseConfig);

// Inicialização do Realtime Database
const database = getDatabase(app);

// Local onde as metas serão salvas
const goalsReference = ref(database, "planejamento/goals");

// Indicador de sincronização existente no index.html
const syncStatus = document.getElementById("syncStatus");

/**
 * Atualiza o indicador de sincronização.
 */
function updateStatus(message, state = "") {
  if (!syncStatus) return;

  syncStatus.className = `sync${state ? ` ${state}` : ""}`;
  syncStatus.textContent = message;
}

/**
 * Valida e normaliza as metas recebidas.
 */
function normalizeGoals(value) {
  const list = Array.isArray(value)
    ? value
    : value && typeof value === "object"
      ? Object.values(value)
      : [];

  return list
    .filter(goal => (
      goal &&
      typeof goal.id === "string" &&
      typeof goal.name === "string" &&
      Number.isFinite(Number(goal.target)) &&
      Number.isFinite(Number(goal.saved)) &&
      typeof goal.deadline === "string"
    ))
    .map(goal => ({
      ...goal,
      target: Math.max(0, Number(goal.target)),
      saved: Math.max(0, Number(goal.saved))
    }));
}

/**
 * Salva todas as metas no Firebase.
 *
 * Esta função fica disponível para o index.html através de:
 * window.firebaseSaveGoals(metas)
 */
window.firebaseSaveGoals = async updatedGoals => {
  const validGoals = normalizeGoals(updatedGoals);

  if (!validGoals.length) {
    updateStatus("Dados inválidos", "error");

    throw new Error(
      "Nenhuma meta válida foi recebida para salvar."
    );
  }

  updateStatus("Salvando…");

  try {
    await set(goalsReference, validGoals);

    updateStatus("Salvo online", "online");
  } catch (error) {
    updateStatus("Erro ao salvar", "error");

    console.error(
      "Não foi possível salvar no Firebase:",
      error
    );

    throw error;
  }
};

/**
 * Monitora as mudanças no Realtime Database.
 *
 * Sempre que algum valor for alterado no Firebase,
 * o sistema recebe automaticamente os novos dados.
 */
onValue(
  goalsReference,

  async snapshot => {
    try {
      if (snapshot.exists()) {
        const onlineGoals = normalizeGoals(snapshot.val());

        if (
          onlineGoals.length &&
          typeof window.applyFirebaseGoals === "function"
        ) {
          window.applyFirebaseGoals(onlineGoals);
        }
      } else if (
        typeof window.getCurrentGoals === "function"
      ) {
        // Se o banco estiver vazio, salva as metas iniciais
        await window.firebaseSaveGoals(
          window.getCurrentGoals()
        );
      }

      updateStatus("Sincronizado", "online");
    } catch (error) {
      updateStatus(
        "Erro de sincronização",
        "error"
      );

      console.error(
        "Não foi possível sincronizar com o Firebase:",
        error
      );
    }
  },

  error => {
    updateStatus("Sem permissão", "error");

    console.error(
      "O Firebase bloqueou a leitura. Verifique as regras do Realtime Database:",
      error
    );
  }
);
