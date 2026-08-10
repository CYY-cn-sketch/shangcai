import { normalizeBusinessModelCanvas, type BusinessModelCanvasBlock } from "./businessModelCanvasModel";

export function BusinessModelCanvas(props: { blocks: BusinessModelCanvasBlock[] }) {
  const sections = normalizeBusinessModelCanvas(props.blocks);
  return (
    <section className="business-model-canvas" aria-label="商业模式画布">
      <header>
        <div>
          <span>Business Model Canvas</span>
          <h4>商业模式画布</h4>
        </div>
        <em>九模块结构化视图</em>
      </header>
      <div className="business-model-canvas-grid">
        {sections.map((section) => (
          <article className={`canvas-cell canvas-${section.key}`} key={section.key}>
            <strong>{section.label}</strong>
            {section.items.length ? (
              <ul>
                {section.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            ) : (
              <p>待补充</p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
