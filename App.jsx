import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'
import { brl, dateBR, Card, Panel, Empty } from './components/Ui'

const menuItems = [
  ['dashboard', 'Dashboard'],
  ['lancamentos', 'Lançamentos'],
  ['orcamento', 'Orçamento Anual'],
  ['fluxo', 'Fluxo de Caixa'],
  ['fundos', 'Fundos'],
  ['ministerios', 'Ministérios'],
  ['eventos', 'Eventos'],
  ['relatorios', 'Relatórios']
]

const currentYear = new Date().getFullYear()

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [page, setPage] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [data, setData] = useState({
    contas: [],
    lancamentos: [],
    fundos: [],
    ministerios: [],
    eventos: [],
    orcamentos: []
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: authData }) => {
      setSession(authData.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) loadAll()
    else setProfile(null)
  }, [session])

  async function loadAll() {
    setLoading(true)

    const { data: profileData, error: profileError } = await supabase
      .from('perfis')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (profileError) {
      setProfile(null)
      setLoading(false)
      return
    }

    setProfile(profileData)

    const [contas, lancamentos, fundos, ministerios, eventos, orcamentos] = await Promise.all([
      supabase.from('plano_contas').select('*').eq('ativo', true).order('codigo'),
      supabase
        .from('lancamentos')
        .select('*, plano_contas(nome,grupo), ministerios(nome), fundos(nome), eventos(nome)')
        .order('data_competencia', { ascending: false }),
      supabase.from('fundos').select('*').eq('ativo', true).order('nome'),
      supabase.from('ministerios').select('*').eq('ativo', true).order('nome'),
      supabase.from('eventos').select('*').order('data_inicio', { ascending: false }),
      supabase.from('orcamentos').select('*').eq('ano', currentYear)
    ])

    setData({
      contas: contas.data || [],
      lancamentos: lancamentos.data || [],
      fundos: fundos.data || [],
      ministerios: ministerios.data || [],
      eventos: eventos.data || [],
      orcamentos: orcamentos.data || []
    })
    setLoading(false)
  }

  if (loading) return <div className="screen-center">Carregando...</div>
  if (!session) return <Login />

  if (!profile) {
    return (
      <div className="screen-center error-box">
        <h2>Perfil não encontrado</h2>
        <p>O usuário foi autenticado, mas ainda não está vinculado à tabela public.perfis.</p>
        <button onClick={() => supabase.auth.signOut()}>Voltar ao login</button>
      </div>
    )
  }

  const title = menuItems.find(([id]) => id === page)?.[1] || 'Dashboard'

  return (
    <div className="app-shell">
      <aside className={menuOpen ? 'sidebar open' : 'sidebar'}>
        <div className="brand">
          <div className="brand-mark">FTB</div>
          <div>
            <strong>Gestão Financeira</strong>
            <span>Igreja</span>
          </div>
        </div>

        <nav>
          {menuItems.map(([id, label]) => (
            <button
              key={id}
              className={page === id ? 'active' : ''}
              onClick={() => {
                setPage(id)
                setMenuOpen(false)
              }}
            >
              {label}
            </button>
          ))}
        </nav>

        <button className="logout" onClick={() => supabase.auth.signOut()}>
          Sair
        </button>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
          <div>
            <h1>{title}</h1>
            <p>{profile.nome} • {profile.perfil}</p>
          </div>
        </header>

        <main>
          {page === 'dashboard' && <Dashboard lancamentos={data.lancamentos} />}
          {page === 'lancamentos' && (
            <Lancamentos
              profile={profile}
              userId={session.user.id}
              data={data}
              reload={loadAll}
            />
          )}
          {page === 'orcamento' && (
            <Orcamento profile={profile} data={data} reload={loadAll} />
          )}
          {page === 'fluxo' && <Fluxo lancamentos={data.lancamentos} />}
          {page === 'fundos' && <Fundos data={data} />}
          {page === 'ministerios' && <Ministerios data={data} />}
          {page === 'eventos' && (
            <Eventos profile={profile} data={data} reload={loadAll} />
          )}
          {page === 'relatorios' && <Relatorios lancamentos={data.lancamentos} />}
        </main>
      </section>
    </div>
  )
}

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  async function submit(event) {
    event.preventDefault()
    setMessage('Entrando...')

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setMessage(error ? 'Não foi possível entrar. Verifique o e-mail e a senha.' : '')
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="brand-mark large">FTB</div>
        <h1>Gestão Financeira</h1>
        <p>Primeira Igreja Tabernáculo Batista de Roraima</p>

        <label>
          E-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>

        <label>
          Senha
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>

        <button type="submit">Entrar</button>
        <small>{message}</small>
      </form>
    </div>
  )
}

