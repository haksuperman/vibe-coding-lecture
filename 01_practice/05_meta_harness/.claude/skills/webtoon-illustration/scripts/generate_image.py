#!/usr/bin/env python3
"""웹툰 컷 이미지를 OpenAI 이미지 모델(gpt-image-1)로 생성한다.

프롬프트는 셸 이스케이프 문제를 피하기 위해 파일로 받는다.
레퍼런스 이미지(--ref)를 주면 images.edit 다중 입력으로 캐릭터 일관성을 유지한다.

사용 예:
  # 1번 컷 (레퍼런스 없음)
  python3 generate_image.py --prompt-file cut1.txt --out _workspace/images/cut1.png
  # 2번 컷 (1번 컷을 레퍼런스로)
  python3 generate_image.py --prompt-file cut2.txt --out _workspace/images/cut2.png --ref _workspace/images/cut1.png

환경변수 OPENAI_API_KEY 필요. 의존성: pip install openai
"""
import argparse
import base64
import os
import sys


def main() -> int:
    ap = argparse.ArgumentParser(description="Generate a webtoon panel image via OpenAI image model")
    ap.add_argument("--prompt-file", required=True, help="조립된 최종 프롬프트가 담긴 텍스트 파일 경로")
    ap.add_argument("--out", required=True, help="저장할 PNG 경로")
    ap.add_argument("--ref", action="append", default=[],
                    help="일관성용 레퍼런스 이미지 경로(여러 번 지정 가능). 주면 images.edit 사용")
    ap.add_argument("--size", default="1024x1536",
                    help="세로 웹툰 기본 portrait. 지원: 1024x1024 / 1024x1536 / 1536x1024 / auto")
    ap.add_argument("--model", default="gpt-image-1", help="OpenAI 이미지 모델 id")
    args = ap.parse_args()

    if not os.environ.get("OPENAI_API_KEY"):
        print("ERROR: OPENAI_API_KEY 환경변수가 없습니다. .env 또는 export로 설정하세요.", file=sys.stderr)
        return 2

    try:
        from openai import OpenAI
    except ImportError:
        print("ERROR: openai SDK 미설치. `pip install openai` 후 다시 실행하세요.", file=sys.stderr)
        return 2

    with open(args.prompt_file, encoding="utf-8") as f:
        prompt = f.read().strip()
    if not prompt:
        print(f"ERROR: 프롬프트 파일이 비었습니다: {args.prompt_file}", file=sys.stderr)
        return 2

    client = OpenAI()
    try:
        if args.ref:
            for p in args.ref:
                if not os.path.exists(p):
                    print(f"ERROR: 레퍼런스 이미지 없음: {p}", file=sys.stderr)
                    return 2
            images = [open(p, "rb") for p in args.ref]
            result = client.images.edit(model=args.model, image=images, prompt=prompt, size=args.size)
        else:
            result = client.images.generate(model=args.model, prompt=prompt, size=args.size)
    except Exception as e:  # noqa: BLE001 - API/네트워크 오류를 사용자에게 그대로 전달
        print(f"ERROR: 이미지 생성 실패: {e}", file=sys.stderr)
        return 1

    b64 = result.data[0].b64_json
    out_dir = os.path.dirname(args.out)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)
    with open(args.out, "wb") as f:
        f.write(base64.b64decode(b64))
    print(f"saved: {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
