import { useEffect, useRef } from "react";
import HlsPlayer from "@/components/portal/HlsPlayer";
import SecurePdfViewer, { SecureEmbed } from "@/pages/Attent/SecurePdfViewer";

/** Google Drive share links → the embeddable /preview URL (other URLs pass through). */
export const toEmbedUrl = (url) => {
  if (!url || typeof url !== "string") return "";
  const m = url.match(/\/d\/([^/]+)/) || url.match(/id=([^&]+)/);
  return m && m[1] ? `https://drive.google.com/file/d/${m[1]}/preview` : url;
};
const isDrive = (url) => /drive\.google\.com|docs\.google\.com/.test(url || "");

/**
 * Full-screen viewer (design: Preview → pv-bg / pv-bar / pv-scroll).
 * item = { kind: "pdf" | "video", title, url?, streamUrl?, bunnyGuid? }
 *  - pdf: Drive links are embedded, other files are drawn with pdf.js
 *  - video: streamUrl → HLS player, bunnyGuid → Bunny iframe, url → embedded (Drive) player
 */
export default function MaterialViewer({ item, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !document.fullscreenElement && onClose();
    document.addEventListener("keydown", onKey);
    document.body.classList.add("overflow-hidden");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("overflow-hidden");
    };
  }, [onClose]);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) ref.current?.requestFullscreen?.().catch((err) => console.error(err));
    else document.exitFullscreen();
  };

  let body;
  if (item.kind === "pdf") {
    const src = toEmbedUrl(item.url);
    body = isDrive(src)
      ? <div className="flex-1 min-h-0 p-2 sm:p-4"><SecureEmbed src={src} title={item.title} /></div>
      : <div className="pv-scroll"><SecurePdfViewer url={item.url} title={item.title} /></div>;
  } else if (item.streamUrl) {
    body = (
      <div className="flex-1 min-h-0 flex items-center justify-center p-4">
        <div className="w-full max-w-5xl aspect-video bg-black rounded-xl overflow-hidden"><HlsPlayer key={item.streamUrl} src={item.streamUrl} title={item.title} /></div>
      </div>
    );
  } else if (item.bunnyGuid) {
    body = (
      <div className="flex-1 min-h-0 flex items-center justify-center p-4">
        <div className="w-full max-w-5xl aspect-video bg-black rounded-xl overflow-hidden">
          <iframe
            src={`https://iframe.mediadelivery.net/embed/427553/${item.bunnyGuid}?autoplay=true&loop=false&muted=false&preload=true&responsive=true`}
            title={item.title}
            className="w-full h-full border-0"
            loading="lazy"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      </div>
    );
  } else {
    body = <div className="flex-1 min-h-0 p-2 sm:p-4"><SecureEmbed src={toEmbedUrl(item.url)} title={item.title} /></div>;
  }

  return (
    <div ref={ref} className="pv-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pv-bar">
        <span className="pv-kind">{item.kind === "pdf" ? "PDF" : "Video"}</span>
        <p className="text-sm font-semibold text-white truncate flex-1 min-w-0">{item.title}</p>
        <button className="pv-tool wide hidden sm:inline-flex" onClick={toggleFullScreen}>Fullscreen</button>
        <button className="pv-tool" onClick={onClose} aria-label="Close preview">✕</button>
      </div>
      {body}
    </div>
  );
}
