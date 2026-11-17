"use client";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import L from "leaflet";
import "leaflet.markercluster";
import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import type { ForestSummary, NanumPoint, ToiletPoint } from "@/lib/types";
import { pick, type Lang } from "@/lib/i18n";
import { nameOf } from "@/lib/romanize";
import { useLang } from "@/lib/useLang";

export interface MapLayers {
  nanum: boolean;
  toilet: boolean;
}

interface Props {
  forests: ForestSummary[];
  nanum: NanumPoint[];
  toilets: ToiletPoint[];
  layers: MapLayers;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  myLoc: { lat: number; lng: number } | null;
}

// 나무 모양 선 아이콘 (lucide tree-pine과 같은 형태)
const TREE_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z"/><path d="M12 22v-3"/></svg>';

const forestIcon = (selected: boolean, closed: boolean) =>
  L.divIcon({
    className: "",
    html: `<span class="sn-pin${selected ? " sn-pin-on" : ""}${closed ? " sn-pin-closed" : ""}" aria-hidden="true">${TREE_SVG}</span>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

function ForestLayer({ forests, selectedId, onSelect, lang }: Pick<Props, "forests" | "selectedId" | "onSelect"> & { lang: Lang }) {
  const map = useMap();
  const groupRef = useRef<L.MarkerClusterGroup | null>(null);
  const markers = useRef(new Map<string, L.Marker>());

  // 필터된 숲으로 클러스터 다시 구성 + 화면 맞추기
  const key = forests.map((f) => f.id).join(",");
  useEffect(() => {
    const g = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 45,
      iconCreateFunction: (c) =>
        L.divIcon({
          className: "",
          html: `<span class="sn-cluster">${c.getChildCount()}</span>`,
          iconSize: [46, 46],
        }),
    });
    markers.current.clear();
    const pts: L.LatLngExpression[] = [];
    for (const f of forests) {
      if (f.lat == null || f.lng == null) continue;
      const m = L.marker([f.lat, f.lng], {
        icon: forestIcon(false, f.closed),
        title: nameOf(lang, f.name),
        alt: nameOf(lang, f.name),
        keyboard: true,
      });
      m.on("click", () => onSelect(f.id));
      markers.current.set(f.id, m);
      g.addLayer(m);
      pts.push([f.lat, f.lng]);
    }
    map.addLayer(g);
    groupRef.current = g;
    if (pts.length) map.fitBounds(L.latLngBounds(pts), { padding: [30, 30], maxZoom: 12 });
    return () => {
      map.removeLayer(g);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);

  // 선택 표시
  useEffect(() => {
    markers.current.forEach((m, id) => {
      const f = forests.find((x) => x.id === id);
      m.setIcon(forestIcon(id === selectedId, !!f?.closed));
      m.setZIndexOffset(id === selectedId ? 1000 : 0);
    });
    if (selectedId) {
      const m = markers.current.get(selectedId);
      if (m && groupRef.current) {
        groupRef.current.zoomToShowLayer(m, () => map.panTo(m.getLatLng()));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, key]);
  return null;
}

/**
 * 팝업 내용: 공공데이터의 이름·기관명은 외부에서 온 문자열이므로 HTML로 끼워 넣지 않고
 * DOM 노드를 만들어 textContent로만 넣는다.
 */
function popupNode(title: string, lines: string[], source: string) {
  const root = document.createElement("div");
  const strong = document.createElement("strong");
  strong.textContent = title;
  root.append(strong);
  for (const l of lines) {
    root.append(document.createElement("br"), document.createTextNode(l));
  }
  const small = document.createElement("small");
  small.textContent = source;
  root.append(document.createElement("br"), small);
  return root;
}

function PointLayer({ points, kind, lang }: { points: (NanumPoint | ToiletPoint)[]; kind: "nanum" | "toilet"; lang: Lang }) {
  const map = useMap();
  useEffect(() => {
    const t = pick(lang);
    const layer = L.layerGroup(
      points.map((p) => {
        const isN = kind === "nanum";
        const n = p as NanumPoint;
        const x = p as ToiletPoint;
        const node = isN
          ? popupNode(
              n.name,
              [
                t("무장애나눔길", "Barrier-free trail") +
                  (n.lengthM ? ` · ${n.lengthM.toLocaleString()}${t("m", " m")}` : "") +
                  ` · ${t(`${n.year}년 조성`, `built ${n.year}`)}`,
                `${t("관리", "Managed by")}: ${n.org}`,
              ],
              t("출처: 무장애나눔길 조성정보", "Source: Barrier-free Trail Status"),
            )
          : popupNode(
              x.name,
              [t(`장애인용 대변기 ${x.disabled}개 · 어린이용 ${x.child}개`, `Accessible toilets ${x.disabled} · children's ${x.child}`)],
              t("출처: 전국공중화장실표준데이터", "Source: National Public Toilet Standard Data"),
            );
        return L.circleMarker([p.lat, p.lng], {
          radius: isN ? 7 : 6,
          color: isN ? "#793400" : "#005bab",
          fillColor: isN ? "#dd5b00" : "#0075de",
          fillOpacity: 0.9,
          weight: 2,
        }).bindPopup(node);
      }),
    );
    map.addLayer(layer);
    return () => {
      map.removeLayer(layer);
    };
  }, [points, kind, map, lang]);
  return null;
}

function MyLocation({ myLoc, label }: { myLoc: Props["myLoc"]; label: string }) {
  const map = useMap();
  useEffect(() => {
    if (!myLoc) return;
    const m = L.circleMarker([myLoc.lat, myLoc.lng], {
      radius: 9,
      color: "#fff",
      weight: 3,
      fillColor: "#ff64c8",
      fillOpacity: 1,
    }).bindTooltip(label);
    m.addTo(map);
    return () => {
      m.remove();
    };
  }, [myLoc, map, label]);
  return null;
}

export default function ForestMap(props: Props) {
  const { lang, t } = useLang();
  const toiletPts = useMemo(() => props.toilets.filter((t) => t.disabled > 0 || t.child > 0), [props.toilets]);
  return (
    <div className="relative">
      <p className="sr-only">
        {t(
          "지도는 마우스·터치 조작용입니다. 화면낭독기 사용자는 목록 보기에서 같은 정보를 확인할 수 있습니다.",
          "The map is for mouse and touch. Screen reader users can find the same information in the list view.",
        )}
      </p>
      <MapContainer center={[36.3, 127.8]} zoom={7} scrollWheelZoom style={{ height: "min(70vh, 640px)", minHeight: 420 }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {props.layers.nanum && <PointLayer points={props.nanum} kind="nanum" lang={lang} />}
        {props.layers.toilet && <PointLayer points={toiletPts} kind="toilet" lang={lang} />}
        <ForestLayer forests={props.forests} selectedId={props.selectedId} onSelect={props.onSelect} lang={lang} />
        <MyLocation myLoc={props.myLoc} label={t("내 위치", "My location")} />
      </MapContainer>
    </div>
  );
}
