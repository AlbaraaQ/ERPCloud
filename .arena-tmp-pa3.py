"""Wave PA-3 — remove platform-admin's Reveal and CountUp forks.

Same decision staff's got, for the same two reasons.

v3 does export both, but components/motion.tsx documents them as "the
marketing-only motion primitives (Design v3 §5: 'Reveal/CountUp/Marquee لـ
marketing فقط')". A platform console is not marketing, so importing them
here would be wrong even with shared code — ADR-030 is about not keeping a
second copy, not about ignoring where the first copy belongs.

platform-admin's copies are also the worse implementation: a 0.9s
framer-motion animation that never consults prefers-reduced-motion, in an
app with no MotionConfig anywhere. The fork is therefore both out of place
and an accessibility defect.

  Reveal — nine wrappers carry no className, so they are pure decoration
  and are unwrapped. The three that carry a grid class (xl:col-span-*)
  become a plain <div>, because that class has to live on a wrapper
  element. The block is shifted left two spaces.

  CountUp — its final frame is just the formatted value, so each site
  becomes the number it was animating toward. The local default formatted
  with toLocaleString('en-US'), which is kept so the rendered text does
  not change; the only thing lost is the animation.
"""

import re
import sys

FILES = [
    "apps/platform-admin/app/analytics/page.tsx",
    "apps/platform-admin/app/page.tsx",
    "apps/platform-admin/app/revenue/page.tsx",
    "apps/platform-admin/app/tenants/page.tsx",
    "apps/platform-admin/components/ui/metric-card.tsx",
]

stats = {"unwrapped": 0, "div": 0, "countup": 0}

for path in FILES:
    lines = open(path, encoding="utf-8").read().split("\n")
    out, i = [], 0
    while i < len(lines):
        stripped = lines[i].strip()
        if stripped.startswith("<Reveal"):
            indent = len(lines[i]) - len(lines[i].lstrip())
            j = i + 1
            while j < len(lines) and lines[j].strip() != "</Reveal>":
                j += 1
            if j >= len(lines):
                sys.exit("FAIL: %s — unterminated <Reveal> at line %d" % (path, i + 1))
            body = lines[i + 1 : j]
            cls = re.search(r'className="([^"]*)"', stripped)
            if cls:
                out.append(" " * indent + '<div className="%s">' % cls.group(1))
                out.extend(body)
                out.append(" " * indent + "</div>")
                stats["div"] += 1
            else:
                for b in body:
                    out.append(b[2:] if b.startswith("  ") else b)
                stats["unwrapped"] += 1
            i = j + 1
            continue
        out.append(lines[i])
        i += 1

    text = "\n".join(out)

    # <CountUp value={x} /> -> the formatted number it animated toward
    text, n = re.subn(
        r"<CountUp value=\{([^}]+)\} />",
        r"{Number(\1).toLocaleString('en-US')}",
        text,
    )
    stats["countup"] += n

    # drop the now-unused import
    text, n = re.subn(
        r"import \{ (?:CountUp, Reveal|Reveal|CountUp) \} from '(?:\.\./)+components/ui/count-up';\n",
        "",
        text,
    )
    if n != 1:
        sys.exit("FAIL: %s — expected one count-up import, removed %d" % (path, n))

    open(path, "w", encoding="utf-8").write(text)
    print("  %s" % path)

print("\nunwrapped=%d  div=%d  countup=%d" % (stats["unwrapped"], stats["div"], stats["countup"]))
