"""AI-assisted editing for head-to-waist character illustrations."""

import base64
import binascii
import logging
import os
from functools import lru_cache
from io import BytesIO
from threading import Lock
from typing import Literal

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, ValidationError

router = APIRouter(prefix="/virtual")
log = logging.getLogger(__name__)
inference_lock = Lock()
MAX_BODY_BYTES = 8_000_000


class CharacterImage(BaseModel):
    image: str = Field(max_length=5_000_000)
    upper_body_confirmed: bool


class RestorationRequest(CharacterImage):
    mask: str = Field(max_length=2_000_000)
    section: Literal["hair", "sideHair", "backHair", "eyes"] = "hair"


async def read_payload(request, schema):
    body = bytearray()
    async for chunk in request.stream():
        if len(body) + len(chunk) > MAX_BODY_BYTES:
            raise HTTPException(413, "이미지 용량이 너무 커요.")
        body.extend(chunk)
    try:
        payload = schema.model_validate_json(body)
    except ValidationError:
        raise HTTPException(422, "이미지 제출 형식을 확인해 주세요.") from None
    if not payload.upper_body_confirmed:
        raise HTTPException(422, "머리부터 허리까지만 보이는 그림을 제출해 주세요.")
    return payload


def decode_png(value):
    from PIL import Image

    try:
        raw = base64.b64decode(value, validate=True)
        with Image.open(BytesIO(raw), formats=["PNG"]) as image:
            if min(image.size) < 32 or max(image.size) > 768:
                raise HTTPException(422, "이미지 크기는 각 변 32~768px여야 해요.")
            return image.convert("RGBA")
    except (binascii.Error, OSError, Image.DecompressionBombError):
        raise HTTPException(422, "PNG 이미지를 읽을 수 없어요.") from None


def encode_png(image):
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("ascii")


@lru_cache(maxsize=1)
def detector():
    import torch
    from transformers import AutoModelForZeroShotObjectDetection, AutoProcessor

    model_id = "IDEA-Research/grounding-dino-tiny"
    device = "cuda" if torch.cuda.is_available() else "cpu"
    return (
        AutoProcessor.from_pretrained(model_id),
        AutoModelForZeroShotObjectDetection.from_pretrained(model_id).to(device).eval(),
    )


@lru_cache(maxsize=1)
def segmenter():
    import torch
    from transformers import Sam2Model, Sam2Processor

    model_id = "facebook/sam2.1-hiera-tiny"
    device = "cuda" if torch.cuda.is_available() else "cpu"
    return Sam2Processor.from_pretrained(model_id), Sam2Model.from_pretrained(model_id).to(device).eval()


def detect(image, labels, threshold):
    import torch

    processor, model = detector()
    inputs = processor(images=image, text=[labels], return_tensors="pt").to(model.device)
    with torch.inference_mode():
        outputs = model(**inputs)
    result = processor.post_process_grounded_object_detection(
        outputs, inputs.input_ids, threshold=threshold, text_threshold=0.25,
        target_sizes=[(image.height, image.width)],
    )[0]
    return list(zip(result["text_labels"], result["boxes"].tolist(), result["scores"].tolist()))


# 허리까지 허용하고 골반과 하반신이 감지된 제출은 거절한다.
def validate_framing(image):
    forbidden = ["hips", "thigh", "leg", "foot"]
    detections = detect(image, ["head", *forbidden], threshold=0.28)
    if any(label in forbidden for label, _, _ in detections):
        raise HTTPException(422, "골반이나 하반신이 감지됐어요. 머리부터 허리까지만 남도록 잘라 다시 제출해 주세요.")
    if not any(label == "head" for label, _, _ in detections):
        raise HTTPException(422, "머리 영역을 확인하기 어려워요. 정면 상반신 그림을 올려주세요.")


def to_rgb(image):
    from PIL import Image

    white = Image.new("RGBA", image.size, "white")
    return Image.alpha_composite(white, image).convert("RGB")


