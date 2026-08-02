import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import './styles.css'

const menu = [
  ['dashboard','Dashboard'],
  ['lancamentos','Lançamentos'],
  ['orcamento','Orçamento'],
  ['fluxo','Fluxo de Caixa'],
  ['fundos','Fundos'],
  ['ministerios','Ministérios'],
  ['eventos','Eventos'],
  ['relatorios','Relatórios']
]

const brl = (v) => Number(v || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const dateBR = (d) => d ? d.split('-').reverse().join('/') : ''

export default function App(){
  const [session,setSession] = useState(null)
  const [profile,setProfile] = useState(null)
  const [page,setPage] = useState('dashboard')
  const [loading,setLoading] = useState(true)
  const [contas,setContas] = useState([])
  const [lancamentos,setLancamentos] = useState([])
  const [fundos,setFundos] = useState([])
  const [ministerios,setMinisterios] = useState([])
  const [eventos,setEventos] = useState([])
  const [orcamentos,setOrcamentos] = useState([])

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>{
      setSession(data.session)
      setLoading(false)
    })
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event,s)=>{
      setSession(s)
    })
    return ()=>subscription.unsubscribe()
  },[])

  useEffect(()=>{
    if(!session) return
    loadAll()
  },[session])

  async function loadAll(){
    setLoading(true)
    const {data:p} = await supabase.from('perfis').select('*').eq('id',session.user.id).single()
    setProfile(p || null)
    const [c,l,f,m,e,o] = await Promise.all([
      supabase.from('plano_contas').select('*').eq('ativo',true).order('codigo'),
      supabase.from('lancamentos').select('*,plano_contas(nome,grupo),ministerios(nome),fundos(nome),eventos(nome)').order('data_competencia',{ascending:false}),
      supabase.from('fundos').select('*').eq('ativo',true).order('nome'),
      supabase.from('ministerios').select('*').eq('ativo',true).order('nome'),
      supabase.from('eventos').select('*').order('data_inicio',{ascending:false}),
      supabase.from('orcamentos').select('*')
    ])
    setContas(c.data || [])
    setLancamentos(l.data || [])
    setFundos(f.data || [])
    setMinisterios(m.data || [])
    setEventos(e.data || [])
    setOrcamentos(o.data || [])
    setLoading(false)
  }

  if(loading) return <div className="center">Carregando...</div>
  if(!session) return <Login/>
  if(!profile) return <div className="center">Usuário autenticado, mas sem perfil vinculado à igreja.</div>

  return (
    <div className="layout">
      <aside>
        <div className="brand">
          <div className="logo">FTB</div>
          <div><strong>Gestão Financeira</strong><span>Igrejas</span></div>
        </div>
        <nav>
          {menu.map(([id,label])=>
            <button key={id} className={page===id?'active':''} onClick={()=>setPage(id)}>{label}</button>
          )}
        </nav>
        <button className="logout" onClick={()=>supabase.auth.signOut()}>Sair</button>
      </aside>

      <section className="content">
        <header>
          <div><h1>{menu.find(x=>x[0]===page)?.[1]}</h1><p>{profile.nome} • {profile.perfil}</p></div>
        </header>
        <main>
          {page==='dashboard' && <Dashboard lancamentos={lancamentos}/>}
          {page==='lancamentos' && <Lancamentos profile={profile} contas={contas} fundos={fundos} ministerios={ministerios} eventos={eventos} lancamentos={lancamentos} reload={loadAll}/>}
          {page==='orcamento' && <Orcamento profile={profile} contas={contas} lancamentos={lancamentos} orcamentos={orcamentos} reload={loadAll}/>}
          {page==='fluxo' && <Fluxo lancamentos={lancamentos}/>}
          {page==='fundos' && <Fundos fundos={fundos} lancamentos={lancamentos}/>}
          {page==='ministerios' && <Ministerios ministerios={ministerios} lancamentos={lancamentos}/>}
          {page==='eventos' && <Eventos profile={profile} ministerios={ministerios} eventos={eventos} reload={loadAll}/>}
          {page==='relatorios' && <Relatorios lancamentos={lancamentos}/>}
        </main>
      </section>
    </div>
  )
}

function Login(){
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [msg,setMsg]=useState('')
  async function login(e){
    e.preventDefault()
    setMsg('Entrando...')
    const {error}=await supabase.auth.signInWithPassword({email,password})
    setMsg(error ? 'E-mail ou senha inválidos.' : '')
  }
  return <div className="login-bg">
    <form className="login-card" onSubmit={login}>
      <div className="logo">FTB</div>
      <h1>Gestão Financeira</h1>
      <p>Primeira Igreja Tabernáculo Batista de Roraima</p>
      <label>E-mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label>
      <label>Senha<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>
      <button>Entrar</button>
      <small>{msg}</small>
    </form>
  </div>
}

