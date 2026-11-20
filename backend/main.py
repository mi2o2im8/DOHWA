# 실행 명령어 uvicorn main:app --reload --env-file .env

import os
import re
import secrets
import smtplib
import ssl
import time
from collections import deque
from dataclasses import dataclass
from datetime import date
from email.message import EmailMessage
from threading import Lock

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, SecretStr, field_validator

app = FastAPI(title="DOHWA API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["POST"],
    allow_headers=["Content-Type"],
)


@app.exception_handler(RequestValidationError)
async def invalid_input(request: Request, error: RequestValidationError):
    return JSONResponse(status_code=422, content={"detail": "입력값을 확인해 주세요."})


@app.get("/")
def home():
    return {"message": "DOHWA Backend 실행 성공!"}


class MailRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)

    @field_validator("email")
    @classmethod
    def validate_address(cls, value: str):
        local, separator, domain = value.partition("@")
        label = r"[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?"
        if (not separator or not re.fullmatch(r"[a-zA-Z0-9_%+-]+(?:\.[a-zA-Z0-9_%+-]+)*", local)
                or len(local) > 64 or not re.fullmatch(rf"(?:{label}\.)+[a-zA-Z]{{2,63}}", domain)):
            raise ValueError("이메일 주소를 확인해 주세요.")
        return value.lower()


class CodeRequest(MailRequest):
    code: str = Field(pattern=r"^[0-9]{6}$")


class SignupRequest(MailRequest):
    ticket: str = Field(min_length=32, max_length=128)
    password: SecretStr = Field(min_length=8, max_length=64)
    real_name: str = Field(min_length=2, max_length=30)
    nickname: str | None = Field(default=None, max_length=12)
    birth_date: date
    gender: str | None = Field(default=None, max_length=30)


@dataclass
class Challenge:
    code: str
    sent: float
    expires: float
    attempts: int = 0
    ticket: str = ""
    submitting: bool = False


challenges: dict[str, Challenge] = {}
recent_sends = deque()
lock = Lock()


def send_mail(address, code):
    user = os.environ["SMTP_USER"]
    message = EmailMessage()
    message["From"] = user
    message["To"] = address
    message["Subject"] = "[DOHWA] 이메일 인증번호"
    message.set_content(f"인증번호는 {code}입니다. 5분 안에 회원가입 화면에 입력해 주세요.")
    with smtplib.SMTP_SSL(os.environ["SMTP_HOST"], int(os.getenv("SMTP_PORT", "465")),
                          context=ssl.create_default_context(), timeout=12) as smtp:
        smtp.login(user, os.environ["SMTP_APP_PASSWORD"])
        smtp.send_message(message)


@app.post("/email/request-verification")
def request_code(body: MailRequest, request: Request):
    address = str(body.email).lower()
    now = time.monotonic()
    ip = request.client.host if request.client else ""
    with lock:
        for key in list(challenges):
            if challenges[key].expires <= now and not challenges[key].submitting:
                del challenges[key]
        while recent_sends and recent_sends[0][0] <= now - 3600:
            recent_sends.popleft()
        previous = challenges.get(address)
        if previous and (previous.submitting or now - previous.sent < 60):
            raise HTTPException(429, "잠시 후 다시 요청해 주세요. 재발송 간격은 1분입니다.")
        if len(recent_sends) >= 100 or sum(host == ip for _, host in recent_sends) >= 10:
            raise HTTPException(429, "발송 횟수를 초과했습니다. 나중에 다시 시도해 주세요.")
        recent_sends.append((now, ip))
        challenge = Challenge(f"{secrets.randbelow(1000000):06d}", now, now + 300)
        challenges[address] = challenge
    sent = False
    try:
        # 인증메일 발송 전 이메일 중복 확인
        key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        url = os.environ["SUPABASE_URL"].rstrip("/")
        response = httpx.post(
            f"{url}/rest/v1/rpc/dohwa_email_exists",
            headers={"apikey": key, "Authorization": f"Bearer {key}"},
            json={"requested_email": address},
            timeout=10,
        )
        response.raise_for_status()
        email_exists = response.json()
        if type(email_exists) is not bool:
            raise HTTPException(503, "이메일 중복 확인 결과를 확인하지 못했습니다.")
        if email_exists:
            raise HTTPException(409, "이미 가입된 이메일입니다. 로그인해 주세요.")

        send_mail(address, challenge.code)
        sent = True
        return {"sent": True}
    except httpx.HTTPError as error:
        print("이메일 중복 확인 오류:", type(error).__name__, flush=True)
        raise HTTPException(503, "이메일 중복 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.")
    except (OSError, smtplib.SMTPException, KeyError, ValueError) as error:
        print("인증 요청 오류:", type(error).__name__, getattr(error, "smtp_code", ""), flush=True)
        raise HTTPException(503, "인증 요청을 처리하지 못했습니다. 서버 설정을 확인해 주세요.")
    finally:
        # 발송에 실패한 요청의 인증번호 제거
        if not sent:
            with lock:
                if challenges.get(address) is challenge:
                    del challenges[address]


@app.post("/email/verify")
def verify(body: CodeRequest):
    with lock:
        item = challenges.get(str(body.email).lower())
        if not item or item.expires <= time.monotonic() or item.ticket or item.attempts >= 5:
            raise HTTPException(400, "인증번호를 다시 요청해 주세요.")
        item.attempts += 1
        if not secrets.compare_digest(item.code, body.code):
            raise HTTPException(400, "인증번호가 일치하지 않습니다.")
        item.ticket = secrets.token_urlsafe(32)
        item.expires = time.monotonic() + 900
        return {"ticket": item.ticket}


@app.post("/signup", status_code=201)
def signup(body: SignupRequest):
    address = str(body.email).lower()
    with lock:
        item = challenges.get(address)
        if (not item or item.expires <= time.monotonic() or not item.ticket
                or not secrets.compare_digest(item.ticket.encode(), body.ticket.encode())):
            raise HTTPException(403, "이메일 인증을 다시 진행해 주세요.")
        if item.submitting:
            raise HTTPException(409, "가입 요청을 처리하고 있습니다.")
        item.submitting = True
    try:
        key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        result = httpx.post(
            os.environ["SUPABASE_URL"].rstrip("/") + "/auth/v1/admin/users",
            headers={"apikey": key, "Authorization": "Bearer " + key},
            json={"email": address, "password": body.password.get_secret_value(),
                  "email_confirm": True,
                  "user_metadata": {"real_name": body.real_name, "nickname": body.nickname,
                                    "birth_date": body.birth_date.isoformat(), "gender": body.gender}},
            timeout=15,
        )
        if not result.is_success:
            code = result.json().get("error_code")
            print("Supabase 가입 오류:", result.status_code, code, flush=True)
            if code in ("email_exists", "user_already_exists"):
                raise HTTPException(409, "이미 가입된 이메일입니다.")
            if code == "weak_password":
                raise HTTPException(400, "비밀번호가 Supabase 보안 정책에 맞지 않습니다.")
            raise HTTPException(502, "가입에 실패했습니다. Supabase 설정과 프로필 생성 규칙을 확인해 주세요.")
        with lock:
            del challenges[address]
        return {"created": True}
    except (httpx.HTTPError, KeyError, ValueError):
        raise HTTPException(503, "가입 서버 연결 또는 설정을 확인해 주세요.")
    finally:
        with lock:
            item.submitting = False