from datetime import datetime


def fmt_number(n: int | float | None) -> str:
    if n is None:
        return "—"
    n = int(n)
    if n >= 1_000_000:
        return f"{n / 1_000_000:.1f}M"
    if n >= 1_000:
        return f"{n / 1_000:.1f}K"
    return str(n)


def fmt_date(dt: datetime | None) -> str:
    if not dt:
        return "—"
    return dt.strftime("%d %b %Y")
