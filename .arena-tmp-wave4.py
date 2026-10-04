"""Wave 4a — re-point staff's Tabs and FilterBar onto @erp/ui.

components/ui.tsx is a flat file imported by 36 screens. Of its ten exports,
Tabs and FilterBar are the only two that duplicate @erp/ui; the other eight
(StatTile, StatTiles, StatusTrack, ActionBar, DocHead, DocField, StateBox,
Totals) are document-screen patterns with no design-system counterpart and
are therefore not forks.

FilterBar — the decision.

v3's FilterBar offers children, onClear, summary and className. staff's
offered children and `actions`, and the fifteen call sites show that
`actions` was an overloaded catch-all slot rather than one concept:

  11 of 15 are summaries — «12 صنفاً», «كل المستودعات», a selected unit's
  name. v3 already renders exactly this at the far end via `summary`, so
  they map straight across.

  1 of 15 (transfers) is a filter reset — «كل الفترة» clears the period.
  That is `onClear` with a `clearLabel`, not an action slot.

  3 of 15 are real actions that are not filters at all, and they are moved
  rather than mapped, because a «reserve the selected serials» or «run the
  auto-match job» button inside a filter row is a layout accident that the
  slot made possible:
    - bank-reconciliation: the Screen already renders an actions row with
      two buttons; the auto-match button joins it.
    - serials: the bulk buttons act on the table's own `checked` rows, so
      they move to a row directly above that table, next to the selection.
    - item-card: «عرض البطاقة» applies the filters, so it stays a button but
      becomes the last child of the row rather than a separate slot.

The alternative — adding an `actions` prop to v3's FilterBar — was rejected
because it would give the design system two competing far-end slots and
would enshrine non-filter buttons in a filter row. `summary` for display and
`onClear` for the reset is what v3 already decided, and the call sites agree
with it.

Tabs — the decision.

v3's Tabs was not generic, so adopting it would have downgraded the two
call sites written as <Tabs<TabId>> from a compile-checked union to a bare
string, meaning a mistyped tab id stops being an error. v3's Tabs is now
generic over the key type with a `string` default, which keeps every
existing call site valid and gives the union back. The only rename needed is
`items[].id` -> `items[].key`, since v3 names the field `key`.
"""

import re
import sys

SUMMARY_FILES = [
    "apps/staff/app/inventory/below-minimum/page.tsx",
    "apps/staff/app/inventory/expiry/page.tsx",
    "apps/staff/app/inventory/in-transit/page.tsx",
    "apps/staff/app/inventory/item-units/page.tsx",
    "apps/staff/app/inventory/items/page.tsx",
    "apps/staff/app/inventory/levels/page.tsx",
    "apps/staff/app/inventory/movements/page.tsx",
    "apps/staff/app/inventory/overview/page.tsx",
]

# ------------------------------------------- 1. actions -> summary (11) ----
for path in SUMMARY_FILES:
    text = open(path, encoding="utf-8").read()
    if "actions={" not in text:
        sys.exit("FAIL: %s — no actions= found" % path)
    # only the FilterBar one carries actions= in these files
    text, n = re.subn(r"actions=\{", "summary={", text)
    if n != 1:
        sys.exit("FAIL: %s — expected one actions=, found %d" % (path, n))
    open(path, "w", encoding="utf-8").write(text)
    print("  %s: actions -> summary" % path)

print("\nsummary conversions done")