def segment(payload):
    import torch
    from PIL import Image, ImageChops

    source = decode_png(payload.image)
    image = to_rgb(source)
    validate_framing(image)
    detections = detect(image, ["bangs", "face", "eye"], threshold=0.25)
    # 화면에서 보이는 왼쪽·오른쪽 눈을 각각 저장한다.
    layers = {
        name: Image.new("L", image.size)
        for name in ("hair", "face", "leftEye", "rightEye")
    }
    labels = {"bangs": "hair", "face": "face"}
    ranked = sorted(detections, key=lambda item: item[2], reverse=True)

    face_box = next((box for label, box, _ in ranked if label == "face"), None)
    face_center = (face_box[0] + face_box[2]) / 2 if face_box else image.width / 2

    candidates = []
    used_layers = set()
    for label, box, _ in ranked:
        if label == "eye":
            eye_center = (box[0] + box[2]) / 2
            layer = "leftEye" if eye_center < face_center else "rightEye"
        else:
            layer = labels.get(label)

        if layer is None or layer in used_layers:
            continue

        candidates.append((layer, box))
        used_layers.add(layer)

    if candidates:
        processor, model = segmenter()
        inputs = processor(images=image, input_boxes=[[box for _, box in candidates]], return_tensors="pt").to(model.device)
        with torch.inference_mode():
            outputs = model(**inputs, multimask_output=False)
        masks = processor.post_process_masks(outputs.pred_masks.cpu(), inputs["original_sizes"])[0]
        for (layer, _), mask in zip(candidates, masks):
            alpha = Image.fromarray((mask[0].numpy() > 0).astype("uint8") * 255)
            layers[layer] = ImageChops.lighter(layers[layer], alpha)

    # 기존 눈 버튼에 쓰이는 양쪽 눈 마스크도 함께 보낸다.
    layers["eyes"] = ImageChops.lighter(layers["leftEye"], layers["rightEye"])
    return {"masks": {name: encode_png(mask) for name, mask in layers.items()}}


@lru_cache(maxsize=1)
def inpainting_model(model_id):
    import torch
    from diffusers import AutoPipelineForInpainting

    device = "cuda" if torch.cuda.is_available() else "cpu"
    dtype = torch.float16 if device == "cuda" else torch.float32
    return AutoPipelineForInpainting.from_pretrained(model_id, torch_dtype=dtype).to(device)


def restore(payload):
    from PIL import Image, ImageChops

    model_id = os.getenv("DOHWA_INPAINT_MODEL", "stable-diffusion-v1-5/stable-diffusion-inpainting")
    source = decode_png(payload.image)
    mask_image = decode_png(payload.mask)
    if mask_image.size != source.size:
        raise HTTPException(422, "원본과 마스크 크기가 달라요.")
    mask = ImageChops.multiply(mask_image.getchannel("A"), source.getchannel("A"))
    if not mask.getbbox():
        raise HTTPException(422, "채울 영역을 먼저 지정해 주세요.")
    image = to_rgb(source)
    validate_framing(image)

    # 눈 마스크 주변의 피부까지 포함해서 잘라낸다.
    crop_box = (0, 0, source.width, source.height)
    if payload.section == "eyes":
        left, top, right, bottom = mask.getbbox()
        padding = max(right - left, bottom - top) // 2
        crop_box = (
            max(0, left - padding),
            max(0, top - padding),
            min(source.width, right + padding),
            min(source.height, bottom + padding),
        )

    region = image.crop(crop_box)
    region_mask = mask.crop(crop_box)
    size = tuple(max(64, ((dimension + 7) // 8) * 8) for dimension in region.size)

    # 선택한 부위에 맞는 채우기 지시를 고른다.
    context = {
        "hair": "forehead and facial skin underneath the bangs",
        "sideHair": "the underlying cheek, ear, clothing or background behind the side hair",
        "backHair": "the underlying background or clothing behind the back hair",
        "eyes": "smooth skin matching the surrounding color, shading and illustration style, without visible eyes or eyelashes",
    }
    output = inpainting_model(model_id)(
        prompt=f"anime illustration, {context[payload.section]}, matching line art and colors",
        image=region.resize(size),
        mask_image=region_mask.resize(size, Image.Resampling.NEAREST),
        width=size[0], height=size[1],
    )
    # 필터에 걸린 이미지는 원본에 합성하지 않는다.
    if any(getattr(output, "nsfw_content_detected", None) or []):
        raise HTTPException(422, "AI가 채운 그림을 사용할 수 없어요.")

    # 생성한 조각을 원본 좌표에 놓고, 기존 마스크로 합성한다.
    result = source.copy()
    filled_region = output.images[0].resize(region.size).convert("RGBA")
    result.paste(filled_region, (crop_box[0], crop_box[1]))
    
    restored = Image.composite(result.convert("RGBA"), source, mask)
    restored.putalpha(source.getchannel("A"))
    return {"image": encode_png(restored)}


def run_inference(operation, payload):
    if not inference_lock.acquire(blocking=False):
        raise HTTPException(503, "AI가 다른 그림을 처리 중이에요. 잠시 후 다시 시도해 주세요.")
    try:
        return operation(payload)
    except HTTPException:
        raise
    except Exception:
        log.exception("Virtual character inference failed")
        raise HTTPException(503, "AI 모델을 실행할 수 없어요. 서버 모델 설치 상태를 확인해 주세요.") from None
    finally:
        inference_lock.release()


@router.post("/segment")
async def segment_image(request: Request):
    from starlette.concurrency import run_in_threadpool

    payload = await read_payload(request, CharacterImage)
    return await run_in_threadpool(run_inference, segment, payload)


@router.post("/restore")
async def restore_image(request: Request):
    from starlette.concurrency import run_in_threadpool

    payload = await read_payload(request, RestorationRequest)
    return await run_in_threadpool(run_inference, restore, payload)
