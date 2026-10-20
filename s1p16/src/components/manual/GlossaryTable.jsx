export function GlossaryTable({ glossary }) {
  if (glossary.length === 0) return null
  return (
    <section className="card manual-section">
      <h2 className="card-title">Glossary</h2>
      <table className="table">
        <tbody>
          {glossary.map((g) => (
            <tr key={g.term}>
              <th scope="row">{g.term}</th>
              <td>{g.meaning}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
