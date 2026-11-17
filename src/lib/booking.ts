/** 예약 버튼 링크. 홈페이지가 숲나들e면 그 휴양림 예약 페이지로, 아니면 운영기관 홈페이지로 보낸다. */
export interface BookingLink {
  url: string;
  /** 숲나들e(산림청 휴양림 통합예약) 링크인지 */
  foresttrip: boolean;
}

export function bookingLink(homepage: string | null | undefined, national: boolean): BookingLink | null {
  const raw = (homepage ?? "").trim();
  const url = raw ? (/^https?:\/\//i.test(raw) ? raw : `https://${raw}`) : "";
  if (url) {
    try {
      const u = new URL(url);
      if (u.protocol === "http:" || u.protocol === "https:")
        return { url: u.toString(), foresttrip: /(^|\.)foresttrip\.go\.kr$/.test(u.hostname) };
    } catch {
      /* 잘못된 주소는 버린다 */
    }
  }
  return national ? { url: "https://www.foresttrip.go.kr", foresttrip: true } : null;
}
