import React, { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { RefreshCcw } from "lucide-react";

// pdf.js worker (Vite)
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
).toString();

const blockEvent = (e) => e.preventDefault();

/**
 * Sandboxed iframe: no `allow-popups` => the embedded viewer can't open a new tab
 * (Drive "pop-out" / Google viewer "open" buttons stop working).
 * A transparent overlay also covers the top-right toolbar area.
 */
export const SecureEmbed = ({ src, title }) => (
    <div className="relative w-full h-full" onContextMenu={blockEvent}>
        <iframe
            src={src}
            title={title}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
            referrerPolicy="no-referrer"
        />
        {/* covers the pop-out / download buttons of Drive & Google viewer */}
        <div className="absolute top-0 right-0 w-28 h-14 z-10" />
    </div>
);

/**
 * Renders the PDF pages onto <canvas> with pdf.js.
 * No browser PDF toolbar => no download / print / open-in-new-tab buttons.
 */
const SecurePdfViewer = ({ url, title }) => {
    const containerRef = useRef(null);
    const [width, setWidth] = useState(800);
    const [fileData, setFileData] = useState(null);
    const [numPages, setNumPages] = useState(0);
    const [status, setStatus] = useState("loading"); // loading | ready | error

    // Fetch the PDF bytes (needs CORS on the backend)
    useEffect(() => {
        let cancelled = false;
        setStatus("loading");
        setFileData(null);
        setNumPages(0);

        fetch(url)
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.arrayBuffer();
            })
            .then((buf) => {
                if (cancelled) return;
                setFileData(new Uint8Array(buf));
                setStatus("ready");
            })
            .catch((err) => {
                console.warn("PDF fetch failed, using Google viewer:", err);
                if (!cancelled) setStatus("error");
            });

        return () => {
            cancelled = true;
        };
    }, [url]);

    // Fit pages to container width
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver(([entry]) => {
            setWidth(Math.min(entry.contentRect.width - 32, 1000));
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Memoized so react-pdf doesn't reload on every render
    const file = useMemo(
        () => (fileData ? { data: fileData } : null),
        [fileData],
    );

    const loader = (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/80">
            <RefreshCcw size={28} className="animate-spin" />
            <span className="text-sm font-medium">Loading PDF…</span>
        </div>
    );

    // Fallback if CORS blocks the fetch
    if (status === "error") {
        return (
            <SecureEmbed
                title={title}
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(
                    url,
                )}&embedded=true`}
            />
        );
    }

    return (
        <div
            ref={containerRef}
            className="w-full h-full overflow-y-auto select-none"
            onContextMenu={blockEvent}
            onDragStart={blockEvent}
            onCopy={blockEvent}
        >
            {status === "loading" || !file ? (
                loader
            ) : (
                <Document
                    file={file}
                    loading={loader}
                    onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                    onLoadError={() => setStatus("error")}
                    className="flex flex-col items-center gap-4 py-4"
                >
                    {Array.from({ length: numPages }, (_, i) => (
                        <Page
                            key={i}
                            pageNumber={i + 1}
                            width={width}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                            className="shadow-lg"
                        />
                    ))}
                </Document>
            )}
        </div>
    );
};

export default SecurePdfViewer;