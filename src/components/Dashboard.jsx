// =============================================================================
// COMPONENT — Dashboard
// Exibe os cards de resumo, gráfico de pizza por categoria e
// gráfico de área mensal de proventos, além do ranking de posições.
// =============================================================================

import { useMemo } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { CHART_COLORS } from "../constants";
import {
  fmtBRL, fmtUSD, toBRL,
  calcPatrimonioBRL, calcTotalProventosBRL,
  calcProventosDisponiveisBRL, calcByCategoria, calcProventosPorMes,
} from "../utils/financeiro";

// --- Card de resumo ---
const SummaryCard = ({ label, value, sub, color }) => (
  <div style={{ background: "linear-gradient(135deg,#141000,#1E1800)", border: "1px solid #2A2000", borderRadius: 12, padding: "18px 22px" }}>
    <div style={{ fontSize: 11, color: "#7A6A40", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>{label}</div>
    <div style={{ fontSize: 24, fontWeight: "bold", color, marginBottom: 4 }}>{value}</div>
    <div style={{ fontSize: 12, color: "#5A4A20" }}>{sub}</div>
  </div>
);

export default function Dashboard({ aplicacoes, proventos, cotacaoUSD }) {
  // Memoiza cálculos pesados para evitar recomputação desnecessária
  const patrimonioBRL       = useMemo(() => calcPatrimonioBRL(aplicacoes, proventos, cotacaoUSD), [aplicacoes, proventos, cotacaoUSD]);
  const totalProventosBRL   = useMemo(() => calcTotalProventosBRL(proventos, cotacaoUSD), [proventos, cotacaoUSD]);
  const proventosLivresBRL  = useMemo(() => calcProventosDisponiveisBRL(proventos, cotacaoUSD), [proventos, cotacaoUSD]);
  const byCategoria         = useMemo(() => calcByCategoria(aplicacoes, cotacaoUSD), [aplicacoes, cotacaoUSD]);
  const proventosPorMes     = useMemo(() => calcProventosPorMes(proventos, cotacaoUSD), [proventos, cotacaoUSD]);

  // Top 5 posições por valor em BRL
  const topAplicacoes = useMemo(() =>
    [...aplicacoes]
      .sort((a, b) => toBRL(Number(b.valor), b.moeda, cotacaoUSD) - toBRL(Number(a.valor), a.moeda, cotacaoUSD))
      .slice(0, 5),
    [aplicacoes, cotacaoUSD]
  );

  const emptyChart = (msg) => (
    <div style={{ color: "#3A3000", textAlign: "center", padding: "40px 0", fontSize: 14 }}>{msg}</div>
  );

  return (
    <>
      {/* Cards de resumo */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 24 }}>
        <SummaryCard label="Patrimônio Aplicado"   value={fmtBRL(patrimonioBRL)}      sub={`${aplicacoes.length} aplicação(ões)`}    color="#E8C97A" />
        <SummaryCard label="Proventos Recebidos"   value={fmtBRL(totalProventosBRL)}  sub={`${proventos.length} lançamento(s)`}      color="#C9A84C" />
        <SummaryCard label="Proventos Disponíveis" value={fmtBRL(proventosLivresBRL)} sub="não reaplicados"                          color={proventosLivresBRL > 0 ? "#6BBF6B" : "#5A4A20"} />
      </div>

      {/* Gráficos */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>

        {/* Distribuição por categoria */}
        <div style={{ background: "#141000", border: "1px solid #2A2000", borderRadius: 12, padding: 22 }}>
          <div style={{ fontSize: 12, color: "#C9A84C", letterSpacing: 1, marginBottom: 14, textTransform: "uppercase" }}>Distribuição por Categoria</div>
          {byCategoria.length === 0 ? emptyChart("Nenhum dado") : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={byCategoria} cx="50%" cy="50%" outerRadius={85} dataKey="value" stroke="none">
                    {byCategoria.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmtBRL(v)} contentStyle={{ background: "#1A1500", border: "1px solid #3A3000", borderRadius: 8, color: "#E8C97A", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                {byCategoria.map((item, i) => (
                  <div key={item.name} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#A09060" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    {item.name}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Proventos por mês */}
        <div style={{ background: "#141000", border: "1px solid #2A2000", borderRadius: 12, padding: 22 }}>
          <div style={{ fontSize: 12, color: "#C9A84C", letterSpacing: 1, marginBottom: 14, textTransform: "uppercase" }}>Proventos por Mês</div>
          {proventosPorMes.length === 0 ? emptyChart("Nenhum provento") : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={proventosPorMes}>
                <defs>
                  <linearGradient id="gradProv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#C9A84C" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A1500" />
                <XAxis dataKey="mes" tick={{ fill: "#5A4A20", fontSize: 10 }} />
                <YAxis tick={{ fill: "#5A4A20", fontSize: 10 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(1)}k`} />
                <Tooltip formatter={(v) => fmtBRL(v)} contentStyle={{ background: "#1A1500", border: "1px solid #3A3000", borderRadius: 8, color: "#E8C97A", fontSize: 12 }} />
                <Area type="monotone" dataKey="total" stroke="#C9A84C" fill="url(#gradProv)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Ranking de posições */}
        <div style={{ background: "#141000", border: "1px solid #2A2000", borderRadius: 12, padding: 22, gridColumn: "1 / -1" }}>
          <div style={{ fontSize: 12, color: "#C9A84C", letterSpacing: 1, marginBottom: 16, textTransform: "uppercase" }}>Maiores Posições</div>
          {topAplicacoes.length === 0 ? emptyChart("Nenhuma aplicação") : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {topAplicacoes.map((inv, i) => {
                const valBRL = toBRL(Number(inv.valor), inv.moeda, cotacaoUSD);
                const pct    = patrimonioBRL > 0 ? (valBRL / patrimonioBRL) * 100 : 0;
                return (
                  <div key={inv.id} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: CHART_COLORS[i % CHART_COLORS.length], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#0D0D0D", fontWeight: "bold", flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: "#E8C97A", display: "flex", alignItems: "center", gap: 8 }}>
                        {inv.nome}
                        {inv.moeda === "USD" && <span style={{ fontSize: 10, background: "#1A2A3A", border: "1px solid #2A4A6A", borderRadius: 10, padding: "1px 7px", color: "#6AAFD4" }}>USD</span>}
                      </div>
                      <div style={{ fontSize: 11, color: "#5A4A20" }}>{inv.categoria}{inv.corretora && ` · ${inv.corretora}`}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 14, color: "#C9A84C", fontWeight: "bold" }}>{fmtBRL(valBRL)}</div>
                      {inv.moeda === "USD" && <div style={{ fontSize: 11, color: "#6AAFD4" }}>{fmtUSD(inv.valor)}</div>}
                      <div style={{ fontSize: 11, color: "#5A4A20" }}>{pct.toFixed(1)}%</div>
                    </div>
                    <div style={{ width: 70, height: 4, background: "#1E1800", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: CHART_COLORS[i % CHART_COLORS.length], borderRadius: 4 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