function Dashboard({lancamentos}){
  const realized=lancamentos.filter(x=>x.status==='realizado')
  const entradas=realized.filter(x=>x.tipo==='entrada').reduce((s,x)=>s+Number(x.valor),0)
  const saidas=realized.filter(x=>x.tipo==='saida').reduce((s,x)=>s+Number(x.valor),0)
  return <>
    <div className="cards">
      <Card t="Entradas realizadas" v={brl(entradas)}/>
      <Card t="Saídas realizadas" v={brl(saidas)}/>
      <Card t="Saldo acumulado" v={brl(entradas-saidas)} cls={entradas-saidas>=0?'ok':'bad'}/>
      <Card t="Lançamentos" v={lancamentos.length}/>
    </div>
    <Panel title="Últimos lançamentos"><LancTable rows={lancamentos.slice(0,10)}/></Panel>
  </>
}

function Lancamentos({profile,contas,fundos,ministerios,eventos,lancamentos,reload}){
  const [form,setForm]=useState({
    conta_id:'',tipo:'entrada',descricao:'',data_competencia:new Date().toISOString().slice(0,10),
    data_pagamento:'',valor:'',status:'previsto',ministerio_id:'',fundo_id:'',evento_id:'',forma_pagamento:'',documento:'',observacao:''
  })
  function upd(k,v){setForm({...form,[k]:v})}
  async function save(e){
    e.preventDefault()
    const payload={...form,igreja_id:profile.igreja_id,valor:Number(form.valor),criado_por:profile.id}
    ;['data_pagamento','ministerio_id','fundo_id','evento_id','forma_pagamento','documento','observacao'].forEach(k=>{if(!payload[k])payload[k]=null})
    const {error}=await supabase.from('lancamentos').insert(payload)
    if(error) return alert(error.message)
    setForm({...form,descricao:'',valor:'',documento:'',observacao:''})
    reload()
  }
  async function del(id){
    if(!confirm('Excluir este lançamento?'))return
    await supabase.from('lancamentos').delete().eq('id',id)
    reload()
  }
  return <>
    <Panel title="Novo lançamento">
      <form onSubmit={save}>
        <div className="form-grid">
          <label>Conta<select value={form.conta_id} onChange={e=>upd('conta_id',e.target.value)} required><option value="">Selecione</option>{contas.map(x=><option key={x.id} value={x.id}>{x.codigo} - {x.nome}</option>)}</select></label>
          <label>Tipo<select value={form.tipo} onChange={e=>upd('tipo',e.target.value)}><option value="entrada">Entrada</option><option value="saida">Saída</option></select></label>
          <label>Descrição<input value={form.descricao} onChange={e=>upd('descricao',e.target.value)} required/></label>
          <label>Competência<input type="date" value={form.data_competencia} onChange={e=>upd('data_competencia',e.target.value)} required/></label>
          <label>Pagamento<input type="date" value={form.data_pagamento} onChange={e=>upd('data_pagamento',e.target.value)}/></label>
          <label>Valor<input type="number" step="0.01" value={form.valor} onChange={e=>upd('valor',e.target.value)} required/></label>
          <label>Status<select value={form.status} onChange={e=>upd('status',e.target.value)}><option value="previsto">Previsto</option><option value="realizado">Realizado</option></select></label>
          <label>Ministério<select value={form.ministerio_id} onChange={e=>upd('ministerio_id',e.target.value)}><option value="">Nenhum</option>{ministerios.map(x=><option key={x.id} value={x.id}>{x.nome}</option>)}</select></label>
          <label>Fundo<select value={form.fundo_id} onChange={e=>upd('fundo_id',e.target.value)}><option value="">Nenhum</option>{fundos.map(x=><option key={x.id} value={x.id}>{x.nome}</option>)}</select></label>
          <label>Evento<select value={form.evento_id} onChange={e=>upd('evento_id',e.target.value)}><option value="">Nenhum</option>{eventos.map(x=><option key={x.id} value={x.id}>{x.nome}</option>)}</select></label>
        </div>
        <button className="primary">Salvar lançamento</button>
      </form>
    </Panel>
    <Panel title="Movimentações"><LancTable rows={lancamentos} onDelete={del}/></Panel>
  </>
}

function Orcamento({profile,contas,lancamentos,orcamentos,reload}){
  const year=new Date().getFullYear()
  async function save(conta,mes,valor){
    const existing=orcamentos.find(o=>o.conta_id===conta&&o.ano===year&&o.mes===mes)
    if(existing) await supabase.from('orcamentos').update({valor_previsto:Number(valor||0)}).eq('id',existing.id)
    else await supabase.from('orcamentos').insert({igreja_id:profile.igreja_id,conta_id:conta,ano:year,mes,valor_previsto:Number(valor||0)})
    reload()
  }
  return <Panel title={`Orçamento ${year}`}>
    <div className="table-wrap"><table><thead><tr><th>Conta</th>{Array.from({length:12},(_,i)=><th key={i}>{i+1}</th>)}</tr></thead>
    <tbody>{contas.map(c=><tr key={c.id}><td>{c.nome}</td>{Array.from({length:12},(_,i)=>{
      const m=i+1
      const o=orcamentos.find(x=>x.conta_id===c.id&&x.ano===year&&x.mes===m)
      const real=lancamentos.filter(l=>l.conta_id===c.id&&l.status==='realizado'&&Number(l.data_competencia.slice(5,7))===m).reduce((s,l)=>s+Number(l.valor),0)
      return <td key={m}><input type="number" defaultValue={o?.valor_previsto||0} onBlur={e=>save(c.id,m,e.target.value)}/><small>Real: {brl(real)}</small></td>
    })}</tr>)}</tbody></table></div>
  </Panel>
}

