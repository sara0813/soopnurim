"use client";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer } from "react-leaflet";
import type { ForestSummary } from "@/lib/types";
import type { NanumPoint } from "./Explorer";

const km = (d: number) => (d < 0.05 ? "50m 미만" : d < 1 ? `${Math.round(d * 1000)}m` : `${d.toFixed(1)}km`);

export default function ForestMap({ forests, nanum }: { forests: ForestSummary[]; nanum: NanumPoint[] }) {
  const pts = forests.filter((f) => f.lat && f.lng);
  const nanumByName = new Map(nanum.map((n) => [n.name, n]));
  return (
    <div>
      <p className="sr-only">
        지도는 마우스·터치 조작용입니다. 화면낭독기 사용자는 목록 보기에서 같은 정보를 확인할 수 있습니다.
      </p>
      <MapContainer center={[36.3, 127.8]} zoom={7} scrollWheelZoom style={{ height: "70vh", minHeight: 420 }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pts.map((f) => {
          const n = f.nanumNearest && nanumByName.get(f.nanumNearest.name);
          return n ? (
            <Polyline
              key={`l-${f.id}`}
              positions={[
                [f.lat!, f.lng!],
                [n.lat, n.lng],
              ]}
              pathOptions={{ color: "#e07b00", weight: 3, dashArray: "4 4" }}
            />
          ) : null;
        })}
        {nanum.map((n) => (
          <CircleMarker
            key={`n-${n.name}-${n.lat}`}
            center={[n.lat, n.lng]}
            radius={5}
            pathOptions={{ color: "#a35400", fillColor: "#e07b00", fillOpacity: 0.9, weight: 1 }}
          >
            <Popup>
              <strong>{n.name}</strong>
              <br />
              무장애나눔길 · {n.lengthM ? `${n.lengthM.toLocaleString()}m · ` : ""}
              {n.year}년 조성
              <br />
              관리: {n.org}
              <br />
              <small>출처: 한국산림복지진흥원_무장애나눔길 조성정보</small>
            </Popup>
          </CircleMarker>
        ))}
        {pts.map((f) => (
          <CircleMarker
            key={f.id}
            center={[f.lat!, f.lng!]}
            radius={7}
            pathOptions={{ color: "#0f3d26", fillColor: "#1f6b45", fillOpacity: 0.9, weight: 2 }}
          >
            <Popup>
              <strong>{f.name}</strong>
              <br />
              {f.address}
              {f.nanumNearest && (
                <>
                  <br />
                  무장애나눔길: {f.nanumNearest.name} (직선 {km(f.nanumNearest.distKm)})
                </>
              )}
              <br />
              <Link href={`/forest/${f.id}`}>여정별 정보·빈칸 보기 →</Link>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
