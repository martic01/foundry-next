// Turns pasted text (one link per line) into [{ line, raw, title, url }].
// Accepted shapes per line:
//   https://meet.google.com/abc
//   Live class | https://meet.google.com/abc
//   Live class - https://meet.google.com/abc
//   meet.google.com/abc            (https:// is added)
export function parseLinkLines(text) {
  const out = [];
  String(text || '').split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    const m = line.match(/(https?:\/\/\S+|www\.\S+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/\S*)?)/i);
    let url = m ? m[1].replace(/[),.;]+$/, '') : line;
    let title = m ? (line.slice(0, m.index) + line.slice(m.index + m[1].length)).replace(/[|\-–—:,]+\s*$/, '').replace(/^\s*[|\-–—:,]+/, '').trim() : '';
    if (m && !/^https?:\/\//i.test(url)) url = `https://${url}`;
    out.push({ line: i + 1, raw, title: title.replace(/\s*[|\-–—:]\s*$/, '').trim(), url });
  });
  return out;
}