function Fluxo({lancamentos}){
  const rows=Array.from({length:12},(_,i)=>{
    const m=i+1
    const list=lancamentos.filter(x=>x.status==='realizado'&&Number(x.data_competencia.slice(5,7))===m)
    const ent=list.filter(x=>x.tipo==='entrada').reduce((s,x)=>s+Number(x.valor),0)
    const sai=list.filter(x=>x.tipo==='saida').reduce((s,x)=>s+Number(x.valor),0)
    return {m,ent,sai,saldo:ent-sai}
  })
  return <Panel title="Fluxo de caixa consolidado"><div className="table-wrap"><table><thead><tr><th>Mês</th><th>Entradas</th><th>Saídas</th><th>Saldo</th></tr></thead><tbody>{rows.map(r=><tr key={r.m}><td>{r.m}</td><td>{brl(r.ent)}</td><td>{brl(r.sai)}</td><td className={r.saldo>=0?'ok':'bad'}>{brl(r.saldo)}</td></tr>)}</tbody></table></div></Panel>
}

function Fundos({fundos,lancamentos}){
  return <div className="cards">{fundos.map(f=>{
    const mov=lancamentos.filter(l=>l.fundo_id===f.id&&l.status==='realizado').reduce((s,l)=>s+(l.tipo==='entrada'?Number(l.valor):-Number(l.valor)),0)
    return <Card key={f.id} t={f.nome} v={brl(Number(f.saldo_inicial)+mov)}/>
  })}</div>
}

function Ministerios({ministerios,lancamentos}){
  return <div className="cards">{ministerios.map(m=>{
    const list=lancamentos.filter(l=>l.ministerio_id===m.id&&l.status==='realizado')
    const saldo=list.reduce((s,l)=>s+(l.tipo==='entrada'?Number(l.valor):-Number(l.valor)),0)
    return <Card key={m.id} t={m.nome} v={brl(saldo)} cls={saldo>=0?'ok':'bad'}/>
  })}</div>
}

function Eventos({profile,ministerios,eventos,reload}){
  const [nome,setNome]=useState('')
  const [ministerio,setMinisterio]=useState('')
  const [data,setData]=useState('')
  async function save(e){
    e.preventDefault()
    const {error}=await supabase.from('eventos').insert({igreja_id:profile.igreja_id,nome,ministerio_id:ministerio||null,data_inicio:data||null})
    if(error)return alert(error.message)
    setNome('');setData('');reload()
  }
  return <>
    <Panel title="Novo evento"><form onSubmit={save} className="form-grid">
      <label>Nome<input value={nome} onChange={e=>setNome(e.target.value)} required/></label>
      <label>Ministério<select value={ministerio} onChange={e=>setMinisterio(e.target.value)}><option value="">Nenhum</option>{ministerios.map(x=><option key={x.id} value={x.id}>{x.nome}</option>)}</select></label>
      <label>Data<input type="date" value={data} onChange={e=>setData(e.target.value)}/></label>
      <button className="primary">Salvar</button>
    </form></Panel>
    <Panel title="Eventos"><div className="table-wrap"><table><thead><tr><th>Evento</th><th>Data</th><th>Status</th></tr></thead><tbody>{eventos.map(e=><tr key={e.id}><td>{e.nome}</td><td>{dateBR(e.data_inicio)}</td><td>{e.status}</td></tr>)}</tbody></table></div></Panel>
  </>
}

function Relatorios({lancamentos}){
  function csv(){
    const rows=[['Data','Descrição','Conta','Tipo','Status','Valor'],...lancamentos.map(x=>[x.data_competencia,x.descricao,x.plano_contas?.nome||'',x.tipo,x.status,x.valor])]
    const text=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(';')).join('\n')
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+text],{type:'text/csv'}));a.download='lancamentos.csv';a.click()
  }
  return <Panel title="Relatórios"><button className="primary" onClick={csv}>Exportar lançamentos CSV</button></Panel>
}

function Card({t,v,cls=''}){return <div className="card"><span>{t}</span><strong className={cls}>{v}</strong></div>}
function Panel({title,children}){return <section className="panel"><h2>{title}</h2>{children}</section>}
function LancTable({rows,onDelete}){
  return <div className="table-wrap"><table><thead><tr><th>Data</th><th>Descrição</th><th>Conta</th><th>Tipo</th><th>Status</th><th>Valor</th>{onDelete&&<th>Ação</th>}</tr></thead>
  <tbody>{rows.map(x=><tr key={x.id}><td>{dateBR(x.data_competencia)}</td><td>{x.descricao}</td><td>{x.plano_contas?.nome||''}</td><td>{x.tipo}</td><td>{x.status}</td><td>{brl(x.valor)}</td>{onDelete&&<td><button className="danger" onClick={()=>onDelete(x.id)}>Excluir</button></td>}</tr>)}</tbody></table></div>
}
