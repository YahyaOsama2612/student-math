import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

/** HLS (Bunny signed .m3u8) player; Safari plays HLS natively. Download and right-click are blocked. */
const HlsPlayer = ({ src, title }) => {
  const videoRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return undefined;

    setFailed(false);
    let hls;

    if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) setFailed(true);
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari / iOS play HLS natively
      video.src = src;
      video.play().catch(() => {});
    } else {
      setFailed(true);
    }

    return () => {
      if (hls) hls.destroy();
    };
  }, [src]);

  if (failed) {
    return (
      <div className="w-full h-full flex items-center justify-center text-center text-white/80 text-sm px-6">
        Couldn&apos;t load this video. The link may have expired, please refresh
        the page.
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      title={title}
      controls
      playsInline
      controlsList="nodownload"
      onContextMenu={(e) => e.preventDefault()}
      className="w-full h-full bg-black"
    />
  );
};

export default HlsPlayer;