function Dashboard({ lancamentos }) {
  const realized = lancamentos.filter((item) => item.status === 'realizado')
  const entradas = realized
    .filter((item) => item.tipo === 'entrada')
    .reduce((sum, item) => sum + Number(item.valor), 0)
  const saidas = realized
    .filter((item) => item.tipo === 'saida')
    .reduce((sum, item) => sum + Number(item.valor), 0)
  const saldo = entradas - saidas

  return (
    <>
      <div className="cards">
        <Card label="Entradas realizadas" value={brl(entradas)} />
        <Card label="Saídas realizadas" value={brl(saidas)} />
        <Card label="Saldo acumulado" value={brl(saldo)} tone={saldo >= 0 ? 'positive' : 'negative'} />
        <Card label="Lançamentos cadastrados" value={lancamentos.length} />
      </div>

      <Panel title="Últimos lançamentos" subtitle="Movimentações mais recentes">
        <LancamentosTable rows={lancamentos.slice(0, 10)} />
      </Panel>
    </>
  )
}

function Lancamentos({ profile, userId, data, reload }) {
  const initialForm = {
    conta_id: '',
    tipo: 'entrada',
    descricao: '',
    data_competencia: new Date().toISOString().slice(0, 10),
    data_pagamento: '',
    valor: '',
    status: 'previsto',
    ministerio_id: '',
    fundo_id: '',
    evento_id: '',
    forma_pagamento: '',
    documento: '',
    observacao: ''
  }

  const [form, setForm] = useState(initialForm)
  const [message, setMessage] = useState('')

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function save(event) {
    event.preventDefault()
    setMessage('Salvando...')

    const payload = {
      ...form,
      igreja_id: profile.igreja_id,
      valor: Number(form.valor),
      criado_por: userId
    }

    for (const key of ['data_pagamento','ministerio_id','fundo_id','evento_id','forma_pagamento','documento','observacao']) {
      if (!payload[key]) payload[key] = null
    }

    const { error } = await supabase.from('lancamentos').insert(payload)
    if (error) {
      setMessage(`Erro: ${error.message}`)
      return
    }

    setForm(initialForm)
    setMessage('Lançamento salvo.')
    await reload()
  }

  async function remove(id) {
    if (!window.confirm('Deseja excluir este lançamento?')) return
    const { error } = await supabase.from('lancamentos').delete().eq('id', id)
    if (error) window.alert(error.message)
    else reload()
  }

  return (
    <>
      <Panel title="Novo lançamento" subtitle="Cadastre receitas e despesas previstas ou realizadas">
        <form onSubmit={save}>
          <div className="form-grid">
            <label>
              Conta
              <select value={form.conta_id} onChange={(e) => update('conta_id', e.target.value)} required>
                <option value="">Selecione</option>
                {data.contas.map((item) => (
                  <option key={item.id} value={item.id}>{item.codigo} - {item.nome}</option>
                ))}
              </select>
            </label>

            <label>
              Tipo
              <select value={form.tipo} onChange={(e) => update('tipo', e.target.value)}>
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
              </select>
            </label>

            <label>
              Descrição
              <input value={form.descricao} onChange={(e) => update('descricao', e.target.value)} required />
            </label>

            <label>
              Competência
              <input type="date" value={form.data_competencia} onChange={(e) => update('data_competencia', e.target.value)} required />
            </label>

            <label>
              Pagamento/recebimento
              <input type="date" value={form.data_pagamento} onChange={(e) => update('data_pagamento', e.target.value)} />
            </label>

            <label>
              Valor
              <input type="number" step="0.01" min="0" value={form.valor} onChange={(e) => update('valor', e.target.value)} required />
            </label>

            <label>
              Status
              <select value={form.status} onChange={(e) => update('status', e.target.value)}>
                <option value="previsto">Previsto</option>
                <option value="realizado">Realizado</option>
              </select>
            </label>

            <label>
              Ministério
              <select value={form.ministerio_id} onChange={(e) => update('ministerio_id', e.target.value)}>
                <option value="">Nenhum</option>
                {data.ministerios.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
              </select>
            </label>

            <label>
              Fundo
              <select value={form.fundo_id} onChange={(e) => update('fundo_id', e.target.value)}>
                <option value="">Nenhum</option>
                {data.fundos.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
              </select>
            </label>

            <label>
              Evento
              <select value={form.evento_id} onChange={(e) => update('evento_id', e.target.value)}>
                <option value="">Nenhum</option>
                {data.eventos.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
              </select>
            </label>
          </div>

          <label>
            Observação
            <textarea value={form.observacao} onChange={(e) => update('observacao', e.target.value)} />
          </label>

          <div className="form-actions">
            <button type="submit">Salvar lançamento</button>
            <span>{message}</span>
          </div>
        </form>
      </Panel>

      <Panel title="Movimentações" subtitle="Histórico de lançamentos">
        <LancamentosTable rows={data.lancamentos} onDelete={remove} />
      </Panel>
    </>
  )
}

function LancamentosTable({ rows, onDelete }) {
  if (!rows.length) return <Empty />

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Descrição</th>
            <th>Conta</th>
            <th>Tipo</th>
            <th>Status</th>
            <th>Valor</th>
            {onDelete && <th>Ação</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={item.id}>
              <td>{dateBR(item.data_competencia)}</td>
              <td>{item.descricao}</td>
              <td>{item.plano_contas?.nome || ''}</td>
              <td><span className={`badge ${item.tipo}`}>{item.tipo}</span></td>
              <td>{item.status}</td>
              <td>{brl(item.valor)}</td>
              {onDelete && (
                <td><button className="danger" onClick={() => onDelete(item.id)}>Excluir</button></td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Orcamento({ profile, data, reload }) {
  async function save(contaId, month, value) {
    const existing = data.orcamentos.find(
      (item) => item.conta_id === contaId && item.ano === currentYear && item.mes === month
    )

    if (existing) {
      await supabase.from('orcamentos').update({ valor_previsto: Number(value || 0) }).eq('id', existing.id)
    } else {
      await supabase.from('orcamentos').insert({
        igreja_id: profile.igreja_id,
        conta_id: contaId,
        ano: currentYear,
        mes: month,
        valor_previsto: Number(value || 0)
      })
    }
    reload()
  }

  return (
    <Panel title={`Orçamento ${currentYear}`} subtitle="Previsto, realizado e variação mensal">
      <div className="table-wrap budget-table">
        <table>
          <thead>
            <tr>
              <th>Conta</th>
              {Array.from({ length: 12 }, (_, index) => <th key={index}>{index + 1}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.contas.map((conta) => (
              <tr key={conta.id}>
                <td>{conta.nome}</td>
                {Array.from({ length: 12 }, (_, index) => {
                  const month = index + 1
                  const budget = data.orcamentos.find(
                    (item) => item.conta_id === conta.id && item.ano === currentYear && item.mes === month
                  )
                  const realized = data.lancamentos
                    .filter((item) =>
                      item.conta_id === conta.id &&
                      item.status === 'realizado' &&
                      Number(item.data_competencia.slice(5, 7)) === month
                    )
                    .reduce((sum, item) => sum + Number(item.valor), 0)

                  return (
                    <td key={month}>
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={budget?.valor_previsto || 0}
                        onBlur={(e) => save(conta.id, month, e.target.value)}
                      />
                      <small>Real: {brl(realized)}</small>
                      <small>Δ: {brl(realized - Number(budget?.valor_previsto || 0))}</small>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

function Fluxo({ lancamentos }) {
  const rows = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1
    const items = lancamentos.filter(
      (item) =>
        item.status === 'realizado' &&
        Number(item.data_competencia.slice(5, 7)) === month
    )
    const entradas = items.filter((item) => item.tipo === 'entrada').reduce((sum, item) => sum + Number(item.valor), 0)
    const saidas = items.filter((item) => item.tipo === 'saida').reduce((sum, item) => sum + Number(item.valor), 0)
    return { month, entradas, saidas, saldo: entradas - saidas }
  })

  return (
    <Panel title="Fluxo de Caixa Consolidado" subtitle="Entradas, saídas e saldo realizado por mês">
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Mês</th><th>Entradas</th><th>Saídas</th><th>Saldo</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.month}>
                <td>{row.month}</td>
                <td>{brl(row.entradas)}</td>
                <td>{brl(row.saidas)}</td>
                <td className={row.saldo >= 0 ? 'positive' : 'negative'}>{brl(row.saldo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

function Fundos({ data }) {
  return (
    <div className="cards">
      {data.fundos.map((fundo) => {
        const movement = data.lancamentos
          .filter((item) => item.fundo_id === fundo.id && item.status === 'realizado')
          .reduce((sum, item) => sum + (item.tipo === 'entrada' ? Number(item.valor) : -Number(item.valor)), 0)

        return <Card key={fundo.id} label={fundo.nome} value={brl(Number(fundo.saldo_inicial) + movement)} />
      })}
    </div>
  )
}

function Ministerios({ data }) {
  return (
    <div className="cards">
      {data.ministerios.map((ministerio) => {
        const balance = data.lancamentos
          .filter((item) => item.ministerio_id === ministerio.id && item.status === 'realizado')
          .reduce((sum, item) => sum + (item.tipo === 'entrada' ? Number(item.valor) : -Number(item.valor)), 0)

        return (
          <Card
            key={ministerio.id}
            label={ministerio.nome}
            value={brl(balance)}
            tone={balance >= 0 ? 'positive' : 'negative'}
          />
        )
      })}
    </div>
  )
}

function Eventos({ profile, data, reload }) {
  const [form, setForm] = useState({
    nome: '',
    ministerio_id: '',
    data_inicio: '',
    data_fim: '',
    orcamento_previsto: '',
    status: 'planejado',
    descricao: ''
  })

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function save(event) {
    event.preventDefault()
    const payload = {
      ...form,
      igreja_id: profile.igreja_id,
      ministerio_id: form.ministerio_id || null,
      data_inicio: form.data_inicio || null,
      data_fim: form.data_fim || null,
      orcamento_previsto: Number(form.orcamento_previsto || 0),
      descricao: form.descricao || null
    }

    const { error } = await supabase.from('eventos').insert(payload)
    if (error) window.alert(error.message)
    else {
      setForm({
        nome: '',
        ministerio_id: '',
        data_inicio: '',
        data_fim: '',
        orcamento_previsto: '',
        status: 'planejado',
        descricao: ''
      })
      reload()
    }
  }

  return (
    <>
      <Panel title="Novo evento">
        <form onSubmit={save}>
          <div className="form-grid">
            <label>Nome<input value={form.nome} onChange={(e) => update('nome', e.target.value)} required /></label>
            <label>
              Ministério
              <select value={form.ministerio_id} onChange={(e) => update('ministerio_id', e.target.value)}>
                <option value="">Nenhum</option>
                {data.ministerios.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
              </select>
            </label>
            <label>Data inicial<input type="date" value={form.data_inicio} onChange={(e) => update('data_inicio', e.target.value)} /></label>
            <label>Data final<input type="date" value={form.data_fim} onChange={(e) => update('data_fim', e.target.value)} /></label>
            <label>Orçamento<input type="number" step="0.01" value={form.orcamento_previsto} onChange={(e) => update('orcamento_previsto', e.target.value)} /></label>
            <label>
              Status
              <select value={form.status} onChange={(e) => update('status', e.target.value)}>
                <option value="planejado">Planejado</option>
                <option value="aprovado">Aprovado</option>
                <option value="em_execucao">Em execução</option>
                <option value="concluido">Concluído</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </label>
          </div>
          <button type="submit">Salvar evento</button>
        </form>
      </Panel>

      <Panel title="Eventos cadastrados">
        {data.eventos.length ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Evento</th><th>Início</th><th>Status</th><th>Orçamento</th></tr></thead>
              <tbody>
                {data.eventos.map((item) => (
                  <tr key={item.id}>
                    <td>{item.nome}</td>
                    <td>{dateBR(item.data_inicio)}</td>
                    <td>{item.status}</td>
                    <td>{brl(item.orcamento_previsto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty />}
      </Panel>
    </>
  )
}

function Relatorios({ lancamentos }) {
  function exportCsv() {
    const rows = [
      ['Data','Descrição','Conta','Tipo','Status','Valor'],
      ...lancamentos.map((item) => [
        item.data_competencia,
        item.descricao,
        item.plano_contas?.nome || '',
        item.tipo,
        item.status,
        item.valor
      ])
    ]

    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(';'))
      .join('\n')

    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv' }))
    link.download = 'lancamentos-financeiros.csv'
    link.click()
  }

  return (
    <Panel title="Relatórios">
      <div className="report-actions">
        <button onClick={exportCsv}>Exportar lançamentos em CSV</button>
        <button className="secondary" onClick={() => window.print()}>Imprimir</button>
      </div>
    </Panel>
  )
}
