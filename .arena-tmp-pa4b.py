"""Wave PA-4 — re-point platform-admin's input fork onto @erp/ui. (retry)

Input and Labeled are pure re-points: v3's InputProps is a superset of the
local one, and Labeled now exists in the package (added for staff).
Textarea is deleted rather than ported — no call site anywhere in this app.

Select is the one real API change, the same one staff hit: v3 takes an
`options` array of {value,label,disabled} where the local fork took
<option> children. Eleven call sites, three shapes:

  literal options   <option value="3">٣ أشهر</option>
                    -> { value: '3', label: '٣ أشهر' }

  leading placeholder <option value="">الكل</option>
                    -> placeholder="الكل" (v3 renders the empty first
                       option itself)

  a .map() over a source
                    {SRC.map((k) => (<option key={k} value={k}>{L[k]}</option>))}
                    -> SRC.map((k) => ({ value: k, label: L[k] }))

The first attempt at this broke on `onChange`. It located the end of the
opening tag with `block.index(">")`, but every one of these Selects writes
its handler as `onChange={(e) => …}`, and the `>` of that arrow is not the
end of the tag. The tag was cut in half, `onChange` silently vanished, and
the leftover ` onDaysChange(…)` fragment ended up inside the children —
which is what produced the `setStatus is assigned but never used` errors.
The opening tag is now found by walking to the first `>` at brace depth
zero, so an arrow inside a prop value cannot end it.

Arabic labels are lifted out of the source rather than retyped.
"""

import os
import re
import sys

FILES = []
for root, dirs, fs in os.walk("apps/platform-admin"):
    for f in fs:
        if f.endswith(".tsx"):
            FILES.append(os.path.join(root, f))

OPTION_LITERAL = re.compile(r'<option value="([^"]*)">(.*?)</option>', re.S)
MAP_BLOCK = re.compile(
    r"\{(\S.*?)\.map\(\((\w+)\) => \(\s*<option key=\{[^}]*\} value=\{([^}]*)\}>\s*(\{[^}]*\}|\S[^\n]*?)\s*</option>\s*\)\)\}",
    re.S,
)
ATTR = re.compile(r'(\w+)=(?:"[^"]*"|\{[^{}]*\})')
KEEP = {"label", "value", "onChange", "placeholder", "className"}


def tag_end(text, start):
    """Index just past the '>' that closes the opening tag at `start`."""
    depth = 0
    for i in range(start, len(text)):
        c = text[i]
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
        elif c == ">" and depth == 0:
            return i + 1
    sys.exit("FAIL: unterminated opening tag at %d" % start)


converted = 0
for path in sorted(FILES):
    t = open(path, encoding="utf-8").read()
    if "ui/input'" not in t:
        continue
    original = t

    cursor = 0
    while True:
        m = re.search(r"<Select\b", t[cursor:])
        if not m:
            break
        start = cursor + m.start()
        end = tag_end(t, start)
        close = t.index("</Select>", start) + len("</Select>")
        block = t[start:close]

        open_tag = t[start:end]
        inner = t[end : close - len("</Select>")]

        attrs = open_tag[len("<Select") : -1]
        keep = [p.group(0) for p in ATTR.finditer(attrs) if p.group(1) in KEEP]
        if not any(p.startswith("onChange=") for p in keep):
            sys.exit("FAIL: %s — onChange lost from:\n%s" % (path, open_tag))

        options, placeholder = [], None
        for val, label in OPTION_LITERAL.findall(inner):
            label = label.strip()
            if val == "":
                placeholder = label
            else:
                options.append("{ value: '%s', label: '%s' }" % (val, label))

        for src, param, valexpr, labelexpr in MAP_BLOCK.findall(inner):
            labelexpr = labelexpr.strip()
            if labelexpr.startswith("{") and labelexpr.endswith("}"):
                labelexpr = labelexpr[1:-1].strip()
            options.append(
                "%s.map((%s) => ({ value: %s, label: %s }))"
                % (src, param, valexpr.strip(), labelexpr)
            )

        if not options:
            sys.exit("FAIL: %s — no options parsed from:\n%s" % (path, block))

        new_attrs = list(keep)
        if placeholder:
            new_attrs.append('placeholder="%s"' % placeholder)
        new_attrs.append("options={[\n%s,\n]}" % ",\n".join("  " + o for o in options))

        indent = re.match(r"[ \t]*", t[start - (len(t[:start]) - len(t[:start].rstrip(" \t\n")) ) :]).group(0)
        indent = t[max(t.rfind("\n", 0, start) + 1, 0) : start]
        replacement = "<Select\n" + "".join("%s%s\n" % (indent, a) for a in new_attrs) + indent + "/>"

        t = t[:start] + replacement + t[close:]
        cursor = start + len(replacement)
        converted += 1

    t, n = re.subn(
        r"import \{ ([^}]*) \} from '(?:\.\./)+components/ui/input';",
        r"import { \1 } from '@erp/ui';",
        t,
    )
    if n != 1:
        sys.exit("FAIL: %s — expected one input import, found %d" % (path, n))

    if t == original:
        sys.exit("FAIL: %s — no change" % path)
    open(path, "w", encoding="utf-8").write(t)
    print("  %s" % path)

print("\n%d Select(s) converted" % converted)
