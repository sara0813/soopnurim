import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card mx-auto max-w-lg space-y-3 p-6 text-center">
      <h1 className="text-2xl font-bold">페이지를 찾을 수 없습니다</h1>
      <p className="text-muted">주소가 바뀌었거나 없는 휴양림일 수 있습니다.</p>
      <Link href="/" className="btn btn-primary">
        숲 찾기로 돌아가기
      </Link>
    </div>
  );
}
