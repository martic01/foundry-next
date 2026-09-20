// Handles both youtu.be/<id> and youtube.com/watch?v=<id> (with or
// without extra query params like `si=`), and strips the video down to
// just its ID before building the embed URL -- an <iframe src> pointed
// at a full watch/share URL doesn't actually embed the player.
function getYoutubeEmbedUrl(url) {
  try {
    const u = new URL(url);
    let id = null;
    if (u.hostname.includes('youtu.be')) {
      id = u.pathname.slice(1);
    } else if (u.hostname.includes('youtube.com')) {
      id = u.searchParams.get('v');
    }
    if (!id) return null;
    return `https://www.youtube.com/embed/${id}`;
  } catch {
    return null;
  }
}

export default function VideoEmbed({ url, title }) {
  const embedUrl = getYoutubeEmbedUrl(url);
  if (!embedUrl) return null;

  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg border border-line bg-black">
      <iframe
        src={embedUrl}
        title={title}
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}
