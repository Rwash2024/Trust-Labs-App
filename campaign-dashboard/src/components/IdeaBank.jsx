export default function IdeaBank({ ideas, posts, onReuse }) {
  if (!ideas.length) return <p className="muted">لسه مفيش أفكار. اكتب أول فكرة 👆</p>
  return (
    <ul className="idea-bank">
      {ideas.map((i) => (
        <li key={i.id} className="card row between">
          <div>
            <strong>{i.text}</strong>
            <span className="muted"> · {posts.filter((p) => p.ideaId === i.id).length} منشور · {i.createdAt}</span>
          </div>
          <button type="button" className="btn" onClick={() => onReuse(i.text)}>استخدمها تاني</button>
        </li>
      ))}
    </ul>
  )
}
