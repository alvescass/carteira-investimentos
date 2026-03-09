// =============================================================================
// HOOK — useCarteira
// Gerencia o estado completo da carteira de investimentos.
//
// Responsabilidades:
//   - Carregar aplicações, proventos e configurações do banco
//   - Salvar, editar e excluir registros
//   - Gerenciar cotação do dólar e lista de corretoras
// =============================================================================

import { useState, useCallback } from "react";
import { dbGet, dbPost, dbPatch, dbDelete } from "../api/supabase";
import { CORRETORAS_DEFAULT } from "../constants";

export function useCarteira(user) {
  const [aplicacoes, setAplicacoes] = useState([]);
  const [proventos,  setProventos]  = useState([]);
  const [corretoras, setCorretoras] = useState(CORRETORAS_DEFAULT);
  const [cotacaoUSD, setCotacaoUSD] = useState(5.80);
  const [cotacaoId,  setCotacaoId]  = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState(null);

  // --- Consistência ---

  /**
   * Verifica e corrige proventos marcados como reaplicados que não estão
   * vinculados a nenhuma aplicação ativa. Recebe os arrays diretamente
   * para evitar dependência de estado assíncrono logo após o loadAll.
   */
  const checkConsistenciaProventos = useCallback(async (apls, provs) => {
    const idsVinculados = new Set(
      apls.flatMap((a) => a.origem_provento_ids ?? [])
    );

    const inconsistentes = provs.filter(
      (p) => p.reaplicado === true && !idsVinculados.has(p.id)
    );

    if (inconsistentes.length === 0) return provs;

    console.warn(`[useCarteira] Corrigindo ${inconsistentes.length} provento(s) inconsistente(s)...`);

    await Promise.all(
      inconsistentes.map((p) => dbPatch("proventos", p.id, { reaplicado: false }))
    );

    return provs.map((p) =>
      inconsistentes.some((i) => i.id === p.id)
        ? { ...p, reaplicado: false }
        : p
    );
  }, []);

  // --- Carregamento inicial ---

  /**
   * Carrega todos os dados do usuário autenticado em paralelo.
   * Deve ser chamado após login ou ao montar o componente principal.
   */
  const loadAll = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);

    try {
      const [apls, provs, configs] = await Promise.all([
        dbGet("aplicacoes", `order=created_at.desc&user_id=eq.${user.id}`),
        dbGet("proventos",  `order=created_at.desc&user_id=eq.${user.id}`),
        dbGet("configuracoes", `user_id=eq.${user.id}`),
      ]);

      if (!Array.isArray(apls))    throw new Error("Erro ao carregar aplicações");
      if (!Array.isArray(provs))   throw new Error("Erro ao carregar proventos");
      if (!Array.isArray(configs)) throw new Error("Erro ao carregar configurações");

      // Verifica e corrige inconsistências antes de setar o estado
      const provsConsistentes = await checkConsistenciaProventos(apls, provs);

      setAplicacoes(apls);
      setProventos(provsConsistentes);

      // Restaura configurações salvas pelo usuário
      const cotConfig  = configs.find((c) => c.chave === "cotacaoUSD");
      const corrConfig = configs.find((c) => c.chave === "corretoras");

      if (cotConfig) {
        setCotacaoUSD(parseFloat(cotConfig.valor));
        setCotacaoId(cotConfig.id);
      }
      if (corrConfig) {
        setCorretoras(JSON.parse(corrConfig.valor));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id, checkConsistenciaProventos]);

  // --- Aplicações ---

  /** Salva uma nova aplicação e atualiza o estado local */
  const addAplicacao = useCallback(async (formData) => {
    setSaving(true);
    const body = {
      nome:                formData.nome,
      categoria:           formData.categoria,
      moeda:               formData.moeda,
      valor:               Number(formData.valor),
      data:                formData.data,
      rentabilidade:       formData.rentabilidade || null,
      notas:               formData.notas || null,
      corretora:           formData.corretora || null,
      origem_provento_ids: formData.origemProventoIds,
      user_id:             user.id,
    };
    const res = await dbPost("aplicacoes", body);
    if (res[0]) setAplicacoes((prev) => [res[0], ...prev]);

    // Marca proventos vinculados como reaplicados
    if (formData.origemProventoIds?.length > 0) {
      await Promise.all(
        formData.origemProventoIds.map((id) =>
          dbPatch("proventos", id, { reaplicado: true })
        )
      );
      setProventos((prev) =>
        prev.map((p) =>
          formData.origemProventoIds.includes(p.id) ? { ...p, reaplicado: true } : p
        )
      );
    }
    setSaving(false);
  }, [user?.id]);

  /** Atualiza uma aplicação existente */
  const updateAplicacao = useCallback(async (item) => {
    setSaving(true);
    const { id, created_at, ...rest } = item;
    await dbPatch("aplicacoes", id, { ...rest, valor: Number(rest.valor) });
    setAplicacoes((prev) =>
      prev.map((a) => (a.id === id ? { ...item, valor: Number(item.valor) } : a))
    );
    setSaving(false);
  }, []);

  /** Remove uma aplicação e reverte reaplicado nos proventos vinculados */
  const deleteAplicacao = useCallback(async (id) => {
    const aplicacao = aplicacoes.find((a) => a.id === id);

    if (aplicacao?.origem_provento_ids?.length > 0) {
      await Promise.all(
        aplicacao.origem_provento_ids.map((proventoId) =>
          dbPatch("proventos", proventoId, { reaplicado: false })
        )
      );
      setProventos((prev) =>
        prev.map((p) =>
          aplicacao.origem_provento_ids.includes(p.id)
            ? { ...p, reaplicado: false }
            : p
        )
      );
    }

    await dbDelete("aplicacoes", id);
    setAplicacoes((prev) => prev.filter((a) => a.id !== id));
  }, [aplicacoes]);

  // --- Proventos ---

  /** Salva um novo provento e atualiza o estado local */
  const addProvento = useCallback(async (formData) => {
    setSaving(true);
    const body = {
      ativo:      formData.ativo,
      tipo:       formData.tipo,
      moeda:      formData.moeda,
      valor:      Number(formData.valor),
      data:       formData.data,
      corretora:  formData.corretora || null,
      reaplicado: false,
      user_id:    user.id,
    };
    const res = await dbPost("proventos", body);
    if (res[0]) setProventos((prev) => [res[0], ...prev]);
    setSaving(false);
  }, [user?.id]);

  /** Atualiza um provento existente */
  const updateProvento = useCallback(async (item) => {
    setSaving(true);
    const { id, created_at, ...rest } = item;
    await dbPatch("proventos", id, { ...rest, valor: Number(rest.valor) });
    setProventos((prev) =>
      prev.map((p) => (p.id === id ? { ...item, valor: Number(item.valor) } : p))
    );
    setSaving(false);
  }, []);

  /** Remove um provento */
  const deleteProvento = useCallback(async (id) => {
    await dbDelete("proventos", id);
    setProventos((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // --- Configurações ---

  /**
   * Salva a cotação do dólar.
   * Se já existe um registro, atualiza; caso contrário, cria um novo.
   */
  const saveCotacao = useCallback(async (novaCotatacao) => {
    setSaving(true);
    const valor = String(novaCotatacao);

    if (cotacaoId) {
      await dbPatch("configuracoes", cotacaoId, { valor });
    } else {
      const res = await dbPost("configuracoes", {
        chave: "cotacaoUSD",
        valor,
        user_id: user.id,
      });
      if (res[0]) setCotacaoId(res[0].id);
    }
    setCotacaoUSD(novaCotatacao);
    setSaving(false);
  }, [cotacaoId, user?.id]);

  /** Adiciona uma nova corretora à lista e persiste no banco */
  const addCorretora = useCallback(async (nome) => {
    const updated = [...new Set([...corretoras, nome])];
    setCorretoras(updated);

    const corrConfig = await dbGet("configuracoes", `chave=eq.corretoras&user_id=eq.${user.id}`);
    if (corrConfig[0]) {
      await dbPatch("configuracoes", corrConfig[0].id, { valor: JSON.stringify(updated) });
    } else {
      await dbPost("configuracoes", {
        chave: "corretoras",
        valor: JSON.stringify(updated),
        user_id: user.id,
      });
    }
  }, [corretoras, user?.id]);

  return {
    // Estado
    aplicacoes,
    proventos,
    corretoras,
    cotacaoUSD,
    loading,
    saving,
    error,

    // Ações
    loadAll,
    addAplicacao,
    updateAplicacao,
    deleteAplicacao,
    addProvento,
    updateProvento,
    deleteProvento,
    saveCotacao,
    addCorretora,
  };
}
