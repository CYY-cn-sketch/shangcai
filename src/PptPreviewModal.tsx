import { useState } from "react";
import { Download, MonitorPlay, X } from "lucide-react";
import { parsePptSlideOutline } from "./pptxBuilder";

type PptPreviewAsset = {
  title: string;
  pptKnowledgeContent?: string;
  pptKnowledgeReferences?: Array<{ title: string; url?: string }>;
  pptUsesLexiang?: boolean;
  pptUrl?: string;
  pptFileName?: string;
};

const previewImages = Array.from(
  { length: 10 },
  (_, index) => `/demo-assets/ppt-preview/slide-${String(index + 1).padStart(2, "0")}.png`,
);

function triggerDownload(href: string, filename: string) {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.rel = "noreferrer";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function PptPreviewModal(props: { asset: PptPreviewAsset; onClose: () => void }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const generatedSlides = parsePptSlideOutline(props.asset.pptKnowledgeContent);
  const activeMeta = generatedSlides[activeSlide] || generatedSlides[0];
  const sourceLabel = props.asset.pptUsesLexiang ? "乐享内容 + 平台组装" : "平台预置结构";
  const references = props.asset.pptKnowledgeReferences || [];
  const visibleReferences = references.slice(0, 3);
  const hiddenReferenceCount = Math.max(0, references.length - visibleReferences.length);

  return (
    <div className="modal-backdrop preview-modal-backdrop" role="presentation">
      <section className="media-modal ppt-modal" role="dialog" aria-modal="true" aria-label="预览路演 PPT">
        <header>
          <div>
            <span className="eyebrow">{sourceLabel}</span>
            <h3>{props.asset.title}</h3>
            <p>
              {props.asset.pptUsesLexiang
                ? "页面观点来自乐享知识库，PPTX 文件由平台组装并持久化；预览图片仅用于展示版式。"
                : "乐享不可用时，平台会使用预置课程结构组装真实 PPTX，不会伪装成供应商生成结果。"}
            </p>
          </div>
          <button className="modal-close-button" type="button" onClick={props.onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </header>
        <div className="ppt-image-preview-body">
          <section className="ppt-image-stage">
            <img src={previewImages[activeSlide]} alt={`PPT 第 ${activeSlide + 1} 页预览`} />
            <div className="ppt-slide-bottom">
              <article className="ppt-slide-meta-card">
                <span>{String(activeSlide + 1).padStart(2, "0")} / {previewImages.length}</span>
                <strong>{activeMeta[0]}</strong>
                <p>{activeMeta[1]} · {activeMeta[2]}</p>
              </article>
              {visibleReferences.length ? (
                <article className="ppt-reference-card">
                  <span>引用来源</span>
                  <div>
                    {visibleReferences.map((reference) =>
                      reference.url ? (
                        <a href={reference.url} key={`${reference.title}-${reference.url}`} target="_blank" rel="noreferrer">
                          {reference.title}
                        </a>
                      ) : (
                        <em key={reference.title}>{reference.title}</em>
                      ),
                    )}
                    {hiddenReferenceCount > 0 && <em>+{hiddenReferenceCount} 个来源</em>}
                  </div>
                </article>
              ) : (
                <article className="ppt-reference-card muted">
                  <span>引用来源</span>
                  <p>暂无外部来源，当前页使用平台预置课程结构。</p>
                </article>
              )}
            </div>
          </section>
          <section className="ppt-thumb-strip" aria-label="PPT 页面缩略图">
            {previewImages.map((image, index) => (
              <button className={activeSlide === index ? "active" : ""} key={image} type="button" onClick={() => setActiveSlide(index)}>
                <img src={image} alt={`第 ${index + 1} 页缩略图`} />
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{generatedSlides[index]?.[0] || `第 ${index + 1} 页`}</strong>
              </button>
            ))}
          </section>
        </div>
        <footer className="context-actions">
          {props.asset.pptUrl ? (
            <a className="button-link" href={props.asset.pptUrl} target="_blank" rel="noreferrer">
              <MonitorPlay size={15} />
              浏览器打开
            </a>
          ) : (
            <button type="button" disabled title="PPTX 文件尚未生成">
              <MonitorPlay size={15} />
              PPTX 尚未生成
            </button>
          )}
          <button
            type="button"
            disabled={!props.asset.pptUrl}
            onClick={() => props.asset.pptUrl && triggerDownload(props.asset.pptUrl, props.asset.pptFileName || `${props.asset.title}.pptx`)}
          >
            <Download size={15} />
            下载 PPTX
          </button>
        </footer>
      </section>
    </div>
  );
}
