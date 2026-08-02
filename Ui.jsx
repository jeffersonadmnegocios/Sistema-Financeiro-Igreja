export const brl = (value) =>
  Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })

export const dateBR = (value) =>
  value ? value.split('-').reverse().join('/') : ''

export function Card({ label, value, tone = '' }) {
  return (
    <article className="card">
      <span>{label}</span>
      <strong className={tone}>{value}</strong>
    </article>
  )
}

export function Panel({ title, subtitle, children }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

export function Empty({ children = 'Nenhum registro encontrado.' }) {
  return <p className="empty">{children}</p>
}
